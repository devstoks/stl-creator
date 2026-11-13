"""Validação do STL gerado: reabre o arquivo exportado e verifica integridade e dimensões.

Estados: APROVADO (nada detectado), ATENCAO (revisar), BLOQUEADO (não exportar com segurança).
Isto NÃO garante impressão perfeita: a aprovação digital não substitui a impressão de teste.
"""
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import trimesh


def validar_stl(
    caminho: Path,
    extensao_esperada_xy: Optional[List[float]] = None,
    componentes_esperados: Optional[int] = None,
    avisos_extra: Optional[List[str]] = None,
    tol_mm: float = 0.5,
) -> Dict:
    avisos: List[str] = list(avisos_extra or [])
    erros: List[str] = []
    r: Dict = {"arquivo": caminho.name}

    if not caminho.exists() or caminho.stat().st_size < 84:
        erros.append("O arquivo STL não foi gerado ou está vazio.")
        return _fecha(r, avisos, erros)
    r["tamanho_bytes"] = caminho.stat().st_size

    try:
        t = trimesh.load(str(caminho), file_type="stl", force="mesh", process=True)
    except Exception as e:  # leitor de malha não conseguiu abrir
        erros.append(f"O STL gerado não pôde ser reaberto: {e}")
        return _fecha(r, avisos, erros)

    if len(t.faces) == 0:
        erros.append("A malha não tem faces.")
        return _fecha(r, avisos, erros)

    r["faces"] = int(len(t.faces))
    r["extensao_mm"] = [round(float(v), 3) for v in t.extents]
    r["unidade"] = "mm"
    if not np.isfinite(t.vertices).all():
        erros.append("Há coordenadas inválidas (NaN/infinito) na malha.")
    if (t.extents <= 0).any():
        erros.append("Alguma dimensão X/Y/Z não é positiva.")

    degenerada = int((t.area_faces < 1e-7).sum())
    r["faces_degeneradas"] = degenerada
    if degenerada > max(5, 0.001 * len(t.faces)):  # poucas faces de área ~0 são inofensivas (junções em T)
        avisos.append(f"{degenerada} face(s) degenerada(s) detectada(s).")

    r["watertight"] = bool(t.is_watertight)
    r["orientacao_consistente"] = bool(t.is_winding_consistent)
    if not t.is_watertight:
        erros.append("A malha não é fechada (watertight); o fatiador pode falhar.")
    if not t.is_winding_consistent:
        avisos.append("A orientação das faces é inconsistente.")

    vol = float(t.volume) if t.is_watertight else float("nan")
    r["volume_mm3"] = round(vol, 2) if np.isfinite(vol) else None
    if np.isfinite(vol) and vol <= 0:
        erros.append("O volume da malha não é positivo.")

    comp = len(t.split(only_watertight=False))
    r["componentes"] = comp
    if componentes_esperados is not None and comp != componentes_esperados:
        avisos.append(f"Esperava {componentes_esperados} peça(s) separada(s), mas há {comp}.")

    if extensao_esperada_xy:
        ex, ey = t.extents[0], t.extents[1]
        dx, dy = abs(ex - extensao_esperada_xy[0]), abs(ey - extensao_esperada_xy[1])
        r["extensao_esperada_mm"] = [round(v, 3) for v in extensao_esperada_xy]
        if dx > tol_mm or dy > tol_mm:
            avisos.append(
                f"As dimensões do STL ({ex:.2f} × {ey:.2f} mm) diferem do esperado "
                f"({extensao_esperada_xy[0]:.2f} × {extensao_esperada_xy[1]:.2f} mm)."
            )
    return _fecha(r, avisos, erros)


def _fecha(r: Dict, avisos: List[str], erros: List[str]) -> Dict:
    r["avisos"] = avisos
    r["erros"] = erros
    r["status"] = "BLOQUEADO" if erros else ("ATENCAO" if avisos else "APROVADO")
    return r
