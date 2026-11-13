import type { ParamMeta, Perfil } from "../types";

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

export default function PainelPerfil(p: Props) {
  const atual = p.perfis.find((x) => x.id === p.perfilId);
  const grupos = Array.from(new Set(p.metas.map((m) => m.grupo)));
  const origem = (p.perfil.origem ?? {}) as Record<string, string>;
  return (
    <div className="painel-perfil">
      <div className="linha">
        <select value={p.perfilId} onChange={(e) => p.onSelecionar(e.target.value)}>
          {p.perfis.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </div>
      <div className="linha botoes">
        <button onClick={p.onSalvar} disabled={!atual || atual.protegido || !p.alterado} title={atual?.protegido ? "O perfil padrão é protegido: use 'Salvar como novo'" : ""}>Salvar</button>
        <button onClick={p.onSalvarComo}>Salvar como novo</button>
        <button className="perigo" onClick={p.onExcluir} disabled={!atual || atual.protegido}>Excluir</button>
      </div>
      {p.alterado && <p className="dica">Há alterações não salvas neste perfil (elas já valem para o próximo modelo gerado).</p>}
      {grupos.map((g) => (
        <fieldset key={g}>
          <legend>{g}</legend>
          {p.metas.filter((m) => m.grupo === g).map((m) => {
            const v = p.perfil[m.chave];
            return (
              <div key={m.chave} className="param">
                <label>
                  <span>{m.titulo}{m.unidade && <em> ({m.unidade})</em>}
                    <i className={`origem o-${origem[m.chave] ?? m.origem}`}>{origem[m.chave] ?? m.origem}</i></span>
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
