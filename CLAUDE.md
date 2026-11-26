# Site Nosso Projeto 3D

Site institucional e porta de entrada de vendas, publicado no GitHub Pages (repositório `nossoprojeto3d.github.io`): https://nossoprojeto3d.com.br/ (os endereços antigos `/site/...` levam pra raiz)
Todo push na `main` dispara `.github/workflows/deploy.yml`, que roda `astro check`, gera o site e publica. Se o check falhar, nada vai pro ar.

Feito em **Astro**, sem React nem Tailwind. É a **V4**: uma página só, **clara**, com o dourado da logo como destaque. A V3 (escura, com peças 3D em Three.js) está na etiqueta `v3-final`; a V2 em `backup-oficial-20261013`; a V1 em `v1-final`.

```bash
npm run dev        # http://localhost:4321/  (--host pra abrir no celular pela rede)
npm run build      # gera dist/ (lê os queridinhos do catálogo no ar; QUERIDINHOS_ARQUIVO=<caminho> usa um arquivo local)
npx astro check    # tipos e erros; rode antes de commitar
npm run testar     # bateria dos caminhos de contato (WhatsApp, Instagram, catálogo, Shopee); rode depois do build
npm run icones     # regenera favicon e ícones de app a partir de public/assets/logo.png
npm run fotos      # prepara as fotos da pasta ~/Desktop/Fotos do site
```

## Página

`src/pages/index.astro`, de cima pra baixo:

1. **Abertura com três portas**: "Nosso catálogo" (Para você; no celular, até 900px, abre o catálogo direto em nova aba e a seção "Sua ideia merece sair do papel" fica escondida; no computador desce até ela). **Celular (até 900px), "jeito de app"**: o h1 fica só para Google e leitor de tela e no lugar entra a boas-vindas `.app-ola` (foto do casal + "Oi! Somos o Júnior e a Thai"); depois "Nosso catálogo" maior (foto ocupando o cartão e botão "Abrir"), a fileira de queridinhos que arrasta pro lado (`[data-app-queridinhos]`, mesmo sorteio da vitrine) e os grupos em destaque (`.app-grupos`: Nossos Achadinhos grande, nas cores do app dele, porque é onde vem a comissão; Família menor). As portas "Sou maker" e "Quem somos" somem (Quem somos continua no fim da página); as ferramentas viram fileira que arrasta; embaixo fica a barra fixa `.abas-app` (Catálogo, Ferramentas, Cupom e, na ponta direita e em destaque, Achadinhos), e o body ganha espaço embaixo pra ela. No computador tudo isso fica escondido (`min-width:901px`), "Sou maker" (Para criadores) e "Quem somos". As três têm a mesma moldura; as duas primeiras são vitrines que trocam sozinhas a cada 3,2 s (queridinhos do catálogo e prints dos projetos), e a de Quem somos mostra só a foto do casal, fixa; no celular a vitrine fica na metade direita e o texto à esquerda. Cada porta desce até a seção dela.
2. **Sua ideia merece sair do papel** (`#comprar`), com dois públicos: **Para você** (`#para-voce`: 4 queridinhos sorteados no computador; no celular 2, que trocam sozinhos a cada 2,2 s passando por todos; catálogo e WhatsApp) e **Para empresas** (`#para-empresas`: texto de brindes, peças da categoria Brindes do catálogo + o card "Sua marca aqui", que fica sempre (no celular: 1 brinde + ele), link para `#categoria/Brindes` e WhatsApp de empresas).
3. **Para criadores** (`#criadores`): Calculadora, Fatiô (antes Ajuste 3MF), Dicas e STLs otimizados (cards claros no computador; lista com miniatura do lado no celular); cada card tem um desenho animado em CSS no lugar do print: `FerramentaAnimada.astro` (calculadora em roxo somando custos até o preço, ajuste em laranja com os controles deslizando, dicas em framboesa com cartões numerados passando) e `StlAnimado.astro` (arquivos baixando e uma impressora levantando a peça). Antes de abrir a pasta do Drive dos STLs, `AvisoStl.astro` (no layout) mostra o aviso de que os modelos são dos criadores do MakerWorld; ele pega qualquer link com `data-link="hub.stlsGratis"`. A vitrine da porta "Sou maker" continua com os prints de `public/assets/projetos/` e o `StlAnimado`.
4. **Nossas parcerias** (`#parcerias`): Voolt3D (link de afiliado com `rel="sponsored"`, cupom `CUPOM_VOOLT` com botão de copiar), Mercado Livre (só aparece quando `LINKS.hub.mercadoLivre` tiver o link) (o convite "Quero ser parceiro", no WhatsApp, fica no rodapé).
5. **Quem somos** (`#quem-somos`): foto, versículo, Goiânia, "Conheça nossa história" (diálogo `Historia.astro`) e Instagram.
6. **Grupos no WhatsApp** (links em `LINKS.grupos`; grupo com link vazio não aparece): no computador, a faixa `#grupos` (`.grupos-web`); no celular, os cartões `.app-grupos` e a aba Achadinhos. Não há mais botão flutuante.

