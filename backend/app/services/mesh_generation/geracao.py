"""Orquestra: contornos escolhidos + perfil -> sólidos 3D -> STL -> validação."""
from pathlib import Path
from typing import Dict, List, Literal

from shapely.geometry import Polygon
from shapely.geometry.base import BaseGeometry

from ...models.perfil import PerfilFabricacao
from ..geometry_2d import formas as f2d
from ..validation.validador import validar_stl
from . import construtor as c3d

Tipo = Literal["cortador", "marcador", "conjunto"]
ORDEM_STATUS = {"APROVADO": 0, "ATENCAO": 1, "BLOQUEADO": 2}


class ErroGeracao(ValueError):
    """Erro com mensagem útil para o usuário (sem stack trace)."""


def _svg(geoms: List[BaseGeometry]) -> str:
    """SVG em mm com o desenho usado na geração (Y para baixo, padrão SVG)."""
    todos = [p for g in geoms for p in f2d.partes(g)]
    if not todos:
        return ""
    x0 = min(p.bounds[0] for p in todos); y0 = min(p.bounds[1] for p in todos)
    x1 = max(p.bounds[2] for p in todos); y1 = max(p.bounds[3] for p in todos)
    d = []
    for p in todos:
        for ring in [p.exterior, *p.interiors]:
            pts = [f"{x - x0:.3f},{y1 - y:.3f}" for x, y in ring.coords[:-1]]
            d.append("M" + " L".join(pts) + " Z")
    w, h = x1 - x0, y1 - y0
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.3f}mm" height="{h:.3f}mm" '
            f'viewBox="0 0 {w:.3f} {h:.3f}"><path fill-rule="evenodd" d="{" ".join(d)}"/></svg>')


def gerar(pasta: Path, contornos: List[Dict], papeis: Dict[int, str], tipo: Tipo,
          perfil: PerfilFabricacao, largura_mm: float, altura_mm: float = None,
          manter_proporcao: bool = True) -> Dict:
    polys = {c["id"]: f2d.poligono_de_pontos(c["pontos"]) for c in contornos}
    sel = lambda papel: [polys[i] for i, pp in papeis.items() if pp == papel and i in polys and not polys[i].is_empty]
    externos, detalhes = sel("externo"), sel("detalhe")
    avisos: List[str] = []
    pecas: Dict[str, List] = {"cortador": [], "carimbo": []}  # listas de (Manifold, extensão_esperada)
    desenhos_svg: List[BaseGeometry] = []

    if tipo == "marcador":
        fontes = externos + detalhes
        if not fontes:
            raise ErroGeracao("Selecione pelo menos um contorno para o relevo do marcador.")
        rel = f2d.xor_par_impar(fontes)
        rel = f2d.ajustar_em_disco(_para_mm_livre(rel, largura_mm),
                                   perfil.marcador_diametro_mm, perfil.marcador_margem_mm)
        if perfil.espelhar_marcador:
            rel = f2d.espelhar_x(rel)
        base = c3d.disco(perfil.marcador_diametro_mm)
        avisos += f2d.avisos_geometria(rel, perfil.espessura_minima_linha_mm, perfil.distancia_minima_elementos_mm)
        pecas["carimbo"].append((c3d.construir_marcador(base, rel, perfil),
                                 [perfil.marcador_diametro_mm] * 2))
        desenhos_svg += [base, rel]
        desenho = base
    else:
        if not externos:
            raise ErroGeracao("Marque um contorno como 'externo': é ele que define o formato do cortador.")
        d_px = f2d.uniao_externa(externos)
        rel_px = f2d.xor_par_impar(detalhes) if detalhes else Polygon()
        desenho, (rel,), _ = f2d.normalizar_para_mm(d_px, [rel_px], largura_mm, altura_mm, manter_proporcao)
        if perfil.simplificacao_contorno_mm > 0:
            desenho = desenho.simplify(perfil.simplificacao_contorno_mm)
        rel = rel.intersection(desenho) if not rel.is_empty else rel
        if perfil.espelhar_carimbo and not rel.is_empty:
            rel = f2d.espelhar_x(rel)
        if not rel.is_empty:
            avisos += f2d.avisos_geometria(rel, perfil.espessura_minima_linha_mm, perfil.distancia_minima_elementos_mm)
        desenhos_svg += [desenho, rel]
        m = perfil.folga_topo_mm + perfil.espessura_parede_mm + perfil.largura_aba_mm \
            + (perfil.altura_total_mm - perfil.altura_aba_base_mm) * _tan(perfil)
        for parte in f2d.partes(desenho):
            if parte.area < 1.0:
                continue
            x0, y0, x1, y1 = parte.bounds
            if tipo in ("cortador", "conjunto"):
                pecas["cortador"].append((c3d.construir_cortador(parte, perfil),
                                          [x1 - x0 + 2 * m, y1 - y0 + 2 * m]))
            if tipo == "conjunto":
                r = rel.intersection(parte) if not rel.is_empty else rel
                pecas["carimbo"].append((c3d.construir_carimbo(parte, r, perfil), [x1 - x0, y1 - y0]))
        if not pecas["cortador"] and not pecas["carimbo"]:
            raise ErroGeracao("O contorno externo ficou pequeno demais depois da conversão para mm.")

    arquivos: List[Dict] = []

    def exportar(nome: str, ms: List, esperado=None, n_comp=None):
        if not ms:
            return
        cx = 0.0
        colocados = []
        for m_ in ms:
            x0, y0, x1, y1 = c3d.caixa_xy(m_)
            colocados.append(c3d.deslocar(m_, cx - x0, -(y0 + y1) / 2))
            cx += (x1 - x0) + perfil.separacao_pecas_mm
        total = c3d.uniao(colocados)
        arq = pasta / nome
        c3d.para_malha(total).export(str(arq), file_type="stl")  # STL binário
        arquivos.append({"nome": nome, "url_nome": nome,
                         "validacao": validar_stl(arq, esperado, n_comp, avisos if nome == "modelo.stl" else None)})

    cort = [m for m, _ in pecas["cortador"]]
    carim = [m for m, _ in pecas["carimbo"]]
    todos = cort + carim
    esp1 = None
    if len(todos) == 1:
        esp1 = (pecas["cortador"] or pecas["carimbo"])[0][1]
    exportar("modelo.stl", todos, esp1, len(todos))
    if tipo == "conjunto":
        exportar("cortador.stl", cort, (pecas["cortador"][0][1] if len(cort) == 1 else None), len(cort))
        exportar("carimbo.stl", carim, (pecas["carimbo"][0][1] if len(carim) == 1 else None), len(carim))

    (pasta / "vetor.svg").write_text(_svg(desenhos_svg), encoding="utf-8")
    status = max((a["validacao"]["status"] for a in arquivos), key=lambda s: ORDEM_STATUS[s])
    resumo = {"tipo": tipo, "status": status, "avisos": avisos, "arquivos": arquivos}
    if tipo != "marcador":
        x0, y0, x1, y1 = desenho.bounds
        resumo["desenho_mm"] = [round(x1 - x0, 2), round(y1 - y0, 2)]
    return resumo


def _tan(p: PerfilFabricacao) -> float:
    import math
    return math.tan(math.radians(p.inclinacao_parede_graus))


def _para_mm_livre(g: BaseGeometry, largura_mm: float) -> BaseGeometry:
    """Para marcadores: converte px -> mm só invertendo Y e centralizando (o encaixe no disco ajusta a escala)."""
    out, _, _ = f2d.normalizar_para_mm(g, [], max(largura_mm, 1.0))
    return out
