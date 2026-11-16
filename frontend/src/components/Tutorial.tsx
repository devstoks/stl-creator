import { useState } from "react";
import { Icone, Logo, type NomeIcone } from "./Icones";

const SLIDES: { icone: NomeIcone | "logo"; titulo: string; texto: string; itens?: string[] }[] = [
  {
    icone: "logo",
    titulo: "Bem-vindo ao Biscuit 3D Studio",
    texto: "Transforme um desenho em um cortador de biscuit pronto para imprimir em 3D. Você não precisa saber modelagem: o programa faz as contas e segue o padrão da sua fábrica.",
    itens: ["Tudo roda neste computador, sem internet e sem assinatura.", "São só 4 etapas, e o programa guia você em cada uma."],
  },
  {
    icone: "upload",
    titulo: "Etapa 1 · Escolha a imagem",
    texto: "Arraste uma imagem (PNG ou JPG) ou um arquivo SVG para a tela.",
    itens: [
      "Funciona melhor com desenhos de contorno bem claro.",
      "Fundo liso, transparente ou xadrez de “PNG sem fundo” tudo bem.",
      "Imagens grandes e nítidas dão contornos mais bonitos.",
    ],
  },
  {
    icone: "forma",
    titulo: "Etapa 2 · Clique na peça",
    texto: "O programa encontra os contornos do desenho sozinho. Você só diz qual deles vira o cortador.",
    itens: [
      "Forma: é o contorno que será cortado na massa. Clique no desenho ou numa das peças da lista.",
      "Ignorar: o que não deve entrar no modelo. Dá para desfazer sempre.",
      "Relevo à mão: só se você quiser levantar um detalhe específico (é opcional).",
    ],
  },
  {
    icone: "regua",
    titulo: "Etapa 3 · Produto e tamanho",
    texto: "Escolha o que quer criar e o tamanho do desenho em milímetros (10 mm = 1 cm).",
    itens: [
      "Cortador: só a peça que corta.",
      "Cortador + carimbo: duas peças que combinam. O carimbo sai como uma base reta e lisa, sem paredes, para você modelar por cima.",
      "Se preferir, o carimbo pode sair com o relevo (olhos, boca, linhas) criado automaticamente.",
      "Marcador: um disco pequeno com o desenho em relevo.",
      "As medidas de fabricação já vêm certas; só mexa nelas se precisar.",
    ],
  },
  {
    icone: "cubo",
    titulo: "Etapa 4 · Veja em 3D e salve",
    texto: "Gire o modelo com o mouse para conferir antes de imprimir.",
    itens: [
      "Aprovado: o modelo passou nas verificações automáticas.",
      "Atenção: leia o aviso antes de imprimir.",
      "Bloqueado: volte e ajuste a escolha das peças ou o tamanho.",
      "Salve o STL e abra no seu fatiador. Faça sempre um teste de impressão.",
    ],
  },
];

const GLOSSARIO: [string, string][] = [
  ["Cortador", "A peça com paredes finas que corta a massa no formato do desenho."],
  ["Carimbo", "Peça que acompanha o cortador. Por padrão sai como uma base reta e lisa, para você modelar o desenho por cima."],
  ["Base lisa", "Uma placa plana, sem paredes e sem relevo, com o formato do desenho."],
  ["Marcador", "Um disco pequeno com o desenho em relevo."],
  ["Forma", "O contorno externo do desenho. Define o formato do cortador."],
  ["Relevo", "Os detalhes levantados no carimbo (olhos, boca, linhas). É opcional: o carimbo pode sair liso ou com relevo automático."],
  ["Aba", "A borda plana na base do cortador, que se estende para fora da parede."],
  ["Perfil de fabricação", "O conjunto de medidas da fábrica (espessura da parede, altura, aba). O padrão foi medido nos seus modelos de referência."],
  ["STL", "O arquivo 3D que você leva para o fatiador/impressora."],
  ["Fatiador", "Programa que prepara o STL para a impressora (Bambu Studio, por exemplo)."],
  ["mm", "Milímetro. 10 mm = 1 cm."],
];

interface Props {
  aberto: boolean;
  onFechar: (naoMostrarMais: boolean) => void;
  abaInicial?: "tour" | "glossario";
}

export default function Tutorial({ aberto, onFechar, abaInicial = "tour" }: Props) {
  const [i, setI] = useState(0);
  const [aba, setAba] = useState<"tour" | "glossario">(abaInicial);
  const [nunca, setNunca] = useState(true);
  if (!aberto) return null;
  const s = SLIDES[i];
  const ultimo = i === SLIDES.length - 1;
  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Tutorial" onClick={() => onFechar(nunca)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <div className="abas-mini">
            <button className={aba === "tour" ? "on" : ""} onClick={() => setAba("tour")}>Como funciona</button>
            <button className={aba === "glossario" ? "on" : ""} onClick={() => setAba("glossario")}>Palavras que aparecem</button>
          </div>
          <button className="icone-btn" aria-label="Fechar" onClick={() => onFechar(nunca)}><Icone nome="fechar" tam={22} /></button>
        </div>

        {aba === "tour" ? (
          <>
            <div className="slide">
              <div className="slide-icone">{s.icone === "logo" ? <Logo tam={56} /> : <Icone nome={s.icone} tam={34} />}</div>
              <h2>{s.titulo}</h2>
              <p>{s.texto}</p>
              {s.itens && <ul>{s.itens.map((t) => <li key={t}>{t}</li>)}</ul>}
            </div>
            <div className="pontos">{SLIDES.map((_, k) => <button key={k} className={k === i ? "on" : ""} aria-label={`Passo ${k + 1}`} onClick={() => setI(k)} />)}</div>
            <div className="modal-rodape">
              <label className="check"><input type="checkbox" checked={nunca} onChange={(e) => setNunca(e.target.checked)} /> Não mostrar ao abrir</label>
              <div className="botoes">
                {i > 0 && <button className="sec" onClick={() => setI(i - 1)}>Voltar</button>}
                {!ultimo
                  ? <button className="principal" onClick={() => setI(i + 1)}>Próximo</button>
                  : <button className="principal" onClick={() => onFechar(nunca)}>Começar!</button>}
              </div>
            </div>
          </>
        ) : (
          <div className="glossario">
            <h2>Palavras que aparecem no programa</h2>
            <dl>{GLOSSARIO.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
            <div className="modal-rodape"><span /><button className="principal" onClick={() => onFechar(nunca)}>Entendi</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
