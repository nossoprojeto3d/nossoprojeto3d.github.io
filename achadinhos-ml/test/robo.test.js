/* Testes da ponte do robô (src/robo.js) com uma Evolution API de mentira: node --test achadinhos-ml/test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criaRobo, traduzErroRobo } from '../src/robo.js';
import worker from '../src/index.js';

const ENV = { EVO_URL: 'https://robo.test/', EVO_KEY: 'chave', EVO_INSTANCIA: 'achadinhos' };
function evoFalsa(estado = {}) {
  const pedidos = [];
  const resp = (status, j) => new Response(JSON.stringify(j), { status, headers: { 'content-type': 'application/json' } });
  const f = async (url, op) => {
    const u = new URL(url), corpo = op.body ? JSON.parse(op.body) : null;
    pedidos.push({ metodo: op.method, caminho: u.pathname + u.search, corpo, apikey: op.headers.apikey });
    const p = u.pathname;
    if (p === '/instance/connectionState/achadinhos') return estado.semInstancia ? resp(404, { response: { message: ['The "achadinhos" instance does not exist'] } }) : resp(200, { instance: { instanceName: 'achadinhos', state: estado.state || 'open' } });
    if (p === '/instance/create') { estado.semInstancia = false; return resp(201, { instance: { instanceName: 'achadinhos' } }); }
    if (p === '/instance/connect/achadinhos') return resp(200, { pairingCode: null, code: '2@abc', base64: 'data:image/png;base64,QRQR', count: 1 });
    if (p === '/instance/fetchInstances') return resp(200, [{ name: 'achadinhos', ownerJid: '5511999990000@s.whatsapp.net' }]);
    if (p === '/group/fetchAllGroups/achadinhos') return resp(200, [{ id: '120363-2@g.us', subject: 'Nossos Achadinhos 2', size: 180 }, { id: '120363-1@g.us', subject: 'Nossos Achadinhos 1', size: 256 }]);
    if (p.startsWith('/message/')) return estado.falhaEnvio ? resp(400, { response: { message: ['not-authorized'] } }) : resp(201, { key: { id: 'x' } });
    if (p === '/instance/logout/achadinhos') return resp(200, { status: 'SUCCESS' });
    return resp(404, {});
  };
  return { f, pedidos };
}
const semPausa = async () => {};

test('status conectado traz o número; sem instância fica desconectado', async () => {
  const e = evoFalsa();
  assert.deepEqual((await criaRobo(ENV, e.f, semPausa)({ acao: 'status' })).dados, { estado: 'conectado', numero: '5511999990000' });
  assert.equal(e.pedidos[0].apikey, 'chave');
  assert.equal(e.pedidos[0].caminho, '/instance/connectionState/achadinhos');
  const d = evoFalsa({ semInstancia: true });
  assert.deepEqual((await criaRobo(ENV, d.f, semPausa)({ acao: 'status' })).dados, { estado: 'desconectado', numero: '' });
});

test('QR cria a instância na primeira vez', async () => {
  const e = evoFalsa({ semInstancia: true });
  const r = await criaRobo(ENV, e.f, semPausa)({ acao: 'qr' });
  assert.equal(r.dados.qr, 'data:image/png;base64,QRQR');
  assert.deepEqual(e.pedidos.map(p => p.caminho), ['/instance/connectionState/achadinhos', '/instance/create', '/instance/connect/achadinhos']);
  assert.equal(e.pedidos[1].corpo.integration, 'WHATSAPP-BAILEYS');
});

test('grupos em ordem alfabética, sem participantes', async () => {
  const e = evoFalsa();
  const r = await criaRobo(ENV, e.f, semPausa)({ acao: 'grupos' });
  assert.deepEqual(r.dados.grupos.map(g => g.nome), ['Nossos Achadinhos 1', 'Nossos Achadinhos 2']);
  assert.deepEqual(r.dados.grupos[0], { jid: '120363-1@g.us', nome: 'Nossos Achadinhos 1', membros: 256 });
  assert.equal(e.pedidos[0].caminho, '/group/fetchAllGroups/achadinhos?getParticipants=false');
});

test('envia post e códigos em ordem; imagem vai como mídia com legenda', async () => {
  const e = evoFalsa(); const pausas = [];
  const r = await criaRobo(ENV, e.f, async ms => pausas.push(ms))({ acao: 'enviar', jid: '120363-1@g.us', mensagens: [{ tipo: 'imagem', texto: 'Saiu cupom!', imagem: 'data:image/jpeg;base64,/9j/AAAA' }, { tipo: 'texto', texto: 'MELI20' }] });
  assert.deepEqual(r.dados, { ok: true });
  assert.equal(e.pedidos[0].caminho, '/message/sendMedia/achadinhos');
  assert.deepEqual(e.pedidos[0].corpo, { number: '120363-1@g.us', mediatype: 'image', mimetype: 'image/jpeg', caption: 'Saiu cupom!', media: '/9j/AAAA', fileName: 'cupom.jpeg' });
  assert.deepEqual(e.pedidos[1].corpo, { number: '120363-1@g.us', text: 'MELI20', linkPreview: true });
  assert.equal(pausas.length, 1); assert.ok(pausas[0] >= 1000 && pausas[0] <= 3000);
});

test('nunca envia para o privado de alguém', async () => {
  const e = evoFalsa();
  const r = await criaRobo(ENV, e.f, semPausa)({ acao: 'enviar', jid: '5511988887777@s.whatsapp.net', mensagens: [{ tipo: 'texto', texto: 'oi' }] });
  assert.equal(r.status, 502); assert.equal(r.dados.erro, 'o robô só envia para grupos');
  assert.equal(e.pedidos.length, 0);
});

test('erros em português e robô sem configuração', async () => {
  const e = evoFalsa({ falhaEnvio: true });
  const r = await criaRobo(ENV, e.f, semPausa)({ acao: 'enviar', jid: '120363-1@g.us', mensagens: [{ tipo: 'texto', texto: 'oi' }] });
  assert.equal(r.dados.erro, 'o número não pode mandar mensagem nesse grupo');
  assert.equal(traduzErroRobo('Connection Closed'), 'o robô está desconectado do WhatsApp');
  assert.equal(traduzErroRobo('fetch failed'), 'o robô não respondeu a tempo');
  assert.equal((await criaRobo({}, e.f, semPausa)({ acao: 'status' })).status, 503);
  assert.equal((await criaRobo(ENV, e.f, semPausa)({ acao: 'apagar-tudo' })).status, 400);
});

test('worker: /api/robo só para membros', async () => {
  globalThis.fetch = async (url, op = {}) => {
    if (String(url).startsWith('https://sb.test/')) return Response.json(op.headers.authorization === 'Bearer membro' ? [{ user_id: 'u1' }] : []);
    throw new Error('rede');
  };
  const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_KEY: 'pub', DADOS: { get: async () => null } };
  const pede = tk => worker.fetch(new Request('https://x.test/api/robo', { method: 'POST', headers: { authorization: 'Bearer ' + tk, 'content-type': 'application/json' }, body: JSON.stringify({ acao: 'status' }) }), env);
  assert.equal((await pede('outro')).status, 401);
  const r = await pede('membro');
  assert.equal(r.status, 503);
  assert.equal((await r.json()).erro, 'O robô ainda não foi configurado no servidor.');
});
