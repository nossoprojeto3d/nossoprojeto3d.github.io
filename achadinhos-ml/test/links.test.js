/* Testes do gerador de meli.la: node --test achadinhos-ml/test
   As vitrines em fixtures/ são trechos reais das páginas de 26/11/2026 (link de outro grupo e link da conta).
   O cURL aqui é de mentira, no mesmo formato do "Copy as cURL (bash)" do Chrome. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { limpaProduto, produtoDaVitrine, produtoDireto, ehML, ehLista, sessaoDoCurl, juntaCookies, validadeDe } from '../src/ml.js';
import worker from '../src/index.js';

const fx = n => readFileSync(new URL(`./fixtures/${n}.html`, import.meta.url), 'utf8');
const VITRINE_OUTRO = 'https://www.mercadolivre.com.br/social/gabriellamorais?matt_word=gabriellamorais&matt_tool=88772317&forceInApp=true&ref=abc';
const CURL = `curl 'https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/linkbuilder/createLink' \\
  -H 'accept: application/json, text/plain, */*' \\
  -H 'content-type: application/json' \\
  -b '_d2id=abc-123; ssid=ghy-1126-XYZ; orgnickp=JRMARTINS; _csrf=k9' \\
  -H 'origin: https://www.mercadolivre.com.br' \\
  -H 'x-csrf-token: 0f1e2d3c-aaaa-bbbb-cccc-1234567890ab' \\
  --data-raw '{"urls":["https://www.mercadolivre.com.br/filamento/p/MLB24741975?pdp_filters=item_id%3AMLB3391196931&tracking_id=x#polycard"],"tag":"jrmartins"}'`;

test('lê a sessão do cURL copiado do Chrome', () => {
  const s = sessaoDoCurl(CURL);
  assert.equal(s.cookie, '_d2id=abc-123; ssid=ghy-1126-XYZ; orgnickp=JRMARTINS; _csrf=k9');
  assert.equal(s.csrf, '0f1e2d3c-aaaa-bbbb-cccc-1234567890ab');
  assert.equal(s.tag, 'jrmartins');
  assert.match(s.teste, /\/p\/MLB24741975/);
  /* cookie em -H e aspas $'...' também valem */
  const s2 = sessaoDoCurl(`curl $'https://x' -H $'cookie: ssid=a\\'b; x=1' -H 'X-CSRF-Token: t1' --data-raw $'{"urls":["u"],"tag":"jr"}'`);
  assert.deepEqual([s2.cookie, s2.csrf, s2.tag], ["ssid=a'b; x=1", 't1', 'jr']);
  assert.equal(sessaoDoCurl('aB3xY9'), null);
  assert.equal(sessaoDoCurl(CURL.replace('ssid=ghy-1126-XYZ; ', '')), null);
});

test('junta cookies novos e apaga os vencidos', () => {
  const c = juntaCookies('a=1; ssid=velho; b=2', ['ssid=novo; Path=/; Secure', 'b=; Max-Age=0', 'c=3; Path=/']);
  assert.equal(c, 'a=1; ssid=novo; c=3');
});

test('validade do cookie de login renovado', () => {
  const agora = Date.parse('2026-11-26T12:00:00Z');
  assert.equal(validadeDe(['ssid=x; Max-Age=86400; Path=/'], agora), '2026-11-27T12:00:00.000Z');
  assert.equal(validadeDe(['a=1', 'ssid=x; Expires=Mon, 27 Dec 2027 10:00:00 GMT; Path=/'], agora), '2027-12-27T10:00:00.000Z');
  assert.equal(validadeDe(['_d2id=x; Max-Age=999'], agora), null);
  assert.equal(validadeDe(['ssid=; Max-Age=0'], agora), null);
});

