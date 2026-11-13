"""Perfil de Fabricação: todos os números que definem como o cortador/carimbo é construído.

Os valores padrão vêm das medições feitas nos STL de referência da fábrica
(docs/00-analise-stl-referencia.md). Cada parâmetro tem `origem`:
  - "medido": medido no STL de referência
  - "confirmado": confirmado pela fábrica
  - "pendente": ainda precisa de confirmação / teste físico
Nada aqui está no código de geometria: ele só lê este perfil.
"""
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

VERSAO_FORMATO_PERFIL = 1


class PerfilFabricacao(BaseModel):
    nome: str = "Padrão medido (pendente de confirmação)"

    # --- Cortador ---
    altura_total_mm: float = Field(10.0, ge=2, le=60)
    altura_aba_base_mm: float = Field(1.5, ge=0, le=20)
    espessura_parede_mm: float = Field(0.8, ge=0.2, le=5)
    inclinacao_parede_graus: float = Field(5.0, ge=0, le=15)
    folga_topo_mm: float = Field(0.1, ge=0, le=3)
    largura_aba_mm: float = Field(1.75, ge=0, le=15)

    # --- Carimbo ---
    carimbo_altura_base_mm: float = Field(1.5, ge=0.4, le=20)
    carimbo_altura_relevo_mm: float = Field(3.0, ge=0.2, le=20)
    espelhar_carimbo: bool = False

    # --- Marcador de docinho (disco com relevo) ---
    marcador_diametro_mm: float = Field(15.0, ge=5, le=100)
    marcador_margem_mm: float = Field(1.5, ge=0, le=20)
    espelhar_marcador: bool = True

    # --- Regras de segurança de impressão (geram AVISOS, não bloqueiam) ---
    espessura_minima_linha_mm: float = Field(0.8, ge=0, le=5)
    distancia_minima_elementos_mm: float = Field(0.95, ge=0, le=5)

    # --- Qualidade / organização ---
    tolerancia_inclinacao_mm: float = Field(0.02, ge=0.005, le=0.2)
    simplificacao_contorno_mm: float = Field(0.03, ge=0.0, le=0.5)
    separacao_pecas_mm: float = Field(8.0, ge=1, le=100)

    origem: Dict[str, str] = Field(default_factory=dict)


def _m(chave, titulo, unidade, descricao, grupo, origem):
    return {"chave": chave, "titulo": titulo, "unidade": unidade, "descricao": descricao,
            "grupo": grupo, "origem": origem}


# Metadados usados pela interface (títulos e explicações em português).
PARAMETROS_META: List[dict] = [
    _m("altura_total_mm", "Altura total do cortador", "mm",
       "Altura da parede, da base até o topo (a parte que corta).", "Cortador", "medido"),
    _m("altura_aba_base_mm", "Altura da aba de base", "mm",
       "Espessura da 'aba' plana que fica em volta do cortador, na parte de baixo (onde você aperta).", "Cortador", "medido"),
    _m("espessura_parede_mm", "Espessura da parede", "mm",
       "Quão grossa é a parede do cortador. 0,8 mm é o que os seus modelos usam.", "Cortador", "medido"),
    _m("inclinacao_parede_graus", "Inclinação da parede", "graus",
       "A parede abre um pouco para baixo para facilitar desenformar. 5° é o que os seus modelos usam.", "Cortador", "medido"),
    _m("folga_topo_mm", "Folga do carimbo no topo", "mm",
       "Espaço entre o desenho (carimbo) e a parede interna, medido no topo do cortador. Seu valor: 0,1 mm.", "Cortador", "confirmado"),
    _m("largura_aba_mm", "Largura da aba", "mm",
       "Quanto a aba se estende para fora da parede. Medido ~1,75 mm.", "Cortador", "medido"),
    _m("carimbo_altura_base_mm", "Altura da base do carimbo", "mm",
       "Espessura da placa de baixo do carimbo.", "Carimbo", "medido"),
    _m("carimbo_altura_relevo_mm", "Altura do relevo", "mm",
       "Quanto os detalhes (corações, linhas, letras) sobem acima da base do carimbo.", "Carimbo", "medido"),
    _m("espelhar_carimbo", "Espelhar relevo do carimbo", "", "Inverte o relevo da esquerda para a direita.", "Carimbo", "pendente"),
    _m("marcador_diametro_mm", "Diâmetro do marcador", "mm", "Tamanho do disco do marcador de docinho.", "Marcador", "medido"),
    _m("marcador_margem_mm", "Margem do desenho no marcador", "mm",
       "Espaço livre entre o desenho e a borda do disco.", "Marcador", "pendente"),
    _m("espelhar_marcador", "Espelhar relevo do marcador", "",
       "Os marcadores de letras da fábrica são espelhados para imprimir do jeito certo.", "Marcador", "medido"),
    _m("espessura_minima_linha_mm", "Espessura mínima de traço", "mm",
       "Traços mais finos que isso podem quebrar ou não imprimir. O sistema avisa (não bloqueia).", "Segurança", "medido"),
    _m("distancia_minima_elementos_mm", "Distância mínima entre elementos", "mm",
       "Vão mínimo entre duas partes do relevo. Se for menor, elas podem grudar na impressão. Só gera aviso; você decide.", "Segurança", "medido"),
    _m("tolerancia_inclinacao_mm", "Qualidade da inclinação", "mm",
       "Menor = parede mais lisa, porém arquivo maior. 0,02 é imperceptível na impressão.", "Qualidade", "pendente"),
    _m("simplificacao_contorno_mm", "Simplificação do contorno", "mm",
       "Remove pontos desnecessários do contorno para o arquivo ficar leve.", "Qualidade", "pendente"),
    _m("separacao_pecas_mm", "Espaço entre peças no arquivo", "mm",
       "Distância entre o cortador e o carimbo quando exportados juntos.", "Qualidade", "pendente"),
]


def perfil_padrao() -> PerfilFabricacao:
    origem = {m["chave"]: m["origem"] for m in PARAMETROS_META}
    return PerfilFabricacao(origem=origem)
