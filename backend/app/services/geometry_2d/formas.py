"""Operações 2D (Shapely) sobre os contornos: montagem, escala em mm e verificações."""
from typing import Dict, List, Sequence, Tuple

import numpy as np
from shapely import affinity
from shapely.geometry import MultiPolygon, Polygon
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union


def poligono_de_pontos(pontos: Sequence[Sequence[float]]) -> Polygon:
    p = Polygon(pontos)
    if not p.is_valid:
        p = p.buffer(0)
    return p


def partes(g: BaseGeometry) -> List[Polygon]:
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [p for p in getattr(g, "geoms", []) if isinstance(p, Polygon)]


def preencher(g: BaseGeometry) -> BaseGeometry:
    """Remove furos (usa só o contorno externo de cada parte)."""
    return unary_union([Polygon(p.exterior) for p in partes(g)])


def uniao_externa(polys: Sequence[Polygon]) -> BaseGeometry:
    return preencher(unary_union([p for p in polys if not p.is_empty]))


def xor_par_impar(polys: Sequence[Polygon]) -> BaseGeometry:
    """Regra par-ímpar: contorno dentro de contorno vira furo (ex.: letra O)."""
    g: BaseGeometry = Polygon()
    for p in polys:
        g = g.symmetric_difference(p)
    return g


def normalizar_para_mm(
    desenho: BaseGeometry,
    outros: Sequence[BaseGeometry],
    largura_mm: float,
    altura_mm: float = None,
    manter_proporcao: bool = True,
) -> Tuple[BaseGeometry, List[BaseGeometry], Tuple[float, float]]:
    """Converte coordenadas de imagem (y para baixo, pixels) em mm (y para cima),
    centralizando o desenho na origem. Retorna (desenho, outros, (escala_x, escala_y))."""
    x0, y0, x1, y1 = desenho.bounds
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0:
        raise ValueError("O desenho selecionado tem largura ou altura zero.")
    sx = largura_mm / w
    sy = sx if (manter_proporcao or not altura_mm) else altura_mm / h
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2

    def conv(g: BaseGeometry) -> BaseGeometry:
        g = affinity.translate(g, -cx, -cy)
        g = affinity.scale(g, sx, -sy, origin=(0, 0))  # inverte Y: imagem -> mm
        return g

    return conv(desenho), [conv(o) for o in outros], (sx, sy)


def espelhar_x(g: BaseGeometry) -> BaseGeometry:
    cx = (g.bounds[0] + g.bounds[2]) / 2
    return affinity.scale(g, -1, 1, origin=(cx, 0))


def ajustar_em_disco(g: BaseGeometry, diametro: float, margem: float) -> BaseGeometry:
    """Centraliza e reduz/amplia g para caber dentro de um disco (mantendo proporção)."""
    if g.is_empty:
        return g
    x0, y0, x1, y1 = g.bounds
    g = affinity.translate(g, -(x0 + x1) / 2, -(y0 + y1) / 2)
    raio_util = max(diametro / 2 - margem, 0.1)
    maior = max(np.hypot(x, y) for p in partes(g) for x, y in p.exterior.coords)
    k = raio_util / maior if maior > 0 else 1
    return affinity.scale(g, k, k, origin=(0, 0))


def avisos_geometria(g: BaseGeometry, esp_min: float, dist_min: float) -> List[str]:
    """Verificações 2D do relevo. Só avisam; a decisão final é do usuário."""
    avisos: List[str] = []
    if g.is_empty:
        return avisos
    area = g.area
    if esp_min > 0:
        aberto = g.buffer(-esp_min / 2, join_style=1).buffer(esp_min / 2, join_style=1)
        perda = 1 - aberto.area / area if area > 0 else 0
        if perda > 0.03:
            avisos.append(
                f"Há traços mais finos que {esp_min:.2f} mm (≈{perda*100:.0f}% da área do relevo). "
                "Eles podem quebrar ou não sair na impressão. Aumente a escala do desenho ou ajuste o relevo."
            )
    if dist_min > 0:
        fechado = g.buffer(dist_min / 2, join_style=1).buffer(-dist_min / 2, join_style=1)
        ganho = fechado.area / area - 1 if area > 0 else 0
        if ganho > 0.03:
            avisos.append(
                f"Há elementos mais próximos que {dist_min:.2f} mm entre si; podem grudar na impressão. "
                "Confira se isso é aceitável para este desenho."
            )
    return avisos
