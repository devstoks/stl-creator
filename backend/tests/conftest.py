import os, sys, tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="b3d-test-")
os.environ["B3D_DATA_DIR"] = _tmp
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pytest
from fastapi.testclient import TestClient

RAIZ = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def client():
    from app.main import app
    return TestClient(app)


def png_bytes(desenhar):
    """Cria PNG de teste (255 = branco) usando OpenCV."""
    import cv2
    img = np.full((400, 400, 3), 255, np.uint8)
    desenhar(cv2, img)
    ok, buf = cv2.imencode(".png", img)
    return buf.tobytes()
