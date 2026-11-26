/* Configuração do Nossos Achadinhos.
   Com os dois campos vazios, o app roda em modo de teste (qualquer login entra, nada fica salvo).
   Usa o projeto "nossoprojeto3d's Project" do Supabase (o mesmo do Caixa), em tabelas próprias
   com o prefixo achadinhos_ e uma conta só dele, separada das contas do Caixa.
   A chave é a publicável, feita para ficar no navegador; quem protege os dados são as regras das tabelas. */
window.NA_CONFIG = {
  supabaseUrl: 'https://sruvkpqzpjqeqkesqffq.supabase.co',
  supabaseKey: 'sb_publishable_oETMODMZSazY4tWIYmOWLw_aqT6zY9l',
  // Robô do WhatsApp: 'local' fala com o robô aberto neste computador (pasta achadinhos-robo-local); false = só demonstração.
  robo: 'local',
  // Gerador de meli.la (pasta achadinhos-ml): troca o link do outro grupo pelo nosso, com a sessão do ML salva em Ajustes.
  ml: 'https://achadinhos-ml.auto-insta.workers.dev'
};