- **Queridinhos e brindes**: o build do catálogo gera `catalogo/queridinhos.json` (MaisVendido preenchido, não esgotadas, com foto) e `catalogo/brindes.json` (categoria Brindes, não esgotadas, com foto). O build do site já põe as listas no HTML; no navegador o script busca a versão atual e sorteia. Mudou no painel do catálogo: a página acompanha sem precisar publicar o site. Para testar sem internet: `QUERIDINHOS_ARQUIVO=... BRINDES_ARQUIVO=... npm run build`.
- **Prints dos projetos**: `public/assets/projetos/*.jpg` (960×713, tema claro quando o projeto tem). Se um projeto mudar de cara, tire o print de novo.
- `empresas.astro`, `eventos.astro`, `para-voce.astro` levam para `#comprar`; os `#empresas` e `#eventos` antigos caem em "Para empresas" e `#voce` em "Para você".
- `404.astro`: o GitHub Pages serve esse arquivo em qualquer endereço inexistente do domínio; ele também leva `/calc-3d`, `/ajuste-3mf`, `/ajustes` e `/site` para os endereços novos (o Fatiô mudou de `/ajustes` para `/fatio` em 11/11/2026; `public/ajustes` e `public/ajuste-3mf` redirecionam na hora).

- **Natal** (`src/data/natal.ts` + `components/v4/Natal.astro`): faixa verde no topo com link para a categoria Natal do catálogo e neve caindo nela e atrás da abertura (`data-neve`). Some sozinho a partir de `NATAL_ATE` (o navegador confere a data, não precisa publicar). No próximo Natal, troque as datas e o texto em `natal.ts`. Para tirar antes da data: `git revert natal-2026` (etiqueta do commit que trouxe o tema; `antes-do-natal-2026` marca o site logo antes dele).

## Celular e computador são layouts diferentes

Desde 25/11/2026 a página tem duas caras, separadas em **900px** (`max-width:900px` = celular e tablet; `min-width:901px` = computador). Mudança pedida "só no celular" ou "só na web" fica do lado dela: não deixe vazar pro outro.

