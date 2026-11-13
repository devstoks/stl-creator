#!/bin/bash
# Encerra o servidor local do Biscuit 3D Studio com segurança.
PORTA="${B3D_PORT:-8765}"
PIDS=$(lsof -nP -tiTCP:"${PORTA}" -sTCP:LISTEN 2>/dev/null)
if [ -z "$PIDS" ]; then echo "O Biscuit 3D Studio não está rodando."; else kill $PIDS && echo "Encerrado."; fi
sleep 1