test('acha o produto em destaque na vitrine de outro afiliado', () => {
  const p = produtoDaVitrine(fx('outro'));
  assert.equal(p.id, 'MLB74331719');
  assert.equal(p.titulo, 'Filamento Pla Impressão 3d High Speed 1kg Onyon3d 1.75mm Ful Vermelho');
  assert.equal(p.preco, 91.91);
  assert.equal(p.foto, 'https://http2.mlstatic.com/D_Q_NP_697998-MLA112427993482_062026-R.webp');
  assert.equal(limpaProduto(p.url), 'https://www.mercadolivre.com.br/filamento-pla-impressao-3d-high-speed-1kg-onyon3d-175mm-ful-vermelho/p/MLB74331719');
  assert.deepEqual([p.antes, p.desconto, p.frete, p.nota, p.vendidos, p.loja, p.oficial], [135, 31, 'Frete grátis', '4.9', '1000', 'Yalo Embalagens', true]);
  const q = produtoDaVitrine(fx('meu'));
  assert.deepEqual([q.antes, q.desconto, q.vendidos, q.loja], [119.89, 21, '100mil', 'Polimus 3D']);
});

test('produto pelo id do anúncio mantém o filtro do anúncio', () => {
  const p = produtoDaVitrine(fx('meu'));
  assert.equal(p.id, 'MLB4752819245');
  assert.equal(new URL(limpaProduto(p.url)).searchParams.get('pdp_filters'), 'item_id:MLB4752819245');
  assert.doesNotMatch(limpaProduto(p.url), /matt_|tracking|#/);
});

test('produto direto, hosts e listas', () => {
  assert.equal(produtoDireto('https://www.mercadolivre.com.br/algo/p/MLB123456?x=1').id, 'MLB123456');
  assert.equal(produtoDireto('https://produto.mercadolivre.com.br/MLB-4752819245-filamento-_JM').id, 'MLB4752819245');
  assert.equal(produtoDireto(VITRINE_OUTRO), null);
  assert.ok(ehML('https://meli.la/2wrL4Dw'));
  assert.ok(!ehML('https://mercadolivre.com.br.golpe.com/x'));
  assert.ok(ehLista('https://www.mercadolivre.com.br/social/jrmartins/lists/1ed8?matt_tool=1'));
  assert.equal(produtoDaVitrine('<html>nada</html>'), null);
});

/* ---------- Worker com KV e fetch falsos ---------- */
function ambiente() {
  const kv = new Map();
  return { kv, env: { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'pub', DADOS: { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); } } } };
}
let pedidosML, mlResponde;
function fetchFalso() {
  pedidosML = []; mlResponde = 'ok';
  globalThis.fetch = async (url, op = {}) => {
    url = String(url);
    if (url.startsWith('https://sb.test/rest/v1/achadinhos_membros')) return Response.json(op.headers.authorization === 'Bearer membro' ? [{ user_id: 'u1' }] : []);
    if (url.endsWith('/linkbuilder/createLink')) {
      pedidosML.push({ ...op, corpo: JSON.parse(op.body) });
      if (mlResponde === 'login') return new Response('', { status: 302, headers: { location: 'https://www.mercadolivre.com.br/login' } });
      const h = new Headers({ 'content-type': 'application/json' }); h.append('set-cookie', 'ssid=renovado; Path=/; Expires=Mon, 27 Dec 2027 10:00:00 GMT');
      return new Response(JSON.stringify({ status: 200, urls: [{ id: '2EdRB5y', short_url: 'https://meli.la/2EdRB5y', title: 'Título do ML' }] }), { headers: h });
    }
    const paginas = { 'https://meli.la/2wrL4Dw': [VITRINE_OUTRO, fx('outro')], 'https://meli.la/lista': ['https://www.mercadolivre.com.br/social/x/lists/1?matt_tool=1', '<html></html>'] };
    const p = paginas[url];
    if (!p) throw new Error('rede: ' + url);
    const r = new Response(p[1]); Object.defineProperty(r, 'url', { value: p[0] }); return r;
  };
}
const pede = (env, caminho, corpo, tk = 'membro') => worker.fetch(new Request('https://achadinhos-ml.test' + caminho, {
  method: corpo ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + tk, origin: 'https://nossoprojeto3d.com.br', 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined
}), env);

