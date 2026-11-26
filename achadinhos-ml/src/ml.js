/* Leitura das páginas e do Gerador de links do Mercado Livre, sem rede (dá para testar com o HTML salvo).
   Os links meli.la de afiliado abrem a vitrine social do afiliado (/social/<nome>?matt_word=...&matt_tool=...&ref=...),
   com o produto compartilhado em destaque. As páginas de produto pedem verificação de robô a quem não é navegador,
   então título, foto, preço e endereço saem da própria vitrine. */

/* hosts do ML que aceitamos como entrada */
export const ehML = u => {
  try { const h = new URL(u).hostname; return h === 'meli.la' || /(^|\.)mercadoli[vb]re\.com(\.br)?$/.test(h); } catch (e) { return false; }
};

/* endereço do produto sem rastreio de ninguém: só sobra o filtro do anúncio (pdp_filters) */
export function limpaProduto(produtoUrl) {
  const u = new URL(produtoUrl);
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (k !== 'pdp_filters') u.searchParams.delete(k);
  return u.toString();
}

/* link de produto direto (sem vitrine): /p/MLB123 ou produto.mercadolivre.com.br/MLB-123 */
export function produtoDireto(urlFinal) {
  const u = new URL(urlFinal);
  const m = u.pathname.match(/\/p\/(MLB\d+)/) || (u.hostname.startsWith('produto.') && u.pathname.match(/\/(MLB)-?(\d+)/));
  if (!m) return null;
  return { id: m[2] ? m[1] + m[2] : m[1], url: urlFinal };
}

const desescapa = s => s.replace(/\\u002F/g, '/').replace(/\\"/g, '"');
const foto = id => id ? `https://http2.mlstatic.com/D_Q_NP_${id}-R.webp` : '';

/* o produto em destaque na vitrine: o id vem no evento da página e os dados no cartão (polycard) dele */
export function produtoDaVitrine(html) {
  const ev = html.match(/"page_type":"affiliate-profile"[^}]*?"item_id":"(MLB\d+)"/);
  if (!ev) return null;
  const id = ev[1];
  /* o id do evento pode ser o do anúncio (metadata.id) ou o do produto de catálogo (metadata.product_id) */
  const re = /\{"unique_id":"[^"]*","metadata":\{"id":"(MLB\d+)"(?:,"product_id":"(MLB\d+)")?/g;
  let m, ini = -1;
  while ((m = re.exec(html))) if (m[1] === id || m[2] === id) { ini = m.index; break; }
  if (ini < 0) return null;
  const prox = html.indexOf('{"unique_id"', ini + 20);
  const card = html.slice(ini, prox > 0 ? prox : ini + 20000);
  const up = card.match(/"url_params":"([^"]*)"/);
  if (!up) return null;
  const urlProduto = new URLSearchParams(desescapa(up[1]).replace(/^\?/, '')).get('url');
  if (!urlProduto || !ehML(urlProduto)) return null;
  const titulo = (card.match(/"type":"title","id":"title","title":\{"text":"((?:[^"\\]|\\.)*)"/) || [])[1];
  const preco = (card.match(/"price":\{[^{}]*?"price":([\d.]+)/) || card.match(/"prc":([\d.]+)/) || [])[1];
  const pic = (card.match(/"pictures":\[\{"id":"([^"]+)"/) || [])[1];
  return {
    id,
    url: urlProduto,
    titulo: titulo ? JSON.parse('"' + titulo + '"') : '',
    preco: preco ? +preco : null,
    foto: foto(pic)
  };
}

/* lista ou perfil sem produto (posts de cupom) */
export const ehLista = urlFinal => /\/lists\//.test(new URL(urlFinal).pathname);

/* separa um comando do bash em palavras ('...', $'...', "..." e barra invertida) */
function palavras(t) {
  const out = []; let cur = null, i = 0;
  const poe = c => { cur = (cur ?? '') + c; };
  while (i < t.length) {
    const c = t[i];
    if (c === '\\' && t[i + 1] === '\n') { i += 2; continue; }
    if (/\s/.test(c)) { if (cur !== null) out.push(cur); cur = null; i++; continue; }
    if (c === "'") { const f = t.indexOf("'", i + 1); poe(t.slice(i + 1, f < 0 ? t.length : f)); i = f < 0 ? t.length : f + 1; continue; }
    if (c === '$' && t[i + 1] === "'") {
      i += 2; let s = '';
      while (i < t.length && t[i] !== "'") {
        if (t[i] === '\\' && i + 1 < t.length) { const n = t[i + 1]; s += n === 'n' ? '\n' : n === 't' ? '\t' : n; i += 2; } else s += t[i++];
      }
      poe(s); i++; continue;
    }
    if (c === '"') {
      i++; let s = '';
      while (i < t.length && t[i] !== '"') { if (t[i] === '\\' && i + 1 < t.length) { s += t[i + 1]; i += 2; } else s += t[i++]; }
      poe(s); i++; continue;
    }
    if (c === '\\' && i + 1 < t.length) { poe(t[i + 1]); i += 2; continue; }
    poe(c); i++;
  }
  if (cur !== null) out.push(cur);
  return out;
}

/* sessão do Gerador de links a partir do "Copy as cURL (bash)" do Chrome (pedido createLink):
   cookies (-b ou -H cookie), x-csrf-token e a etiqueta (tag) do corpo */
export function sessaoDoCurl(txt) {
  const p = palavras(String(txt || '').replace(/\r\n/g, '\n'));
  let cookie = '', csrf = '', corpo = '';
  p.forEach((x, i) => {
    const v = p[i + 1] || '';
    if (x === '-b' || x === '--cookie') cookie = v;
    else if (x === '-H' || x === '--header') {
      const k = v.indexOf(':'), n = v.slice(0, k).trim().toLowerCase(), val = v.slice(k + 1).trim();
      if (n === 'cookie') cookie = val; else if (n === 'x-csrf-token') csrf = val;
    } else if (/^--data/.test(x) || x === '-d') corpo = v;
  });
  const tag = (corpo.match(/"tag"\s*:\s*"([\w.-]{2,60})"/) || [])[1] || '';
  const teste = (corpo.match(/"urls"\s*:\s*\[\s*"([^"]+)"/) || [])[1] || '';
  if (!/(^|;\s*)ssid=/.test(cookie) || !csrf || !tag) return null;
  return { cookie, csrf, tag, teste };
}

/* junta os set-cookie da resposta ao cookie guardado, para a sessão não envelhecer */
export function juntaCookies(cookie, setCookies) {
  const mapa = new Map(cookie.split(/;\s*/).filter(Boolean).map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));
  for (const sc of setCookies || []) {
    const par = sc.split(';')[0], i = par.indexOf('=');
    if (i < 1) continue;
    const n = par.slice(0, i).trim(), v = par.slice(i + 1).trim();
    if (/max-age=0\b|expires=thu, 01[ -]jan[ -]1970/i.test(sc) || v === '') mapa.delete(n); else mapa.set(n, v);
  }
  return [...mapa].map(([n, v]) => `${n}=${v}`).join('; ');
}
