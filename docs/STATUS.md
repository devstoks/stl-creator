# Status da implementação (v0.1)

## Pronto e testado
- Servidor local (127.0.0.1), iniciador Mac, API documentada em `/docs`.
- Importar PNG/JPG (vetorização local com OpenCV, inclusive clipart com fundo xadrez desenhado) e SVG (sem revetorizar).
- Controles de vetorização: modo, corte, suavização, simplificação, fechar lacunas, ruído/ilhas, inverter, preencher buracos, restaurar.
- Revisão de contornos: externo / detalhe / ignorar, desfazer/refazer, lista e clique na imagem, zoom e pan.
- Perfis editáveis (criar, salvar como novo, excluir com confirmação; padrão protegido).
- Geração de cortador, marcador (disco) e conjunto (cortador + carimbo), STL binário em mm.
- Validação (reabre o STL): vazio, NaN, malha fechada, volume, dimensões esperadas, peças separadas, traços finos e elementos próximos.
- Prévia 3D com o STL real (rotação, zoom, pan, wireframe, ortográfica, eixos, dimensões).
- Projetos salvos e reabertos; exportação sem sobrescrever (STL, SVG, perfil, projeto, original).
- Executável empacotado (PyInstaller) com teste de fumaça (inicia, importa, gera e confere o STL).
- 16 testes automatizados, inclusive comparação com o Cortador.stl real (dimensões ±0,3 mm, volume ±3%).

## Parcial
- Reprodução do padrão: bate com o carrinho de referência (35,8 × 33,2 mm vs 35,85 × 33,25; volume +1,2%). A aba tem leve chanfro nos modelos reais que ainda não foi modelado (±0,1 mm).
- A inclinação é construída em camadas (degrau < 0,02 mm); o STL tem ~50–85 mil faces (2–4 MB) contra ~3 mil dos modelos originais.
- Contornos internos viram relevo só quando você marca como Detalhe; não há regra automática.
- **Windows:** o código é multiplataforma e o pacote funciona no Linux (testado aqui). O executável Windows (`.exe`) e o macOS são gerados e testados pelo GitHub Actions (`.github/workflows/build.yml`); **ainda não foi executado** nenhuma vez em Windows/Mac. Até a primeira execução verde, trate o Windows como não validado.
- O executável não é assinado: Windows SmartScreen mostra aviso (ver `docs/EMPACOTAMENTO.md`).

## Futuro
- Recorte manual da imagem e separação de objetos colados na interface (o backend já aceita `recorte`).
- Edição de nós/curvas, fechar/unir/separar caminhos.
- Furos no cortador (parede interna ao redor de furos do desenho).
- Assinatura de código (Windows/Mac), instalador (.msi) e `.app` nativo.
- Exportar GLB e PNG de prévia.
- Teste de impressão física com os valores marcados como "medido".
