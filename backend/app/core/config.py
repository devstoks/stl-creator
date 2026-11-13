"""Configuração local. Nada sai do computador: o servidor escuta só em 127.0.0.1."""
import os
import sys
from pathlib import Path

HOST = "127.0.0.1"
PORTA = int(os.environ.get("B3D_PORT", "8765"))
PASTA_DADOS = Path(os.environ.get("B3D_DATA_DIR", Path.home() / "Biscuit3D")).expanduser()
PASTA_PROJETOS = PASTA_DADOS / "projects"
PASTA_PERFIS = PASTA_DADOS / "profiles"
PASTA_EXPORTACOES = PASTA_DADOS / "exports"
PASTA_LOGS = PASTA_DADOS / "logs"
EMPACOTADO = getattr(sys, "frozen", False)  # True dentro do executável gerado pelo PyInstaller
if EMPACOTADO:
    PASTA_FRONTEND = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)) / "frontend_dist"
else:
    PASTA_FRONTEND = Path(__file__).resolve().parents[3] / "frontend" / "dist"
PASTA_PERFIS_PADRAO = Path(__file__).resolve().parents[1] / "profiles"

TAMANHO_MAX_UPLOAD = 25 * 1024 * 1024
EXTENSOES_IMAGEM = {".png", ".jpg", ".jpeg"}
EXTENSOES_SVG = {".svg"}
VERSAO_PROJETO = 1


def garantir_pastas() -> None:
    for p in (PASTA_PROJETOS, PASTA_PERFIS, PASTA_EXPORTACOES, PASTA_LOGS):
        p.mkdir(parents=True, exist_ok=True)
