/* Conexão com o WhatsApp pelo Baileys (WhatsApp Web), como um aparelho conectado do chip.
   A sessão fica numa pasta deste computador; ler o QR uma vez basta. */
import { rm } from 'node:fs/promises';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, prepareWAMessageMedia } from 'baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import sharp from 'sharp';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
const LINK = /https?:\/\/[^\s*_~]+/i;

const meta = (html, prop) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i'));
  const c = m && m[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
};

/* Prévia do link do jeito do WhatsApp do celular: segue os redirecionamentos do meli.la até a página do produto
   (o Baileys sozinho não segue para outro domínio) e usa o og:image como imagem grande. */
export async function previaDoLink(link, upload) {
  const r = await fetch(link, { redirect: 'follow', headers: { 'user-agent': UA, 'accept-language': 'pt-BR,pt;q=0.9' }, signal: AbortSignal.timeout(8000) });
  const html = await r.text();
  const title = meta(html, 'og:title') || (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  if (!title) return undefined;
  const info = { 'canonical-url': link, 'matched-text': link, title, description: meta(html, 'og:description') };
  const img = meta(html, 'og:image');
  if (img) {
    try {
      const bruta = Buffer.from(await (await fetch(img, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) })).arrayBuffer());
      const jpg = await sharp(bruta).jpeg({ quality: 85 }).toBuffer();
      info.jpegThumbnail = await sharp(jpg).resize(192).jpeg({ quality: 60 }).toBuffer();
      if (upload) {
        const { imageMessage } = await prepareWAMessageMedia({ image: jpg }, { upload, mediaTypeOverride: 'thumbnail-link' });
        if (imageMessage) info.highQualityThumbnail = imageMessage;
      }
    } catch (e) { /* sem imagem, a prévia sai só com título */ }
  }
  return info;
}

export function criaConexao(pasta, aoMudar = () => {}) {
  const logger = pino({ level: 'silent' });
  let sock = null, estado = 'desconectado', qrAtual = '', numero = '', ligando = null;

  async function liga() {
    if (ligando) return ligando;
    ligando = (async () => {
      const { state, saveCreds } = await useMultiFileAuthState(pasta);
      estado = 'conectando'; qrAtual = '';
      sock = makeWASocket({
        auth: state, logger, browser: Browsers.macOS('Desktop'),
        markOnlineOnConnect: false,   /* o celular do chip continua recebendo as notificações */
        syncFullHistory: false, shouldSyncHistoryMessage: () => false,
        generateHighQualityLinkPreview: true
      });
      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async u => {
        if (u.qr) { qrAtual = await QRCode.toDataURL(u.qr, { margin: 1, width: 320 }); aoMudar('qr'); }
        if (u.connection === 'open') {
          estado = 'conectado'; qrAtual = '';
          numero = String(sock.user?.id || '').split('@')[0].split(':')[0];
          aoMudar('conectado');
        }
        if (u.connection === 'close') {
          const codigo = u.lastDisconnect?.error?.output?.statusCode;
          sock = null; ligando = null;
          if (codigo === DisconnectReason.loggedOut) {
            estado = 'desconectado'; numero = ''; qrAtual = '';
            await rm(pasta, { recursive: true, force: true });
            aoMudar('saiu');
          } else if (!state.creds.me && codigo !== DisconnectReason.restartRequired) {
            estado = 'desconectado'; qrAtual = '';  /* QR não foi lido a tempo: espera tocar em Conectar de novo */
          } else if (estado !== 'desconectado') {
            estado = 'conectando';
            setTimeout(() => liga().catch(() => {}), codigo === DisconnectReason.restartRequired ? 200 : 3000);
          }
        }
      });
    })();
    try { await ligando; } catch (e) { ligando = null; throw e; }
  }

  const pronto = () => { if (!sock || estado !== 'conectado') throw new Error('not connected'); return sock; };

  return {
    estado: () => estado,
    numero: () => numero,
    qr: () => qrAtual,
    liga,
    async grupos() {
      const l = await pronto().groupFetchAllParticipating();
      return Object.values(l).map(g => ({ jid: g.id, nome: g.subject || 'Grupo sem nome', membros: (g.participants || []).length || g.size || 0 }));
    },
    async enviaTexto(jid, texto) {
      const s = pronto(), link = (texto.match(LINK) || [])[0];
      let linkPreview;
      if (link) linkPreview = await previaDoLink(link, s.waUploadToServer).catch(() => undefined);
      await s.sendMessage(jid, linkPreview ? { text: texto, linkPreview } : { text: texto });
    },
    async enviaImagem(jid, buffer, legenda) { await pronto().sendMessage(jid, { image: buffer, caption: legenda }); },
    async sai() {
      const s = sock; estado = 'desconectado'; numero = ''; qrAtual = '';
      if (s) { try { await s.logout(); } catch (e) {} }
      sock = null; ligando = null;
      await rm(pasta, { recursive: true, force: true });
    }
  };
}
