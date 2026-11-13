"""Compara o motor com o Cortador.stl real da fábrica (carrinho de bebê)."""
import numpy as np
import pytest
import trimesh
from shapely.geometry import Polygon

from app.models.perfil import perfil_padrao
from app.services.mesh_generation import construtor as c
from conftest import RAIZ

REF = RAIZ / "examples" / "referencia" / "Cortador.stl"


@pytest.mark.skipif(not REF.exists(), reason="STL de referência ausente")
def test_reproduz_carrinho_da_referencia(tmp_path):
    ref = trimesh.load(str(REF), force="mesh")
    comps = sorted(ref.split(only_watertight=False), key=lambda m: (round(m.bounds[0][0] / 15), m.bounds[0][1]))
    base_carimbo, cortador_ref = comps[0], comps[1]
    s = base_carimbo.section(plane_origin=[0, 0, 0.5], plane_normal=[0, 0, 1])
    D = Polygon(Polygon(max(s.discrete, key=len)[:, :2]).buffer(0).exterior).simplify(0.03)
    from shapely import affinity
    D = affinity.translate(D, -D.centroid.x, -D.centroid.y)

    out = tmp_path / "carrinho.stl"
    c.para_malha(c.construir_cortador(D, perfil_padrao())).export(str(out))
    g = trimesh.load(str(out), force="mesh")

    assert np.allclose(g.extents, cortador_ref.extents, atol=0.3)
    assert abs(g.volume - cortador_ref.volume) / cortador_ref.volume < 0.03
