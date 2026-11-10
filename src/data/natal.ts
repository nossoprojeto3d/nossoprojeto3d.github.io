/**
 * Clima de Natal: faixa no topo e neve atrás da abertura. Tudo some sozinho a partir de NATAL_ATE,
 * sem precisar publicar de novo (o navegador confere a data). No próximo ano, é só trocar as datas e o texto.
 */
export const NATAL_ATE = "2026-12-26T00:00:00-03:00";
export const FAIXA_NATAL = {
  texto: "Presentes de Natal personalizados",
  // ex.: "Peça até 15/12 para receber antes do Natal". Vazio = sem prazo na faixa.
  prazo: "",
  botao: "Ver peças de Natal"
};
export const natalNoAr = () => Date.now() < new Date(NATAL_ATE).getTime();
