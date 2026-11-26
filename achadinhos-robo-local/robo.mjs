/* Robô local do Nossos Achadinhos: deixe aberto neste computador e o botão "Enviar pro grupo" do app dispara sozinho.
   Atende só em 127.0.0.1:3737 e só pedidos vindos do app (nossoprojeto3d.com.br ou o teste local).
   Rodar: npm start (na pasta achadinhos-robo-local). A sessão do WhatsApp fica na pasta "sessao" ao lado. */
import http from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { criaRobo } from './nucleo.mjs';
import { criaConexao } from './whatsapp.mjs';

const PORTA = +(process.env.PORTA || 3737);
const PASTA = process.env.SESSAO || join(dirname(fileURLToPath(import.meta.url)), 'sessao');
const ORIGENS = ['https://nossoprojeto3d.com.br', 'http://localhost:4321', 'http://127.0.0.1:4321'];

const conexao = criaConexao(PASTA, ev => {
  const msg = { qr: 'QR Code pronto: leia pelo app (Ajustes).', conectado: `Conectado ao WhatsApp (${conexao.numero()}).`, saiu: 'O número foi desconectado.' }[ev];
  if (msg) console.log(new Date().toLocaleTimeString('pt-BR'), msg);
});
const robo = criaRobo(conexao);

function cabecalhos(origem) {
  return {
    'access-control-allow-origin': origem,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-private-network': 'true',  /* o Chrome pede isso para um site falar com o computador */
    'access-control-max-age': '600',
    vary: 'origin'
  };
}

const servidor = http.createServer(async (req, res) => {
  const origem = req.headers.origin;
  if (origem && !ORIGENS.includes(origem)) { res.writeHead(403).end(); return; }
  const h = origem ? cabecalhos(origem) : {};
  if (req.method === 'OPTIONS') { res.writeHead(204, h).end(); return; }
  if (req.method !== 'POST' || req.url !== '/robo' || !/application\/json/.test(req.headers['content-type'] || '')) {
    res.writeHead(404, h).end(); return;
  }
  let txt = '';
  for await (const parte of req) { txt += parte; if (txt.length > 15e6) { res.writeHead(413, h).end(); return; } }
  let corpo = {}; try { corpo = JSON.parse(txt); } catch (e) {}
  const r = await robo(corpo);
  res.writeHead(r.status, { ...h, 'content-type': 'application/json' }).end(JSON.stringify(r.dados));
});

servidor.listen(PORTA, '127.0.0.1', async () => {
  console.log(`Robô do Nossos Achadinhos aberto (porta ${PORTA}). Deixe esta janela aberta para os envios sairem sozinhos.`);
  if (existsSync(join(PASTA, 'creds.json'))) {
    console.log('Reconectando ao WhatsApp…');
    conexao.liga().catch(e => console.log('Não consegui reconectar:', e.message));
  }
});
