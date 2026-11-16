import type { Resultado } from "../types";
import { Icone } from "./Icones";

const TITULO = {
  APROVADO: "Tudo certo! O modelo está pronto para salvar",
  ATENCAO: "Atenção: confira antes de imprimir",
  BLOQUEADO: "Ainda não dá para salvar este modelo",
} as const;
const EXPLICA = {
  APROVADO: "A malha 3D está fechada e passou em todas as verificações automáticas. Mesmo assim, faça sempre um teste de impressão.",
  ATENCAO: "O modelo foi gerado, mas há pontos que merecem um olhar. Leia os avisos abaixo e decida se está bom para o seu caso.",
  BLOQUEADO: "Encontramos um problema que pode estragar a impressão. Volte, ajuste a escolha das peças ou o tamanho e gere de novo.",
} as const;

export default function Validacao({ r }: { r: Resultado }) {
  const erros = r.arquivos.flatMap((a) => a.validacao.erros.map((e) => (r.arquivos.length > 1 ? `${a.nome}: ${e}` : e)));
  const avisos = Array.from(new Set([...r.avisos, ...r.arquivos.flatMap((a) => a.validacao.avisos)]));
  return (
    <div className={`cartao-status st-${r.status}`}>
      <div className="st-topo">
        <span className="st-icone"><Icone nome={r.status === "APROVADO" ? "check" : "alerta"} tam={22} /></span>
        <div>
          <strong>{TITULO[r.status]}</strong>
          <span className={`selo s-${r.status}`}>{r.status === "ATENCAO" ? "Atenção" : r.status === "APROVADO" ? "Aprovado" : "Bloqueado"}</span>
        </div>
      </div>
      <p className="dica">{EXPLICA[r.status]}</p>
      {r.desenho_mm && <p className="medida">Tamanho do desenho: <b>{r.desenho_mm[0]} × {r.desenho_mm[1]} mm</b></p>}
      {r.carimbo_liso && <p className="medida">Carimbo: <b>base reta e lisa</b>, sem paredes nem relevo, pronta para você modelar o desenho por cima.</p>}
      {r.relevo_auto && <p className="medida">Relevo do carimbo criado automaticamente: <b>{r.relevo_auto.area_mm2} mm²</b> de detalhes em alto-relevo.</p>}
      {erros.length > 0 && <ul className="lista-msg erro">{erros.map((e, i) => <li key={i}>{e}</li>)}</ul>}
      {avisos.length > 0 && <ul className="lista-msg aviso">{avisos.map((e, i) => <li key={i}>{e}</li>)}</ul>}

      <details className="detalhes-tec">
        <summary>Ver detalhes técnicos</summary>
        {r.arquivos.map((a) => (
          <div key={a.nome} className="arq-tec">
            <b>{a.nome}</b>
            {a.validacao.extensao_mm && <> — {a.validacao.extensao_mm.map((v) => v.toFixed(2)).join(" × ")} mm</>}
            <ul>
              <li>Malha fechada: {a.validacao.watertight ? "sim" : "NÃO"} · peças separadas: {a.validacao.componentes}</li>
              <li>Faces: {a.validacao.faces} · volume: {a.validacao.volume_mm3 ?? "—"} mm³ · {((a.validacao.tamanho_bytes ?? 0) / 1e6).toFixed(2)} MB</li>
            </ul>
          </div>
        ))}
        <p className="dica">Gerado em {r.tempo_s}s. Estas verificações <b>não</b> garantem a impressão.</p>
      </details>
    </div>
  );
}
