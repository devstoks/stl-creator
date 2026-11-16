import { Icone, type NomeIcone } from "./Icones";

export const PASSOS: { n: number; titulo: string; sub: string; icone: NomeIcone }[] = [
  { n: 1, titulo: "Imagem", sub: "Escolha o desenho", icone: "upload" },
  { n: 2, titulo: "Peças", sub: "Clique no que usar", icone: "forma" },
  { n: 3, titulo: "Produto", sub: "Tipo e tamanho", icone: "regua" },
  { n: 4, titulo: "Resultado", sub: "Veja em 3D e salve", icone: "cubo" },
];

interface Props {
  atual: number;
  /** maior etapa já liberada */
  liberado: number;
  onIr: (n: number) => void;
}

/** Lista vertical de etapas (barra lateral): feita ✓, atual em destaque, bloqueada com cadeado. */
export default function Passos({ atual, liberado, onIr }: Props) {
  return (
    <nav className="passos" aria-label="Etapas">
      {PASSOS.map((p) => {
        const feito = p.n < atual && p.n <= liberado;
        const ativo = p.n === atual;
        const bloqueado = p.n > liberado;
        return (
          <button key={p.n} className={`passo ${ativo ? "ativo" : ""} ${feito ? "feito" : ""}`} disabled={bloqueado}
                  onClick={() => onIr(p.n)} aria-current={ativo ? "step" : undefined} title={`${p.titulo} — ${p.sub}`}>
            <span className="bolinha">{feito ? <Icone nome="check" tam={17} /> : p.n}</span>
            <span className="passo-txt"><b>{p.titulo}</b><small>{p.sub}</small></span>
            {bloqueado && <Icone nome="cadeado" tam={15} />}
          </button>
        );
      })}
    </nav>
  );
}
