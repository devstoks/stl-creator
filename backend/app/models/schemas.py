"""Contratos da API local."""
from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field

from ..models.perfil import PerfilFabricacao
from ..services.vectorization.contornos import ParamsVetorizacao


class GerarRequisicao(BaseModel):
    tipo: Literal["cortador", "marcador", "conjunto"] = "cortador"
    papeis: Dict[int, Literal["externo", "detalhe", "ignorar"]]
    perfil: PerfilFabricacao
    largura_mm: float = Field(30.0, gt=2, le=400, description="Largura final do DESENHO (contorno do carimbo), em mm.")
    altura_mm: Optional[float] = Field(None, gt=2, le=400)
    manter_proporcao: bool = True


class VetorizarRequisicao(BaseModel):
    params: ParamsVetorizacao = ParamsVetorizacao()


class ExportarRequisicao(BaseModel):
    pasta_destino: Optional[str] = None
    nome: Optional[str] = None


class SalvarProjetoRequisicao(BaseModel):
    estado: dict
