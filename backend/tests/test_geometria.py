import numpy as np
import trimesh
from shapely.geometry import Point, Polygon, box

from app.models.perfil import perfil_padrao
from app.services.geometry_2d import formas as f
from app.services.mesh_generation import construtor as c
from app.services.validation.validador import validar_stl


def test_normalizar_para_mm_escala_e_inverte_y():
    d = box(0, 0, 200, 100)
    out, _, (sx, sy) = f.normalizar_para_mm(d, [], 40.0)
    x0, y0, x1, y1 = out.bounds
    assert (x1 - x0) == np.float64(40.0) or abs((x1 - x0) - 40) < 1e-9
    assert abs((y1 - y0) - 20) < 1e-9          # proporção preservada
    assert abs(x0 + x1) < 1e-9 and abs(y0 + y1) < 1e-9   # centrado


def test_xor_gera_furo_da_letra_o():
    g = f.xor_par_impar([Point(0, 0).buffer(5), Point(0, 0).buffer(2)])
    assert len(f.partes(g)[0].interiors) == 1


def test_avisos_tracos_finos():
    fino = box(0, 0, 20, 0.3)
    assert f.avisos_geometria(fino, 0.8, 0.0)
    assert not f.avisos_geometria(box(0, 0, 20, 5), 0.8, 0.0)


def test_cortador_espessura_e_dimensoes(tmp_path):
    p = perfil_padrao()
    D = Point(0, 0).buffer(15, quad_segs=32)
    m = c.construir_cortador(D, p)
    arq = tmp_path / "c.stl"
    c.para_malha(m).export(str(arq))
    v = validar_stl(arq)
    assert v["status"] == "APROVADO", v
    tan = np.tan(np.radians(p.inclinacao_parede_graus))
    margem = p.folga_topo_mm + p.espessura_parede_mm + p.largura_aba_mm + (p.altura_total_mm - p.altura_aba_base_mm) * tan
    assert abs(v["extensao_mm"][0] - (30 + 2 * margem)) < 0.1
    assert abs(v["extensao_mm"][2] - p.altura_total_mm) < 1e-6
    # espessura da parede a meia altura = 0,8 mm
    t = trimesh.load(str(arq), force="mesh")
    s = t.section(plane_origin=[0, 0, 6], plane_normal=[0, 0, 1])
    loops = sorted([Polygon(e[:, :2]) for e in s.discrete], key=lambda q: -q.area)
    esp = (loops[0].area - loops[1].area) / ((loops[0].length + loops[1].length) / 2)
    assert abs(esp - p.espessura_parede_mm) < 0.03


def test_carimbo_base_e_relevo(tmp_path):
    p = perfil_padrao()
    D = box(-10, -10, 10, 10)
    rel = box(-3, -3, 3, 3)
    arq = tmp_path / "s.stl"
    c.para_malha(c.construir_carimbo(D, rel, p)).export(str(arq))
    v = validar_stl(arq)
    assert v["status"] == "APROVADO"
    assert abs(v["extensao_mm"][2] - (p.carimbo_altura_base_mm + p.carimbo_altura_relevo_mm)) < 1e-6
    assert abs(v["volume_mm3"] - (400 * 1.5 + 36 * 3.0)) < 1.0


def test_validador_bloqueia_arquivo_vazio(tmp_path):
    arq = tmp_path / "vazio.stl"
    arq.write_bytes(b"")
    assert validar_stl(arq)["status"] == "BLOQUEADO"
