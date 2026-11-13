# Perfis de fabricação e parâmetros

Tudo que define como a peça é construída está no **perfil** (tela, passo 5). Você muda um número, gera de novo e vê o resultado: **não precisa mexer no código**.
Perfis ficam em `~/Biscuit3D/profiles/*.json`. O perfil **"Padrão medido"** é protegido: use *Salvar como novo* para criar o seu.
A etiqueta ao lado de cada parâmetro mostra a origem: **medido** (tirado dos seus STL), **confirmado** (você confirmou), **pendente** (ainda não validado com impressão).

## Cortador
| Parâmetro | Padrão | O que faz | Se mexer |
|---|---|---|---|
| Altura total | 10 mm | Altura da parede, da base ao topo | Maior = cortador mais alto |
| Altura da aba de base | 1,5 mm | Espessura da aba plana embaixo (onde se aperta) | |
| Espessura da parede | 0,8 mm | Grossura da parede | Menor que 0,6 pode quebrar |
| Inclinação da parede | 5° | A parede abre para baixo (facilita desenformar) | 0° = parede reta |
| Folga do carimbo no topo | 0,1 mm | Espaço entre o desenho (carimbo) e a parede interna, no topo | **Se o carimbo ficar apertado, aumente (ex.: 0,15). Se ficar solto, diminua.** |
| Largura da aba | 1,75 mm | Quanto a aba sai da parede para fora | |

Como a parede abre para baixo, a folga real cresce de 0,1 mm no topo até ~0,9 mm perto da base (0,1 + 8,5 × tan 5°).

## Carimbo e marcador
| Parâmetro | Padrão | O que faz |
|---|---|---|
| Altura da base do carimbo | 1,5 mm | Placa de baixo |
| Altura do relevo | 3,0 mm | Quanto os detalhes sobem |
| Espelhar relevo | não (carimbo) / sim (marcador) | Inverte o desenho; marcadores de letras são espelhados para imprimir do jeito certo |
| Diâmetro do marcador | 15 mm | Tamanho do disco |
| Margem do desenho no marcador | 1,5 mm | Espaço entre o desenho e a borda do disco |

## Segurança de impressão (só avisam)
- **Espessura mínima de traço (0,8 mm):** traços mais finos que isso podem quebrar. O sistema avisa em "Atenção".
- **Distância mínima entre elementos (0,95 mm):** elementos mais próximos podem grudar. Você avalia caso a caso (coloque 0 para desligar o aviso).

## Qualidade
- **Qualidade da inclinação (0,02 mm):** menor = parede mais lisa e arquivo maior.
- **Simplificação do contorno (0,03 mm):** remove pontos desnecessários; maior = arquivo mais leve, contorno menos fiel.
- **Espaço entre peças (8 mm):** distância entre cortador e carimbo no arquivo.

## Dimensão "largura final"
É a largura do **desenho** (contorno do carimbo). O cortador fica maior: cerca de 3,4 mm a mais em cada lado (folga + parede + aba + abertura da parede). O tamanho real aparece no painel de validação.
