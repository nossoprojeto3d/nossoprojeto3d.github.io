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
    shopee: "https://shopee.com.br/nossoprojeto3d?categoryId=100636&entryPoint=ShopByPDP&itemId=58216954178",
    stlsGratis: "https://drive.google.com/drive/folders/1KEVqYll78dvHoo0AbDUCeM57MLXllw48?usp=sharing"
  },
  calculadora: {
    site: "https://nossoprojeto3d.com.br/calculadora/",
    github: "https://github.com/nossoprojeto3d/calculadora"
  },
  catalogo: {
    site: "https://nossoprojeto3d.com.br/catalogo/"
  },
  ajuste3mf: {
    site: "https://nossoprojeto3d.com.br/ajustes/"
  }
};

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
  topo: "Olá! Vi o site e quero fazer um pedido.",
  empresas: "Olá! Quero um orçamento de brindes ou expositores para a minha empresa.",
  eventos: "Olá! Quero um orçamento de lembrancinhas ou decoração para uma festa.",
  voce: "Olá! Quero um orçamento de uma peça personalizada.",
  chamadaFinal: "Olá! Tenho uma ideia e queria transformar em peça.",
  rodapeIcone: "Oi, tudo bem? Vim pelo site.",
  rodapeContato: "Olá, tudo bem? Gostaria de mais informações."
};
export type OrigemWhatsApp = keyof typeof MENSAGENS;

/** Link do WhatsApp já com a mensagem da parte do site em que o botão está. */
export function whatsapp(origem: OrigemWhatsApp) {
  return `${LINKS.contato.whatsappOrcamento}?text=${encodeURIComponent(MENSAGENS[origem])}`;
}