test('worker: quem não é membro não usa a API', async () => {
  fetchFalso(); const { env } = ambiente();
  assert.equal((await pede(env, '/api/converter', { url: 'https://meli.la/2wrL4Dw' }, 'outro')).status, 401);
  assert.equal((await pede(env, '/api/sessao', null, 'outro')).status, 401);
});

test('worker: guarda a sessão testada e gera o meli.la do produto do outro grupo', async () => {
  fetchFalso(); const { env, kv } = ambiente();
  assert.equal((await pede(env, '/api/converter', { url: 'https://meli.la/2wrL4Dw' })).status, 409);
  assert.equal((await pede(env, '/api/sessao', { curl: 'aB3xY9' })).status, 400);
  const s = await (await pede(env, '/api/sessao', { curl: CURL })).json();
  assert.equal(s.tag, 'jrmartins'); assert.equal(s.cookie, undefined);
  const r = await pede(env, '/api/converter', { url: 'https://meli.la/2wrL4Dw' });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://nossoprojeto3d.com.br');
  const d = await r.json();
  assert.equal(d.curto, 'https://meli.la/2EdRB5y');
  assert.equal(d.titulo, 'Filamento Pla Impressão 3d High Speed 1kg Onyon3d 1.75mm Ful Vermelho');
  const ult = pedidosML.at(-1);
  assert.deepEqual(ult.corpo, { urls: ['https://www.mercadolivre.com.br/filamento-pla-impressao-3d-high-speed-1kg-onyon3d-175mm-ful-vermelho/p/MLB74331719'], tag: 'jrmartins' });
  assert.equal(ult.headers['x-csrf-token'], '0f1e2d3c-aaaa-bbbb-cccc-1234567890ab');
  assert.match(JSON.parse(kv.get('sessao')).cookie, /ssid=renovado/);
  const g = await (await pede(env, '/api/sessao')).json();
  assert.deepEqual(Object.keys(g).sort(), ['em', 'tag', 'validade']);
  assert.equal(g.validade, '2027-12-27T10:00:00.000Z');
});

test('worker: modelo da mensagem compartilhado', async () => {
  fetchFalso(); const { env } = ambiente();
  assert.deepEqual(await (await pede(env, '/api/modelo')).json(), {});
  const m = await (await pede(env, '/api/modelo', { tipo: 'oferta', texto: '*{titulo}*\n{link}' })).json();
  assert.equal(m.texto, '*{titulo}*\n{link}');
  await pede(env, '/api/modelo', { tipo: 'cupom', texto: '{cupons}\n{link}' });
  const g = await (await pede(env, '/api/modelo')).json();
  assert.deepEqual([g.oferta.texto, g.cupom.texto], ['*{titulo}*\n{link}', '{cupons}\n{link}']);
  assert.equal((await pede(env, '/api/modelo', { tipo: 'oferta', texto: 'x'.repeat(3001) })).status, 400);
  assert.equal((await pede(env, '/api/modelo', { tipo: 'outro', texto: 'a' })).status, 400);
  await pede(env, '/api/modelo', { tipo: 'oferta', texto: '  ' });
  assert.deepEqual(Object.keys(await (await pede(env, '/api/modelo')).json()), ['cupom']);
  assert.equal((await pede(env, '/api/modelo', { tipo: 'cupom', texto: 'a' }, 'outro')).status, 401);
});

test('worker: sessão vencida, lista e link que não é do ML', async () => {
  fetchFalso(); const { env } = ambiente();
  await pede(env, '/api/sessao', { curl: CURL });
  mlResponde = 'login';
  const r = await pede(env, '/api/converter', { url: 'https://meli.la/2wrL4Dw' });
  assert.equal(r.status, 409); assert.equal((await r.json()).erro, 'sessao');
  assert.equal((await pede(env, '/api/sessao', { curl: CURL })).status, 422);
  assert.equal((await pede(env, '/api/converter', { url: 'https://meli.la/lista' })).status, 422);
  assert.equal((await pede(env, '/api/converter', { url: 'https://golpe.com/x' })).status, 400);
});
