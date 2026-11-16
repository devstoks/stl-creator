import type { ParamMeta, Perfil } from "../types";
import { Icone } from "./Icones";

interface Props {
  metas: ParamMeta[];
  perfil: Perfil;
  perfis: { id: string; nome: string; protegido: boolean }[];
  perfilId: string;
  alterado: boolean;
  onSelecionar: (id: string) => void;
  onMudar: (chave: string, valor: number | boolean) => void;
  onSalvar: () => void;
  onSalvarComo: () => void;
  onExcluir: () => void;
}

const ROTULO_ORIGEM: Record<string, string> = { medido: "medido nos seus STL", confirmado: "confirmado por você", pendente: "a confirmar" };

export default function PainelPerfil(p: Props) {
  const atual = p.perfis.find((x) => x.id === p.perfilId);
  const grupos = Array.from(new Set(p.metas.map((m) => m.grupo)));
  const origem = (p.perfil.origem ?? {}) as Record<string, string>;
  return (
    <div className="painel-perfil">
      <div className="linha">
        <select value={p.perfilId} onChange={(e) => p.onSelecionar(e.target.value)} aria-label="Perfil de fabricação">
          {p.perfis.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.protegido ? " (padrão da fábrica)" : ""}</option>)}
        </select>
      </div>
      <div className="linha botoes">
        <button className="sec" onClick={p.onSalvar} disabled={!atual || atual.protegido || !p.alterado}
                title={atual?.protegido ? "O perfil padrão é protegido: use “Salvar como novo”" : ""}>Salvar</button>
        <button className="sec" onClick={p.onSalvarComo}><Icone nome="mais" tam={15} /> Salvar como novo</button>
        <button className="sec perigo" onClick={p.onExcluir} disabled={!atual || atual.protegido}>Excluir</button>
      </div>
      {atual?.protegido && <p className="dica">O perfil padrão não pode ser alterado. Mude os valores à vontade e use <b>Salvar como novo</b> para guardar a sua versão.</p>}
      {p.alterado && <p className="dica">Você mudou valores neste perfil. Eles já valem para o próximo modelo gerado.</p>}
      {grupos.map((g) => (
        <fieldset key={g}>
          <legend>{g}</legend>
          {p.metas.filter((m) => m.grupo === g).map((m) => {
            const v = p.perfil[m.chave];
            const o = origem[m.chave] ?? m.origem;
            return (
              <div key={m.chave} className="param">
                <label>
                  <span>{m.titulo}{m.unidade && <em> ({m.unidade})</em>}
                    <i className={`origem o-${o}`}>{ROTULO_ORIGEM[o] ?? o}</i></span>
                  {typeof v === "boolean" ? (
                    <input type="checkbox" checked={v} onChange={(e) => p.onMudar(m.chave, e.target.checked)} />
                  ) : (
                    <input type="number" step="0.05" value={Number(v)} onChange={(e) => p.onMudar(m.chave, parseFloat(e.target.value))} />
                  )}
                </label>
                <small>{m.descricao}</small>
              </div>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
