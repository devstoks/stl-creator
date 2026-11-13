@echo off
REM Encerra o servidor local (porta 8765). Normalmente basta fechar a janela preta do programa.
if "%B3D_PORT%"=="" set B3D_PORT=8765
for /f "tokens=5" %%p in ('netstat -ano ^| findstr LISTENING ^| findstr :%B3D_PORT%') do taskkill /PID %%p /F
