import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import EditorContornos, { COR_PAPEL, NOME_PAPEL } from "./components/EditorContornos";
import { Icone, IlustracaoProduto, Logo } from "./components/Icones";
import Miniatura from "./components/Miniatura";
import PainelPerfil from "./components/PainelPerfil";
import Passos from "./components/Passos";
import Tutorial from "./components/Tutorial";
import Validacao from "./components/Validacao";
import Visualizador3D from "./components/Visualizador3D";
import type { Papel, ParamMeta, ParamsRelevo, ParamsVetorizacao, Perfil, PreviaRelevo, Resultado, Tipo, Vetor } from "./types";

const PARAMS_VET: ParamsVetorizacao = {
  modo: "auto", limiar: null, inverter: false, suavizacao: 1, fechar_lacunas_px: 7, remover_ruido_px: 2,
  preencher_buracos: false, simplificacao_px: 1.2, area_minima_px: 400, recorte: null,
};
const RELEVO_PADRAO: ParamsRelevo = { ativo: true, modo: "ambos", detalhe: 5, linha_mm: null, margem_borda_mm: 0.5 };
const CHAVE_TUTORIAL = "biscuit3d_tutorial_visto";
const CHAVE_TEMA = "biscuit3d_tema";
const TAMANHOS_RAPIDOS = [30, 40, 50, 60, 80];
const PECAS_VISIVEIS = 12;

type Tema = "escuro" | "claro";
type Carimbo = "liso" | "relevo";

const converterPapeis = (p?: Record<string, Papel>): Record<number, Papel> =>
  Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [Number(k), v]));

const lerTutorialVisto = () => { try { return localStorage.getItem(CHAVE_TUTORIAL) === "1"; } catch { return false; } };
const gravarTutorialVisto = () => { try { localStorage.setItem(CHAVE_TUTORIAL, "1"); } catch { /* sem armazenamento: tudo bem */ } };
const lerTema = (): Tema => { try { return localStorage.getItem(CHAVE_TEMA) === "claro" ? "claro" : "escuro"; } catch { return "escuro"; } };

const PRODUTOS: { id: Tipo; titulo: string; texto: string }[] = [
  { id: "cortador", titulo: "Cortador", texto: "A peça com paredes finas que corta a massa no formato do desenho." },
  { id: "conjunto", titulo: "Cortador + carimbo", texto: "Duas peças que combinam: o cortador e uma base lisa para o carimbo." },
  { id: "marcador", titulo: "Marcador", texto: "Um disco pequeno com o desenho em relevo." },
];

const TEXTOS: Record<number, { t: string; d: string }> = {
  1: { t: "Escolha a imagem", d: "Arraste o desenho para a tela ou clique para procurar no computador." },
  2: { t: "Escolha a peça do cortador", d: "Clique no desenho ao lado, ou numa das peças abaixo, para usá-la como forma." },
  3: { t: "O que você quer criar?", d: "Escolha o produto e o tamanho. As medidas de fabricação já estão certas." },
  4: { t: "Confira o modelo 3D", d: "Gire o modelo ao lado para conferir. Se estiver bom, baixe os arquivos." },
};

const FERRAMENTAS: { id: Papel; nome: string; texto: string }[] = [
  { id: "externo", nome: "Forma", texto: "Clique na peça que será cortada." },
  { id: "ignorar", nome: "Ignorar", texto: "Clique no que deve ficar de fora." },
  { id: "detalhe", nome: "Relevo à mão", texto: "Levanta um detalhe específico (opcional). O carimbo liso não usa relevo." },
];

