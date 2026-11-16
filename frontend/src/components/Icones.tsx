const CAMINHOS = {
  upload: "M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  forma: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  regua: "M3 17L17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2",
  cubo: "M12 2l9 5v10l-9 5-9-5V7z M12 12l9-5 M12 12v10 M12 12L3 7",
  ajuda: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8 M12 17h.01",
  check: "M5 12l5 5L20 7",
  seta: "M5 12h14 M13 6l6 6-6 6",
  voltar: "M19 12H5 M11 6l-6 6 6 6",
  desfazer: "M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3",
  refazer: "M15 14l5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3",
  pasta: "M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  baixar: "M12 4v12 M7 11l5 5 5-5 M4 20h16",
  mais: "M12 5v14 M5 12h14",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01",
  fechar: "M6 6l12 12 M18 6L6 18",
  engrenagem: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M19.1 4.9L17 7 M7 17l-2.1 2.1",
  novo: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M12 12v6 M9 15h6",
  mover: "M5 9l-3 3 3 3 M9 5l3-3 3 3 M15 19l-3 3-3-3 M19 9l3 3-3 3 M2 12h20 M12 2v20",
  lupa: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
  alerta: "M12 3l10 18H2z M12 10v5 M12 18h.01",
  sol: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M19.1 4.9l-1.4 1.4 M6.3 17.7l-1.4 1.4",
  lua: "M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z",
  cadeado: "M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3",
  olho: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  livro: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19V5 M8 7h7",
  lampada: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  limpar: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v5 M14 11v5",
  placa: "M3 14l9-5 9 5-9 5z M3 14v3l9 5 9-5v-3",
  pasta2: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, tam = 20 }: { nome: NomeIcone; tam?: number }) {
  return (
    <svg className="icone" width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}

/** Logotipo: um cortador de biscuit estilizado em verde-ciano. */
export function Logo({ tam = 34 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#lg)" />
      <path d="M20 31s-9-5.6-11.4-11.2A6.2 6.2 0 0 1 20 15.6a6.2 6.2 0 0 1 11.4 4.2C29 25.4 20 31 20 31z"
            fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** Ilustrações simples dos produtos (cartões da etapa 3). */
export function IlustracaoProduto({ tipo }: { tipo: "cortador" | "conjunto" | "marcador" }) {
  const coracao = "M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z";
  return (
    <svg viewBox="0 0 64 56" width="76" height="66" aria-hidden="true">
      {tipo === "cortador" && (
        <g transform="translate(8 4) scale(2)">
          <path d={coracao} fill="none" stroke="#14b8a6" strokeWidth="2.2" strokeLinejoin="round" />
          <path d={coracao} fill="none" stroke="#a7f3d0" strokeWidth="5" strokeLinejoin="round" opacity=".55" />
        </g>
      )}
      {tipo === "conjunto" && (
        <g>
          <g transform="translate(2 8) scale(1.7)">
            <path d={coracao} fill="none" stroke="#14b8a6" strokeWidth="2.4" strokeLinejoin="round" />
            <path d={coracao} fill="none" stroke="#a7f3d0" strokeWidth="5.5" strokeLinejoin="round" opacity=".55" />
          </g>
          <g transform="translate(30 14) scale(1.4)">
            <path d={coracao} fill="#22d3ee" stroke="#0891b2" strokeWidth="1.6" strokeLinejoin="round" />
          </g>
        </g>
      )}
      {tipo === "marcador" && (
        <g>
          <circle cx="32" cy="28" r="24" fill="#cffafe" stroke="#06b6d4" strokeWidth="2.5" />
          <g transform="translate(19 15) scale(1.1)">
            <path d={coracao} fill="#22d3ee" stroke="#0891b2" strokeWidth="1.6" strokeLinejoin="round" />
          </g>
        </g>
      )}
    </svg>
  );
}
