"""Endpoints da API local (documentação automática em /docs)."""
import json
import logging
import time
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..core import config
from ..models.perfil import PARAMETROS_META, PerfilFabricacao
from ..models.schemas import (ExportarRequisicao, GerarRequisicao, SalvarProjetoRequisicao, VetorizarRequisicao)
from ..services.mesh_generation.geracao import ErroGeracao, gerar
from ..services.profiles import repositorio as perfis
from ..services.projects import repositorio as projetos
from ..services.vectorization import contornos as vet

log = logging.getLogger("b3d")
router = APIRouter(prefix="/api")


def _erro(e: Exception):
    if isinstance(e, FileNotFoundError):
        raise HTTPException(404, str(e))
    if isinstance(e, PermissionError):
        raise HTTPException(403, str(e))
    if isinstance(e, (ValueError, ErroGeracao)):
        raise HTTPException(400, str(e))
    log.exception("Erro inesperado")
    raise HTTPException(500, "Erro inesperado. Veja o log em " + str(config.PASTA_LOGS))


@router.get("/health")
def health():
    import cv2, manifold3d, shapely, trimesh  # noqa
    return {"ok": True, "pasta_dados": str(config.PASTA_DADOS), "versao_formato_projeto": config.VERSAO_PROJETO,
            "dependencias": {"opencv": cv2.__version__, "shapely": shapely.__version__, "trimesh": trimesh.__version__,
                             "manifold3d": "ok"}}


# ---------------- Perfis ----------------
@router.get("/profiles")
def listar_perfis():
    return {"perfis": perfis.listar(), "parametros": PARAMETROS_META}


@router.get("/profiles/{pid}")
def ler_perfil(pid: str):
    try:
        return perfis.ler(pid).model_dump()
    except Exception as e:
        _erro(e)


@router.post("/profiles")
def criar_perfil(perfil: PerfilFabricacao):
    try:
        return {"id": perfis.criar(perfil)}
    except Exception as e:
        _erro(e)


@router.put("/profiles/{pid}")
def atualizar_perfil(pid: str, perfil: PerfilFabricacao):
    try:
        perfis.atualizar(pid, perfil)
        return {"ok": True}
    except Exception as e:
        _erro(e)


@router.delete("/profiles/{pid}")
def excluir_perfil(pid: str):
    try:
        perfis.excluir(pid)
        return {"ok": True}
    except Exception as e:
        _erro(e)


# ---------------- Importação / vetorização ----------------
@router.post("/import")
async def importar(arquivo: UploadFile = File(...)):
    ext = Path(arquivo.filename or "").suffix.lower()
    if ext not in config.EXTENSOES_IMAGEM | config.EXTENSOES_SVG:
        raise HTTPException(400, "Formato não suportado. Use PNG, JPG ou SVG.")
    dados = await arquivo.read(config.TAMANHO_MAX_UPLOAD + 1)
    if len(dados) > config.TAMANHO_MAX_UPLOAD:
        raise HTTPException(400, "Arquivo grande demais (máximo 25 MB).")
    try:
        if ext in config.EXTENSOES_SVG:
            r = vet.vetorizar_svg(dados)
        else:
            r = vet.vetorizar_raster(dados, vet.ParamsVetorizacao())
        pid = projetos.criar(arquivo.filename, dados)
        r["papeis"] = vet.papeis_padrao(r["contornos"])
        r["tipo_arquivo"] = "svg" if ext in config.EXTENSOES_SVG else "raster"
        projetos.guardar(pid, "vetor.json", r)
        return {"projeto_id": pid, **r}
    except Exception as e:
        _erro(e)


@router.get("/projects/{pid}/original")
def original(pid: str):
    try:
        return FileResponse(projetos.original(pid))
    except Exception as e:
        _erro(e)


@router.post("/projects/{pid}/vectorize")
def revetorizar(pid: str, req: VetorizarRequisicao):
    try:
        orig = projetos.original(pid)
        if orig.suffix.lower() == ".svg":
            raise ValueError("SVG já é vetorial: não precisa vetorizar de novo.")
        r = vet.vetorizar_raster(orig.read_bytes(), req.params)
        r["papeis"] = vet.papeis_padrao(r["contornos"])
        r["tipo_arquivo"] = "raster"
        projetos.guardar(pid, "vetor.json", r)
        return r
    except Exception as e:
        _erro(e)


# ---------------- Geração / projeto ----------------
@router.post("/projects/{pid}/generate")
def gerar_modelo(pid: str, req: GerarRequisicao):
    try:
        pasta = projetos.pasta(pid)
        vetor = projetos.ler(pid, "vetor.json")
        t0 = time.time()
        r = gerar(pasta, vetor["contornos"], req.papeis, req.tipo, req.perfil, req.largura_mm,
                  req.altura_mm, req.manter_proporcao)
        r["tempo_s"] = round(time.time() - t0, 2)
        (pasta / "perfil.json").write_text(json.dumps(req.perfil.model_dump(), indent=2, ensure_ascii=False), "utf-8")
        projetos.guardar(pid, "projeto.json", {"versao_formato": config.VERSAO_PROJETO, "requisicao": req.model_dump(),
                                               "resultado": r})
        return r
    except Exception as e:
        _erro(e)


@router.get("/projects/{pid}/files/{nome}")
def baixar_arquivo(pid: str, nome: str):
    try:
        return FileResponse(projetos.arquivo(pid, nome))
    except Exception as e:
        _erro(e)


@router.get("/projects")
def listar_projetos():
    return {"projetos": projetos.listar()}


@router.get("/projects/{pid}")
def abrir_projeto(pid: str):
    try:
        return {"id": pid, "meta": projetos.ler(pid, "meta.json"), "vetor": projetos.ler(pid, "vetor.json"),
                "projeto": projetos.ler(pid, "projeto.json"), "estado_ui": projetos.ler(pid, "estado_ui.json")}
    except Exception as e:
        _erro(e)


@router.post("/projects/{pid}")
def salvar_projeto(pid: str, req: SalvarProjetoRequisicao):
    try:
        projetos.pasta(pid)
        projetos.guardar(pid, "estado_ui.json", req.estado)
        return {"ok": True}
    except Exception as e:
        _erro(e)


@router.post("/projects/{pid}/export")
def exportar(pid: str, req: ExportarRequisicao):
    try:
        destino = Path(req.pasta_destino) if req.pasta_destino else config.PASTA_EXPORTACOES
        nome = req.nome or projetos.ler(pid, "meta.json")["nome"]
        itens = projetos.exportar(pid, destino, nome)
        return {"pasta": itens[0], "arquivos": itens[1:]}
    except Exception as e:
        _erro(e)
