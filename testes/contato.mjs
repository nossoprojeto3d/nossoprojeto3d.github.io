// Bateria de testes dos caminhos de contato e compra (node testes/contato.mjs, depois de npm run build).
// Lê as páginas geradas em dist/ e confere cada link de WhatsApp, Instagram, catálogo e Shopee:
// destino certo, mensagem pronta certa, abre em nova aba e o endereço responde na internet.
import { readFile } from "node:fs/promises";
import { BRINDES_JSON, LINKS, MENSAGENS, QUERIDINHOS_JSON } from "../src/data/links.ts";

const NUMERO = "5562993152843";
let falhas = 0, ok = 0;
const certo = (cond, msg) => { if (cond) ok++; else { falhas++; console.log("  ✗ " + msg); } };

const paginas = ["index.html", "404.html", "empresas/index.html", "eventos/index.html", "para-voce/index.html"];
const html = Object.fromEntries(await Promise.all(paginas.map(async (p) => [p, await readFile(`dist/${p}`, "utf8")])));

/** todos os <a> da página, com href decodificado e o contexto (id da seção mais próxima pelo texto anterior) */
function links(h) {
  return [...h.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => {
    const at = (n) => (new RegExp(`\\b${n}="([^"]*)"`).exec(m[1]) || [])[1];
    const txt = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return { href: (at("href") || "").replace(/&amp;/g, "&"), target: at("target"), rel: at("rel"), dataLink: at("data-link"), texto: txt, aria: at("aria-label") };
  });
}

// ---------- 1. Página inicial: cada caminho até a gente ----------
console.log("1. Página inicial");
const inicio = links(html["index.html"]);
const externos = inicio.filter((l) => /^https?:/.test(l.href));
for (const l of externos) {
  certo(l.target === "_blank", `abre na mesma aba: ${l.href}`);
  certo(/noopener/.test(l.rel || ""), `sem rel=noopener: ${l.href}`);
}
const zap = inicio.filter((l) => /wa\.me|whatsapp\.com/.test(l.href));
const insta = inicio.filter((l) => l.href === LINKS.contato.instagram);
const catalogo = inicio.filter((l) => l.href === LINKS.catalogo.site);
const shopee = inicio.filter((l) => l.href === LINKS.hub.shopee);
console.log(`   WhatsApp: ${zap.length} · Instagram: ${insta.length} · Catálogo: ${catalogo.length} · Shopee: ${shopee.length}`);
certo(catalogo.length >= 3, `esperava ≥ 3 links do catálogo, achei ${catalogo.length}`);
certo(insta.length >= 3, `esperava ≥ 3 links do Instagram, achei ${insta.length}`);
certo(shopee.length >= 2, `esperava ≥ 2 links da Shopee, achei ${shopee.length}`);

