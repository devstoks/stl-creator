import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import EditorContornos from "./components/EditorContornos";
import PainelPerfil from "./components/PainelPerfil";
import Validacao from "./components/Validacao";
import Visualizador3D from "./components/Visualizador3D";
import type { Papel, ParamMeta, ParamsVetorizacao, Perfil, Resultado, Tipo, Vetor } from "./types";

const PARAMS_VET: ParamsVetorizacao = {
  modo: "auto", limiar: null, inverter: false, suavizacao: 1, fechar_lacunas_px: 7, remover_ruido_px: 2,
  preencher_buracos: false, simplificacao_px: 1.2, area_minima_px: 400, recorte: null,
};

const converterPapeis = (p?: Record<string, Papel>): Record<number, Papel> =>
  Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [Number(k), v]));

export default function App() {
  const [saude, setSaude] = useState<string>("verificando…");
  const [perfis, setPerfis] = useState<{ id: string; nome: string; protegido: boolean }[]>([]);
  const [metas, setMetas] = useState<ParamMeta[]>([]);
  const [perfilId, setPerfilId] = useState("padrao-medido");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const perfilSalvo = useRef("");

  const [projeto, setProjeto] = useState<{ id: string; vetor: Vetor } | null>(null);
  const [papeis, setPapeis] = useState<Record<number, Papel>>({});
  const [passado, setPassado] = useState<Record<number, Papel>[]>([]);
  const [futuro, setFuturo] = useState<Record<number, Papel>[]>([]);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [paramsVet, setParamsVet] = useState<ParamsVetorizacao>(PARAMS_VET);
  const [mostrarImagem, setMostrarImagem] = useState(true);
  const [mostrarIgn, setMostrarIgn] = useState(true);

  const [tipo, setTipo] = useState<Tipo>("cortador");
  const [largura, setLargura] = useState(30);
  const [altura, setAltura] = useState<number | null>(null);
  const [manter, setManter] = useState(true);

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [versao, setVersao] = useState(0);
  const [arquivoVisto, setArquivoVisto] = useState("modelo.stl");
  const [aba, setAba] = useState<"2d" | "3d">("2d");
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");
  const [recentes, setRecentes] = useState<{ id: string; nome: string; tem_modelo: boolean }[]>([]);
  const [pastaExport, setPastaExport] = useState("");
  const [exportMsg, setExportMsg] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const semRevetorizar = useRef(true);

  const tratar = useCallback(async <T,>(rotulo: string, fn: () => Promise<T>): Promise<T | undefined> => {
    setErro(""); setOcupado(rotulo);
    try { return await fn(); } catch (e) { setErro((e as Error).message); } finally { setOcupado(""); }
  }, []);

  const carregarPerfil = useCallback(async (id: string) => {
    const p = await api.perfil(id);
    setPerfilId(id); setPerfil(p); perfilSalvo.current = JSON.stringify(p);
  }, []);

  const atualizarListas = useCallback(async () => {
    const [pf, pj] = await Promise.all([api.perfis(), api.projetos()]);
    setPerfis(pf.perfis); setMetas(pf.parametros); setRecentes(pj.projetos);
  }, []);

  useEffect(() => {
    api.saude().then((s) => setSaude(`Motor local ativo · ${Object.entries(s.dependencias).map(([k, v]) => `${k} ${v}`).join(" · ")}`))
      .catch(() => setSaude("Servidor local não encontrado"));
    tratar("Carregando", async () => { await atualizarListas(); await carregarPerfil("padrao-medido"); });
  }, [atualizarListas, carregarPerfil, tratar]);

  // ---------- importação / vetorização ----------
  const aplicarVetor = (v: Vetor) => {
    setPapeis(converterPapeis(v.papeis)); setPassado([]); setFuturo([]); setSelecionado(null);
  };
  const importar = (arq: File) => tratar("Importando e vetorizando…", async () => {
    const r = await api.importar(arq);
    semRevetorizar.current = true;
    setParamsVet(PARAMS_VET);
    setProjeto({ id: r.projeto_id, vetor: r }); aplicarVetor(r);
    setResultado(null); setAba("2d"); setExportMsg("");
    await atualizarListas();
  });

  useEffect(() => {
    if (!projeto || projeto.vetor.tipo_arquivo === "svg") return;
    if (semRevetorizar.current) { semRevetorizar.current = false; return; }
    const t = setTimeout(() => tratar("Vetorizando…", async () => {
      const v = await api.revetorizar(projeto.id, paramsVet);
      setProjeto({ id: projeto.id, vetor: v }); aplicarVetor(v);
    }), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsVet]);

  const restaurarVetor = () => { semRevetorizar.current = false; setParamsVet({ ...PARAMS_VET }); };

  const mudarPapel = (id: number, papel: Papel) => {
    setPassado((p) => [...p, papeis]); setFuturo([]);
    setPapeis((cur) => ({ ...cur, [id]: papel }));
  };
  const definirTodos = (papel: Papel) => {
    if (!projeto) return;
    setPassado((p) => [...p, papeis]); setFuturo([]);
    setPapeis(Object.fromEntries(projeto.vetor.contornos.map((c) => [c.id, papel])));
  };
  const desfazer = () => { if (!passado.length) return; setFuturo((f) => [papeis, ...f]); setPapeis(passado[passado.length - 1]); setPassado((p) => p.slice(0, -1)); };
  const refazer = () => { if (!futuro.length) return; setPassado((p) => [...p, papeis]); setPapeis(futuro[0]); setFuturo((f) => f.slice(1)); };

  // ---------- perfis ----------
  const alterado = perfil ? JSON.stringify(perfil) !== perfilSalvo.current : false;
  const mudarParam = (k: string, v: number | boolean) => setPerfil((p) => (p ? { ...p, [k]: Number.isNaN(v) ? 0 : v } : p));
  const salvarPerfil = () => tratar("Salvando perfil", async () => { await api.atualizarPerfil(perfilId, perfil!); perfilSalvo.current = JSON.stringify(perfil); await atualizarListas(); });
  const salvarComo = () => {
    const nome = window.prompt("Nome do novo perfil:", `${perfil?.nome ?? "Perfil"} (cópia)`);
    if (!nome) return;
    tratar("Salvando perfil", async () => {
      const r = await api.criarPerfil({ ...perfil!, nome }); await atualizarListas(); await carregarPerfil(r.id);
    });
  };
  const excluirPerfil = () => {
    if (!window.confirm("Excluir este perfil? Essa ação não pode ser desfeita.")) return;
    tratar("Excluindo perfil", async () => { await api.excluirPerfil(perfilId); await atualizarListas(); await carregarPerfil("padrao-medido"); });
  };

  // ---------- geração ----------
  const contagem = (papel: Papel) => Object.values(papeis).filter((p) => p === papel).length;
  const gerar = () => tratar("Gerando o modelo 3D…", async () => {
    const r = await api.gerar(projeto!.id, { tipo, papeis, perfil, largura_mm: largura, altura_mm: manter ? null : altura, manter_proporcao: manter });
    setResultado(r); setVersao((v) => v + 1); setArquivoVisto("modelo.stl"); setAba("3d"); setExportMsg("");
    await atualizarListas();
  });

  // ---------- projetos ----------
  const abrir = (id: string) => tratar("Abrindo projeto…", async () => {
    const p = await api.abrir(id);
    semRevetorizar.current = true;
    const ui = p.estado_ui ?? {};
    setProjeto({ id: p.id, vetor: p.vetor });
    setPapeis(converterPapeis(ui.papeis ?? p.vetor.papeis)); setPassado([]); setFuturo([]);
    setParamsVet(ui.paramsVet ?? PARAMS_VET);
    setTipo(ui.tipo ?? p.projeto?.requisicao?.tipo ?? "cortador");
    setLargura(ui.largura ?? p.projeto?.requisicao?.largura_mm ?? 30);
    setAltura(ui.altura ?? null); setManter(ui.manter ?? true);
    if (ui.perfil) setPerfil(ui.perfil);
    setResultado((p.projeto as any)?.resultado ?? null); setVersao((v) => v + 1);
    setAba("2d"); setExportMsg("");
  });
  useEffect(() => {
    if (!projeto) return;
    const t = setTimeout(() => { api.salvarEstado(projeto.id, { papeis, paramsVet, tipo, largura, altura, manter, perfil }).catch(() => {}); }, 800);
    return () => clearTimeout(t);
  }, [projeto, papeis, paramsVet, tipo, largura, altura, manter, perfil]);

  const exportar = () => tratar("Exportando…", async () => {
    const r = await api.exportar(projeto!.id, pastaExport.trim() || null);
    setExportMsg(`Salvo em: ${r.pasta}  (${r.arquivos.join(", ")})`);
  });

  const podeGerar = !!projeto && !!perfil && (tipo === "marcador" ? contagem("externo") + contagem("detalhe") > 0 : contagem("externo") > 0);
  const nomeVisto = resultado?.arquivos.find((a) => a.nome === arquivoVisto) ? arquivoVisto : "modelo.stl";
  const bloqueado = resultado?.status === "BLOQUEADO";

  return (
    <div className="app"
         onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
         onDragLeave={() => setArrastando(false)}
         onDrop={(e) => { e.preventDefault(); setArrastando(false); const f = e.dataTransfer.files[0]; if (f) importar(f); }}>
      <header>
        <h1>Biscuit 3D Studio</h1>
        <span className="status">{saude}</span>
        <select value="" onChange={(e) => e.target.value && abrir(e.target.value)}>
          <option value="">Projetos recentes…</option>
          {recentes.map((r) => <option key={r.id} value={r.id}>{r.nome}{r.tem_modelo ? " ✓" : ""}</option>)}
        </select>
      </header>
      {ocupado && <div className="faixa ocupado">{ocupado}</div>}
      {erro && <div className="faixa erro" onClick={() => setErro("")}>{erro} <small>(clique para fechar)</small></div>}

      <div className="corpo">
        <aside>
          <section>
            <h2><b>1</b> Importar imagem ou SVG</h2>
            <label className={`soltar ${arrastando ? "ativo" : ""}`}>
              Arraste aqui ou clique para escolher<br /><small>PNG, JPG ou SVG · tudo é processado neste computador</small>
              <input type="file" accept=".png,.jpg,.jpeg,.svg" hidden onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
            </label>
          </section>

          {projeto && projeto.vetor.tipo_arquivo !== "svg" && (
            <section>
              <h2><b>2</b> Vetorização</h2>
              <p className="dica">Modo usado: <b>{projeto.vetor.modo_usado}</b>. Se o contorno ficou ruim, ajuste abaixo; a revisão é automática.</p>
              <div className="param"><label><span>Como separar o desenho do fundo</span>
                <select value={paramsVet.modo} onChange={(e) => setParamsVet({ ...paramsVet, modo: e.target.value as ParamsVetorizacao["modo"] })}>
                  <option value="auto">Automático</option><option value="saturacao">Cores (ignora fundo cinza/xadrez)</option>
                  <option value="limiar">Claro/escuro (desenho preto no branco)</option><option value="alfa">Transparência do PNG</option>
                </select></label></div>
              <Slider rot="Corte (limiar)" v={paramsVet.limiar ?? (paramsVet.modo === "saturacao" ? 40 : 128)} min={1} max={254} on={(v) => setParamsVet({ ...paramsVet, limiar: v })} />
              <Slider rot="Suavização" v={paramsVet.suavizacao} min={0} max={6} step={0.5} on={(v) => setParamsVet({ ...paramsVet, suavizacao: v })} />
              <Slider rot="Simplificação do contorno" v={paramsVet.simplificacao_px} min={0} max={8} step={0.2} on={(v) => setParamsVet({ ...paramsVet, simplificacao_px: v })} />
              <Slider rot="Fechar pequenas lacunas" v={paramsVet.fechar_lacunas_px} min={0} max={40} on={(v) => setParamsVet({ ...paramsVet, fechar_lacunas_px: v })} />
              <Slider rot="Remover ruído / pequenas ilhas (área mínima)" v={paramsVet.area_minima_px} min={50} max={20000} step={50} on={(v) => setParamsVet({ ...paramsVet, area_minima_px: v })} />
              <label className="check"><input type="checkbox" checked={paramsVet.inverter} onChange={(e) => setParamsVet({ ...paramsVet, inverter: e.target.checked })} /> Inverter claro/escuro</label>
              <label className="check"><input type="checkbox" checked={paramsVet.preencher_buracos} onChange={(e) => setParamsVet({ ...paramsVet, preencher_buracos: e.target.checked })} /> Preencher buracos internos (corpo branco etc.)</label>
              <button onClick={restaurarVetor}>Restaurar vetorização original</button>
            </section>
          )}

          {projeto && (
            <section>
              <h2><b>3</b> Revisar contornos</h2>
              <p className="dica">Clique no contorno (na imagem ao lado) ou use os botões. <b style={{ color: "#1d6fdc" }}>Externo</b> = forma do cortador · <b style={{ color: "#e8590c" }}>Detalhe</b> = relevo do carimbo · Ignorar = fora.</p>
              <div className="botoes">
                <button onClick={desfazer} disabled={!passado.length}>Desfazer</button>
                <button onClick={refazer} disabled={!futuro.length}>Refazer</button>
                <button onClick={() => definirTodos("ignorar")}>Ignorar todos</button>
                {tipo === "marcador" && <button onClick={() => definirTodos("detalhe")}>Todos como detalhe</button>}
              </div>
              <div className="lista-contornos">
                {projeto.vetor.contornos.slice(0, 80).map((c) => (
                  <div key={c.id} className={`item ${selecionado === c.id ? "sel" : ""}`} onClick={() => setSelecionado(c.id)}>
                    <span>#{c.id} · {Math.round(c.bbox[2])}×{Math.round(c.bbox[3])}{c.pai !== null ? ` · dentro de #${c.pai}` : ""}</span>
                    <select value={papeis[c.id] ?? "ignorar"} onChange={(e) => mudarPapel(c.id, e.target.value as Papel)}>
                      <option value="ignorar">Ignorar</option><option value="externo">Externo</option><option value="detalhe">Detalhe</option>
                    </select>
                  </div>
                ))}
                {projeto.vetor.contornos.length > 80 && <p className="dica">Mostrando os 80 maiores de {projeto.vetor.contornos.length}.</p>}
              </div>
            </section>
          )}

          {projeto && (
            <section>
              <h2><b>4</b> Produto e medidas</h2>
              <div className="param"><label><span>Tipo de produto</span>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
                  <option value="cortador">Cortador</option><option value="marcador">Marcador (disco com relevo)</option><option value="conjunto">Conjunto (cortador + carimbo)</option>
                </select></label></div>
              {tipo !== "marcador" ? (<>
                <div className="param"><label><span>Largura final do desenho (mm)</span>
                  <input type="number" min={5} value={largura} onChange={(e) => setLargura(parseFloat(e.target.value) || 0)} /></label>
                  <small>É o tamanho do contorno (do carimbo). O cortador fica um pouco maior: parede + aba.</small></div>
                <label className="check"><input type="checkbox" checked={manter} onChange={(e) => setManter(e.target.checked)} /> Manter proporção original</label>
                {!manter && <div className="param"><label><span>Altura final do desenho (mm)</span>
                  <input type="number" min={5} value={altura ?? ""} onChange={(e) => setAltura(parseFloat(e.target.value) || null)} /></label></div>}
              </>) : <p className="dica">No marcador o desenho é ajustado para caber no disco (diâmetro e margem estão no perfil).</p>}
            </section>
          )}

          {perfil && (
            <section>
              <h2><b>5</b> Perfil de fabricação</h2>
              <PainelPerfil metas={metas} perfil={perfil} perfis={perfis} perfilId={perfilId} alterado={alterado}
                onSelecionar={(id) => tratar("Carregando perfil", () => carregarPerfil(id))} onMudar={mudarParam}
                onSalvar={salvarPerfil} onSalvarComo={salvarComo} onExcluir={excluirPerfil} />
            </section>
          )}

          {projeto && (
            <section>
              <h2><b>6</b> Gerar e exportar</h2>
              <button className="principal" disabled={!podeGerar || !!ocupado} onClick={gerar}>Gerar modelo 3D</button>
              {!podeGerar && <p className="dica">{tipo === "marcador" ? "Marque ao menos um contorno como Detalhe." : "Marque um contorno como Externo."}</p>}
              {resultado && <Validacao r={resultado} />}
              {resultado && (
                <div className="exportar">
                  <input placeholder="Pasta de destino (vazio = ~/Biscuit3D/exports)" value={pastaExport} onChange={(e) => setPastaExport(e.target.value)} />
                  <button className="principal" onClick={exportar} disabled={bloqueado || !!ocupado}>Exportar STL + vetor + perfil</button>
                  {bloqueado && <p className="erro">Exportação bloqueada: corrija os erros acima.</p>}
                  {exportMsg && <p className="ok">{exportMsg}</p>}
                  <p className="dica">Nunca sobrescreve: se o nome já existir, cria "-2", "-3"… Baixar direto: {resultado.arquivos.map((a) => (
                    <a key={a.nome} href={api.urlArquivo(projeto!.id, a.nome, versao)} download>{a.nome}</a>))}</p>
                </div>
              )}
            </section>
          )}
        </aside>

        <main>
          <div className="abas">
            <button className={aba === "2d" ? "on" : ""} onClick={() => setAba("2d")}>Desenho 2D</button>
            <button className={aba === "3d" ? "on" : ""} onClick={() => setAba("3d")} disabled={!resultado}>Prévia 3D</button>
            {aba === "2d" && projeto && <>
              <label className="check"><input type="checkbox" checked={mostrarImagem} onChange={(e) => setMostrarImagem(e.target.checked)} /> imagem original</label>
              <label className="check"><input type="checkbox" checked={mostrarIgn} onChange={(e) => setMostrarIgn(e.target.checked)} /> contornos ignorados</label>
            </>}
            {aba === "3d" && resultado && resultado.arquivos.length > 1 && resultado.arquivos.map((a) => (
              <button key={a.nome} className={nomeVisto === a.nome ? "on" : ""} onClick={() => setArquivoVisto(a.nome)}>{a.nome.replace(".stl", "")}</button>))}
          </div>
          {aba === "2d" && (projeto
            ? <EditorContornos imagemUrl={api.urlOriginal(projeto.id)} vetor={projeto.vetor} papeis={papeis} onPapel={mudarPapel}
                mostrarImagem={mostrarImagem} mostrarContornosIgnorados={mostrarIgn} selecionado={selecionado} onSelecionar={setSelecionado} />
            : <div className="vazio grande">Comece arrastando uma imagem (PNG/JPG) ou um SVG para esta janela.</div>)}
          {aba === "3d" && <Visualizador3D url={projeto && resultado ? api.urlArquivo(projeto.id, nomeVisto, versao) : null} />}
        </main>
      </div>
    </div>
  );
}

function Slider({ rot, v, min, max, step = 1, on }: { rot: string; v: number; min: number; max: number; step?: number; on: (v: number) => void }) {
  return (
    <div className="param"><label><span>{rot}: <b>{v}</b></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(parseFloat(e.target.value))} /></label></div>
  );
}
