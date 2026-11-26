/* Núcleo do robô local do Nossos Achadinhos: mesmas ações da ponte antiga (src/robo.js do Worker),
   agora falando direto com o WhatsApp pelo Baileys, como um "aparelho conectado" do chip.
   Ações: status | qr | grupos | enviar | desconectar. Só envia para grupo (…@g.us), nunca no privado. */

const espera = ms => new Promise(r => setTimeout(r, ms));

/* erros do WhatsApp em português, para a tela de envio */
export function traduzErroRobo(t) {
  const s = String(t || '').toLowerCase();
  if (/not-authorized|forbidden|not admin|403/.test(s)) return 'o número não pode mandar mensagem nesse grupo';
  if (/item-not-found|not.?found|does not exist|no such|404|not a participant/.test(s)) return 'o número não está nesse grupo';
  if (/rate|429|too many|overlimit/.test(s)) return 'o WhatsApp pediu pra ir mais devagar';
  if (/connection closed|not connected|desconectad|logged ?out|401/.test(s)) return 'o robô está desconectado do WhatsApp';
  if (/timed? ?out|timeout|econn|fetch failed/.test(s)) return 'o WhatsApp não respondeu a tempo';
  return 'o WhatsApp recusou a mensagem';
}

const falha = publico => Object.assign(new Error(publico), { publico });

/* conexao: { estado(), numero(), qr(), liga(), grupos(), enviaTexto(jid, texto), enviaImagem(jid, buffer, legenda), sai() } */
export function criaRobo(conexao, pausa = espera) {
  const acoes = {
    async status() {
      return { estado: conexao.estado() === 'conectado' ? 'conectado' : 'desconectado', numero: conexao.numero() };
    },
    async qr() {
      if (conexao.estado() === 'conectado') return { conectado: true };
      await conexao.liga();
      for (let i = 0; i < 40 && !conexao.qr() && conexao.estado() !== 'conectado'; i++) await pausa(250);
      if (conexao.estado() === 'conectado') return { conectado: true };
      if (!conexao.qr()) throw falha('o WhatsApp não mandou o QR Code, tente de novo');
      return { qr: conexao.qr() };
    },
    async grupos() {
      if (conexao.estado() !== 'conectado') throw falha('o robô está desconectado do WhatsApp');
      const l = await conexao.grupos();
      return { grupos: l.filter(g => /@g\.us$/.test(g.jid || '')).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) };
    },
    async enviar({ jid, mensagens }) {
      if (!/^[\d-]+@g\.us$/.test(jid || '')) throw falha('o robô só envia para grupos');
      if (!Array.isArray(mensagens) || !mensagens.length || mensagens.length > 10) throw falha('post vazio');
      if (conexao.estado() !== 'conectado') throw falha('o robô está desconectado do WhatsApp');
      let primeira = true;
      for (const m of mensagens) {
        const imagem = m.tipo === 'imagem' && m.imagem;
        if (!imagem && !String(m.texto || '').trim()) continue;
        if (!primeira) await pausa(1000 + Math.floor(Math.random() * 2000)); /* 1 a 3 s entre o post e cada código */
        primeira = false;
        if (imagem) await conexao.enviaImagem(jid, Buffer.from(String(m.imagem).replace(/^data:[^,]+,/, ''), 'base64'), m.texto || '');
        else await conexao.enviaTexto(jid, m.texto);
      }
      return { ok: true };
    },
    async desconectar() { await conexao.sai(); return { ok: true }; }
  };
  return async function (corpo) {
    const f = acoes[corpo && corpo.acao];
    if (!f) return { status: 400, dados: { erro: 'Ação desconhecida.' } };
    try { return { status: 200, dados: await f(corpo) }; }
    catch (e) { return { status: 502, dados: { erro: e.publico || traduzErroRobo(e && (e.message || e.output?.statusCode)) } }; }
  };
}
