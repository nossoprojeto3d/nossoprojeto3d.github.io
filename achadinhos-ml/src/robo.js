/* Ponte do robô do WhatsApp: o app chama POST /api/robo { acao, ... } e o Worker fala com a Evolution API v2
   (servidor na Oracle, atrás do túnel da Cloudflare). A chave da Evolution fica só aqui (segredo EVO_KEY).
   Rotas conferidas no código da Evolution API 2.3.8 (src/api/routes/*.router.ts e dto/sendMessage.dto.ts), 26/11/2026:
   GET /instance/connectionState/:i, GET /instance/connect/:i, POST /instance/create, GET /instance/fetchInstances,
   DELETE /instance/logout/:i, GET /group/fetchAllGroups/:i?getParticipants=false,
   POST /message/sendText/:i { number, text, linkPreview }, POST /message/sendMedia/:i { number, mediatype, mimetype, caption, media }. */

const espera = ms => new Promise(r => setTimeout(r, ms));

/* erros da Evolution e do WhatsApp em português, para a tela de envio */
export function traduzErroRobo(t) {
  const s = String(t || '').toLowerCase();
  if (/not-authorized|forbidden|not admin|admin/.test(s)) return 'o número não pode mandar mensagem nesse grupo';
  if (/item-not-found|not.?found|does not exist|no such|404/.test(s)) return 'o número não está nesse grupo';
  if (/rate|429|too many|overlimit/.test(s)) return 'o WhatsApp pediu pra ir mais devagar';
  if (/connection closed|not connected|close|logged ?out|401/.test(s)) return 'o robô está desconectado do WhatsApp';
  if (/timed? ?out|timeout|econn|fetch failed|502|503|504/.test(s)) return 'o robô não respondeu a tempo';
  return 'o WhatsApp recusou a mensagem';
}

/* tipo da imagem pelo começo do base64 */
const mimeDe = b64 => b64.startsWith('/9j/') ? 'image/jpeg' : b64.startsWith('UklGR') ? 'image/webp' : 'image/png';

export function criaRobo(env, fetcher = fetch, pausa = espera) {
  const base = String(env.EVO_URL || '').replace(/\/+$/, ''), inst = encodeURIComponent(env.EVO_INSTANCIA || 'achadinhos');
  async function evo(metodo, caminho, corpo) {
    let r;
    try {
      r = await fetcher(base + caminho, { method: metodo, headers: { apikey: env.EVO_KEY, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
    } catch (e) { const x = new Error('fetch failed'); x.status = 0; throw x; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j && (j.response && (Array.isArray(j.response.message) ? j.response.message.join(' ') : j.response.message) || j.message || j.error);
      const x = new Error(String(msg || r.status)); x.status = r.status; throw x;
    }
    return j;
  }
  /* cria a instância do chip na primeira vez */
  async function garanteInstancia() {
    try { await evo('GET', `/instance/connectionState/${inst}`); return; } catch (e) { if (e.status !== 404) throw e; }
    await evo('POST', '/instance/create', { instanceName: env.EVO_INSTANCIA || 'achadinhos', integration: 'WHATSAPP-BAILEYS', qrcode: true });
  }
  const acoes = {
    async status() {
      let st;
      try { st = await evo('GET', `/instance/connectionState/${inst}`); } catch (e) { if (e.status === 404) return { estado: 'desconectado', numero: '' }; throw e; }
      const conectado = st && st.instance && st.instance.state === 'open';
      let numero = '';
      if (conectado) {
        const l = await evo('GET', `/instance/fetchInstances?instanceName=${inst}`).catch(() => []);
        const dono = (Array.isArray(l) ? l[0] : l) || {};
        numero = String(dono.ownerJid || dono.owner || '').split('@')[0].split(':')[0];
      }
      return { estado: conectado ? 'conectado' : 'desconectado', numero };
    },
    async qr() {
      await garanteInstancia();
      const c = await evo('GET', `/instance/connect/${inst}`);
      const b = c.base64 || (c.qrcode && c.qrcode.base64) || '';
      if (!b) throw new Error('sem QR');
      return { qr: b.startsWith('data:') ? b : 'data:image/png;base64,' + b };
    },
    async grupos() {
      const l = await evo('GET', `/group/fetchAllGroups/${inst}?getParticipants=false`);
      return { grupos: (Array.isArray(l) ? l : []).filter(g => /@g\.us$/.test(g.id || '')).map(g => ({ jid: g.id, nome: g.subject || 'Grupo sem nome', membros: g.size || 0 })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) };
    },
    /* só manda para grupo (…@g.us): o robô nunca escreve no privado de ninguém */
    async enviar({ jid, mensagens }) {
      if (!/^[\d-]+@g\.us$/.test(jid || '')) throw Object.assign(new Error('só grupos'), { publico: 'o robô só envia para grupos' });
      if (!Array.isArray(mensagens) || !mensagens.length || mensagens.length > 10) throw Object.assign(new Error('mensagens'), { publico: 'post vazio' });
      for (let i = 0; i < mensagens.length; i++) {
        const m = mensagens[i];
        if (i) await pausa(1000 + Math.floor(Math.random() * 2000)); /* 1 a 3 s entre o post e cada código */
        if (m.tipo === 'imagem' && m.imagem) {
          const b64 = String(m.imagem).replace(/^data:[^,]+,/, '');
          await evo('POST', `/message/sendMedia/${inst}`, { number: jid, mediatype: 'image', mimetype: mimeDe(b64), caption: m.texto || '', media: b64, fileName: 'cupom.' + mimeDe(b64).split('/')[1] });
        } else {
          if (!String(m.texto || '').trim()) continue;
          await evo('POST', `/message/sendText/${inst}`, { number: jid, text: m.texto, linkPreview: true });
        }
      }
      return { ok: true };
    },
    async desconectar() { await evo('DELETE', `/instance/logout/${inst}`); return { ok: true }; }
  };
  return async function (corpo) {
    if (!base || !env.EVO_KEY) return { status: 503, dados: { erro: 'O robô ainda não foi configurado no servidor.' } };
    const f = acoes[corpo && corpo.acao];
    if (!f) return { status: 400, dados: { erro: 'Ação desconhecida.' } };
    try { return { status: 200, dados: await f(corpo) }; }
    catch (e) { return { status: e.status === 0 ? 504 : 502, dados: { erro: e.publico || traduzErroRobo(e.message || e.status) } }; }
  };
}
