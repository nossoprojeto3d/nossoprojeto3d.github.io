/**
 * Toda URL externa do site fica aqui. Pra trocar um link, mude só nesse arquivo.
 * Nos componentes, use <a href={LINKS.grupo.chave} data-link="grupo.chave">:
 * o data-link continua servindo pro medicao.js saber de onde veio o clique.
 */
export const LINKS = {
  contato: {
    whatsapp: "https://wa.me/message/HH37CDNHHMQCD1",
    instagram: "https://instagram.com/nossoprojeto3d",
    // sem o ?text=: o orçamento guiado monta a mensagem e completa o link
    whatsappOrcamento: "https://wa.me/5562993152843"
  },
  hub: {
    // loja no Mercado Livre: enquanto estiver vazio, o card não aparece na seção Parcerias
    mercadoLivre: "",
    shopee: "https://shopee.com.br/nossoprojeto3d?categoryId=100636&entryPoint=ShopByPDP&itemId=58216954178",
    stlsGratis: "https://drive.google.com/drive/folders/1KEVqYll78dvHoo0AbDUCeM57MLXllw48?usp=sharing"
  },
  calculadora: {
    site: "https://nossoprojeto3d.com.br/calculadora/",
    github: "https://github.com/nossoprojeto3d/calculadora"
  },
  catalogo: {
    site: "https://nossoprojeto3d.com.br/catalogo/",
    brindes: "https://nossoprojeto3d.com.br/catalogo/#categoria/Brindes",
    natal: "https://nossoprojeto3d.com.br/catalogo/#categoria/Natal"
  },
  parceiros: {
    // link de afiliado (o mesmo da calculadora); o cupom fica em CUPOM_VOOLT
    voolt: "https://afiliado.c2cseller.com/voolt3d-nosso-projeto-b0e5828bb12818a1"
  },
  ajuste3mf: {
    site: "https://nossoprojeto3d.com.br/ajustes/"
  },
  dicas: {
    site: "https://nossoprojeto3d.com.br/dicas/"
  }
};

/** Listas geradas pelo build do catálogo: queridinhos (sorteados em "Para você") e brindes ("Para empresas"). */
export const QUERIDINHOS_JSON = "https://nossoprojeto3d.com.br/catalogo/queridinhos.json";
export const BRINDES_JSON = "https://nossoprojeto3d.com.br/catalogo/brindes.json";
export const CUPOM_VOOLT = "NOSSOPROJETO";

export const SITE_URL = "https://nossoprojeto3d.com.br/";
export const TELEFONE = "+55 62 99315-2843";

/** Caminho interno respeitando o base do site (hoje a raiz do domínio). */
export function url(caminho = "") {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${caminho.replace(/^\//, "")}`;
}

/**
 * Mensagem pronta de cada botão de WhatsApp. Cada uma começa de um jeito diferente, pra saber
 * pela conversa de qual parte do site a pessoa veio. Pra trocar um texto, mude só aqui
 * (e confira se continua diferente das outras: `npm run testar` avisa se duas ficarem iguais).
 */
export const MENSAGENS = {
  menu: "Olá! Vim pelo site e queria tirar uma dúvida.",
  menuCelular: "Oi! Estava olhando o site de vocês e queria conversar.",
  comprar: "Olá! Quero um orçamento de uma peça personalizada.",
  empresas: "Olá! Quero um orçamento de brindes personalizados para a minha empresa.",
  parceria: "Olá! Tenho uma empresa e quero conversar sobre uma parceria com a Nosso Projeto 3D.",
  rodapeIcone: "Oi, tudo bem? Vim pelo site.",
  rodapeContato: "Olá, tudo bem? Gostaria de mais informações."
};
export type OrigemWhatsApp = keyof typeof MENSAGENS;

/** Link do WhatsApp já com a mensagem da parte do site em que o botão está. */
export function whatsapp(origem: OrigemWhatsApp) {
  return `${LINKS.contato.whatsappOrcamento}?text=${encodeURIComponent(MENSAGENS[origem])}`;
}
