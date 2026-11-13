"""Ponto de entrada do executável (Windows e Mac): inicia o servidor local e abre o navegador.

- Escuta só em 127.0.0.1.
- Se já houver uma instância rodando, apenas abre o navegador nela.
- Se a porta estiver ocupada por outro programa, usa a próxima livre.
"""
import json
import socket
import sys
import threading
import time
import urllib.request
import webbrowser

from .core import config


def _porta_livre(inicio: int) -> int:
    for porta in range(inicio, inicio + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex((config.HOST, porta)) != 0:  # ninguém escutando -> livre
                return porta
    raise RuntimeError("Não encontrei uma porta livre entre %d e %d." % (inicio, inicio + 49))


def _ja_rodando(porta: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://{config.HOST}:{porta}/api/health", timeout=1.5) as r:
            return bool(json.load(r).get("ok"))
    except Exception:
        return False


def _abrir_quando_pronto(url: str, porta: int) -> None:
    for _ in range(80):
        if _ja_rodando(porta):
            webbrowser.open(url)
            return
        time.sleep(0.25)


def principal() -> None:
    inicio = config.PORTA
    if _ja_rodando(inicio):
        print("O Biscuit 3D Studio já está aberto. Abrindo o navegador...")
        webbrowser.open(f"http://{config.HOST}:{inicio}")
        return
    porta = _porta_livre(inicio)
    config.PORTA = porta
    url = f"http://{config.HOST}:{porta}"
    print("=" * 60)
    print(" Biscuit 3D Studio")
    print(f" Abra no navegador: {url}")
    print(" Seus arquivos ficam em:", config.PASTA_DADOS)
    print(" Para ENCERRAR, feche esta janela (ou pressione Ctrl+C).")
    print("=" * 60, flush=True)
    threading.Thread(target=_abrir_quando_pronto, args=(url, porta), daemon=True).start()

    import uvicorn
    from .main import app
    uvicorn.run(app, host=config.HOST, port=porta, log_config=None, access_log=False)


if __name__ == "__main__":
    try:
        principal()
    except KeyboardInterrupt:
        pass
    except Exception as e:  # mensagem útil em vez de janela que fecha sozinha
        print("\nErro ao iniciar:", e)
        input("Pressione Enter para fechar...")
        sys.exit(1)
