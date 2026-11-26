/* Testes do robô local com um WhatsApp de mentira: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criaRobo, traduzErroRobo } from '../nucleo.mjs';

function conexaoFalsa(inicial = 'conectado') {
  const feitos = [];
  let estado = inicial, qr = '';
  return {
    feitos,
    estado: () => estado, numero: () => estado === 'conectado' ? '5562999990000' : '', qr: () => qr,
    async liga() { estado = 'conectando'; qr = 'data:image/png;base64,QR'; },
    async grupos() { return [{ jid: '120363-2@g.us', nome: 'Nossos Achadinhos 2', membros: 180 }, { jid: '120363-1@g.us', nome: 'Nossos Achadinhos 1', membros: 256 }, { jid: '5511@s.whatsapp.net', nome: 'x', membros: 1 }]; },
    async enviaTexto(jid, texto) { if (texto === 'falha') throw new Error('not-authorized'); feitos.push(['texto', jid, texto]); },
    async enviaImagem(jid, buf, legenda) { feitos.push(['imagem', jid, buf.toString('base64'), legenda]); },
    async sai() { estado = 'desconectado'; feitos.push(['sai']); }
  };
}
const semPausa = async () => {};

test('status e QR', async () => {
  const c = conexaoFalsa('desconectado'), robo = criaRobo(c, semPausa);
  assert.deepEqual((await robo({ acao: 'status' })).dados, { estado: 'desconectado', numero: '' });
  assert.deepEqual((await robo({ acao: 'qr' })).dados, { qr: 'data:image/png;base64,QR' });
  const ok = criaRobo(conexaoFalsa(), semPausa);
  assert.deepEqual((await ok({ acao: 'status' })).dados, { estado: 'conectado', numero: '5562999990000' });
  assert.deepEqual((await ok({ acao: 'qr' })).dados, { conectado: true });
});

test('grupos só de grupo e em ordem alfabética', async () => {
  const r = await criaRobo(conexaoFalsa(), semPausa)({ acao: 'grupos' });
  assert.deepEqual(r.dados.grupos.map(g => g.nome), ['Nossos Achadinhos 1', 'Nossos Achadinhos 2']);
});

test('envia imagem com legenda e depois os códigos, com pausa entre eles', async () => {
  const c = conexaoFalsa(), pausas = [];
  const r = await criaRobo(c, async ms => pausas.push(ms))({ acao: 'enviar', jid: '120363-1@g.us', mensagens: [{ tipo: 'imagem', texto: 'Saiu cupom!', imagem: 'data:image/jpeg;base64,/9j/AAAA' }, { tipo: 'texto', texto: 'MELI20' }, { tipo: 'texto', texto: '  ' }] });
  assert.deepEqual(r.dados, { ok: true });
  assert.deepEqual(c.feitos, [['imagem', '120363-1@g.us', '/9j/AAAA', 'Saiu cupom!'], ['texto', '120363-1@g.us', 'MELI20']]);
  assert.equal(pausas.length, 1); assert.ok(pausas[0] >= 1000 && pausas[0] <= 3000);
});

test('nunca envia no privado, nem desconectado; erros em português', async () => {
  const c = conexaoFalsa(), robo = criaRobo(c, semPausa);
  const priv = await robo({ acao: 'enviar', jid: '5562988887777@s.whatsapp.net', mensagens: [{ tipo: 'texto', texto: 'oi' }] });
  assert.equal(priv.status, 502); assert.equal(priv.dados.erro, 'o robô só envia para grupos');
  assert.equal(c.feitos.length, 0);
  const off = await criaRobo(conexaoFalsa('desconectado'), semPausa)({ acao: 'enviar', jid: '120363-1@g.us', mensagens: [{ tipo: 'texto', texto: 'oi' }] });
  assert.equal(off.dados.erro, 'o robô está desconectado do WhatsApp');
  const neg = await robo({ acao: 'enviar', jid: '120363-1@g.us', mensagens: [{ tipo: 'texto', texto: 'falha' }] });
  assert.equal(neg.dados.erro, 'o número não pode mandar mensagem nesse grupo');
  assert.equal((await robo({ acao: 'apagar-tudo' })).status, 400);
  assert.equal(traduzErroRobo('Connection Closed'), 'o robô está desconectado do WhatsApp');
});

test('desconectar', async () => {
  const c = conexaoFalsa();
  assert.deepEqual((await criaRobo(c, semPausa)({ acao: 'desconectar' })).dados, { ok: true });
  assert.equal(c.estado(), 'desconectado');
});
