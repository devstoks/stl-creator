import type { ParamMeta, ParamsRelevo, ParamsVetorizacao, Perfil, PreviaRelevo, Resultado, Vetor } from "./types";

async function chamar<T>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, init);
  } catch {
    throw new Error("Não consegui falar com o servidor local. Ele ainda está aberto?");
  }
  if (!r.ok) {
    let msg = `Erro ${r.status}`;
    try { const j = await r.json(); msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* ignora */ }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}
const json = (corpo: unknown): RequestInit => ({
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
});

export const api = {
  saude: () => chamar<{ ok: boolean; pasta_dados: string; dependencias: Record<string, string> }>("/api/health"),
  perfis: () => chamar<{ perfis: { id: string; nome: string; protegido: boolean }[]; parametros: ParamMeta[] }>("/api/profiles"),
  perfil: (id: string) => chamar<Perfil>(`/api/profiles/${id}`),
  criarPerfil: (p: Perfil) => chamar<{ id: string }>("/api/profiles", json(p)),
  atualizarPerfil: (id: string, p: Perfil) =>
    chamar<{ ok: boolean }>(`/api/profiles/${id}`, { ...json(p), method: "PUT" }),
  excluirPerfil: (id: string) => chamar<{ ok: boolean }>(`/api/profiles/${id}`, { method: "DELETE" }),
  importar: (arquivo: File) => {
    const f = new FormData(); f.append("arquivo", arquivo);
    return chamar<Vetor & { projeto_id: string }>("/api/import", { method: "POST", body: f });
  },
  revetorizar: (id: string, params: ParamsVetorizacao) =>
    chamar<Vetor>(`/api/projects/${id}/vectorize`, json({ params })),
  previaRelevo: (id: string, corpo: { papeis: Record<number, string>; perfil: Perfil; largura_mm: number; params: ParamsRelevo }) =>
    chamar<PreviaRelevo>(`/api/projects/${id}/relief`, json(corpo)),
  gerar: (id: string, corpo: unknown) => chamar<Resultado>(`/api/projects/${id}/generate`, json(corpo)),
  projetos: () => chamar<{ projetos: { id: string; nome: string; tem_modelo: boolean }[] }>("/api/projects"),
  abrir: (id: string) => chamar<{ id: string; vetor: Vetor; projeto: { requisicao: any } | null; estado_ui: any }>(`/api/projects/${id}`),
  salvarEstado: (id: string, estado: unknown) => chamar<{ ok: boolean }>(`/api/projects/${id}`, json({ estado })),
  exportar: (id: string, pasta_destino: string | null) =>
    chamar<{ pasta: string; arquivos: string[] }>(`/api/projects/${id}/export`, json({ pasta_destino })),
  urlOriginal: (id: string) => `/api/projects/${id}/original`,
  urlArquivo: (id: string, nome: string, v = 0) => `/api/projects/${id}/files/${nome}?v=${v}`,
};
