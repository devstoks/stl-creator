"""Projetos em pastas locais: original, contornos, estado e modelos gerados."""
import json
import re
import shutil
import time
import uuid
from pathlib import Path
from typing import Dict, List

from ...core import config


def _seguro(nome: str) -> str:
    s = re.sub(r"[^A-Za-z0-9._-]+", "-", nome).strip("-.")
    s = s[:60] or "projeto"
    if s.split(".")[0].upper() in {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)),
                                   *(f"LPT{i}" for i in range(1, 10))}:
        s = "_" + s  # nomes reservados do Windows
    return s


def pasta(pid: str) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,120}", pid) or ".." in pid:
        raise ValueError("Identificador de projeto inválido.")
    p = config.PASTA_PROJETOS / pid
    if not p.is_dir():
        raise FileNotFoundError("Projeto não encontrado.")
    return p


def criar(nome_arquivo: str, dados: bytes) -> str:
    stem = _seguro(Path(nome_arquivo).stem)
    ext = Path(nome_arquivo).suffix.lower()
    pid = f"{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4]}-{stem}"
    p = config.PASTA_PROJETOS / pid
    p.mkdir(parents=True, exist_ok=False)
    (p / f"original{ext}").write_bytes(dados)
    guardar(pid, "meta.json", {"nome": stem, "arquivo_original": f"original{ext}", "criado_em": time.time(),
                               "versao_formato": config.VERSAO_PROJETO})
    return pid


def original(pid: str) -> Path:
    p = pasta(pid)
    return p / ler(pid, "meta.json")["arquivo_original"]


def guardar(pid: str, nome: str, dados: Dict) -> None:
    p = config.PASTA_PROJETOS / pid
    (p / nome).write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")


def ler(pid: str, nome: str, padrao=None):
    f = pasta(pid) / nome
    if not f.exists():
        return padrao
    return json.loads(f.read_text(encoding="utf-8"))


def arquivo(pid: str, nome: str) -> Path:
    if "/" in nome or "\\" in nome or ".." in nome:
        raise ValueError("Nome de arquivo inválido.")
    f = pasta(pid) / nome
    if not f.is_file():
        raise FileNotFoundError("Arquivo não encontrado.")
    return f


def listar() -> List[Dict]:
    out = []
    for p in sorted(config.PASTA_PROJETOS.iterdir(), reverse=True):
        m = p / "meta.json"
        if p.is_dir() and m.exists():
            meta = json.loads(m.read_text(encoding="utf-8"))
            out.append({"id": p.name, "nome": meta.get("nome", p.name), "criado_em": meta.get("criado_em"),
                        "tem_modelo": (p / "modelo.stl").exists()})
    return out


def exportar(pid: str, destino: Path, nome_base: str) -> List[str]:
    """Copia os arquivos do projeto para a pasta escolhida SEM sobrescrever nada."""
    p = pasta(pid)
    destino = Path(destino).expanduser()
    destino.mkdir(parents=True, exist_ok=True)
    n, pasta_final = 1, destino / _seguro(nome_base)
    while pasta_final.exists():
        n += 1
        pasta_final = destino / f"{_seguro(nome_base)}-{n}"
    pasta_final.mkdir()
    copiados = []
    for nome in ("modelo.stl", "cortador.stl", "carimbo.stl", "vetor.svg", "perfil.json", "projeto.json", "preview.png"):
        if (p / nome).exists():
            shutil.copy2(p / nome, pasta_final / nome)
            copiados.append(nome)
    orig = ler(pid, "meta.json")["arquivo_original"]
    shutil.copy2(p / orig, pasta_final / orig)
    copiados.append(orig)
    return [str(pasta_final)] + copiados