// ---------- 2. Cada botão de WhatsApp com a mensagem da sua parte do site ----------
console.log("2. Mensagens do WhatsApp por origem");
const textos = Object.values(MENSAGENS);
certo(new Set(textos).size === textos.length, "há mensagens repetidas: não dá pra saber de onde a pessoa veio");
const vistas = new Set();
for (const l of zap) {
  const url = new URL(l.href);
  const origem = (l.dataLink || "").replace(/^whatsapp\./, "");
  certo(url.hostname === "wa.me" && url.pathname === `/${NUMERO}`, `WhatsApp com número errado: ${l.href}`);
  certo(origem in MENSAGENS, `botão de WhatsApp sem origem (data-link="${l.dataLink}"): ${l.texto || l.aria}`);
  certo(url.searchParams.get("text") === MENSAGENS[origem], `botão "${origem}" com mensagem errada: "${url.searchParams.get("text")}"`);
  certo(!/\s/.test(l.href) && l.href.length < 2000, `link do WhatsApp mal formado: ${l.href}`);
  vistas.add(origem);
}
for (const origem of Object.keys(MENSAGENS)) {
  certo(vistas.has(origem), `nenhum botão usa a mensagem "${origem}"`);
  console.log(`   ${origem.padEnd(14)} "${MENSAGENS[origem]}"`);
}
// cada seção tem o botão de WhatsApp dela
for (const [secao, origem] of [["comprar", "comprar"], ["comprar", "empresas"], ["parcerias", "parceria"]]) {
  const trecho = new RegExp(`id="${secao}"[\\s\\S]*?</section>`).exec(html["index.html"])?.[0] || "";
  certo(trecho.includes(`data-link="whatsapp.${origem}"`), `seção ${secao} sem o WhatsApp "${origem}"`);
}
// as três portas levam às seções e a vitrine dos queridinhos busca a lista do catálogo
for (const alvo of ["comprar", "criadores", "quem-somos"]) certo(html["index.html"].includes(`href="#${alvo}"`), `sem porta para #${alvo}`);
certo(html["index.html"].includes(`data-fonte="${QUERIDINHOS_JSON}"`), "Para você não busca os queridinhos do catálogo");
certo(html["index.html"].includes(`data-fonte="${BRINDES_JSON}"`), "Para empresas não busca os brindes do catálogo");
certo(inicio.some((l) => l.href === LINKS.catalogo.brindes), "Para empresas sem link para os brindes do catálogo");
certo(inicio.some((l) => l.href === LINKS.parceiros.voolt && /sponsored/.test(l.rel || "")), "Parcerias sem o link da Voolt3D (com rel=sponsored)");
const pecas = [...html["index.html"].matchAll(/data-link="catalogo\.peca"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*data-link="catalogo\.peca"/g)].map((m) => m[1] || m[2]).filter((h) => !h.includes("${"));
certo(pecas.length > 0, "nenhum queridinho no HTML (o build não conseguiu ler a lista do catálogo)");
for (const h of pecas) certo(h.startsWith(LINKS.catalogo.site + "#produto/"), `queridinho com link errado: ${h}`);

// ---------- 3. Endereços antigos e página de erro ----------
console.log("3. Endereços antigos e 404");
for (const p of ["empresas/index.html", "eventos/index.html", "para-voce/index.html"]) {
  const refresh = /http-equiv="refresh" content="0; url=([^"]+)"/.exec(html[p])?.[1];
  const script = /const destino = "([^"]+)"[\s\S]*?location\.replace\(destino\)/.exec(html[p])?.[1];
  certo(refresh === "/#comprar" && script === "/#comprar", `${p} não leva para #comprar (refresh: ${refresh}, script: ${script})`);
}
const erro = links(html["404.html"]);
certo(erro.some((l) => l.href === LINKS.catalogo.site), "404 sem link pro catálogo");
certo(erro.some((l) => l.href.includes(encodeURIComponent(MENSAGENS.menu))), "404 sem WhatsApp no menu");
// os # antigos das abas (#empresas, #eventos, #voce) caem em "Para você", inclusive com a página aberta
certo(/hashchange/.test(await readFile("src/pages/index.astro", "utf8")), "a página não reage aos # antigos das abas");

// ---------- 4. Os destinos respondem na internet ----------
console.log("4. Destinos na internet");
const destinos = [...new Set([`https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAGENS.comprar)}`, LINKS.contato.instagram, LINKS.catalogo.site, LINKS.hub.shopee, LINKS.calculadora.site, LINKS.ajuste3mf.site, LINKS.dicas.site, LINKS.hub.stlsGratis, LINKS.parceiros.voolt, QUERIDINHOS_JSON, BRINDES_JSON, ...(LINKS.hub.mercadoLivre ? [LINKS.hub.mercadoLivre] : [])])];
for (const d of destinos) {
  try {
    const r = await fetch(d, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" } });
    const final = new URL(r.url).hostname;
    // Instagram e Shopee às vezes respondem 429/403 pra robôs; o que importa é não dar 404 nem cair em outro site
    const vivo = r.status < 400 || [403, 429].includes(r.status);
    certo(vivo, `${d} respondeu ${r.status}`);
    console.log(`   ${r.status} ${d.length > 70 ? d.slice(0, 70) + "…" : d} → ${final}`);
    if (d.includes("wa.me")) {
      const corpo = await r.text();
      certo(!/link.{0,40}(inv[aá]lido|invalid|expired|expirou)/i.test(corpo), "o link curto do WhatsApp parece inválido/expirado");
    }
  } catch (e) {
    certo(false, `${d} não respondeu (${e.message})`);
  }
}

console.log(`\n${ok} conferências ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
