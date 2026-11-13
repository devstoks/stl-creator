export type Papel = "externo" | "detalhe" | "ignorar";
export type Tipo = "cortador" | "marcador" | "conjunto";

export interface Contorno {
  id: number;
  pontos: [number, number][];
  area: number;
  bbox: [number, number, number, number];
  pai: number | null;
}
export interface Vetor {
  largura: number;
  altura: number;
  modo_usado: string;
  tipo_arquivo?: string;
  contornos: Contorno[];
  papeis?: Record<string, Papel>;
}
export interface ParamsVetorizacao {
  modo: "auto" | "alfa" | "saturacao" | "limiar";
  limiar: number | null;
  inverter: boolean;
  suavizacao: number;
  fechar_lacunas_px: number;
  remover_ruido_px: number;
  preencher_buracos: boolean;
  simplificacao_px: number;
  area_minima_px: number;
  recorte: [number, number, number, number] | null;
}
export type Perfil = Record<string, number | string | boolean | Record<string, string>>;
export interface ParamMeta {
  chave: string; titulo: string; unidade: string; descricao: string; grupo: string; origem: string;
}
export interface Validacao {
  arquivo: string; status: "APROVADO" | "ATENCAO" | "BLOQUEADO"; avisos: string[]; erros: string[];
  extensao_mm?: number[]; faces?: number; volume_mm3?: number | null; componentes?: number;
  watertight?: boolean; tamanho_bytes?: number;
}
export interface Resultado {
  tipo: Tipo; status: Validacao["status"]; avisos: string[]; tempo_s: number;
  desenho_mm?: number[];
  arquivos: { nome: string; validacao: Validacao }[];
}
