import { useEffect, useMemo, useRef, useState } from "react";
import type { Papel, PoligonoRelevo, Vetor } from "../types";
import { Icone } from "./Icones";

export const COR_PAPEL: Record<Papel, string> = { externo: "#0d9488", detalhe: "#f59e0b", ignorar: "#94a3b8" };
export const NOME_PAPEL: Record<Papel, string> = { externo: "Forma do cortador", detalhe: "Relevo à mão", ignorar: "Ignorar" };

interface Props {
  imagemUrl: string;
  vetor: Vetor;
  papeis: Record<number, Papel>;
  /** clique num contorno (a lógica de qual papel aplicar fica no App) */
  onClicar?: (id: number) => void;
  mostrarImagem: boolean;
  mostrarContornosIgnorados: boolean;
  selecionado: number | null;
  onSelecionar: (id: number | null) => void;
  somenteLeitura?: boolean;
  /** texto curto mostrado ao passar o mouse, depende da ferramenta ativa */
  dicaClique?: string;
  /** relevo automático calculado (px da imagem), desenhado em laranja por cima */
  relevoPrevia?: PoligonoRelevo[] | null;
  /** caixa [x, y, largura, altura] (px da imagem) para aproximar a visão; vazio = desenho inteiro */
  foco?: [number, number, number, number] | null;
}

