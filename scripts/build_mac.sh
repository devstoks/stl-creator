#!/bin/bash
# Gera o executavel para macOS NESTE Mac. Requer Python 3.10+ e Node.js 18+.
set -e
cd "$(dirname "$0")/.."
python3 -m venv .venv-build
./.venv-build/bin/pip install --upgrade pip
./.venv-build/bin/pip install -r backend/requirements.txt pyinstaller
(cd frontend && npm ci --no-audit --no-fund && npm run build)
./.venv-build/bin/python scripts/build_exe.py
echo; echo "Pronto: dist_exe/Biscuit3DStudio-macos.zip"
