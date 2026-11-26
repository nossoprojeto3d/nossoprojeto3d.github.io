/* Gerador de meli.la do Nossos Achadinhos (https://achadinhos-ml.auto-insta.workers.dev).
   Faz o mesmo que o Gerador de links do ML (afiliados/linkbuilder), com a sessão da conta guardada aqui.
   GET  /api/sessao     sessão salva? ({ tag, em }; o cookie nunca sai daqui)
   POST /api/sessao     { curl }: o "Copy as cURL (bash)" do createLink no Chrome; testa e guarda cookie, csrf e etiqueta
   POST /api/converter  { url }: abre o link de outro grupo, acha o produto e devolve o meli.la da conta
   Só atende quem está logado no app e é membro (achadinhos_membros no Supabase). */
import { ehML, limpaProduto, produtoDireto, produtoDaVitrine, ehLista, sessaoDoCurl, juntaCookies } from './ml.js';

const UA_CEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_PC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
const CRIA = 'https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/linkbuilder/createLink';
const ORIGENS = ['https://nossoprojeto3d.com.br', 'http://localhost:4321', 'http://localhost:8788'];

function cors(req) {
  const o = req.headers.get('origin');
  return {
    'access-control-allow-origin': ORIGENS.includes(o) ? o : ORIGENS[0],
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'vary': 'origin'
  };
}
const json = (req, dados, status = 200) => Response.json(dados, { status, headers: cors(req) });
const falha = codigo => Object.assign(new Error(codigo), { codigo });

/* o token do Supabase vale e a conta é membro: com o token dela, a tabela só devolve a própria linha se ela for membro */
async function membro(req, env) {
  const tk = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tk) return false;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/achadinhos_membros?select=user_id&limit=1`, {
    headers: { apikey: env.SUPABASE_KEY, authorization: 'Bearer ' + tk }
  });
  if (!r.ok) return false;
  const l = await r.json().catch(() => []);
  return Array.isArray(l) && l.length > 0;
}

/* segue os redirecionamentos do meli.la e traz a página final */
async function abre(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA_CEL, 'accept-language': 'pt-BR,pt;q=0.9' } });
  return { final: r.url || url, html: await r.text() };
}

/* pede o meli.la ao Gerador de links com a sessão; renova os cookies que o ML mandar */
async function geraMeli(env, s, url) {
  const r = await fetch(CRIA, {
    method: 'POST', redirect: 'manual',
    headers: {
      'content-type': 'application/json', accept: 'application/json, text/plain, */*', 'accept-language': 'pt-BR,pt;q=0.9',
      origin: 'https://www.mercadolivre.com.br', referer: 'https://www.mercadolivre.com.br/afiliados/linkbuilder',
      'user-agent': UA_PC, 'x-csrf-token': s.csrf, cookie: s.cookie
    },
    body: JSON.stringify({ urls: [url], tag: s.tag })
  });
  const novos = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  if (novos.length) {
    const c = juntaCookies(s.cookie, novos);
    if (c !== s.cookie) { s.cookie = c; await env.DADOS.put('sessao', JSON.stringify(s)); }
  }
  if (r.status === 401 || r.status === 403 || (r.status >= 300 && r.status < 400)) throw falha('sessao');
  const j = await r.json().catch(() => null);
  const u = j && Array.isArray(j.urls) && j.urls[0];
  if (!u || !/^https:\/\/meli\.la\/\w+$/.test(u.short_url || '')) throw falha(r.status >= 500 ? 'ml-fora' : 'ml-recusou');
  return { curto: u.short_url, titulo: u.title || '' };
}

async function converter(req, env) {
  const { url } = await req.json().catch(() => ({}));
  if (!url || !ehML(url)) return json(req, { erro: 'nao-ml' }, 400);
  const s = JSON.parse((await env.DADOS.get('sessao')) || 'null');
  if (!s) return json(req, { erro: 'sem-sessao' }, 409);
  let prod = produtoDireto(url);
  if (!prod) {
    let p;
    try { p = await abre(url); } catch (e) { return json(req, { erro: 'ml-fora' }, 502); }
    if (ehLista(p.final)) return json(req, { erro: 'lista' }, 422);
    prod = produtoDireto(p.final) || produtoDaVitrine(p.html);
    if (!prod) return json(req, { erro: 'sem-produto' }, 422);
  }
  try {
    const m = await geraMeli(env, s, limpaProduto(prod.url));
    return json(req, { id: prod.id, titulo: prod.titulo || m.titulo, preco: prod.preco ?? null, foto: prod.foto || '', curto: m.curto });
  } catch (e) {
    return json(req, { erro: e.codigo || 'ml-fora' }, e.codigo === 'sessao' ? 409 : 502);
  }
}

async function salvaSessao(req, env) {
  const { curl } = await req.json().catch(() => ({}));
  const s = sessaoDoCurl(curl);
  if (!s) return json(req, { erro: 'curl-invalido' }, 400);
  const { teste, ...guardar } = s;
  guardar.em = new Date().toISOString();
  try { await geraMeli(env, guardar, teste && ehML(teste) ? limpaProduto(teste) : 'https://www.mercadolivre.com.br/p/MLB24741975'); }
  catch (e) { return json(req, { erro: e.codigo === 'sessao' ? 'sessao' : 'teste-falhou' }, 422); }
  await env.DADOS.put('sessao', JSON.stringify(guardar));
  return json(req, { tag: guardar.tag, em: guardar.em });
}

export default {
  async fetch(req, env) {
    const p = new URL(req.url).pathname;
    if (!p.startsWith('/api/')) return Response.redirect('https://nossoprojeto3d.com.br/achadinhos/', 302);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (!(await membro(req, env))) return json(req, { erro: 'sem-acesso' }, 401);
    if (p === '/api/sessao' && req.method === 'GET') {
      const s = JSON.parse((await env.DADOS.get('sessao')) || 'null');
      return json(req, s ? { tag: s.tag, em: s.em } : {});
    }
    if (p === '/api/sessao' && req.method === 'POST') return salvaSessao(req, env);
    if (p === '/api/converter' && req.method === 'POST') return converter(req, env);
    return json(req, { erro: 'rota' }, 404);
  }
};
