# Biscuit 3D Studio

Aplicação **local** (sem internet, sem mensalidade, sem hospedagem) que transforma uma imagem ou SVG em
**cortador**, **carimbo** ou **marcador** de biscuit em STL, seguindo o padrão de fabricação medido nos seus modelos.

Fluxo: `imagem/SVG → vetorização → revisão dos contornos → perfil de fabricação → sólido 3D → validação → STL`.

## Para quem vai usar: Windows ou Mac (executável)
O usuário final **não instala nada**: recebe o `.zip` (`Biscuit3DStudio-windows.zip` ou `-macos.zip`), extrai e dá duplo clique em `Biscuit3DStudio`. Veja `docs/LEIA-ME_USUARIO.txt`.
Como gerar esses zips (inclusive o do Windows a partir do seu Mac): **`docs/EMPACOTAMENTO.md`**.

## Como usar a partir do código (desenvolvimento, macOS)
1. **Duplo clique em `start_mac.command`.** Na primeira vez ele instala as dependências (precisa de internet só nessa etapa; leva alguns minutos). Se o macOS reclamar de segurança: botão direito → Abrir.
2. O navegador abre em `http://127.0.0.1:8765`. Arraste uma imagem (PNG/JPG) ou SVG para a janela.
3. **Revise os contornos** (passo 3): clique no desenho para marcar cada contorno como **Externo** (forma do cortador), **Detalhe** (relevo do carimbo) ou **Ignorar**.
4. Escolha o tipo (cortador, marcador ou conjunto), a largura final do desenho e o perfil de fabricação. Clique em **Gerar modelo 3D**.
5. Gire o modelo na aba **Prévia 3D**, confira o painel de validação e **exporte** (STL + SVG + perfil + original).
6. Para encerrar: feche a janela do Terminal ou use `stop_mac.command`.

Requisitos (modo desenvolvimento): Python 3.10 ou mais novo. No Windows, o equivalente é `start_windows.bat`; o usuário final usa o executável.

Seus arquivos ficam em `~/Biscuit3D/` (`projects/`, `profiles/`, `exports/`, `logs/`). Mude com a variável `B3D_DATA_DIR`.

## Privacidade
Tudo roda no seu computador. O servidor escuta só em `127.0.0.1`, o CORS aceita só a própria aplicação, não há login, telemetria, API externa nem upload. Depois da instalação, funciona sem internet.

## Como o modelo é construído
Ver `docs/00-analise-stl-referencia.md` (medições) e `docs/PERFIS_E_PARAMETROS.md` (cada parâmetro, em português).
Resumo: parede de 0,8 mm que abre 5° para baixo, folga de 0,1 mm no topo entre desenho e parede, aba de base de 1,5 mm,
carimbo com base de 1,5 mm + relevo de 3 mm. Esses números vêm dos seus STL e ficam no **perfil**, não no código.

## Desenvolvimento
```bash
cd backend && python3 -m venv ../.venv && ../.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
../.venv/bin/python -m pytest -q tests      # testes (inclui comparação com o Cortador.stl real)
../.venv/bin/python -m app.main             # API em http://127.0.0.1:8765  (documentação em /docs)
cd ../frontend && npm install && npm run dev   # interface em modo desenvolvimento (porta 5173)
cd frontend && npm run build                    # regenera frontend/dist
```

## Estrutura
`backend/app/{api,core,models,services/{vectorization,geometry_2d,mesh_generation,validation,projects,profiles}}`,
`backend/tests`, `frontend/src`, `examples/` (STL de referência e imagem de teste), `docs/`.

Veja também: `docs/STATUS.md` (o que está pronto, parcial ou futuro) e `docs/SOLUCAO_DE_PROBLEMAS.md`.