export default function EditorContornos(p: Props) {
  const { vetor } = p;
  const [vb, setVb] = useState({ x: 0, y: 0, w: vetor.largura, h: vetor.altura });
  const [sobre, setSobre] = useState<number | null>(null);
  const arrasto = useRef<{ x: number; y: number; vb: typeof vb; moveu: boolean; id: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const ajustar = () => setVb({ x: 0, y: 0, w: vetor.largura, h: vetor.altura });
  const chaveFoco = p.foco ? p.foco.join(",") : "";
  useEffect(() => {
    if (p.foco) {
      const [x, y, w, h] = p.foco;
      const m = Math.max(w, h) * 0.12;
      setVb({ x: x - m, y: y - m, w: w + 2 * m, h: h + 2 * m });
    } else ajustar();
  }, [vetor.largura, vetor.altura, chaveFoco]); // eslint-disable-line react-hooks/exhaustive-deps

  const caminhos = useMemo(
    () => vetor.contornos.map((c) => ({ id: c.id, d: "M" + c.pontos.map(([x, y]) => `${x},${y}`).join(" L") + " Z" })),
    [vetor.contornos]
  );

  const zoomPor = (k: number, fx = 0.5, fy = 0.5) =>
    setVb((v) => {
      const w = Math.min(Math.max(v.w * k, 20), vetor.largura * 6);
      const h = w * (v.h / v.w);
      return { x: v.x + (v.w - w) * fx, y: v.y + (v.h - h) * fy, w, h };
    });
  const zoom = (ev: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    zoomPor(ev.deltaY < 0 ? 0.85 : 1 / 0.85, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
  };
  const inicio = (ev: React.PointerEvent) => {
    // Não capturamos o mouse aqui: capturar já no clique faz o navegador entregar o "click" ao SVG
    // e não ao contorno, e aí clicar numa peça não funcionaria. A captura só começa ao arrastar.
    arrasto.current = { x: ev.clientX, y: ev.clientY, vb, moveu: false, id: ev.pointerId };
  };
  const mover = (ev: React.PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    const r = svgRef.current!.getBoundingClientRect();
    const dx = ((ev.clientX - a.x) / r.width) * a.vb.w, dy = ((ev.clientY - a.y) / r.height) * a.vb.h;
    if (!a.moveu && Math.abs(ev.clientX - a.x) + Math.abs(ev.clientY - a.y) > 4) {
      a.moveu = true;
      try { svgRef.current!.setPointerCapture(a.id); } catch { /* sem captura: o arraste ainda funciona dentro do SVG */ }
    }
    if (a.moveu) setVb({ ...a.vb, x: a.vb.x - dx, y: a.vb.y - dy });
  };
  const fim = () => { setTimeout(() => (arrasto.current = null), 0); };
  const clicar = (id: number) => {
    if (arrasto.current?.moveu) return;
    p.onSelecionar(id);
    if (!p.somenteLeitura) p.onClicar?.(id);
  };
  const caminhoRelevo = useMemo(() => (p.relevoPrevia ?? []).map((q) =>
    [q.pontos, ...q.buracos].map((r) => "M" + r.map(([x, y]) => `${x},${y}`).join(" L") + " Z").join(" ")).join(" "),
    [p.relevoPrevia]);
  const escala = vb.w / (svgRef.current?.getBoundingClientRect().width || vb.w);

  return (
    <div className="editor2d">
      <div className="barra-2d">
        <button className="mini-btn" onClick={() => zoomPor(0.8)} title="Aproximar"><Icone nome="mais" tam={16} /></button>
        <button className="mini-btn" onClick={() => zoomPor(1.25)} title="Afastar"><span className="menos" /></button>
        <button className="mini-btn" onClick={() => setVb({ x: 0, y: 0, w: vetor.largura, h: vetor.altura })} title="Mostrar o desenho inteiro"><Icone nome="lupa" tam={16} /> Ver tudo</button>
        <span className="dica-barra"><Icone nome="mover" tam={15} /> Roda do mouse = zoom · arraste para mover</span>
      </div>
      <div className="stage2d">
        <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} onWheel={zoom} onPointerDown={inicio}
             onPointerMove={mover} onPointerUp={fim} className="svg2d">
          <rect x={0} y={0} width={vetor.largura} height={vetor.altura} fill="#fff" />
          {p.mostrarImagem && <image href={p.imagemUrl} x={0} y={0} width={vetor.largura} height={vetor.altura} />}
          {caminhos.map(({ id, d }) => {
            const papel = p.papeis[id] ?? "ignorar";
            if (papel === "ignorar" && !p.mostrarContornosIgnorados) return null;
            const destaque = sobre === id || p.selecionado === id;
            return (
              <path key={id} d={d} fillRule="evenodd" onClick={() => clicar(id)}
                    onPointerEnter={() => setSobre(id)} onPointerLeave={() => setSobre((s) => (s === id ? null : s))}
                    fill={papel === "ignorar" ? (sobre === id ? COR_PAPEL.externo : "transparent") : COR_PAPEL[papel]}
                    fillOpacity={papel === "ignorar" ? (sobre === id && !p.somenteLeitura ? 0.12 : 0) : sobre === id ? 0.34 : 0.24}
                    stroke={papel === "ignorar" && sobre === id && !p.somenteLeitura ? COR_PAPEL.externo : COR_PAPEL[papel]}
                    strokeWidth={(destaque ? 3.6 : papel === "ignorar" ? 1.2 : 2.6) * escala}
                    strokeDasharray={papel === "ignorar" ? `${4 * escala} ${3 * escala}` : undefined}
                    style={{ cursor: p.somenteLeitura ? "default" : "pointer", pointerEvents: p.somenteLeitura ? "none" : "all" }}>
                <title>{p.somenteLeitura ? `Peça #${id}` : `Peça #${id} · ${NOME_PAPEL[papel]}${p.dicaClique ? ` — ${p.dicaClique}` : ""}`}</title>
              </path>
            );
          })}
          {caminhoRelevo && <path d={caminhoRelevo} fillRule="evenodd" fill="#f59e0b" fillOpacity={0.78} stroke="#b45309"
                                  strokeWidth={1.2 * escala} style={{ pointerEvents: "none" }} />}
        </svg>
        {(!p.somenteLeitura || caminhoRelevo) && (
          <div className="legenda">
            {!p.somenteLeitura && (["externo", "detalhe", "ignorar"] as Papel[]).map((k) => (
              <span key={k}><i style={{ background: COR_PAPEL[k] }} />{NOME_PAPEL[k]}</span>
            ))}
            {caminhoRelevo && <span><i style={{ background: "#f59e0b" }} />Relevo automático</span>}
          </div>
        )}
      </div>
    </div>
  );
}
