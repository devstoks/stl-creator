"""Perfis de fabricação salvos como JSON em ~/Biscuit3D/profiles. O perfil padrão é copiado na 1ª execução."""
import json
import re
import shutil
from typing import Dict, List

from ...core import config
from ...models.perfil import VERSAO_FORMATO_PERFIL, PerfilFabricacao, perfil_padrao

ID_PADRAO = "padrao-medido"


def _slug(nome: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", nome.lower().strip()).strip("-")
    return s or "perfil"


def _caminho(pid: str):
    if not re.fullmatch(r"[a-z0-9-]{1,80}", pid):
        raise ValueError("Identificador de perfil inválido.")
    return config.PASTA_PERFIS / f"{pid}.json"


def inicializar() -> None:
    config.garantir_pastas()
    alvo = _caminho(ID_PADRAO)
    if not alvo.exists():
        escrever(ID_PADRAO, perfil_padrao())


def escrever(pid: str, perfil: PerfilFabricacao) -> None:
    dados = {"versao_formato": VERSAO_FORMATO_PERFIL, "perfil": perfil.model_dump()}
    _caminho(pid).write_text(json.dumps(dados, indent=2, ensure_ascii=False), encoding="utf-8")


def ler(pid: str) -> PerfilFabricacao:
    c = _caminho(pid)
    if not c.exists():
        raise FileNotFoundError(f"Perfil '{pid}' não encontrado.")
    return PerfilFabricacao(**json.loads(c.read_text(encoding="utf-8"))["perfil"])


def listar() -> List[Dict]:
    return [{"id": c.stem, "nome": ler(c.stem).nome, "protegido": c.stem == ID_PADRAO}
            for c in sorted(config.PASTA_PERFIS.glob("*.json"))]


def criar(perfil: PerfilFabricacao) -> str:
    base = _slug(perfil.nome)
    pid, n = base, 2
    while _caminho(pid).exists():  # nunca sobrescreve
        pid, n = f"{base}-{n}", n + 1
    escrever(pid, perfil)
    return pid


def atualizar(pid: str, perfil: PerfilFabricacao) -> None:
    if pid == ID_PADRAO:
        raise PermissionError("O perfil padrão não pode ser alterado. Duplique-o para editar.")
    ler(pid)
    escrever(pid, perfil)


def excluir(pid: str) -> None:
    if pid == ID_PADRAO:
        raise PermissionError("O perfil padrão não pode ser excluído.")
    _caminho(pid).unlink()
