"""Fluxo completo: importar -> escolher contornos -> gerar -> validar -> exportar -> reabrir."""
import trimesh
from conftest import RAIZ, png_bytes


def _importar(client, dados, nome="forma.png"):
    r = client.post("/api/import", files={"arquivo": (nome, dados, "image/png")})
    assert r.status_code == 200, r.text
    return r.json()


def _coracao(cv2, img):
    cv2.circle(img, (150, 150), 70, (0, 0, 0), -1)
    cv2.circle(img, (250, 150), 70, (0, 0, 0), -1)
    import numpy as np
    cv2.fillPoly(img, [np.array([[85, 190], [315, 190], [200, 330]])], (0, 0, 0))
    cv2.circle(img, (200, 170), 22, (255, 255, 255), -1)   # detalhe interno (vazado)


def test_saude_e_perfis(client):
    assert client.get("/api/health").json()["ok"]
    j = client.get("/api/profiles").json()
    assert any(p["id"] == "padrao-medido" for p in j["perfis"]) and j["parametros"]
    assert client.delete("/api/profiles/padrao-medido").status_code == 403


def test_fluxo_cortador_conjunto_e_exportacao(client, tmp_path):
    d = _importar(client, png_bytes(_coracao))
    pid = d["projeto_id"]
    papeis = {int(k): v for k, v in d["papeis"].items()}
    ext = [k for k, v in papeis.items() if v == "externo"]
    assert len(ext) == 1
    perfil = client.get("/api/profiles/padrao-medido").json()

    corpo = {"tipo": "cortador", "papeis": papeis, "perfil": perfil, "largura_mm": 40}
    r = client.post(f"/api/projects/{pid}/generate", json=corpo)
    assert r.status_code == 200, r.text
    res = r.json()
    assert res["status"] == "APROVADO", res
    stl = client.get(f"/api/projects/{pid}/files/modelo.stl")
    assert stl.status_code == 200
    (tmp_path / "m.stl").write_bytes(stl.content)
    m = trimesh.load(str(tmp_path / "m.stl"), force="mesh")        # reaberto
    assert m.is_watertight and m.volume > 0 and abs(m.extents[2] - 10.0) < 1e-6

    # conjunto: cortador + carimbo (o círculo vazado vira detalhe)
    detalhes = {k: ("detalhe" if v == "ignorar" else v) for k, v in papeis.items()}
    r = client.post(f"/api/projects/{pid}/generate", json={**corpo, "tipo": "conjunto", "papeis": detalhes})
    assert r.status_code == 200, r.text
    nomes = {a["nome"] for a in r.json()["arquivos"]}
    assert nomes == {"modelo.stl", "cortador.stl", "carimbo.stl"}

    # exportação nunca sobrescreve
    e1 = client.post(f"/api/projects/{pid}/export", json={"pasta_destino": str(tmp_path / "saida")}).json()
    e2 = client.post(f"/api/projects/{pid}/export", json={"pasta_destino": str(tmp_path / "saida")}).json()
    assert e1["pasta"] != e2["pasta"] and "modelo.stl" in e1["arquivos"] and "vetor.svg" in e1["arquivos"]

    # reabrir o projeto mantém as configurações
    p = client.get(f"/api/projects/{pid}").json()
    assert p["projeto"]["requisicao"]["largura_mm"] == 40


def test_marcador_com_letras(client):
    def letras(cv2, img):
        cv2.putText(img, "O", (60, 300), cv2.FONT_HERSHEY_DUPLEX, 10, (0, 0, 0), 14)
    d = _importar(client, png_bytes(letras))
    papeis = {int(k): "detalhe" for k in d["papeis"]}
    perfil = client.get("/api/profiles/padrao-medido").json()
    r = client.post(f"/api/projects/{d['projeto_id']}/generate",
                    json={"tipo": "marcador", "papeis": papeis, "perfil": perfil, "largura_mm": 15})
    assert r.status_code == 200, r.text
    ex = r.json()["arquivos"][0]["validacao"]["extensao_mm"]
    assert abs(ex[0] - 15) < 0.2 and abs(ex[2] - 4.5) < 1e-6


def test_erros_claros(client):
    assert client.post("/api/import", files={"arquivo": ("x.exe", b"abc", "application/octet-stream")}).status_code == 400
    d = _importar(client, png_bytes(_coracao))
    perfil = client.get("/api/profiles/padrao-medido").json()
    papeis = {int(k): "ignorar" for k in d["papeis"]}
    r = client.post(f"/api/projects/{d['projeto_id']}/generate",
                    json={"tipo": "cortador", "papeis": papeis, "perfil": perfil, "largura_mm": 30})
    assert r.status_code == 400 and "externo" in r.json()["detail"]
    assert client.get("/api/projects/../etc/passwd").status_code in (400, 404, 422)


def test_folha_do_bebe_pdf_nao_aplica_e_png_real_gera_stl(client):
    """PNG real da fábrica: escolhe a chupeta e gera o cortador."""
    d = _importar(client, (RAIZ / "examples" / "folha-bebe-original.png").read_bytes(), "folha.png")
    cs = d["contornos"]
    chupeta = [c for c in cs if c["pai"] is None and 340 < c["bbox"][0] < 370 and c["bbox"][1] < 100][0]
    papeis = {c["id"]: "ignorar" for c in cs}
    papeis[chupeta["id"]] = "externo"
    perfil = client.get("/api/profiles/padrao-medido").json()
    r = client.post(f"/api/projects/{d['projeto_id']}/generate",
                    json={"tipo": "cortador", "papeis": papeis, "perfil": perfil, "largura_mm": 27.5})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "APROVADO"
