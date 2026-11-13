# Como gerar o executável (Windows e Mac)

**Você desenvolve no Mac, o usuário final usa Windows.** O Windows não precisa instalar Python, Node nem nada:
ele recebe um `.zip`, extrai e dá duplo clique em `Biscuit3DStudio.exe`. Tudo (motor, interface e bibliotecas) vai dentro da pasta.

> O PyInstaller **não gera `.exe` a partir do Mac**. O `.exe` precisa ser construído no Windows. Você não precisa de um PC com Windows:
> o **GitHub Actions** (gratuito) constrói numa máquina Windows de verdade e ainda testa o programa lá.

## Opção A (recomendada): GitHub Actions, sem ter Windows
1. Crie um repositório no GitHub e envie esta pasta (`biscuit-3d-studio`), incluindo `examples/referencia/` (os testes usam seus STL) e `.github/`.
   Repositório **privado** serve (o plano gratuito tem minutos mensais de Actions; Windows consome mais minutos que Mac/Linux).
2. No GitHub: aba **Actions** → "Build e testes (Windows + Mac)" → **Run workflow**. (Também roda sozinho a cada `git push` na `main`.)
3. Espere ~10–15 min. Ao terminar, abra a execução e baixe em **Artifacts**:
   - `Biscuit3DStudio-windows` → contém `Biscuit3DStudio-windows.zip` (entregue ao usuário Windows)
   - `Biscuit3DStudio-macos` → contém `Biscuit3DStudio-macos.zip`
4. Se algum passo ficar vermelho, o erro aparece no log. Ele roda os 16 testes e um **teste de fumaça do executável** (inicia o programa, importa uma imagem, gera um STL e confere o arquivo) no Windows e no Mac.

## Opção B: construir você mesmo
- **Windows:** `scripts\build_windows.bat` (precisa de Python 3.10+ e Node 18+).
- **Mac:** `scripts/build_mac.sh`. Gera `dist_exe/Biscuit3DStudio-macos.zip`.

## O que o usuário Windows vê
1. Extrai o zip → duplo clique em `Biscuit3DStudio.exe`.
2. O Windows pode avisar "O Windows protegeu o computador" (SmartScreen), porque o programa **não é assinado**: *Mais informações → Executar assim mesmo*.
   Antivírus às vezes reclamam de programas feitos com PyInstaller: coloque a pasta nas exceções. Assinatura de código (certificado pago) resolve, fica como evolução.
3. Abre uma janela preta (é o servidor: **não feche**) e o navegador abre sozinho. Fechar a janela preta encerra o programa.
4. Os dados ficam em `C:\Users\NOME\Biscuit3D`. Funciona sem internet.

## Atualizar versões
Gere um novo zip e entregue de novo. Os projetos e perfis ficam em `Biscuit3D` (fora da pasta do programa), então não se perdem ao trocar a pasta.
