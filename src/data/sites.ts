// Nossos sites: usados no menu (painel "Sites"), na seção "Nossos sites" e no rodapé.
import { LINKS } from "./links";

export interface Site {
  nome: string;
  texto: string;
  href: string;
  /** chave do LINKS, vai no data-link pro medicao.js */
  link: string;
  icone: string;
}

export const GRUPOS_SITES: { titulo: string; sites: Site[] }[] = [
  {
    titulo: "Comprar e acompanhar",
    sites: [
      { nome: "Catálogo", texto: "Peças com preço e cores, pedidas pelo WhatsApp.", href: LINKS.catalogo.site, link: "catalogo.site", icone: "i-book" },
      { nome: "Shopee", texto: "Nossos produtos com a segurança da plataforma.", href: LINKS.hub.shopee, link: "hub.shopee", icone: "i-bag" },
      { nome: "Instagram", texto: "Bastidores, lançamentos e novidades em @nossoprojeto3d.", href: LINKS.contato.instagram, link: "contato.instagram", icone: "i-instagram" }
    ]
  },
  {
    titulo: "Para criadores",
    sites: [
      { nome: "Calculadora de custos", texto: "Calcule o custo real das suas impressões 3D.", href: LINKS.calculadora.site, link: "calculadora.site", icone: "i-calc" },
      { nome: "Ajuste 3MF", texto: "A IA sugere as configurações do seu 3MF para o Bambu Studio.", href: LINKS.ajuste3mf.site, link: "ajuste3mf.site", icone: "i-sliders" },
      { nome: "STLs grátis", texto: "Arquivos prontos para você imprimir em casa.", href: LINKS.hub.stlsGratis, link: "hub.stlsGratis", icone: "i-cube" },
      { nome: "Dicas", texto: "As dicas de impressão 3D dos nossos vídeos, uma por ficha.", href: LINKS.dicas.site, link: "dicas.site", icone: "i-bulb" }
    ]
  }
];
