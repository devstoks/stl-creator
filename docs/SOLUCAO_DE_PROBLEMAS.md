# Solução de problemas

**O macOS não abre o start_mac.command.** Botão direito → Abrir (1ª vez). Se disser sem permissão: no Terminal, `chmod +x start_mac.command stop_mac.command`.

**"Python 3 não encontrado".** Instale Python 3.10+ em python.org e rode de novo.

**Falha ao instalar dependências.** Confira a internet (só é necessária na instalação). Apague a pasta `.venv` e rode de novo. Em Apple Silicon use o Python do python.org ou do Homebrew (arm64).

**O navegador não abriu.** Abra manualmente http://127.0.0.1:8765. Se a porta estiver ocupada: `B3D_PORT=8800 ./start_mac.command`.

**"Não consegui falar com o servidor local".** A janela do Terminal foi fechada. Abra `start_mac.command` de novo.

**O contorno saiu ruim.** Passo 2: troque *Como separar o desenho do fundo*, ajuste *Corte*, *Suavização* e *Fechar lacunas*. Partes brancas do desenho (ex.: corpo do body) somem do fundo: marque *Preencher buracos internos*. Objetos colados (ex.: carrinho + balão) ainda não podem ser separados na tela; recorte a imagem antes (recorte na interface está planejado).

**Status "Atenção".** Leia as mensagens: traços finos, elementos muito próximos ou peças separadas inesperadas. Não é erro; avalie e, se preciso, aumente a escala ou ajuste o relevo.

**Status "Bloqueado".** A malha não está fechada ou está vazia: o STL não deve ser usado. Tente simplificar o contorno (mais simplificação) e gerar de novo.

**Logs técnicos:** `~/Biscuit3D/logs/servidor.log`.

## Windows (executável)
**"O Windows protegeu o computador".** SmartScreen: *Mais informações → Executar assim mesmo* (o programa não é assinado).
**O antivírus apagou ou bloqueou o programa.** Restaure e adicione a pasta `Biscuit3DStudio` às exceções.
**Nada abre / janela preta fecha na hora.** Extraia o zip inteiro (não rode de dentro do zip) para uma pasta simples (ex.: `C:\Biscuit3D-programa`). Se continuar, abra o Prompt de Comando, entre na pasta e execute `Biscuit3DStudio.exe` para ler a mensagem de erro.
**A porta 8765 está ocupada.** O programa usa a próxima porta livre sozinho e mostra o endereço na janela preta.