- **Computador**: a V4 original. Título que "imprime", três portas (Nosso catálogo, Sou maker, Quem somos) que descem até as seções, "Sua ideia merece sair do papel", Para criadores em cards, a faixa dos grupos (`.grupos-web`, `#grupos`, entre "Sua ideia" e Para criadores: faixa verde do Nossos Achadinhos com cupons empilhados e a Família numa linha branca embaixo), Parcerias e Quem somos.
- **Celular ("jeito de app")**: boas-vindas do casal no lugar do título (o h1 fica só pro Google), "Nosso catálogo" grande abrindo o catálogo direto, queridinhos em fileira, os grupos em destaque (Nossos Achadinhos grande, porque é onde vem a comissão; Família com cara de grupo do WhatsApp), ferramentas em fileira, Parcerias, Quem somos e a barra fixa `.abas-app` (Catálogo, Ferramentas, Cupom, Achadinhos na ponta direita). Some: a faixa `.grupos-web`, "Sua ideia merece sair do papel", as portas Sou maker e Quem somos e o efeito do título.
- Elementos só do celular: `.app-ola`, `.app-bloco` (queridinhos e grupos), `.porta-abrir`, `.abas-app`; escondidos no computador por um bloco `@media (min-width:901px)` no fim dos estilos de `index.astro`. A porta "Nosso catálogo" troca o destino por script (`data-celular`).
- A barra de abas tem fundo sólido `var(--bg)`: o Safari pinta a área da barra de endereço com a cor do que está fixo embaixo, e fundo translúcido deixava cores diferentes.
- Ao testar, confira as duas larguras (375px e 1440px).

## Onde mexer

