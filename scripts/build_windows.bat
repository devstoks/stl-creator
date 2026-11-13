@echo off
REM Gera o executavel Windows (.exe) NESTA maquina Windows. Requer Python 3.10+ e Node.js 18+.
REM Sem Windows? Use o GitHub Actions (.github/workflows/build.yml), que faz isso sozinho.
cd /d "%~dp0.."
python -m venv .venv-build || goto erro
.venv-build\Scripts\python -m pip install --upgrade pip || goto erro
.venv-build\Scripts\pip install -r backend\requirements.txt pyinstaller || goto erro
pushd frontend
call npm ci --no-audit --no-fund || (popd & goto erro)
call npm run build || (popd & goto erro)
popd
.venv-build\Scripts\python scripts\build_exe.py || goto erro
echo.
echo Pronto: dist_exe\Biscuit3DStudio-windows.zip
pause
exit /b 0
:erro
echo FALHOU. Veja a mensagem acima.
pause
exit /b 1
