"""Construção dos sólidos 3D (manifold3d) a partir de geometrias 2D em mm e de um PerfilFabricacao.

Modelo do cortador (derivado das medições dos STL de referência):
  desenho D  = contorno da peça (o mesmo contorno da base do carimbo)
  parede interna em altura z : D + folga_topo + (H - z)*tan(inclinação)   (abre para baixo)
  parede externa             : interna + espessura                         (z >= altura_aba)
  aba (0..altura_aba)        : anel da parede interna até externa(altura_aba) + largura_aba
A inclinação é construída em camadas finas; o degrau horizontal de cada camada fica abaixo de
`tolerancia_inclinacao_mm` (padrão 0,02 mm), invisível numa impressão 3D.
"""
import math
from typing import List

import numpy as np
from manifold3d import CrossSection, JoinType, Manifold, OpType
from shapely.geometry import Polygon
from shapely.geometry.base import BaseGeometry
from shapely.geometry.polygon import orient

from ...models.perfil import PerfilFabricacao
from ..geometry_2d.formas import partes

SOBREPOSICAO_MM = 0.01  # evita faces coplanares ao unir camadas
SEGMENTOS_ARCO = 16


def _cs(g: BaseGeometry) -> CrossSection:
    an = []
    for p in partes(g):
        p = orient(p, 1.0)
        an.append(np.asarray(p.exterior.coords)[:-1])
        an += [np.asarray(i.coords)[:-1] for i in p.interiors]
    return CrossSection(an)


def _offset(cs: CrossSection, d: float) -> CrossSection:
    if abs(d) < 1e-9:
        return cs
    # simplify(0.002) elimina pontos quase repetidos (< 2 µm) que viram faces degeneradas no STL float32
    return cs.offset(d, JoinType.Round, 2.0, SEGMENTOS_ARCO).simplify(0.002)


def _extrudar(cs: CrossSection, z0: float, z1: float) -> Manifold:
    return Manifold.extrude(cs, z1 - z0).translate([0.0, 0.0, z0])


def construir_cortador(desenho: BaseGeometry, p: PerfilFabricacao) -> Manifold:
    """Um cortador por contorno (aceita MultiPolygon)."""
    H, hb = p.altura_total_mm, min(p.altura_aba_base_mm, p.altura_total_mm - 0.5)
    t = p.espessura_parede_mm
    tan_a = math.tan(math.radians(p.inclinacao_parede_graus))
    base = _cs(desenho)

    def interno(z: float) -> CrossSection:
        return _offset(base, p.folga_topo_mm + (H - z) * tan_a)

    # nº de camadas por trecho, para que o degrau horizontal fique <= tolerância
    def n_camadas(altura: float) -> int:
        if tan_a < 1e-6:
            return 1
        dz = p.tolerancia_inclinacao_mm / tan_a
        return max(1, int(math.ceil(altura / dz)))

    fatias: List[Manifold] = []
    ext_aba = _offset(interno(hb), t + p.largura_aba_mm)

    # aba: parede interna continua descendo; borda externa constante
    n = n_camadas(hb) if hb > 0 else 0
    for i in range(n):
        z0, z1 = hb * i / n, hb * (i + 1) / n
        anel = ext_aba - interno((z0 + z1) / 2)
        fatias.append(_extrudar(anel, z0 - (SOBREPOSICAO_MM if i else 0), z1))

    # parede inclinada
    n = n_camadas(H - hb)
    for i in range(n):
        z0, z1 = hb + (H - hb) * i / n, hb + (H - hb) * (i + 1) / n
        zc = (z0 + z1) / 2
        ri = interno(zc)
        anel = _offset(ri, t) - ri
        fatias.append(_extrudar(anel, z0 - SOBREPOSICAO_MM, z1))

    return Manifold.batch_boolean(fatias, OpType.Add).simplify(0.005)


def construir_carimbo(desenho: BaseGeometry, relevo: BaseGeometry, p: PerfilFabricacao) -> Manifold:
    """Placa-base com o contorno do desenho + relevo extrudado por cima."""
    partes_3d = [_extrudar(_cs(desenho), 0.0, p.carimbo_altura_base_mm)]
    if relevo is not None and not relevo.is_empty:
        z0 = p.carimbo_altura_base_mm
        partes_3d.append(_extrudar(_cs(relevo), z0 - SOBREPOSICAO_MM, z0 + p.carimbo_altura_relevo_mm))
    return Manifold.batch_boolean(partes_3d, OpType.Add)


def construir_marcador(desenho_disco: BaseGeometry, relevo: BaseGeometry, p: PerfilFabricacao) -> Manifold:
    return construir_carimbo(desenho_disco, relevo, p)


def disco(diametro: float) -> Polygon:
    from shapely.geometry import Point
    return Point(0, 0).buffer(diametro / 2, quad_segs=48)


def deslocar(m: Manifold, dx: float, dy: float = 0.0) -> Manifold:
    return m.translate([dx, dy, 0.0])


def uniao(partes_m: List[Manifold]) -> Manifold:
    return Manifold.batch_boolean(partes_m, OpType.Add)


def para_malha(m: Manifold):
    """Manifold -> trimesh, removendo fragmentos sem volume que a simplificação pode deixar
    e que fariam o STL parecer 'aberto' para o fatiador."""
    import trimesh
    partes_m = [p for p in m.decompose() if p.volume() > 1e-3]
    mm = (Manifold.batch_boolean(partes_m, OpType.Add) if len(partes_m) > 1 else (partes_m[0] if partes_m else m)).to_mesh()
    t = trimesh.Trimesh(mm.vert_properties[:, :3], mm.tri_verts, process=True)
    # NÃO remova faces de área ~0: elas costuram a malha (junções em T) e removê-las abre buracos.
    return t


def caixa_xy(m: Manifold):
    b = m.bounding_box()  # (xmin, ymin, zmin, xmax, ymax, zmax)
    return b[0], b[1], b[3], b[4]