- `src/data/links.ts`: **toda URL externa fica aqui**, no objeto `LINKS`. Use `href={LINKS.grupo.chave}` com `data-link="grupo.chave"` (o `medicao.js` usa pra saber de onde veio o clique). Links internos passam por `url("caminho/")`. Escreva `target="_blank" rel="noopener noreferrer"` em todo link externo.
- `MENSAGENS` em `src/data/links.ts`: a mensagem pronta de cada botão de WhatsApp, uma por parte do site (menu, menu do celular, Para você, Para empresas, rodapé), pra saber pela conversa de onde a pessoa veio. Use `whatsapp("origem")` no `href` e `data-link="whatsapp.origem"`. As mensagens têm que ser diferentes entre si (o `npm run testar` confere).
- `src/data/sites.ts`: os sites da casa (rodapé).
- `src/components/v4/`: `Topo` (cabeçalho; no celular só logo e WhatsApp), `Rodape`, `Historia`, `Redireciona`. `src/layouts/Pagina.astro`: cabeçalho HTML, SEO e o efeito `.surge`. `src/components/Icones.astro`: os ícones (`<use href="#i-nome"/>`).
- `src/styles/v4.css`: tokens de cor e tipografia, botões, seções.
- `public/achadinhos/`: o app **Nossos Achadinhos** (https://nossoprojeto3d.com.br/achadinhos/), que monta os posts do grupo de ofertas no WhatsApp. É uma página só (`index.html`), fora do Astro e com identidade própria (verde escuro e amarelo, logo NP oficial pintada no verde `#0E3A34` em `logo-np-verde.png` e nos ícones `icone-*.png`; no computador o novo post cabe numa tela, em três colunas: colar, ajustar, conferir e enviar); não aparece no site nem no sitemap (`noindex`). `config.js` guarda o endereço e a chave publicável do Supabase: é o mesmo projeto do Caixa (o plano gratuito só permite 2 projetos), mas em tabelas próprias com prefixo `achadinhos_` e com o mesmo login do Caixa: as duas contas de lá estão em `achadinhos_membros` e só elas leem e gravam (vazio = modo de teste, nada fica salvo). O nome de quem está no aparelho fica guardado no próprio aparelho. Tabelas, gatilho e como remover tudo: `supabase/schema.sql`.
- `achadinhos-ml/`: **gerador de meli.la** do Achadinhos, um Cloudflare Worker em https://achadinhos-ml.auto-insta.workers.dev (KV `DADOS`; publicar com `cd achadinhos-ml && npx wrangler deploy`, não vai sozinho no push; testes com `node --test achadinhos-ml/test`). Ao colar uma oferta, o app manda o link do outro grupo para `/api/converter`: o Worker abre o `meli.la`, que cai na vitrine social do afiliado (`/social/<nome>?matt_word&matt_tool&ref`), acha o produto em destaque (id no `affiliates_event`; título, foto, preço e endereço no cartão do produto, porque a página de produto pede verificação de robô), tira o rastreio e pede o link ao Gerador de links do ML (`POST /affiliate-program/api/v2/affiliates/linkbuilder/createLink`, corpo `{urls:[...], tag}`, com cookie e `x-csrf-token` da sessão). O Junior quer **só meli.la oficial** (a prévia com imagem no WhatsApp depende dele): nada de link curto próprio. A sessão vem de Ajustes > Mercado Livre, onde se cola o "Copy as cURL (bash)" do createLink (Chrome > Network); fica só no KV, nunca volta ao app, e os `set-cookie` do ML são juntados a ela a cada uso. Sessão vencida: o app avisa e manda reconectar. As rotas `/api` só atendem membros (confere `achadinhos_membros` com o token do Supabase de quem chama). Se a conversão falhar, o app volta ao jeito manual (abrir no ML e colar). O Worker também devolve do cartão do produto: preço antigo, desconto, frete, nota, vendidos e loja.
- **Menu do app**: Clonar oferta (abre a mensagem colada), Nova oferta (abre o "Do zero"), Template e Ajustes. Nova oferta e Clonar oferta são a mesma tela (view `novo`), no modo `S.manual`/`S.cZero`; a troca "Mensagem pronta | Do zero" dentro da tela não existe mais. **Sem aba de Histórico** (26/11/2026, o Junior não usava): os posts continuam salvos em `achadinhos_posts` e servem só para o aviso de produto repetido; `telaHistorico` ficou no código sem caminho até ela, caso volte.
- **Modelos das mensagens** (aba Template, troca Oferta | Cupom; editor à esquerda e prévia fixa à direita no computador, prévia embaixo no celular): texto com campos; linha com campo vazio some e trecho entre `[ ]` só aparece se o campo dele tiver valor. Oferta: `{titulo} {preco} {cupom} {cupons} {desconto} {de} {frete} {avaliacao} {loja} {frase} {absurda} {link}`. Cupom: `{abertura} {aviso} {cupons} {codigos} {chamada} {link}`. Botão Emoji com uma lista fixa (`EMOJIS`). A imagem do post de cupom (enviar, copiar prompt, voltar à padrão; guardada no aparelho em `na-img`) fica na troca Cupom da aba Template, não em Ajustes. Ficam no KV do Worker (`/api/modelo`, chaves `modelo-oferta` e `modelo-cupom`, valem para os dois) com cópia no aparelho (`na-modelo-oferta`, `na-modelo-cupom`); vazio = `MODELO_PADRAO`, que repete o formato antigo.
- `public/`: vai pro ar como está. `assets/medicao.js` é o Google Analytics compartilhado com os outros projetos: se mudar aqui, avisar que precisa copiar pros outros. `googlee4343bf2118f52f0.html` é a verificação do Google Search Console (não apagar nem renomear). `sitemap.xml`: atualizar o `lastmod` quando o conteúdo mudar.
- `public/assets/og/og-image.html`: fonte da prévia que aparece no WhatsApp. Depois de editar, gere de novo o `og-image.jpg` em 1200×630 e aumente o `?v=` em `Pagina.astro` (o WhatsApp guarda a prévia antiga).

## Identidade visual

Fundo creme (`--bg` #faf8f2), superfícies brancas, texto quase preto e o **dourado da logo** como destaque (`--ouro-grad` nos botões e setas, `--ouro-texto` #8A6A0A nos rótulos, que dá para ler no claro). Títulos em **Archivo** (largura 112%, peso 750 a 800) e texto em **Instrument Sans**. Verde só no WhatsApp. Sem tema escuro. Use as variáveis de `v4.css` em vez de cores soltas.

## Cuidados

- Estilos de elementos que o script cria (peças sorteadas, quadros da vitrine) usam `:global(...)` dentro do seletor da seção: o Astro não marca o HTML criado pelo JS.
- Imagens com `width`/`height` no HTML e `aspect-ratio` no CSS precisam de `height:auto`, senão a altura do atributo vence.
- As vitrines só giram com a porta na tela, com a aba aberta e sem "reduzir movimento".
- `.surge` nunca esconde o bloco (só desliza ao aparecer): conteúdo invisível esperando o JS já deu tela vazia em teste.
- Safari do iPhone: não tem `animation-timeline`. Efeitos importantes usam `IntersectionObserver`.
- O compactador do build (esbuild) mantém só a última de propriedades duplicadas: em `backdrop-filter`, escreva `-webkit-backdrop-filter` primeiro.

## Imagens

- Fotos: 4:5, 1080×1350, JPEG sRGB, no máximo ~250 KB, em `public/assets/fotos/<número>-<nome>.jpg`. Hoje só a `01-casal.jpg` aparece (Quem somos).
- As originais chegam em `~/Desktop/Fotos do site/`, nomeadas só com o número. `npm run fotos` enquadra, comprime e grava com o nome certo. Não use o `/otimizar-imagens` aqui: ele faz commit sozinho.

Abertura: no computador (no celular, até 900px, ele já aparece pronto), o título "imprime" ao carregar (classes `.impresso` e `.bico` no h1 de `index.astro`, só CSS, roda uma vez; com "reduzir movimento" aparece inteiro).

Ritmo (computador ≥1101px): Para você e Para empresas em zigue-zague (texto de um lado, peças do outro); Ferramentas numa faixa `.faixa` com título e subtítulo lado a lado (`.secao-topo`); Parcerias centralizada (`.topo-centro`); foto de Quem somos maior, encostada na borda esquerda (≥901px). Peças: `.peca-foto` com zoom e "Ver peça" (setinha no celular). Cupom da Voolt em formato de ticket (classe `copiado` ao copiar).

## Roteiro de teste

Usado pelo `/conferir-site`, no build (`npm run build` e `npx astro preview`), no celular (375px), tablet (768px) e desktop:

1. `npm run testar` sem falhas (links, mensagens prontas do WhatsApp, redirecionamentos, queridinhos e destinos no ar).
2. A página e a 404 abrem sem erros no console.
3. As três portas descem até as seções (no celular, "Nosso catálogo" abre o catálogo); as vitrines de "Nosso catálogo" e "Sou maker" trocam sozinhas.
4. "Para você" mostra 6 queridinhos (4 no celular) com foto quadrada, nome e preço; recarregar muda o sorteio; cada um abre a peça no catálogo.
5. Todo botão de contato (cabeçalho, Para você, Para empresas, rodapé) fica visível, sem nada por cima, e abre em nova aba. Não envie mensagem no WhatsApp.
6. `/empresas/`, `/eventos/`, `/para-voce/` e `/#voce` caem em "Para você"; os antigos `/site/...`, `/calc-3d`, `/ajuste-3mf` e `/ajustes` levam para os endereços novos.
7. "Conheça nossa história" abre e fecha o diálogo.
8. Sem rolagem horizontal em 320px, 375px e 768px.

## Próxima evolução: robô do Nossos Achadinhos

Objetivo: o botão "Enviar pro grupo" do app (`public/achadinhos/`) disparar sozinho, por um número provisório, nos grupos de achadinhos, sem o Junior abrir o WhatsApp. Começa quando o chip estiver comprado e dentro dos grupos.

**O que já está pronto (17/11/2026)**
- Interface completa em modo demonstração: Ajustes > Robô do WhatsApp (conectar número por QR, grupos que recebem, espera entre grupos, desconectar com confirmação) e a tela de envio (progresso por grupo, falha com motivo, reenviar só os que falharam, parar). Nada é enviado na demonstração.
- O app já chama a ponte quando `robo: true` em `config.js`: `sb.functions.invoke('achadinhos-robo', { body: { acao, ... } })`, com as ações abaixo. Enquanto `robo: false`, tudo sai pelo WhatsApp do aparelho, como hoje.
- O envio é um grupo por vez (o app espera o intervalo escolhido entre um e outro); o histórico grava uma vez só, quando pelo menos um grupo recebe.
- Se o robô cair, Ajustes mostra "Robô fora do ar" e o botão "Enviar pelo meu WhatsApp" continua embaixo do botão principal.

**Decidido em 26/11/2026**
- Chip comprado e já dentro dos grupos.
- Servidor: **Google Cloud grátis** (a Oracle exigiu CNPJ). Projeto `achadinhos-robo-515921`, máquina `achadinhos-robo` e2-micro (1 GB) em `us-central1-f`, Ubuntu 24.04 Minimal, disco padrão de 30 GB, sem backups, IP `34.41.85.127`, usuário `robo` com a chave `~/.ssh/achadinhos_robo` do Mac. Alerta de orçamento de R$ 1 na conta de faturamento. Arquivos em `achadinhos-robo/`: `docker-compose.yml` (Evolution API `evoapicloud/evolution-api:v2.3.8`, Postgres 15 enxuto e `cloudflared`; sem Redis, cache local por causa da memória) e `instalar.sh` (2 GB de swap, Docker, gera `.env` com a chave e a senha, sobe tudo). Swap, Docker e imagens já instalados na máquina (26/11/2026). Nenhuma porta aberta: o HTTPS vem de um túnel da Cloudflare em `robo.nossoprojeto3d.com.br` apontando para `http://api:8080`. A Evolution não guarda mensagens, contatos nem conversas (`DATABASE_SAVE_DATA_*=false`), só a sessão do chip.
- Ponte: **no Worker `achadinhos-ml`** (`src/robo.js`, `POST /api/robo`), não numa Edge Function do Supabase. Segredos do Worker: `EVO_URL` (https://robo.nossoprojeto3d.com.br) e `EVO_KEY` (a chave do `.env`); `EVO_INSTANCIA = "achadinhos"` no wrangler.toml. O app chama com `chamaRobo` → `apiLinks('/api/robo')`. Ações: `status`, `qr` (cria a instância na primeira vez), `grupos`, `enviar` (só para `…@g.us`, 1 a 3 s entre mensagens, imagem via `sendMedia` com legenda, texto com `linkPreview`), `desconectar`. Rotas conferidas no código da Evolution 2.3.8.

**Falta, em ordem**
1. ~~Servidor~~: pronto (Google Cloud, ver acima).
2. **Túnel (Junior, no painel da Cloudflare):** Zero Trust > Networks > Tunnels > criar `achadinhos-robo` (Cloudflared), copiar o token; em Public Hostname: `robo.nossoprojeto3d.com.br` → HTTP → `api:8080`.
3. **Instalar:** copiar `achadinhos-robo/` para a máquina e rodar `./instalar.sh` com o token.
4. **Worker:** `npx wrangler secret put EVO_URL` e `EVO_KEY`; `npx wrangler deploy`.
5. **Grupos escolhidos no banco** (hoje ficam no aparelho, `na-robo-sel`): guardar no KV do Worker para valer para os dois.
6. **Ligar:** `robo: true` em `config.js`, publicar, conectar o chip pelo QR em Ajustes.
7. **Testar** primeiro num grupo só com os dois: oferta com e sem cupom, post de cupom com imagem, prévia do meli.la, ordem das mensagens, falha (chip fora do grupo), parar no meio, robô desligado (app tem que cair para o envio manual).

**Cuidados contra banimento:** espera de 10 s ou mais entre grupos, nada de mensagem no privado em massa, não adicionar pessoas aos grupos, não entrar em muitos grupos de uma vez. Se o chip for banido, o grupo continua: o número do Nosso Projeto 3D fica como dono/admin e um chip novo entra no lugar.
