"""Vetorização local: imagem raster (PNG/JPG) ou SVG -> lista de contornos editáveis.

Tudo roda no computador do usuário (OpenCV / svgelements). Os contornos ficam em coordenadas
da imagem original (pixels, Y para baixo) ou unidades do SVG, para a prévia sobrepor a imagem.
"""
import io
from typing import Dict, List, Literal, Optional, Tuple

import cv2
import numpy as np
from PIL import Image
from pydantic import BaseModel, Field
from shapely.geometry import Polygon

Modo = Literal["auto", "alfa", "saturacao", "limiar"]


class ParamsVetorizacao(BaseModel):
    modo: Modo = "auto"
    limiar: Optional[int] = Field(None, ge=0, le=255, description="Corte de claro/escuro (ou saturação).")
    inverter: bool = False
    suavizacao: float = Field(1.0, ge=0, le=10, description="Desfoque antes de cortar (px).")
    fechar_lacunas_px: int = Field(7, ge=0, le=60)
    remover_ruido_px: int = Field(2, ge=0, le=30)
    preencher_buracos: bool = False
    simplificacao_px: float = Field(1.2, ge=0, le=20)
    area_minima_px: int = Field(400, ge=1)
    recorte: Optional[Tuple[int, int, int, int]] = Field(None, description="x, y, largura, altura")


def _carregar(dados: bytes) -> Image.Image:
    im = Image.open(io.BytesIO(dados))
    im.load()
    return im.convert("RGBA")


