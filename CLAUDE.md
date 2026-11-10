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

1. **Abertura com três portas**: "Quero comprar" (Para você), "Sou maker" (Para criadores) e "Quem somos". As três têm a mesma moldura; as duas primeiras são vitrines que trocam sozinhas a cada 3,2 s (queridinhos do catálogo e prints dos projetos), e a de Quem somos mostra só a foto do casal, fixa; no celular a vitrine fica na metade direita e o texto à esquerda. Cada porta desce até a seção dela.
2. **Sua ideia merece sair do papel** (`#comprar`), com dois públicos: **Para você** (`#para-voce`: 4 queridinhos sorteados no computador; no celular 2, que trocam sozinhos a cada 2,2 s passando por todos; catálogo e WhatsApp) e **Para empresas** (`#para-empresas`: texto de brindes, peças da categoria Brindes do catálogo + o card "Sua marca aqui", que fica sempre (no celular: 1 brinde + ele), link para `#categoria/Brindes` e WhatsApp de empresas).
3. **Para criadores** (`#criadores`): Calculadora, Ajuste 3MF, Dicas e STLs grátis (cards claros no computador; lista com miniatura do lado no celular); o dos STLs tem o desenho animado `StlAnimado.astro` (arquivos baixando e uma impressora levantando a peça), também usado na vitrine da porta "Sou maker".
4. **Nossas parcerias** (`#parcerias`): Voolt3D (link de afiliado com `rel="sponsored"`, cupom `CUPOM_VOOLT` com botão de copiar), Mercado Livre (só aparece quando `LINKS.hub.mercadoLivre` tiver o link) e o convite "Quero ser parceiro" no WhatsApp.
5. **Quem somos** (`#quem-somos`): foto, versículo, Goiânia, "Conheça nossa história" (diálogo `Historia.astro`) e Instagram.

- **Queridinhos e brindes**: o build do catálogo gera `catalogo/queridinhos.json` (MaisVendido preenchido, não esgotadas, com foto) e `catalogo/brindes.json` (categoria Brindes, não esgotadas, com foto). O build do site já põe as listas no HTML; no navegador o script busca a versão atual e sorteia. Mudou no painel do catálogo: a página acompanha sem precisar publicar o site. Para testar sem internet: `QUERIDINHOS_ARQUIVO=... BRINDES_ARQUIVO=... npm run build`.
- **Prints dos projetos**: `public/assets/projetos/*.jpg` (960×713, tema claro quando o projeto tem). Se um projeto mudar de cara, tire o print de novo.
- `empresas.astro`, `eventos.astro`, `para-voce.astro` levam para `#comprar`; os `#empresas` e `#eventos` antigos caem em "Para empresas" e `#voce` em "Para você".
- `404.astro`: o GitHub Pages serve esse arquivo em qualquer endereço inexistente do domínio; ele também leva `/calc-3d`, `/ajuste-3mf` e `/site` para os endereços novos.

## Onde mexer

- `src/data/links.ts`: **toda URL externa fica aqui**, no objeto `LINKS`. Use `href={LINKS.grupo.chave}` com `data-link="grupo.chave"` (o `medicao.js` usa pra saber de onde veio o clique). Links internos passam por `url("caminho/")`. Escreva `target="_blank" rel="noopener noreferrer"` em todo link externo.
- `MENSAGENS` em `src/data/links.ts`: a mensagem pronta de cada botão de WhatsApp, uma por parte do site (menu, menu do celular, Para você, Para empresas, Parcerias, rodapé), pra saber pela conversa de onde a pessoa veio. Use `whatsapp("origem")` no `href` e `data-link="whatsapp.origem"`. As mensagens têm que ser diferentes entre si (o `npm run testar` confere).
- `src/data/sites.ts`: os sites da casa (rodapé).
- `src/components/v4/`: `Topo` (cabeçalho; no celular só logo e WhatsApp), `Rodape`, `Historia`, `Redireciona`. `src/layouts/Pagina.astro`: cabeçalho HTML, SEO e o efeito `.surge`. `src/components/Icones.astro`: os ícones (`<use href="#i-nome"/>`).
- `src/styles/v4.css`: tokens de cor e tipografia, botões, seções.
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

## Roteiro de teste

Usado pelo `/conferir-site`, no build (`npm run build` e `npx astro preview`), no celular (375px), tablet (768px) e desktop:

1. `npm run testar` sem falhas (links, mensagens prontas do WhatsApp, redirecionamentos, queridinhos e destinos no ar).
2. A página e a 404 abrem sem erros no console.
3. As três portas descem até as seções; as vitrines de "Quero comprar" e "Sou maker" trocam sozinhas.
4. "Para você" mostra 6 queridinhos (4 no celular) com foto quadrada, nome e preço; recarregar muda o sorteio; cada um abre a peça no catálogo.
5. Todo botão de contato (cabeçalho, Para você, Para empresas, Parcerias, rodapé) fica visível, sem nada por cima, e abre em nova aba. Não envie mensagem no WhatsApp.
6. `/empresas/`, `/eventos/`, `/para-voce/` e `/#voce` caem em "Para você"; os antigos `/site/...`, `/calc-3d` e `/ajuste-3mf` levam para os endereços novos.
7. "Conheça nossa história" abre e fecha o diálogo.
8. Sem rolagem horizontal em 320px, 375px e 768px.
