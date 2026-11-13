import type { Resultado } from "../types";

const ROTULO = { APROVADO: "Aprovado", ATENCAO: "Atenção", BLOQUEADO: "Bloqueado" } as const;

export default function Validacao({ r }: { r: Resultado }) {
  return (
    <div className="validacao">
      <div className={`selo s-${r.status}`}>{ROTULO[r.status]}</div>
      <p className="dica">
        Verificações automáticas da malha. Elas <b>não</b> garantem a impressão: faça sempre um teste físico.
        Gerado em {r.tempo_s}s.
      </p>
      {r.desenho_mm && <p>Tamanho do desenho: <b>{r.desenho_mm[0]} × {r.desenho_mm[1]} mm</b></p>}
      {r.avisos.map((a, i) => <p key={i} className="aviso">⚠ {a}</p>)}
      {r.arquivos.map((a) => (
        <details key={a.nome} open={a.validacao.status !== "APROVADO"}>
          <summary><span className={`ponto s-${a.validacao.status}`} /> {a.nome}
            {a.validacao.extensao_mm && <> — {a.validacao.extensao_mm.map((v) => v.toFixed(2)).join(" × ")} mm</>}</summary>
          <ul>
            <li>Malha fechada: {a.validacao.watertight ? "sim" : "NÃO"} · peças separadas: {a.validacao.componentes}</li>
            <li>Faces: {a.validacao.faces} · volume: {a.validacao.volume_mm3 ?? "—"} mm³ · {((a.validacao.tamanho_bytes ?? 0) / 1e6).toFixed(2)} MB</li>
            {a.validacao.erros.map((e, i) => <li key={"e" + i} className="erro">✖ {e}</li>)}
            {a.validacao.avisos.filter((x) => !r.avisos.includes(x)).map((e, i) => <li key={"a" + i} className="aviso">⚠ {e}</li>)}
          </ul>
        </details>
      ))}
    </div>
  );
}
