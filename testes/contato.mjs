// Bateria de testes dos caminhos de contato e compra (node testes/contato.mjs, depois de npm run build).
// Lê as páginas geradas em dist/ e confere cada link de WhatsApp, Instagram, catálogo e Shopee:
// destino certo, mensagem pronta certa, abre em nova aba e o endereço responde na internet.
import { readFile } from "node:fs/promises";
import { LINKS } from "../src/data/links.ts";

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
const zapDireto = inicio.filter((l) => l.href === LINKS.contato.whatsapp);
const zapOrc = inicio.filter((l) => l.href.startsWith(`https://wa.me/${NUMERO}?text=`));
const insta = inicio.filter((l) => l.href === LINKS.contato.instagram);
const catalogo = inicio.filter((l) => l.href === LINKS.catalogo.site);
const shopee = inicio.filter((l) => l.href === LINKS.hub.shopee);
console.log(`   WhatsApp direto: ${zapDireto.length} · WhatsApp com mensagem pronta: ${zapOrc.length} · Instagram: ${insta.length} · Catálogo: ${catalogo.length} · Shopee: ${shopee.length}`);
// menu (computador e celular), topo, chamada final, rodapé (ícone e coluna Contato)
certo(zapDireto.length >= 6, `esperava ≥ 6 botões de WhatsApp direto (menu, menu do celular, topo, chamada final, ícone e coluna do rodapé), achei ${zapDireto.length}`);
certo(catalogo.length >= 5, `esperava ≥ 5 links do catálogo, achei ${catalogo.length}`);
certo(insta.length >= 3, `esperava ≥ 3 links do Instagram, achei ${insta.length}`);
certo(shopee.length >= 2, `esperava ≥ 2 links da Shopee, achei ${shopee.length}`);
for (const l of inicio.filter((l) => /wa\.me|whatsapp/.test(l.href))) {
  certo(l.href.startsWith("https://wa.me/"), `WhatsApp fora do padrão wa.me: ${l.href}`);
  certo(!/\s/.test(l.href), `WhatsApp com espaço sem codificar: ${l.href}`);
}

// ---------- 2. Mensagens prontas do "Pedir orçamento" (uma por aba) ----------
console.log("2. Mensagens prontas da vitrine");
const esperadas = {
  empresas: "Olá! Quero um orçamento de brindes ou expositores para a minha empresa.",
  eventos: "Olá! Quero um orçamento de lembrancinhas ou decoração para uma festa.",
  voce: "Olá! Quero um orçamento de uma peça personalizada."
};
certo(zapOrc.length === 3, `esperava 3 botões "Pedir orçamento" (um por aba), achei ${zapOrc.length}`);
for (const [aba, msg] of Object.entries(esperadas)) {
  const painel = new RegExp(`id="painel-${aba}"[\\s\\S]*?href="([^"]+)"`).exec(html["index.html"]);
  const href = painel?.[1].replace(/&amp;/g, "&") ?? "";
  const url = new URL(href);
  certo(url.hostname === "wa.me" && url.pathname === `/${NUMERO}`, `aba ${aba}: número errado (${url.pathname})`);
  certo(url.searchParams.get("text") === msg, `aba ${aba}: mensagem diferente do esperado: "${url.searchParams.get("text")}"`);
  certo(href.length < 2000, `aba ${aba}: link longo demais pro WhatsApp`);
  console.log(`   ${aba}: "${url.searchParams.get("text")}"`);
}

// ---------- 3. Endereços antigos e página de erro ----------
console.log("3. Endereços antigos e 404");
for (const [p, aba] of [["empresas/index.html", "empresas"], ["eventos/index.html", "eventos"], ["para-voce/index.html", "voce"]]) {
  const refresh = /http-equiv="refresh" content="0; url=([^"]+)"/.exec(html[p])?.[1];
  const script = /const destino = "([^"]+)"[\s\S]*?location\.replace\(destino\)/.exec(html[p])?.[1];
  certo(refresh === `/site/#${aba}` && script === `/site/#${aba}`, `${p} não leva para #${aba} (refresh: ${refresh}, script: ${script})`);
}
const erro = links(html["404.html"]);
certo(erro.some((l) => l.href === LINKS.catalogo.site), "404 sem link pro catálogo");
certo(erro.some((l) => l.href === LINKS.contato.whatsapp), "404 sem WhatsApp no menu");
// o script da vitrine abre a aba pelo #, inclusive quando o # muda com a página aberta (links do rodapé)
certo(/hashchange/.test(await readFile("src/pages/index.astro", "utf8")), "vitrine não reage a mudança de #aba");

// ---------- 4. Os destinos respondem na internet ----------
console.log("4. Destinos na internet");
const destinos = [...new Set([LINKS.contato.whatsapp, `https://wa.me/${NUMERO}?text=${encodeURIComponent(esperadas.voce)}`, LINKS.contato.instagram, LINKS.catalogo.site, LINKS.hub.shopee, LINKS.calculadora.site, LINKS.ajuste3mf.site, LINKS.hub.stlsGratis])];
for (const d of destinos) {
  try {
    const r = await fetch(d, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" } });
    const final = new URL(r.url).hostname;
    // Instagram e Shopee às vezes respondem 429/403 pra robôs; o que importa é não dar 404 nem cair em outro site
    const vivo = r.status < 400 || [403, 429].includes(r.status);
    certo(vivo, `${d} respondeu ${r.status}`);
    console.log(`   ${r.status} ${d.length > 70 ? d.slice(0, 70) + "…" : d} → ${final}`);
    if (d === LINKS.contato.whatsapp) {
      const corpo = await r.text();
      certo(!/link.{0,40}(inv[aá]lido|invalid|expired|expirou)/i.test(corpo), "o link curto do WhatsApp parece inválido/expirado");
    }
  } catch (e) {
    certo(false, `${d} não respondeu (${e.message})`);
  }
}

console.log(`\n${ok} conferências ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
