"""Ponto de entrada do executável (PyInstaller). Em desenvolvimento use: python -m app.main"""
import sys

from app.launcher import principal

if __name__ == "__main__":
    try:
        principal()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print("\nErro ao iniciar:", e)
        try:
            input("Pressione Enter para fechar...")
        except Exception:
            pass
        sys.exit(1)
