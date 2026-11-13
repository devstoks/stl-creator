from app.services.vectorization import contornos as v
from conftest import RAIZ, png_bytes


def test_raster_forma_com_furo():
    def desenhar(cv2, img):
        cv2.circle(img, (200, 200), 120, (0, 0, 0), -1)
        cv2.circle(img, (200, 200), 50, (255, 255, 255), -1)
    r = v.vetorizar_raster(png_bytes(desenhar), v.ParamsVetorizacao())
    assert len(r["contornos"]) == 2
    externo, furo = r["contornos"]
    assert externo["pai"] is None and furo["pai"] == externo["id"]
    assert v.papeis_padrao(r["contornos"])[externo["id"]] == "externo"


def test_raster_remove_manchas_pequenas():
    def desenhar(cv2, img):
        cv2.rectangle(img, (100, 100), (300, 300), (0, 0, 0), -1)
        cv2.circle(img, (30, 30), 4, (0, 0, 0), -1)
    r = v.vetorizar_raster(png_bytes(desenhar), v.ParamsVetorizacao(area_minima_px=400))
    assert len(r["contornos"]) == 1


def test_clipart_com_fundo_xadrez_embutido():
    """A folha do bebê tem o xadrez desenhado nos pixels (sem transparência real)."""
    arq = RAIZ / "examples" / "folha-bebe-original.png"
    r = v.vetorizar_raster(arq.read_bytes(), v.ParamsVetorizacao())
    assert r["modo_usado"] == "saturacao"
    assert len([c for c in r["contornos"] if c["pai"] is None]) >= 6


def test_svg_importado_sem_revetorizar():
    svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><path d="M10 10 H90 V90 H10 Z M30 30 H70 V70 H30 Z" fill="black"/></svg>'
    r = v.vetorizar_svg(svg)
    assert r["modo_usado"] == "svg" and len(r["contornos"]) == 2
    assert r["contornos"][1]["pai"] == 0
