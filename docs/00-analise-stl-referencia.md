# Fase 0 — Análise dos STL de referência

Arquivos analisados: `Cortador.stl` (1,3 MB) e `Carimbo.stl` (0,7 MB). Ambos são STL binário
exportado pelo Autodesk Fusion/ATF 15.17, em milímetros (extensões coerentes com peças reais).
Todas as medidas abaixo foram feitas por seções horizontais (trimesh + shapely). Nada foi presumido;
o que não dá para afirmar só pelo STL está marcado como **PENDENTE**.

## 1. Cortador.stl — 4 produtos numa mesma placa (tema "bebê")

| Item | Valor medido |
|---|---|
| Extensão total | 122,5 × 72,8 × 10,0 mm |
| Componentes (sólidos separados) | 10 |
| Watertight (arquivo inteiro) | **Não** (ver pendências) |

Produtos: carrinho de bebê, chupeta, mamadeira, body. Cada um tem **três tipos de peça**:

### 1.1 Cortador (parede)
- Altura total **10,0 mm**.
- Espessura da parede **0,80 mm**, constante (0,80–0,82 nos 4 produtos).
- **Inclinação (draft) de ~5°** para dentro em direção ao topo: o contorno externo recua ~0,43 mm
  entre Z=5 e Z=9,9, de forma uniforme (mín 0,42 / máx 0,43 mm no carrinho e no body). Ou seja, é um
  deslocamento uniforme do contorno, não uma escala.
- Sem borda de corte triangular visível: a parede é um anel de espessura constante (**PENDENTE**: confirmar
  se a lâmina é intencionalmente reta).

### 1.2 Aba/base do cortador (Z 0 → 1,5 mm)
- Anel plano de **1,5 mm** de altura em volta da parede, com **~2,0 mm de largura** além da parede externa
  (1,96 mm em Z=0,3; 2,06 mm em Z=1,4: leve alargamento com a altura).
- Em carrinho e body a aba é **parte do mesmo sólido** da parede; em chupeta e mamadeira é um
  **sólido separado** (componentes 3 e 7), encostado na parede. Isso é inconsistente entre produtos.
  **PENDENTE:** a fábrica quer aba integrada ou separada?

### 1.3 Carimbo (peça interna de 4,5 mm)
- Placa-base **1,5 mm** (Z 0–1,5) com o contorno do desenho, mais **relevo de 3,0 mm** (Z 1,5–4,5) com os detalhes
  (olhos, corações, linhas, tampa da mamadeira etc.).
- Contorno da base do carimbo fica ~**0,86–0,90 mm** (média) para dentro da parede interna do cortador
  → folga de encaixe. Varia de 0,5 a 3,0 mm em pontos isolados (**PENDENTE**: folga é constante ou depende do desenho?).
- Chupeta tem relevo em níveis intermediários (Z 2,5 e 3,5): há detalhes em alturas diferentes.

## 2. Carimbo.stl — marcadores redondos

| Item | Valor medido |
|---|---|
| Extensão | 31,1 × 31,6 × 4,5 mm |
| Componentes | 4, cada um **15 × 15 × 4,5 mm** (discos Ø15 mm) |
| Watertight | **Sim**, orientação consistente |
| Conteúdo | "?", "BABY", "BOY", "GIRL" em relevo **espelhado** |

- Base 1,5 mm + relevo até 4,5 mm. Só há faces horizontais e verticais (nenhuma inclinada).
- Os discos têm Z intermediários (1,8; 1,875; 2,1; 2,25; 2,7; 3,3…) devido a degraus no relevo
  (**PENDENTE**: confirmar se é efeito de arredondamento do modelo original; para a fábrica parece irrelevante).
- O texto é espelhado de propósito (o carimbo imprime o lado certo).

## 3. Perfil paramétrico proposto

Arquivo: `backend/app/profiles/perfil-medido-referencia.json`. Marcados como **medido / pendente**.

| Parâmetro | Valor | Origem |
|---|---|---|
| altura_total_mm | 10,0 | medido |
| altura_aba_base_mm | 1,5 | medido |
| espessura_parede_mm | 0,8 | medido |
| inclinacao_parede_graus | 5,0 | medido (calculado de 0,43 mm / 4,9 mm) |
| largura_aba_mm | 2,0 | medido |
| aba_integrada | pendente | inconsistente entre produtos |
| carimbo_altura_base_mm | 1,5 | medido |
| carimbo_altura_relevo_mm | 3,0 | medido |
| folga_carimbo_parede_mm | 0,9 | medido (média) |
| carimbo_diametro_marcador_mm | 15,0 | medido (Carimbo.stl) |

Ainda **não** temos: espessura mínima de linhas do relevo, distância mínima entre elementos, tolerâncias de
fabricação e a regra para escolher quais contornos viram relevo. Precisam de confirmação ou de mais exemplos.

## 4. Prova de conceito (`poc/poc_cortador.py`)

Entrada: contorno da base do carimbo do carrinho. Saída: cortador gerado com os valores medidos acima.

| | Referência (carrinho) | POC |
|---|---|---|
| Extensão X × Y × Z | 35,85 × 33,25 × 10,0 | 36,38 × 33,78 × 10,0 |
| Volume | 1231,9 mm³ | 1296,1 mm³ (+5,2 %) |
| STL reaberto | — | watertight, 1 componente, sem faces degeneradas, sem NaN |

Diferença de ~0,5 mm no tamanho vem de eu ter usado a base do carimbo como "desenho" e aplicado folga 0,9;
o desenho original usado pela fábrica não está disponível. **Não afirmo que o resultado é idêntico ao padrão.**

### Escolha de tecnologia
OpenSCAD não está instalado nesta máquina. Usei **Shapely + manifold3d + trimesh** (tudo pip, sem binário
externo, offsets uniformes e booleanas robustas). Isso pode simplificar o empacotamento. Ainda vale comparar com
OpenSCAD no Mac antes de decidir definitivamente.

### Limitação conhecida da POC
A inclinação foi aproximada por camadas de 0,25 mm. O STL ficou com **147 mil faces (7,4 MB)**, contra 2,8 mil
na referência. Funciona para fatiar, mas o motor final deve gerar um loft com poucas faces (a fazer).

## 5. Atualização (13/11/2026) — folga confirmada pela fábrica
A fábrica informou que a folga entre carimbo e cortador é de **0,1 mm**. Isso bate com as medidas: a parede abre ~5° para baixo, então a folga é de 0,1 mm no **topo** e cresce até ~0,9 mm perto da base (0,1 + 8,5 × tan 5° ≈ 0,84). O perfil agora usa `folga_topo_mm = 0,1`. A aba, antes registrada como "pendente", foi confirmada como **integrada à parede** (peça única). O motor definitivo reproduz o carrinho de referência com 35,82 × 33,21 mm (referência 35,85 × 33,25) e volume +1,2 %.
