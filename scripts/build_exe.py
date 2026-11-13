"""Gera o executável do Biscuit 3D Studio para o sistema em que este script roda.

  Windows -> dist_exe/Biscuit3DStudio/Biscuit3DStudio.exe (+ Biscuit3DStudio-windows.zip)
  macOS   -> dist_exe/Biscuit3DStudio/Biscuit3DStudio     (+ Biscuit3DStudio-macos.zip)

O PyInstaller NÃO compila para outro sistema: para gerar o .exe é preciso rodar no Windows
(ou no GitHub Actions: .github/workflows/build.yml faz isso automaticamente).

Uso:  python scripts/build_exe.py
Requer: pip install -r backend/requirements.txt pyinstaller   e   frontend/dist (npm run build)
"""
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DIST_FRONT = RAIZ / "frontend" / "dist"
SAIDA = RAIZ / "dist_exe"


def main() -> None:
    if not (DIST_FRONT / "index.html").exists():
        npm = shutil.which("npm")
        if not npm:
            sys.exit("frontend/dist não existe e o Node.js/npm não está instalado. Rode 'npm run build' em frontend/.")
        subprocess.check_call([npm, "install", "--no-audit", "--no-fund"], cwd=RAIZ / "frontend")
        subprocess.check_call([npm, "run", "build"], cwd=RAIZ / "frontend")

    sistema = {"Windows": "windows", "Darwin": "macos", "Linux": "linux"}.get(platform.system(), platform.system().lower())
    cmd = [
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onedir", "--console",
        "--name", "Biscuit3DStudio",
        "--distpath", str(SAIDA), "--workpath", str(SAIDA / "_build"), "--specpath", str(SAIDA / "_build"),
        "--paths", str(RAIZ / "backend"),
        "--add-data", f"{DIST_FRONT}{os.pathsep}frontend_dist",
        "--collect-all", "manifold3d", "--collect-data", "trimesh", "--collect-all", "svgelements",
        "--collect-submodules", "uvicorn", "--collect-submodules", "anyio",
        "--hidden-import", "multipart", "--hidden-import", "python_multipart",
        "--exclude-module", "tkinter", "--exclude-module", "matplotlib",
        "--exclude-module", "pkg_resources", "--exclude-module", "setuptools",
        str(RAIZ / "backend" / "run_app.py"),
    ]
    print(">>", " ".join(cmd))
    subprocess.check_call(cmd)
    pasta = SAIDA / "Biscuit3DStudio"
    shutil.copy2(RAIZ / "docs" / "LEIA-ME_USUARIO.txt", pasta / "LEIA-ME.txt")
    zip_base = SAIDA / f"Biscuit3DStudio-{sistema}"
    shutil.make_archive(str(zip_base), "zip", SAIDA, "Biscuit3DStudio")
    print(f"\nPronto: {pasta}\nZip para distribuir: {zip_base}.zip")


if __name__ == "__main__":
    main()
