"""Teste de fumaça do EXECUTÁVEL empacotado: inicia, importa uma imagem, gera um STL e confere o arquivo.

Uso: python scripts/smoke_test.py caminho/para/Biscuit3DStudio[.exe]
Funciona em Windows, macOS e Linux (só usa a biblioteca padrão + Pillow).
"""
import io
import json
import os
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request
import uuid

from PIL import Image, ImageDraw

PORTA = 8791
BASE = f"http://127.0.0.1:{PORTA}"


def req(url, dados=None, metodo=None, cabecalhos=None):
    r = urllib.request.Request(url, data=dados, method=metodo, headers=cabecalhos or {})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return resp.read()


def main(exe: str) -> None:
    pasta = tempfile.mkdtemp(prefix="b3d-smoke-")
    env = {**os.environ, "B3D_DATA_DIR": pasta, "B3D_PORT": str(PORTA), "BROWSER": "true"}
    proc = subprocess.Popen([exe], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for _ in range(120):
            try:
                if json.loads(req(BASE + "/api/health")).get("ok"):
                    break
            except Exception:
                if proc.poll() is not None:
                    raise SystemExit("O executável fechou sozinho:\n" + (proc.stdout.read() or ""))
                time.sleep(0.5)
        else:
            raise SystemExit("O servidor não respondeu a tempo.")
        print("saude OK")
        assert b"<div id=\"root\">" in req(BASE + "/"), "interface (frontend) não foi servida"
        print("interface OK")

        # PNG de teste: coração simples preto sobre branco
        im = Image.new("RGB", (400, 400), "white")
        d = ImageDraw.Draw(im)
        d.ellipse((60, 60, 220, 220), fill="black"); d.ellipse((180, 60, 340, 220), fill="black")
        d.polygon([(70, 180), (330, 180), (200, 340)], fill="black")
        buf = io.BytesIO(); im.save(buf, "PNG")
        lim = uuid.uuid4().hex
        corpo = (f"--{lim}\r\nContent-Disposition: form-data; name=\"arquivo\"; filename=\"coracao.png\"\r\n"
                 f"Content-Type: image/png\r\n\r\n").encode() + buf.getvalue() + f"\r\n--{lim}--\r\n".encode()
        imp = json.loads(req(BASE + "/api/import", corpo, "POST", {"Content-Type": f"multipart/form-data; boundary={lim}"}))
        pid = imp["projeto_id"]
        papeis = {int(k): v for k, v in imp["papeis"].items()}
        assert "externo" in papeis.values(), "nenhum contorno externo sugerido"
        perfil = json.loads(req(BASE + "/api/profiles/padrao-medido"))
        corpo = json.dumps({"tipo": "conjunto", "papeis": papeis, "perfil": perfil, "largura_mm": 30}).encode()
        r = json.loads(req(f"{BASE}/api/projects/{pid}/generate", corpo, "POST", {"Content-Type": "application/json"}))
        assert r["status"] != "BLOQUEADO", r
        stl = req(f"{BASE}/api/projects/{pid}/files/modelo.stl")
        n = struct.unpack("<I", stl[80:84])[0]
        assert len(stl) == 84 + 50 * n and n > 100, "STL binário inválido"
        print(f"STL OK ({n} faces, status {r['status']})")
        print("TESTE DE FUMACA: APROVADO")
    finally:
        proc.terminate()
        try:
            proc.wait(10)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main(sys.argv[1])
