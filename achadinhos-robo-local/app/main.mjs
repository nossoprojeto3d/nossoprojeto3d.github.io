/* App de computador do Nossos Achadinhos (Electron): abre o site de sempre numa janela própria
   e traz o bot do WhatsApp junto, sem Terminal. A página fala com o bot por window.ACHADINHOS_APP
   (preload.cjs), não pela porta 3737, então o bot do Terminal pode continuar existindo à parte.
   A sessão do chip fica na pasta de dados do app (no Mac: ~/Library/Application Support/Nossos Achadinhos/sessao). */
import { app, BrowserWindow, ipcMain, shell, dialog, powerSaveBlocker, session } from 'electron';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criaRobo } from '../nucleo.mjs';
import { criaConexao } from '../whatsapp.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SITE = process.env.ACHADINHOS_URL || 'https://nossoprojeto3d.com.br/achadinhos/';
/* só estas páginas podem usar o bot (o teste local entra pela variável ACHADINHOS_URL) */
const ORIGENS = new Set(['https://nossoprojeto3d.com.br', new URL(SITE).origin]);
const doSite = url => { try { const u = new URL(url); return ORIGENS.has(u.origin) && u.pathname.startsWith('/achadinhos'); } catch (e) { return false; } };

if (!app.requestSingleInstanceLock()) app.quit();

let janela = null, robo = null;
/* envio em andamento: o Mac não dorme e fechar a janela pede confirmação */
let enviando = 0, ultimoEnvio = 0, bloqueio = null, soltaBloqueio = null;
const enviandoAgora = () => enviando > 0 || Date.now() - ultimoEnvio < 15000;
function seguraAcordado() {
  if (bloqueio === null || !powerSaveBlocker.isStarted(bloqueio)) bloqueio = powerSaveBlocker.start('prevent-app-suspension');
  clearTimeout(soltaBloqueio);
  soltaBloqueio = setTimeout(() => { if (bloqueio !== null) powerSaveBlocker.stop(bloqueio); bloqueio = null; }, 120000);
}

function ligaRobo() {
  const pasta = join(app.getPath('userData'), 'sessao');
  const conexao = criaConexao(pasta);
  robo = criaRobo(conexao);
  if (existsSync(join(pasta, 'creds.json'))) conexao.liga().catch(() => {});
  ipcMain.handle('robo', async (ev, corpo) => {
    if (!doSite(ev.senderFrame && ev.senderFrame.url)) return { status: 403, dados: { erro: 'Página não autorizada.' } };
    const envio = corpo && corpo.acao === 'enviar';
    if (envio) { enviando++; seguraAcordado(); }
    try { return await robo(corpo); }
    finally { if (envio) { enviando--; ultimoEnvio = Date.now(); } }
  });
}

function abreJanela() {
  janela = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640, show: false,
    title: 'Nossos Achadinhos', backgroundColor: '#EEF2EC',
    /* no Windows, esconde a barra Arquivo/Editar/Exibir (Alt mostra); no Mac não muda nada */
    autoHideMenuBar: true,
    webPreferences: { preload: join(AQUI, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });
  janela.once('ready-to-show', () => janela.show());
  /* links de fora (meli.la, WhatsApp, Mercado Livre) abrem no navegador ou no app do WhatsApp */
  janela.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|mailto|whatsapp):/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  janela.webContents.on('will-navigate', (e, url) => {
    if (doSite(url) || url.startsWith('file:')) return;
    e.preventDefault(); if (/^(https?|whatsapp):/.test(url)) shell.openExternal(url);
  });
  /* sem internet: tela com "Tentar de novo" */
  janela.webContents.on('did-fail-load', (e, codigo, desc, url, principal) => {
    if (principal && codigo !== -3) janela.loadFile(join(AQUI, 'offline.html'), { query: { volta: SITE } });
  });
  janela.on('close', e => {
    if (!enviandoAgora()) return;
    const r = dialog.showMessageBoxSync(janela, {
      type: 'warning', buttons: ['Continuar enviando', 'Fechar mesmo assim'], defaultId: 0, cancelId: 0,
      message: 'Tem um envio acontecendo agora.', detail: 'Se fechar, os grupos que faltam não recebem o post.'
    });
    if (r === 0) e.preventDefault();
  });
  janela.on('closed', () => { janela = null; });
  /* sempre a versão mais nova do site: sem isso o cache (10 min do GitHub Pages) mostra a anterior ao reabrir */
  janela.loadURL(SITE, { extraHeaders: 'Cache-Control: no-cache\nPragma: no-cache\n' });
}

app.whenReady().then(() => {
  /* colar (botões "Colar") e avisos só para o site */
  const pode = new Set(['clipboard-read', 'clipboard-sanitized-write', 'notifications', 'fullscreen']);
  session.defaultSession.setPermissionRequestHandler((wc, perm, ok, info) => ok(pode.has(perm) && doSite(info.requestingUrl || wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((wc, perm, origem) => pode.has(perm) && ORIGENS.has(origem));
  ligaRobo();
  abreJanela();
});
app.on('second-instance', () => { if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); } });
app.on('activate', () => { if (!janela) abreJanela(); });
app.on('window-all-closed', () => app.quit());
