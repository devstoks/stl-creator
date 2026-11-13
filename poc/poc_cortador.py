"""Prova de conceito — Biscuit 3D Studio (Fase 0).

Gera um cortador (parede com inclinação + aba de base) e um carimbo a partir de
um contorno 2D, usando Shapely (2D) + manifold3d (sólidos) + trimesh (validação).

ATENÇÃO: os valores em PERFIL_MEDIDO foram MEDIDOS no Cortador.stl de referência
e ainda estão PENDENTES DE CONFIRMAÇÃO pela fábrica. Não são o padrão oficial.
"""
import json
import sys
from pathlib import Path

import numpy as np
import trimesh
from manifold3d import CrossSection, JoinType, Manifold, OpType
from shapely.geometry import Polygon
from shapely.geometry.polygon import orient

PERFIL_MEDIDO = {
    "_aviso": "Valores medidos em Cortador.stl (carrinho/body). Pendentes de confirmação.",
    "altura_total_mm": 10.0,          # medido: Z máx = 10.0
    "altura_aba_base_mm": 1.5,        # medido: aba/base ocupa Z 0..1.5
    "espessura_parede_mm": 0.8,       # medido: ~0.80 constante em Z 1.5..10
    "inclinacao_parede_graus": 5.0,   # medido: ~0.43 mm de recuo em 4.9 mm de altura
    "largura_aba_mm": 2.0,            # medido: aba ~2.0 mm além da parede externa
    "carimbo_altura_base_mm": 1.5,    # medido: Z 0..1.5
    "carimbo_altura_relevo_mm": 3.0,  # medido: Z 1.5..4.5
    "folga_carimbo_parede_mm": 0.9,   # medido: ~0.86-0.90 (média) carimbo -> parede interna
    "passo_camada_mm": 0.25,           # discretização da inclinação (aproximação)
}


def _poly_para_cs(poly: Polygon) -> CrossSection:
    poly = orient(poly, 1.0)  # exterior anti-horário, furos horários
    rings = [np.asarray(poly.exterior.coords)[:-1]]
    rings += [np.asarray(i.coords)[:-1] for i in poly.interiors]
    return CrossSection(rings)


def _offset(cs: CrossSection, d: float) -> CrossSection:
    return cs.offset(d, join_type=JoinType.Round, miter_limit=2.0, circular_segments=16)


def gerar_cortador(contorno: Polygon, p: dict) -> Manifold:
    """contorno = forma do desenho; a parede fica ao redor dele (folga + parede)."""
    base = _poly_para_cs(contorno)
    h, hb = p["altura_total_mm"], p["altura_aba_base_mm"]
    t, w = p["espessura_parede_mm"], p["largura_aba_mm"]
    folga = p["folga_carimbo_parede_mm"]
    tan_d = np.tan(np.radians(p["inclinacao_parede_graus"]))
    passo = p["passo_camada_mm"]

    interno0 = _offset(base, folga)          # face interna da parede
    partes = []
    # aba de base: anel do interior da parede até w além da parede externa
    aba_ext = _offset(interno0, t + w)
    partes.append(Manifold.extrude(aba_ext - interno0, hb))
    # parede inclinada, em camadas finas
    n = int(np.ceil((h - hb) / passo))
    for i in range(n):
        z0 = hb + i * passo
        z1 = min(h, z0 + passo)
        recuo = -(((z0 + z1) / 2) - hb) * tan_d     # recua para dentro com a altura
        ext = _offset(interno0, t + recuo)
        inn = _offset(interno0, recuo)
        anel = ext - inn
        # sobreposição de 0.01 mm entre camadas evita faces coplanares na união
        zi = z0 - 0.01 if i > 0 else z0 - 0.01
        partes.append(Manifold.extrude(anel, z1 - zi).translate([0, 0, zi]))
    return Manifold.batch_boolean(partes, OpType.Add)  # união


def gerar_carimbo_base(contorno: Polygon, p: dict) -> Manifold:
    return Manifold.extrude(_poly_para_cs(contorno), p["carimbo_altura_base_mm"])


def para_trimesh(m: Manifold) -> trimesh.Trimesh:
    mm = m.to_mesh()
    return trimesh.Trimesh(mm.vert_properties[:, :3], mm.tri_verts, process=True)


def validar(stl: Path) -> dict:
    t = trimesh.load(stl, force="mesh")
    finito = bool(np.isfinite(t.vertices).all())
    deg = int((t.area_faces < 1e-10).sum())
    comps = len(t.split(only_watertight=False))
    r = {
        "arquivo": stl.name, "tamanho_bytes": stl.stat().st_size,
        "faces": int(len(t.faces)), "extensao_mm": t.extents.round(3).tolist(),
        "coordenadas_finitas": finito, "faces_degeneradas": deg,
        "watertight": bool(t.is_watertight), "orientacao_consistente": bool(t.is_winding_consistent),
        "volume_mm3": round(float(t.volume), 2), "componentes": comps,
    }
    r["status"] = "APROVADO" if (finito and deg == 0 and r["watertight"] and t.volume > 0) else "ATENCAO"
    return r


def main(ref_dir: Path, saida: Path):
    saida.mkdir(parents=True, exist_ok=True)
    ref = trimesh.load(ref_dir / "Cortador.stl", force="mesh")
    comps = sorted(ref.split(only_watertight=False), key=lambda c: (round(c.bounds[0][0] / 15), c.bounds[0][1]))
    # contorno de entrada = base do carimbo do carrinho (comp. 0), centrado na origem
    s = comps[0].section(plane_origin=[0, 0, 0.5], plane_normal=[0, 0, 1])
    poly = Polygon(max(s.discrete, key=len)[:, :2]).buffer(0)
    poly = Polygon(poly.exterior).simplify(0.02)
    c = poly.centroid
    from shapely import affinity
    poly = affinity.translate(poly, -c.x, -c.y)

    p = {k: v for k, v in PERFIL_MEDIDO.items() if not k.startswith("_")}
    cortador = gerar_cortador(poly, p)
    carimbo = gerar_carimbo_base(poly, p)
    (saida / "perfil_medido.json").write_text(json.dumps(PERFIL_MEDIDO, indent=2, ensure_ascii=False))
    out = {}
    for nome, man in [("poc_cortador", cortador), ("poc_carimbo_base", carimbo)]:
        arq = saida / f"{nome}.stl"
        para_trimesh(man).export(arq)                       # STL binário
        out[nome] = validar(arq)                            # reabre o arquivo e valida

    # comparação com o cortador carrinho de referência (comp. 1)
    r = comps[1]
    g = trimesh.load(saida / "poc_cortador.stl", force="mesh")
    out["comparacao_com_referencia_carrinho"] = {
        "extensao_ref_mm": r.extents.round(2).tolist(), "extensao_poc_mm": g.extents.round(2).tolist(),
        "volume_ref_mm3": round(float(r.volume), 1), "volume_poc_mm3": round(float(g.volume), 1),
        "diferenca_volume_pct": round(100 * (g.volume - r.volume) / r.volume, 1),
    }
    (saida / "validacao_poc.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
