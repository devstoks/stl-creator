import { useMemo, useRef, useState } from "react";
import type { Papel, Vetor } from "../types";

const COR: Record<Papel, string> = { externo: "#1d6fdc", detalhe: "#e8590c", ignorar: "#8a8f98" };
const PROXIMO: Record<Papel, Papel> = { ignorar: "externo", externo: "detalhe", detalhe: "ignorar" };

interface Props {
  imagemUrl: string;
  vetor: Vetor;
  papeis: Record<number, Papel>;
  onPapel: (id: number, papel: Papel) => void;
  mostrarImagem: boolean;
  mostrarContornosIgnorados: boolean;
  selecionado: number | null;
  onSelecionar: (id: number | null) => void;
}

export default function EditorContornos(p: Props) {
  const { vetor } = p;
  const [vb, setVb] = useState({ x: 0, y: 0, w: vetor.largura, h: vetor.altura });
  const arrasto = useRef<{ x: number; y: number; vb: typeof vb; moveu: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useMemo(() => setVb({ x: 0, y: 0, w: vetor.largura, h: vetor.altura }), [vetor.largura, vetor.altura]);

  const caminhos = useMemo(
    () => vetor.contornos.map((c) => ({ id: c.id, d: "M" + c.pontos.map(([x, y]) => `${x},${y}`).join(" L") + " Z" })),
    [vetor.contornos]
  );

  const zoom = (ev: React.WheelEvent) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const fx = (ev.clientX - r.left) / r.width, fy = (ev.clientY - r.top) / r.height;
    const k = ev.deltaY < 0 ? 0.85 : 1 / 0.85;
    setVb((v) => {
      const w = Math.min(Math.max(v.w * k, 20), vetor.largura * 6);
      const h = w * (v.h / v.w);
      return { x: v.x + (v.w - w) * fx, y: v.y + (v.h - h) * fy, w, h };
    });
  };
  const inicio = (ev: React.PointerEvent) => {
    arrasto.current = { x: ev.clientX, y: ev.clientY, vb, moveu: false };
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
  };
  const mover = (ev: React.PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    const r = svgRef.current!.getBoundingClientRect();
    const dx = ((ev.clientX - a.x) / r.width) * a.vb.w, dy = ((ev.clientY - a.y) / r.height) * a.vb.h;
    if (Math.abs(ev.clientX - a.x) + Math.abs(ev.clientY - a.y) > 4) a.moveu = true;
    if (a.moveu) setVb({ ...a.vb, x: a.vb.x - dx, y: a.vb.y - dy });
  };
  const fim = () => { setTimeout(() => (arrasto.current = null), 0); };
  const clicar = (id: number) => {
    if (arrasto.current?.moveu) return;
    p.onSelecionar(id);
    p.onPapel(id, PROXIMO[p.papeis[id] ?? "ignorar"]);
  };
  const escala = vb.w / (svgRef.current?.getBoundingClientRect().width || vb.w);

  return (
    <div className="editor2d">
      <div className="barra-2d">
        <button onClick={() => setVb({ x: 0, y: 0, w: vetor.largura, h: vetor.altura })}>Ajustar à tela</button>
        <span>Roda do mouse = zoom · arraste = mover · clique num contorno = alterna Ignorar → Externo → Detalhe</span>
      </div>
      <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} onWheel={zoom} onPointerDown={inicio}
           onPointerMove={mover} onPointerUp={fim} className="svg2d">
        <rect x={0} y={0} width={vetor.largura} height={vetor.altura} fill="#fff" />
        {p.mostrarImagem && <image href={p.imagemUrl} x={0} y={0} width={vetor.largura} height={vetor.altura} />}
        {caminhos.map(({ id, d }) => {
          const papel = p.papeis[id] ?? "ignorar";
          if (papel === "ignorar" && !p.mostrarContornosIgnorados) return null;
          return (
            <path key={id} d={d} fillRule="evenodd" onClick={() => clicar(id)}
                  fill={papel === "ignorar" ? "transparent" : COR[papel]} fillOpacity={papel === "ignorar" ? 0 : 0.18}
                  stroke={COR[papel]} strokeWidth={(p.selecionado === id ? 3.5 : papel === "ignorar" ? 1.2 : 2.4) * escala}
                  strokeDasharray={papel === "ignorar" ? `${4 * escala} ${3 * escala}` : undefined}
                  style={{ cursor: "pointer", pointerEvents: "all" }} />
          );
        })}
      </svg>
    </div>
  );
}