def _mascara(rgba: np.ndarray, p: ParamsVetorizacao) -> Tuple[np.ndarray, str]:
    alfa = rgba[..., 3]
    rgb = rgba[..., :3]
    modo = p.modo
    if modo == "auto":
        if (alfa < 250).mean() > 0.01:
            modo = "alfa"
        else:
            hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
            sat = hsv[..., 1]
            cinza_claro = ((sat < 25) & (hsv[..., 2] > 170)).mean()
            colorido = (sat > 40).mean()
            # clipart colorido sobre fundo cinza/xadrez/branco -> separa por saturação
            modo = "saturacao" if (cinza_claro > 0.25 and 0.03 < colorido < 0.75) else "limiar"
    if modo == "alfa":
        lim = p.limiar if p.limiar is not None else 128
        m = alfa > lim
    elif modo == "saturacao":
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        lim = p.limiar if p.limiar is not None else 40
        m = hsv[..., 1] > lim
    else:
        cinza = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        if p.suavizacao > 0:
            cinza = cv2.GaussianBlur(cinza, (0, 0), p.suavizacao)
        if p.limiar is None:
            lim, _ = cv2.threshold(cinza, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        else:
            lim = p.limiar
        m = cinza < lim  # tinta escura sobre fundo claro
    if p.inverter:
        m = ~m
    return m.astype(np.uint8) * 255, modo


def vetorizar_raster(dados: bytes, p: ParamsVetorizacao) -> Dict:
    im = _carregar(dados)
    rgba = np.array(im)
    H, W = rgba.shape[:2]
    ox = oy = 0
    if p.recorte:
        x, y, w, h = p.recorte
        x, y = max(0, x), max(0, y)
        w, h = min(w, W - x), min(h, H - y)
        if w < 5 or h < 5:
            raise ValueError("A área de recorte é pequena demais.")
        rgba = rgba[y:y + h, x:x + w]
        ox, oy = x, y

    if p.modo != "limiar" and p.suavizacao > 0:
        rgba = rgba.copy()
        rgba[..., :3] = cv2.GaussianBlur(rgba[..., :3], (0, 0), p.suavizacao)
    mascara, modo_usado = _mascara(rgba, p)

    if p.fechar_lacunas_px > 0:
        k = np.ones((p.fechar_lacunas_px, p.fechar_lacunas_px), np.uint8)
        mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, k)
    if p.remover_ruido_px > 0:
        k = np.ones((p.remover_ruido_px, p.remover_ruido_px), np.uint8)
        mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, k)
    if p.preencher_buracos:
        cs, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        mascara = np.zeros_like(mascara)
        cv2.drawContours(mascara, cs, -1, 255, thickness=cv2.FILLED)

    cs, hier = cv2.findContours(mascara, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
    brutos = []
    for i, c in enumerate(cs):
        area = cv2.contourArea(c)
        if area < p.area_minima_px or len(c) < 3:
            continue
        if p.simplificacao_px > 0:
            c = cv2.approxPolyDP(c, p.simplificacao_px, True)
        pts = c[:, 0, :].astype(float) + [ox, oy]
        if len(pts) >= 3:
            brutos.append((i, area, pts))
    contornos = _montar(brutos, hier[0] if hier is not None else None)
    return {"largura": W, "altura": H, "modo_usado": modo_usado, "contornos": contornos}


def _montar(brutos, hier) -> List[Dict]:
    """Ordena por área, reatribui ids e liga cada contorno ao pai mantido mais próximo."""
    brutos.sort(key=lambda t: -t[1])
    novo_id = {idx: n for n, (idx, _, _) in enumerate(brutos)}
    out = []
    for n, (idx, area, pts) in enumerate(brutos):
        pai = None
        if hier is not None:
            q = hier[idx][3]
            while q != -1 and q not in novo_id:
                q = hier[q][3]
            pai = novo_id.get(q) if q != -1 else None
        x0, y0 = pts.min(axis=0)
        x1, y1 = pts.max(axis=0)
        out.append({
            "id": n, "pontos": np.round(pts, 2).tolist(), "area": round(float(area), 1),
            "bbox": [round(float(x0), 1), round(float(y0), 1), round(float(x1 - x0), 1), round(float(y1 - y0), 1)],
            "pai": pai,
        })
    return out


def vetorizar_svg(dados: bytes, area_minima: float = 4.0) -> Dict:
    """Interpreta um SVG existente (sem vetorizar de novo): cada subcaminho fechado vira um contorno."""
    from svgelements import SVG, Path, Shape

    svg = SVG.parse(io.BytesIO(dados), reify=True)
    W = float(svg.width or 0) or None
    H = float(svg.height or 0) or None
    brutos = []
    for el in svg.elements():
        if not isinstance(el, Shape):
            continue
        try:
            caminho = Path(el)
            caminho.reify()
            subs = list(caminho.as_subpaths())
        except Exception:
            continue
        for sub in subs:
            sp = Path(sub)
            comp = sp.length(error=1e-3) if len(sp) else 0
            if comp <= 0:
                continue
            n = int(max(24, min(2000, comp / 0.4)))
            pts = np.array([(sp.point(t).x, sp.point(t).y) for t in np.linspace(0, 1, n, endpoint=False)])
            if len(pts) < 3 or not np.isfinite(pts).all():
                continue
            poly = Polygon(pts)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty or poly.area < area_minima:
                continue
            brutos.append([poly.area, pts])
    if not brutos:
        raise ValueError("Não encontrei caminhos fechados no SVG.")
    brutos.sort(key=lambda t: -t[0])
    polys = [Polygon(b[1]).buffer(0) for b in brutos]
    out = []
    for n, (area, pts) in enumerate(brutos):
        pai = None
        for m in range(n - 1, -1, -1):  # menor área maior que n que contém n
            if polys[m].area > area and polys[m].contains(polys[n].representative_point()):
                pai = m
                break
        x0, y0 = pts.min(axis=0)
        x1, y1 = pts.max(axis=0)
        out.append({"id": n, "pontos": np.round(pts, 3).tolist(), "area": round(float(area), 2),
                    "bbox": [round(float(x0), 2), round(float(y0), 2), round(float(x1 - x0), 2), round(float(y1 - y0), 2)],
                    "pai": pai})
    todos = np.vstack([b[1] for b in brutos])
    W = W or float(todos[:, 0].max())
    H = H or float(todos[:, 1].max())
    return {"largura": W, "altura": H, "modo_usado": "svg", "contornos": out}


def papeis_padrao(contornos: List[Dict]) -> Dict[int, str]:
    """Sugestão inicial: maior contorno sem pai = externo; o resto fica ignorado até o usuário escolher."""
    papeis = {c["id"]: "ignorar" for c in contornos}
    raizes = [c for c in contornos if c["pai"] is None]
    if raizes:
        papeis[max(raizes, key=lambda c: c["area"])["id"]] = "externo"
    return papeis
