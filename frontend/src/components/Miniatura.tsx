import { useMemo } from "react";
import type { Contorno } from "../types";

/** Desenho pequeno de um contorno, para a lista de peças. */
export default function Miniatura({ c, cor }: { c: Contorno; cor: string }) {
  const { d, vb } = useMemo(() => {
    const [x, y, w, h] = c.bbox;
    const m = Math.max(w, h) * 0.08 + 1;
    // desenha no máximo ~60 pontos, só para ficar leve
    const passo = Math.max(1, Math.floor(c.pontos.length / 60));
    const pts = c.pontos.filter((_, i) => i % passo === 0);
    return {
      d: "M" + pts.map(([px, py]) => `${px},${py}`).join(" L") + " Z",
      vb: `${x - m} ${y - m} ${w + 2 * m} ${h + 2 * m}`,
    };
  }, [c]);
  return (
    <svg className="mini" viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d={d} fill={cor} fillOpacity={0.25} stroke={cor} strokeWidth={Math.max(c.bbox[2], c.bbox[3]) * 0.04} strokeLinejoin="round" />
    </svg>
  );
}
