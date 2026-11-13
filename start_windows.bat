@echo off
REM Biscuit 3D Studio - modo desenvolvimento no Windows (usa Python instalado).
REM Para o usuario final, distribua o executavel (Biscuit3DStudio.exe) gerado por scripts\build_windows.bat ou pelo GitHub Actions.
cd /d "%~dp0"
set PY=
where py >nul 2>nul && set PY=py -3
if "%PY%"=="" where python >nul 2>nul && set PY=python
if "%PY%"=="" (
  echo Python 3.10+ nao encontrado. Instale em https://www.python.org/downloads/ marcando "Add python.exe to PATH".
  pause & exit /b 1
)
if not exist .venv (
  echo Primeira execucao: instalando dependencias (precisa de internet)...
  %PY% -m venv .venv || (echo Falha ao criar o ambiente & pause & exit /b 1)
  .venv\Scripts\python -m pip install --upgrade pip
  .venv\Scripts\pip install -r backend\requirements.txt || (echo Falha ao instalar dependencias & rmdir /s /q .venv & pause & exit /b 1)
)
if not exist frontend\dist\index.html (
  echo A interface (frontend\dist) nao foi encontrada. Rode "npm run build" na pasta frontend ou use o executavel pronto.
  pause & exit /b 1
)
cd backend
..\.venv\Scripts\python run_app.py
pause
