"""Servidor local do Biscuit 3D Studio. Escuta apenas em 127.0.0.1."""
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.rotas import router
from .core import config
from .services.profiles import repositorio as perfis


def criar_app() -> FastAPI:
    config.garantir_pastas()
    logging.basicConfig(filename=config.PASTA_LOGS / "servidor.log", level=logging.INFO, encoding="utf-8",
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    perfis.inicializar()
    app = FastAPI(title="Biscuit 3D Studio (local)", version="0.1.0")
    # só origens locais. A interface é servida pelo próprio servidor (mesma origem), então o CORS
    # só importa em desenvolvimento (Vite, porta 5173) ou se a porta tiver sido trocada.
    app.add_middleware(CORSMiddleware, allow_origin_regex=r"^http://(127\.0\.0\.1|localhost):\d+$",
                       allow_methods=["*"], allow_headers=["*"])
    app.include_router(router)
    if config.PASTA_FRONTEND.exists():
        app.mount("/", StaticFiles(directory=config.PASTA_FRONTEND, html=True), name="frontend")
    return app


app = criar_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=config.HOST, port=config.PORTA, log_level="info")
