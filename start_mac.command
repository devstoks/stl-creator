#!/bin/bash
# Biscuit 3D Studio — inicia o servidor local e abre o navegador. Duplo clique para usar.
cd "$(dirname "$0")" || exit 1
PORTA="${B3D_PORT:-8765}"
URL="http://127.0.0.1:${PORTA}"

# Já está rodando? Só abre o navegador.
if lsof -nP -iTCP:"${PORTA}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Biscuit 3D Studio já está aberto. Abrindo o navegador..."
  open "${URL}"; exit 0
fi

PY=$(command -v python3.12 || command -v python3.11 || command -v python3.10 || command -v python3)
if [ -z "$PY" ]; then
  echo "Python 3 não encontrado. Instale em https://www.python.org/downloads/ (versão 3.10 ou mais nova) e tente de novo."
  read -r -p "Pressione Enter para fechar..."; exit 1
fi

# Primeira vez: cria o ambiente e instala as dependências (precisa de internet SÓ NESTA ETAPA)
if [ ! -d ".venv" ]; then
  echo "Primeira execução: instalando dependências (leva alguns minutos, precisa de internet)..."
  "$PY" -m venv .venv || { echo "Não consegui criar o ambiente Python."; read -r -p "Enter para fechar..."; exit 1; }
  ./.venv/bin/pip install --upgrade pip >/dev/null
  ./.venv/bin/pip install -r backend/requirements.txt || { echo "Falha ao instalar dependências. Veja docs/SOLUCAO_DE_PROBLEMAS.md"; rm -rf .venv; read -r -p "Enter para fechar..."; exit 1; }
fi

if [ ! -f "frontend/dist/index.html" ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "Montando a interface..."; (cd frontend && npm install --no-audit --no-fund && npm run build)
  else
    echo "A interface (frontend/dist) não foi encontrada e o Node.js não está instalado. Veja o README."; read -r -p "Enter para fechar..."; exit 1
  fi
fi

echo "Iniciando em ${URL}  (para encerrar: feche esta janela ou use stop_mac.command)"
( sleep 2; open "${URL}" ) &
cd backend && exec ../.venv/bin/python run_app.py