export default function App() {
  const [saude, setSaude] = useState<{ ok: boolean | null; texto: string }>({ ok: null, texto: "Verificando o motor local…" });
  const [perfis, setPerfis] = useState<{ id: string; nome: string; protegido: boolean }[]>([]);
  const [metas, setMetas] = useState<ParamMeta[]>([]);
  const [perfilId, setPerfilId] = useState("padrao-medido");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const perfilSalvo = useRef("");

  const [tema, setTema] = useState<Tema>(lerTema);
  const [passo, setPasso] = useState(1);
  const [projeto, setProjeto] = useState<{ id: string; vetor: Vetor } | null>(null);
  const [papeis, setPapeis] = useState<Record<number, Papel>>({});
  const [passado, setPassado] = useState<Record<number, Papel>[]>([]);
  const [futuro, setFuturo] = useState<Record<number, Papel>[]>([]);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [paramsVet, setParamsVet] = useState<ParamsVetorizacao>(PARAMS_VET);
  const [ferramenta, setFerramenta] = useState<Papel>("externo");
  const [varias, setVarias] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [mostrarImagem, setMostrarImagem] = useState(true);
  const [mostrarIgn, setMostrarIgn] = useState(true);

  const [tipo, setTipo] = useState<Tipo>("cortador");
  const [largura, setLargura] = useState(30);
  const [altura, setAltura] = useState<number | null>(null);
  const [manter, setManter] = useState(true);
  const [carimbo, setCarimbo] = useState<Carimbo>("liso");

  const [relevoAuto, setRelevoAuto] = useState<ParamsRelevo>(RELEVO_PADRAO);
  const [previa, setPrevia] = useState<PreviaRelevo | null>(null);
  const [previaCarregando, setPreviaCarregando] = useState(false);
  const [previaErro, setPreviaErro] = useState("");

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [versao, setVersao] = useState(0);
  const [arquivoVisto, setArquivoVisto] = useState("modelo.stl");
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");
  const [recentes, setRecentes] = useState<{ id: string; nome: string; tem_modelo: boolean }[]>([]);
  const [pastaExport, setPastaExport] = useState("");
  const [exportMsg, setExportMsg] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [tutorial, setTutorial] = useState<{ aberto: boolean; aba: "tour" | "glossario"; chave: number }>({
    aberto: !lerTutorialVisto(), aba: "tour", chave: 0,
  });
  const semRevetorizar = useRef(true);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try { localStorage.setItem(CHAVE_TEMA, tema); } catch { /* sem armazenamento: tudo bem */ }
  }, [tema]);

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
    api.saude().then((s) => setSaude({ ok: true, texto: `Motor local ativo · ${Object.entries(s.dependencias).map(([k, v]) => `${k} ${v}`).join(" · ")}` }))
      .catch(() => setSaude({ ok: false, texto: "Servidor local não encontrado" }));
    tratar("Carregando…", async () => { await atualizarListas(); await carregarPerfil("padrao-medido"); });
  }, [atualizarListas, carregarPerfil, tratar]);

  const abrirTutorial = (aba: "tour" | "glossario" = "tour") => setTutorial((t) => ({ aberto: true, aba, chave: t.chave + 1 }));
  const fecharTutorial = (naoMostrar: boolean) => { if (naoMostrar) gravarTutorialVisto(); setTutorial((t) => ({ ...t, aberto: false })); };

  // ---------- importação / vetorização ----------
  const aplicarVetor = (v: Vetor) => {
    setPapeis(converterPapeis(v.papeis)); setPassado([]); setFuturo([]); setSelecionado(null);
  };
  const importar = (arq: File) => tratar("Lendo a imagem e encontrando os contornos…", async () => {
    const r = await api.importar(arq);
    semRevetorizar.current = true;
    setParamsVet(PARAMS_VET);
    setProjeto({ id: r.projeto_id, vetor: r }); aplicarVetor(r);
    setResultado(null); setExportMsg(""); setFerramenta("externo"); setVarias(false); setVerTodas(false);
    setPasso(2);
    await atualizarListas();
  });

  useEffect(() => {
    if (!projeto || projeto.vetor.tipo_arquivo === "svg") return;
    if (semRevetorizar.current) { semRevetorizar.current = false; return; }
    const t = setTimeout(() => tratar("Atualizando os contornos…", async () => {
      const v = await api.revetorizar(projeto.id, paramsVet);
      setProjeto({ id: projeto.id, vetor: v }); aplicarVetor(v);
    }), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsVet]);

  const restaurarVetor = () => { semRevetorizar.current = false; setParamsVet({ ...PARAMS_VET }); };

  // ---------- escolha das peças ----------
  const aplicarPapeis = (novos: Record<number, Papel>) => { setPassado((p) => [...p, papeis]); setFuturo([]); setPapeis(novos); };
  const mudarPapel = (id: number, papel: Papel) => aplicarPapeis({ ...papeis, [id]: papel });
  const clicarContorno = (id: number) => {
    const atual = papeis[id] ?? "ignorar";
    if (ferramenta === "externo") {
      if (varias) return mudarPapel(id, atual === "externo" ? "ignorar" : "externo");
      const novos: Record<number, Papel> = {};
      for (const [k, v] of Object.entries(papeis)) novos[Number(k)] = v === "externo" ? "ignorar" : v;
      novos[id] = "externo";
      return aplicarPapeis(novos);
    }
    if (ferramenta === "detalhe") return mudarPapel(id, atual === "detalhe" ? "ignorar" : "detalhe");
    return mudarPapel(id, "ignorar");
  };
  const definirTodos = (papel: Papel) => {
    if (!projeto) return;
    aplicarPapeis(Object.fromEntries(projeto.vetor.contornos.map((c) => [c.id, papel])));
  };
  const desfazer = () => { if (!passado.length) return; setFuturo((f) => [papeis, ...f]); setPapeis(passado[passado.length - 1]); setPassado((p) => p.slice(0, -1)); };
  const refazer = () => { if (!futuro.length) return; setPassado((p) => [...p, papeis]); setPapeis(futuro[0]); setFuturo((f) => f.slice(1)); };

  // ---------- perfis ----------
  const alterado = perfil ? JSON.stringify(perfil) !== perfilSalvo.current : false;
  const mudarParam = (k: string, v: number | boolean) => setPerfil((p) => (p ? { ...p, [k]: Number.isNaN(v) ? 0 : v } : p));
  const salvarPerfil = () => tratar("Salvando perfil…", async () => { await api.atualizarPerfil(perfilId, perfil!); perfilSalvo.current = JSON.stringify(perfil); await atualizarListas(); });
  const salvarComo = () => {
    const nome = window.prompt("Dê um nome para o novo perfil:", `${perfil?.nome ?? "Perfil"} (cópia)`);
    if (!nome) return;
    tratar("Salvando perfil…", async () => {
      const r = await api.criarPerfil({ ...perfil!, nome }); await atualizarListas(); await carregarPerfil(r.id);
    });
  };
  const excluirPerfil = () => {
    if (!window.confirm("Excluir este perfil? Essa ação não pode ser desfeita.")) return;
    tratar("Excluindo perfil…", async () => { await api.excluirPerfil(perfilId); await atualizarListas(); await carregarPerfil("padrao-medido"); });
  };

  // ---------- geração ----------
  const contagem = (papel: Papel) => Object.values(papeis).filter((p) => p === papel).length;
  const nForma = contagem("externo"), nRelevo = contagem("detalhe");
  const podeGerar = !!projeto && !!perfil && (tipo === "marcador" ? nForma + nRelevo > 0 : nForma > 0);
  const ehSvg = projeto?.vetor.tipo_arquivo === "svg";
  // no SVG não existe relevo automático: o carimbo sempre sai liso
  const carimboLiso = tipo === "conjunto" && (carimbo === "liso" || !!ehSvg);
  const relevoAutoLigado = tipo === "conjunto" && carimbo === "relevo" && !ehSvg;
  const focoForma = useMemo<[number, number, number, number] | null>(() => {
    if (!projeto) return null;
    const cs = projeto.vetor.contornos.filter((c) => papeis[c.id] === "externo");
    if (!cs.length) return null;
    const x0 = Math.min(...cs.map((c) => c.bbox[0])), y0 = Math.min(...cs.map((c) => c.bbox[1]));
    const x1 = Math.max(...cs.map((c) => c.bbox[0] + c.bbox[2])), y1 = Math.max(...cs.map((c) => c.bbox[1] + c.bbox[3]));
    return [x0, y0, x1 - x0, y1 - y0];
  }, [projeto, papeis]);
  useEffect(() => {
    if (passo !== 3 || !relevoAutoLigado || !relevoAuto.ativo || !projeto || !perfil || nForma === 0) {
      setPrevia(null); setPreviaErro(""); setPreviaCarregando(false); return;
    }
    let vivo = true;
    const t = setTimeout(async () => {
      setPreviaCarregando(true); setPreviaErro("");
      try {
        const r = await api.previaRelevo(projeto.id, { papeis, perfil, largura_mm: largura, params: relevoAuto });
        if (vivo) setPrevia(r);
      } catch (e) {
        if (vivo) { setPreviaErro((e as Error).message); setPrevia(null); }
      } finally { if (vivo) setPreviaCarregando(false); }
    }, 500);
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, relevoAutoLigado, relevoAuto, projeto?.id, papeis, largura, perfil, nForma]);

  const gerar = async () => {
    const ok = await tratar("Gerando o modelo 3D…", async () => {
      const r = await api.gerar(projeto!.id, { tipo, papeis, perfil, largura_mm: largura, altura_mm: manter ? null : altura, manter_proporcao: manter,
        carimbo_liso: carimboLiso, relevo_auto: { ...relevoAuto, ativo: relevoAutoLigado && relevoAuto.ativo } });
      setResultado(r); setVersao((v) => v + 1); setArquivoVisto("modelo.stl"); setExportMsg("");
      await atualizarListas();
      return true;
    });
    if (ok) setPasso(4);
  };

  // ---------- projetos ----------
  const abrir = (id: string) => tratar("Abrindo projeto…", async () => {
    const p = await api.abrir(id);
    semRevetorizar.current = true;
    const ui = p.estado_ui ?? {};
    setProjeto({ id: p.id, vetor: p.vetor });
    setPapeis(converterPapeis(ui.papeis ?? p.vetor.papeis)); setPassado([]); setFuturo([]); setVerTodas(false);
    setParamsVet(ui.paramsVet ?? PARAMS_VET);
    setTipo(ui.tipo ?? p.projeto?.requisicao?.tipo ?? "cortador");
    setLargura(ui.largura ?? p.projeto?.requisicao?.largura_mm ?? 30);
    setAltura(ui.altura ?? null); setManter(ui.manter ?? true);
    setCarimbo(ui.carimbo === "relevo" ? "relevo" : "liso");
    setRelevoAuto(ui.relevoAuto ?? RELEVO_PADRAO); setPrevia(null);
    if (ui.perfil) setPerfil(ui.perfil);
    const res = (p.projeto as { resultado?: Resultado } | null)?.resultado ?? null;
    setResultado(res); setVersao((v) => v + 1); setArquivoVisto("modelo.stl"); setExportMsg("");
    setPasso(res ? 4 : 2);
  });
  const novoProjeto = () => {
    if (projeto && !window.confirm("Começar um projeto novo? O projeto atual fica salvo em “Meus projetos”.")) return;
    semRevetorizar.current = true;
    setProjeto(null); setPapeis({}); setPassado([]); setFuturo([]); setResultado(null); setExportMsg("");
    setSelecionado(null); setParamsVet(PARAMS_VET); setRelevoAuto(RELEVO_PADRAO); setCarimbo("liso"); setPrevia(null); setPasso(1);
  };
  useEffect(() => {
    if (!projeto) return;
    const t = setTimeout(() => { api.salvarEstado(projeto.id, { papeis, paramsVet, tipo, largura, altura, manter, perfil, relevoAuto, carimbo }).catch(() => {}); }, 800);
    return () => clearTimeout(t);
  }, [projeto, papeis, paramsVet, tipo, largura, altura, manter, perfil, relevoAuto, carimbo]);

  const exportar = () => tratar("Salvando os arquivos…", async () => {
    const r = await api.exportar(projeto!.id, pastaExport.trim() || null);
    setExportMsg(`Salvo em: ${r.pasta}  (${r.arquivos.join(", ")})`);
  });

  // ---------- navegação ----------
  const liberado = !projeto ? 1 : resultado ? 4 : nForma + nRelevo > 0 ? 3 : 2;
  const ir = (n: number) => { if (n <= liberado) setPasso(n); };
  const nomeAmigavel = (arq: string) =>
    arq === "cortador.stl" ? "Cortador" : arq === "carimbo.stl" ? "Carimbo"
      : tipo === "marcador" ? "Marcador" : tipo === "conjunto" ? "Conjunto" : "Cortador";
  const nomeVisto = resultado?.arquivos.find((a) => a.nome === arquivoVisto) ? arquivoVisto : "modelo.stl";
  const bloqueado = resultado?.status === "BLOQUEADO";
  const diametro = perfil ? Number(perfil.marcador_diametro_mm) : 15;
  const nomeProjeto = recentes.find((r) => r.id === projeto?.id)?.nome ?? (projeto ? "Projeto atual" : "Novo projeto");

  const pecas = useMemo(() => {
    if (!projeto) return [];
    const ord = [...projeto.vetor.contornos].sort((a, b) => b.area - a.area);
    if (verTodas) return ord.slice(0, 80);
    const topo = ord.slice(0, PECAS_VISIVEIS);
    const extras = ord.slice(PECAS_VISIVEIS).filter((c) => (papeis[c.id] ?? "ignorar") !== "ignorar");
    return [...topo, ...extras];
  }, [projeto, papeis, verTodas]);
  const totalPecas = projeto?.vetor.contornos.length ?? 0;

  const soltar = (e: React.DragEvent) => {
    e.preventDefault(); setArrastando(false);
    const f = e.dataTransfer.files[0]; if (f) importar(f);
  };
  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) importar(f); e.target.value = "";
  };

  const bloqueante = ocupado.startsWith("Gerando") || ocupado.startsWith("Lendo");
  const dicaFerramenta = FERRAMENTAS.find((f) => f.id === ferramenta)!.texto;

  const dicaRodape =
    passo === 1 ? (projeto ? "Imagem pronta! Pode continuar." : "Escolha uma imagem para começar.")
    : passo === 2 ? (nForma + nRelevo > 0 ? "Pronto! Pode continuar." : "Clique numa peça do desenho para começar.")
    : passo === 3 ? (podeGerar ? "Confira e clique em Gerar modelo 3D." : "Volte e escolha uma peça como forma.")
    : "Quer mudar algo? Volte e gere de novo.";

  return (
    <div className="app" onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
         onDragLeave={(e) => { if (e.currentTarget === e.target) setArrastando(false); }} onDrop={soltar}>

      {/* ================= BARRA LATERAL ================= */}
      <aside className="lateral">
        <div className="marca"><Logo tam={40} /><div><h1>Biscuit 3D Studio</h1><span>Do desenho ao cortador 3D</span></div></div>

        <div className="rotulo">Etapas</div>
        <Passos atual={passo} liberado={liberado} onIr={ir} />

        <div className="rotulo">Meus projetos</div>
        <div className="lista-proj">
          {recentes.length === 0 && <p className="dica">Seus projetos aparecem aqui.</p>}
          {recentes.slice(0, 4).map((r) => (
            <button key={r.id} className={`proj ${projeto?.id === r.id ? "on" : ""}`} onClick={() => abrir(r.id)} title={r.nome}>
              <i className={r.tem_modelo ? "pronto" : ""} />
              <span><b>{r.nome}</b><small>{r.tem_modelo ? "Modelo pronto" : "Em andamento"}</small></span>
            </button>
          ))}
        </div>
        <button className="btn-novo" onClick={novoProjeto}><Icone nome="mais" tam={18} /><span>Novo projeto</span></button>

        <div className="lateral-fim">
          <div className="ajuda-card">
            <div className="ajuda-topo"><span className="ajuda-icone"><Icone nome="lampada" tam={20} /></span><b>Ajuda</b></div>
            <div className="ajuda-botoes">
              <button className="sec" onClick={() => abrirTutorial("tour")} title="Passo a passo em 1 minuto"><Icone nome="ajuda" tam={17} /> Tutorial</button>
              <button className="sec" onClick={() => abrirTutorial("glossario")} title="O que significa cada palavra"><Icone nome="livro" tam={17} /> Palavras</button>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= PALCO (CENTRO) ================= */}
      <div className="centro">
        <header className="topo-centro">
          <div className="caminho"><span>Meus projetos</span><i>/</i><b>{nomeProjeto}</b></div>
          <span className={`pilula-status ${saude.ok === false ? "off" : ""}`} title={saude.texto}>
            <i />{saude.ok === false ? "Servidor local desligado" : saude.ok ? "Pronto para usar" : "Verificando…"}
          </span>
          <button className="sec" onClick={() => setTema(tema === "escuro" ? "claro" : "escuro")} title="Trocar a aparência do programa">
            <Icone nome={tema === "escuro" ? "sol" : "lua"} tam={18} /> {tema === "escuro" ? "Tema claro" : "Tema escuro"}
          </button>
          <button className="sec" onClick={() => abrirTutorial("tour")}><Icone nome="ajuda" tam={18} /> Ajuda</button>
        </header>

        {ocupado && !bloqueante && <div className="faixa ocupado"><span className="spinner p" />{ocupado}</div>}
        {erro && (
          <div className="faixa erro" role="alert">
            <Icone nome="alerta" tam={20} /><span><b>Algo não saiu como esperado.</b> {erro}</span>
            <button className="icone-btn" aria-label="Fechar aviso" onClick={() => setErro("")}><Icone nome="fechar" tam={18} /></button>
          </div>
        )}

        {/* ---- etapa 1 ---- */}
        {passo === 1 && (
          <div className="cartao-palco">
            <label className={`dropzone ${arrastando ? "ativo" : ""}`}>
              {projeto
                ? <img className="dz-img" src={api.urlOriginal(projeto.id)} alt="Imagem carregada" />
                : <span className="dz-icone"><Icone nome="upload" tam={40} /></span>}
              <b>{projeto ? "Imagem carregada" : "Arraste a imagem para cá"}</b>
              <span className="dz-sub">{projeto ? "Para trocar, arraste outra imagem para cá ou clique." : "ou clique para escolher no computador"}</span>
              <span className="btn-fake"><Icone nome="upload" tam={18} /> {projeto ? "Trocar imagem" : "Escolher imagem"}</span>
              <small>PNG, JPG ou SVG · tudo é processado aqui, nada é enviado para a internet</small>
              <input type="file" accept=".png,.jpg,.jpeg,.svg" hidden onChange={escolherArquivo} />
            </label>
          </div>
        )}

        {/* ---- etapa 2 ---- */}
        {passo === 2 && projeto && (
          <>
            <div className="cartao-palco">
              <EditorContornos imagemUrl={api.urlOriginal(projeto.id)} vetor={projeto.vetor} papeis={papeis}
                onClicar={clicarContorno} mostrarImagem={mostrarImagem} mostrarContornosIgnorados={mostrarIgn}
                selecionado={selecionado} onSelecionar={setSelecionado}
                dicaClique={ferramenta === "externo" ? "clique para usar como forma" : ferramenta === "detalhe" ? "clique para marcar como relevo" : "clique para ignorar"} />
            </div>
            <div className="acoes-palco">
              <button className="btn-acao" onClick={desfazer} disabled={!passado.length}><Icone nome="desfazer" tam={18} /> Desfazer</button>
              <button className="btn-acao" onClick={refazer} disabled={!futuro.length}><Icone nome="refazer" tam={18} /> Refazer</button>
              <button className="btn-acao" onClick={() => definirTodos("ignorar")} title="Desmarcar todas as peças"><Icone nome="limpar" tam={18} /> Limpar</button>
              <span className="sep" />
              <button className={`btn-acao alterna ${mostrarImagem ? "lig" : ""}`} aria-pressed={mostrarImagem} onClick={() => setMostrarImagem(!mostrarImagem)} title="Mostrar ou esconder a imagem original"><Icone nome="olho" tam={18} /> Imagem</button>
              <button className={`btn-acao alterna ${mostrarIgn ? "lig" : ""}`} aria-pressed={mostrarIgn} onClick={() => setMostrarIgn(!mostrarIgn)} title="Mostrar ou esconder o contorno das peças que você ignorou"><Icone nome="olho" tam={18} /> Ignoradas</button>
            </div>
          </>
        )}

        {/* ---- etapa 3 ---- */}
        {passo === 3 && projeto && (
          <>
            <div className="cartao-palco">
              <EditorContornos imagemUrl={api.urlOriginal(projeto.id)} vetor={projeto.vetor} papeis={papeis}
                mostrarImagem mostrarContornosIgnorados={false} selecionado={null} onSelecionar={setSelecionado}
                somenteLeitura relevoPrevia={previa?.poligonos} foco={focoForma} />
            </div>
            <div className="acoes-palco">
              <span className="info-palco"><Icone nome="info" tam={18} /> Esta é a peça escolhida{relevoAutoLigado && previa && previa.n_pecas > 0 ? ". Em laranja, o relevo do carimbo." : "."}</span>
              <span className="sep" />
              <button className="btn-acao" onClick={() => setPasso(2)}><Icone nome="voltar" tam={18} /> Mudar a peça</button>
            </div>
          </>
        )}

        {/* ---- etapa 4 ---- */}
        {passo === 4 && projeto && (
          <>
            {resultado && resultado.arquivos.length > 1 && (
              <div className="seletor-peca">
                <span>Ver no 3D:</span>
                <div className="segmentado">
                  {resultado.arquivos.map((a) => (
                    <button key={a.nome} className={nomeVisto === a.nome ? "on" : ""} onClick={() => setArquivoVisto(a.nome)}>{nomeAmigavel(a.nome)}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="cartao-palco">
              <Visualizador3D url={resultado ? api.urlArquivo(projeto.id, nomeVisto, versao) : null} tema={tema} />
            </div>
            {resultado && (
              <div className="acoes-palco">
                {[...resultado.arquivos].sort((a, b) => Number(a.nome === "modelo.stl") - Number(b.nome === "modelo.stl")).map((a) => {
                  const junto = a.nome === "modelo.stl" && resultado.arquivos.length > 1;
                  return (
                    <a key={a.nome} className={`${junto ? "btn-baixar-sec" : "btn-baixar"} ${bloqueado ? "off" : ""}`} href={bloqueado ? undefined : api.urlArquivo(projeto.id, a.nome, versao)} download={a.nome}>
                      <Icone nome="baixar" tam={20} /> {junto ? "Baixar os dois juntos" : `Baixar ${nomeAmigavel(a.nome).toLowerCase()}`} <small>.stl</small>
                    </a>
                  );
                })}
                {bloqueado && <span className="erro">Salvamento bloqueado: volte e corrija os problemas.</span>}
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= PAINEL DIREITO ================= */}
      <section className="direita" aria-label={`Passo ${passo}`}>
        <div className="direita-topo">
          <span className="etapa-tag">Passo {passo} de 4</span>
          <div className="progresso" aria-hidden="true">{[1, 2, 3, 4].map((n) => <i key={n} className={n <= passo ? "on" : ""} />)}</div>
          <h2>{TEXTOS[passo].t}</h2>
          <p>{TEXTOS[passo].d}</p>
        </div>

        <div className="direita-corpo">
          {/* ---- etapa 1 ---- */}
          {passo === 1 && (
            <>
              <div className="bloco dicas-lista">
                <h3 className="sub">Para ter um bom resultado</h3>
                <div className="dica-item"><span className="n">1</span><div><b>Contorno bem claro</b><p>Linhas definidas e boa separação do fundo dão o melhor resultado.</p></div></div>
                <div className="dica-item"><span className="n">2</span><div><b>Uma peça de cada vez</b><p>Se a imagem tem vários desenhos (uma cartela), você escolhe qual usar no passo 2.</p></div></div>
                <div className="dica-item"><span className="n">3</span><div><b>Imagem nítida</b><p>Quanto maior e mais nítida a imagem, mais bonito fica o contorno.</p></div></div>
              </div>
              {recentes.length > 0 && (
                <div className="bloco">
                  <h3 className="sub">Continuar um projeto</h3>
                  <div className="grade-recentes">
                    {recentes.slice(0, 6).map((r) => (
                      <button key={r.id} className="cartao-recente" onClick={() => abrir(r.id)}>
                        <span className="mini-thumb"><img src={api.urlOriginal(r.id)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} /></span>
                        <b>{r.nome}</b><small>{r.tem_modelo ? "Modelo 3D pronto" : "Em andamento"}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---- etapa 2 ---- */}
          {passo === 2 && projeto && (
            <>
              <div className="ferramentas" role="radiogroup" aria-label="Ferramenta">
                {FERRAMENTAS.map((f) => (
                  <button key={f.id} role="radio" aria-checked={ferramenta === f.id} className={`ferr ${ferramenta === f.id ? "on" : ""}`}
                          style={{ ["--cor" as string]: COR_PAPEL[f.id] }} onClick={() => setFerramenta(f.id)}>
                    <i />{f.nome}
                  </button>
                ))}
              </div>
              <p className="dica-ferr">{dicaFerramenta}</p>
              {ferramenta === "externo" && (
                <label className="check"><input type="checkbox" checked={varias} onChange={(e) => setVarias(e.target.checked)} /><span>Quero usar <b>várias peças juntas</b> como forma</span></label>
              )}

              <div className={`resumo ${nForma === 0 ? "alerta" : ""}`}>
                <b>{nForma}</b> forma{nForma === 1 ? "" : "s"} escolhida{nForma === 1 ? "" : "s"}
                {nRelevo > 0 && <> · <b>{nRelevo}</b> relevo{nRelevo === 1 ? "" : "s"} à mão</>}
                {nForma === 0 && <span> — escolha uma forma para continuar</span>}
              </div>

              <h3 className="sub">Peças encontradas <small>({totalPecas})</small></h3>
              <div className="grade-pecas">
                {pecas.map((c) => {
                  const papel = papeis[c.id] ?? "ignorar";
                  return (
                    <button key={c.id} className={`peca p-${papel} ${selecionado === c.id ? "sel" : ""}`}
                            onClick={() => { setSelecionado(c.id); clicarContorno(c.id); }}
                            title={c.pai !== null ? `Peça ${c.id} · dentro da peça ${c.pai}` : `Peça ${c.id} · peça principal`}>
                      <Miniatura c={c} cor={COR_PAPEL[papel]} />
                      <span className="peca-nome">Peça {c.id}</span>
                      <span className={`selo-papel ${papel}`}>{papel === "externo" ? "Forma" : papel === "detalhe" ? "Relevo" : "Ignorada"}</span>
                    </button>
                  );
                })}
              </div>
              {totalPecas > PECAS_VISIVEIS && (
                <button className="link" onClick={() => setVerTodas(!verTodas)}>{verTodas ? "Mostrar só as maiores" : `Ver todas as ${Math.min(totalPecas, 80)} peças`}</button>
              )}

              {projeto.vetor.tipo_arquivo !== "svg" && (
                <details className="avancado">
                  <summary><Icone nome="engrenagem" tam={18} /> O contorno ficou estranho? Ajustes da imagem</summary>
                  <p className="dica">Modo usado: <b>{projeto.vetor.modo_usado}</b>. Mexa nos controles e o programa refaz os contornos sozinho.</p>
                  <div className="param"><label><span>Como separar o desenho do fundo</span>
                    <select value={paramsVet.modo} onChange={(e) => setParamsVet({ ...paramsVet, modo: e.target.value as ParamsVetorizacao["modo"] })}>
                      <option value="auto">Automático (recomendado)</option><option value="saturacao">Por cor (ignora fundo cinza/xadrez)</option>
                      <option value="limiar">Claro e escuro (desenho preto no branco)</option><option value="alfa">Pela transparência do PNG</option>
                    </select></label></div>
                  <Slider rot="Sensibilidade do contorno" dica="Mude se faltou ou sobrou um pedaço do desenho." v={paramsVet.limiar ?? (paramsVet.modo === "saturacao" ? 40 : 128)} min={1} max={254} on={(v) => setParamsVet({ ...paramsVet, limiar: v })} />
                  <Slider rot="Suavizar bordas" v={paramsVet.suavizacao} min={0} max={6} step={0.5} on={(v) => setParamsVet({ ...paramsVet, suavizacao: v })} />
                  <Slider rot="Simplificar curvas" dica="Mais = contorno mais liso, porém menos fiel." v={paramsVet.simplificacao_px} min={0} max={8} step={0.2} on={(v) => setParamsVet({ ...paramsVet, simplificacao_px: v })} />
                  <Slider rot="Fechar pequenas falhas" v={paramsVet.fechar_lacunas_px} min={0} max={40} on={(v) => setParamsVet({ ...paramsVet, fechar_lacunas_px: v })} />
                  <Slider rot="Ignorar manchas pequenas" dica="Aumente para limpar sujeiras e pontinhos da imagem." v={paramsVet.area_minima_px} min={50} max={20000} step={50} on={(v) => setParamsVet({ ...paramsVet, area_minima_px: v })} />
                  <label className="check"><input type="checkbox" checked={paramsVet.inverter} onChange={(e) => setParamsVet({ ...paramsVet, inverter: e.target.checked })} /> Inverter claro e escuro</label>
                  <label className="check"><input type="checkbox" checked={paramsVet.preencher_buracos} onChange={(e) => setParamsVet({ ...paramsVet, preencher_buracos: e.target.checked })} /> Preencher buracos dentro das peças</label>
                  <button className="sec" onClick={restaurarVetor}>Voltar ao automático</button>
                </details>
              )}
            </>
          )}

          {/* ---- etapa 3 ---- */}
          {passo === 3 && projeto && (
            <>
              <h3 className="sub">Produto</h3>
              <div className="opcoes" role="radiogroup" aria-label="Produto">
                {PRODUTOS.map((pr) => (
                  <button key={pr.id} role="radio" aria-checked={tipo === pr.id} className={`opcao ${tipo === pr.id ? "on" : ""}`} onClick={() => setTipo(pr.id)}>
                    <IlustracaoProduto tipo={pr.id} />
                    <span><b>{pr.titulo}</b><small>{pr.texto}</small></span>
                    {tipo === pr.id && <span className="marca-ok"><Icone nome="check" tam={16} /></span>}
                  </button>
                ))}
              </div>

              {tipo === "conjunto" && (
                <>
                  <h3 className="sub">Como deve ser o carimbo?</h3>
                  <div className="opcoes" role="radiogroup" aria-label="Carimbo">
                    <button role="radio" aria-checked={carimboLiso} className={`opcao ${carimboLiso ? "on" : ""}`} onClick={() => setCarimbo("liso")}>
                      <span className="opcao-icone"><Icone nome="placa" tam={30} /></span>
                      <span><b>Base lisa <em className="recomendado">recomendado</em></b>
                        <small>Só a placa reta e lisa, sem paredes e sem relevo. Você modela o desenho por cima.</small></span>
                      {carimboLiso && <span className="marca-ok"><Icone nome="check" tam={16} /></span>}
                    </button>
                    <button role="radio" aria-checked={!carimboLiso} className={`opcao ${!carimboLiso ? "on" : ""}`} disabled={!!ehSvg} onClick={() => setCarimbo("relevo")}>
                      <span className="opcao-icone"><Icone nome="forma" tam={30} /></span>
                      <span><b>Com relevo automático</b>
                        <small>{ehSvg ? "Não disponível para arquivos SVG." : "O programa levanta olhos, boca e as linhas do desenho."}</small></span>
                      {!carimboLiso && <span className="marca-ok"><Icone nome="check" tam={16} /></span>}
                    </button>
                  </div>
                  {carimboLiso && nRelevo > 0 && <p className="dica">Os {nRelevo} relevo(s) marcados à mão não entram no carimbo liso.</p>}

                  {!carimboLiso && (
                    <div className="bloco">
                      <div className="segmentado pequeno" role="radiogroup" aria-label="O que levantar">
                        {([["ambos", "Linhas + escuras"], ["linhas", "Só linhas"], ["escuras", "Só escuras"]] as const).map(([m, t]) => (
                          <button key={m} role="radio" aria-checked={relevoAuto.modo === m} className={relevoAuto.modo === m ? "on" : ""} onClick={() => setRelevoAuto({ ...relevoAuto, modo: m })}>{t}</button>
                        ))}
                      </div>
                      <div className="param"><label><span>Quantidade de detalhes: <b>{relevoAuto.detalhe}</b></span>
                        <input type="range" min={1} max={10} value={relevoAuto.detalhe} onChange={(e) => setRelevoAuto({ ...relevoAuto, detalhe: parseInt(e.target.value, 10) })} /></label>
                        <small>Menos = só o essencial. Mais = mais linhas (podem ficar finas para imprimir).</small></div>
                      <p className={`estado-relevo ${previaErro ? "erro" : ""}`} aria-live="polite">
                        {previaCarregando ? <><span className="spinner p" /> Calculando o relevo…</>
                          : previaErro ? previaErro
                          : previa ? (previa.n_pecas > 0 ? `Em laranja no desenho: ${previa.area_mm2} mm² de relevo.` : "Não encontrei detalhes com essas opções. Aumente a quantidade de detalhes.")
                          : ""}
                      </p>
                    </div>
                  )}
                </>
              )}

              {tipo !== "marcador" ? (
                <>
                  <h3 className="sub">Tamanho do desenho</h3>
                  <div className="tamanho">
                    <button className="mini-btn" onClick={() => setLargura((v) => Math.max(5, v - 5))} aria-label="Diminuir"><span className="menos" /></button>
                    <input type="number" min={5} value={largura} onChange={(e) => setLargura(parseFloat(e.target.value) || 0)} aria-label="Largura em milímetros" />
                    <span className="un">mm</span>
                    <button className="mini-btn" onClick={() => setLargura((v) => v + 5)} aria-label="Aumentar"><Icone nome="mais" tam={18} /></button>
                  </div>
                  <div className="chips">
                    {TAMANHOS_RAPIDOS.map((t) => <button key={t} className={`chip ${largura === t ? "on" : ""}`} onClick={() => setLargura(t)}>{t / 10} cm</button>)}
                  </div>
                  <p className="dica">Esta é a <b>largura do desenho</b>. O cortador fica um pouco maior que isso, por causa da parede e da aba.</p>
                  <details className="avancado leve">
                    <summary>Mais opções de tamanho</summary>
                    <label className="check"><input type="checkbox" checked={manter} onChange={(e) => setManter(e.target.checked)} /><span>Manter a proporção original do desenho</span></label>
                    {!manter && <div className="param"><label><span>Altura do desenho (mm)</span>
                      <input type="number" min={5} value={altura ?? ""} onChange={(e) => setAltura(parseFloat(e.target.value) || null)} /></label></div>}
                  </details>
                </>
              ) : (
                <>
                  <h3 className="sub">Tamanho</h3>
                  <p className="dica">No marcador o desenho é ajustado sozinho para caber no disco, que tem <b>{diametro} mm</b> de diâmetro. Esse valor fica nas medidas de fabricação, logo abaixo.</p>
                </>
              )}

              {perfil && (
                <details className="avancado">
                  <summary><Icone nome="engrenagem" tam={18} /> Medidas de fabricação <small>· {perfis.find((x) => x.id === perfilId)?.nome ?? "perfil"}</small></summary>
                  <p className="dica">Você <b>não precisa mexer aqui</b>. O perfil padrão foi medido nos seus modelos de referência. Só altere se a sua fábrica mudou o padrão.</p>
                  <PainelPerfil metas={metas} perfil={perfil} perfis={perfis} perfilId={perfilId} alterado={alterado}
                    onSelecionar={(id) => tratar("Carregando perfil…", () => carregarPerfil(id))} onMudar={mudarParam}
                    onSalvar={salvarPerfil} onSalvarComo={salvarComo} onExcluir={excluirPerfil} />
                </details>
              )}

              {!podeGerar && (
                <div className="resumo alerta">
                  {tipo === "marcador" ? "Volte e marque ao menos uma peça como Relevo ou Forma." : "Volte e escolha uma peça como Forma do cortador."}
                </div>
              )}
            </>
          )}

          {/* ---- etapa 4 ---- */}
          {passo === 4 && projeto && resultado && (
            <>
              <Validacao r={resultado} />

              <div className="bloco">
                <h3 className="sub">Quer salvar em uma pasta?</h3>
                <p className="dica">Os botões <b>Baixar</b> ficam embaixo do modelo 3D. Se preferir, o programa salva tudo (STL, desenho e medidas) numa pasta do computador.</p>
                <details className="avancado leve">
                  <summary><Icone nome="pasta" tam={18} /> Salvar numa pasta do computador</summary>
                  <input placeholder="Pasta de destino (vazio = pasta Biscuit3D/exports)" value={pastaExport} onChange={(e) => setPastaExport(e.target.value)} />
                  <button className="principal" onClick={exportar} disabled={bloqueado || !!ocupado}>Salvar STL, desenho e medidas</button>
                  {exportMsg && <p className="ok">{exportMsg}</p>}
                  <p className="dica">Nunca sobrescreve: se o nome já existir, cria “-2”, “-3”…</p>
                </details>
              </div>

              <div className="bloco proximos">
                <h3 className="sub">E agora?</h3>
                <ol>
                  <li>Abra o arquivo .stl no seu fatiador (por exemplo, o Bambu Studio).</li>
                  <li>Faça um <b>teste de impressão</b> antes de produzir em quantidade.</li>
                  <li>Algo não ficou bom? Volte e ajuste. O modelo anterior continua salvo.</li>
                </ol>
              </div>
            </>
          )}
        </div>

        <div className="direita-rodape">
          <p className="rodape-dica">{dicaRodape}</p>
          <div className="rodape-botoes">
            {passo > 1 && <button className="sec grande" onClick={() => setPasso(passo - 1)}><Icone nome="voltar" tam={20} /> Voltar</button>}
            {passo === 1 && <button className="principal grande" disabled={!projeto} onClick={() => setPasso(2)}>Continuar <Icone nome="seta" tam={20} /></button>}
            {passo === 2 && <button className="principal grande" disabled={nForma + nRelevo === 0} onClick={() => setPasso(3)}>Continuar <Icone nome="seta" tam={20} /></button>}
            {passo === 3 && <button className="principal grande" disabled={!podeGerar || !!ocupado} onClick={gerar}><Icone nome="cubo" tam={20} /> Gerar modelo 3D</button>}
            {passo === 4 && <button className="principal grande" onClick={novoProjeto}><Icone nome="novo" tam={20} /> Novo projeto</button>}
          </div>
        </div>
      </section>

      {bloqueante && (
        <div className="carregando" role="status">
          <div className="carregando-card"><span className="spinner" /><b>{ocupado}</b><small>Isso leva alguns segundos. Não feche a janela.</small></div>
        </div>
      )}
      {arrastando && <div className="solte"><Icone nome="upload" tam={44} /><b>Solte a imagem aqui</b></div>}
      {tutorial.aberto && <Tutorial key={tutorial.chave} aberto abaInicial={tutorial.aba} onFechar={fecharTutorial} />}
    </div>
  );
}

function Slider({ rot, dica, v, min, max, step = 1, on }: { rot: string; dica?: string; v: number; min: number; max: number; step?: number; on: (v: number) => void }) {
  return (
    <div className="param"><label><span>{rot}: <b>{v}</b></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(parseFloat(e.target.value))} /></label>
      {dica && <small>{dica}</small>}</div>
  );
}
