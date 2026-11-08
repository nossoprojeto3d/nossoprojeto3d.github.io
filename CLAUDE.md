# Site Nosso Projeto 3D

Site institucional e porta de entrada de vendas, publicado no GitHub Pages (repositório `nossoprojeto3d.github.io`): https://nossoprojeto3d.com.br/ (os endereços antigos `/site/...` levam pra raiz)
Todo push na `main` dispara `.github/workflows/deploy.yml`, que roda `astro check`, gera o site e publica. Se o check falhar, nada vai pro ar.

Feito em **Astro**, sem React nem Tailwind, com **Three.js** nas peças 3D. É a V3: uma página só, escura e "tecnológica", com peças que se imprimem na tela. A V2 (cinco páginas, Fraunces, tema claro) está na etiqueta `backup-oficial-20261013`; a V1 em `v1-final`.

```bash
npm run dev        # http://localhost:4321/  (--host pra abrir no celular pela rede)
npm run build      # gera dist/
npx astro check    # tipos e erros; rode antes de commitar
npm run testar     # bateria dos caminhos de contato (WhatsApp, Instagram, catálogo, Shopee); rode depois do build
npm run modelo -- <arquivo.3mf|.stl> <nome> [frente|em-pe]   # converte peça real em public/assets/3d/<nome>.glb
npm run formas     # regenera src/data/formas.ts (contorno do logo e textos da lembrancinha)
npm run icones     # regenera favicon e ícones de app a partir de public/assets/logo.png
npm run fotos      # prepara as fotos da pasta ~/Desktop/Fotos do site
```

## Página

`src/pages/index.astro`, de cima pra baixo: topo (logo NP em 3D se imprimindo + Catálogo e WhatsApp com o mesmo peso), vitrine com abas Empresas / Eventos / Você (cada aba uma peça 3D e um "Pedir orçamento" com mensagem pronta no WhatsApp), Onde atendemos (mapa 3D), Quem somos, Nossos sites e rodapé.

- `empresas.astro`, `eventos.astro`, `para-voce.astro`: só levam pra aba certa (`/#empresas` etc.), pra não quebrar links antigos. `#empresas`, `#eventos` e `#voce` abrem a aba em qualquer link.
- `404.astro`: o GitHub Pages serve esse arquivo em qualquer endereço inexistente do domínio.

## Onde mexer

- `src/data/links.ts`: **toda URL externa fica aqui**, no objeto `LINKS`. Use `href={LINKS.grupo.chave}` com `data-link="grupo.chave"` (o `medicao.js` usa pra saber de onde veio o clique). Links internos passam por `url("caminho/")` (respeita o base, se um dia voltar a ter). **Não espalhe `{...ext}` em vários `<a>`**: o Astro gruda a classe do escopo várias vezes e o estilo some; escreva `target="_blank" rel="noopener noreferrer"`.
- `MENSAGENS` em `src/data/links.ts`: a mensagem pronta de cada botão de WhatsApp, uma por parte do site (menu, topo, abas, chamada final, rodapé), pra saber pela conversa de onde a pessoa veio. Use `whatsapp("origem")` no `href` e `data-link="whatsapp.origem"`. As mensagens têm que ser diferentes entre si (o `npm run testar` confere).
- `src/data/sites.ts`: os seis sites (menu "Sites", seção Nossos sites e rodapé).
- Abas da vitrine: array `abas` no topo de `index.astro` (texto, itens, peça, legenda e mensagem do WhatsApp).
- `src/scripts/palco.ts`: o palco 3D (impressão camada por camada com o bico, giro com o dedo, pausa fora da tela). `src/scripts/pecas.ts`: as peças. Peças reais vêm de `public/assets/3d/*.glb` com material de cor fiel (matcap, sem reflexo); `empresas.glb` é o chaveiro Starlink MG (do 3MF colorido), `voce.glb` é o pomo (bolinha e asas soltas, montadas no código). Logo e lembrancinha são feitos no código.
- `src/scripts/mapa3d.ts` + `components/v3/Entrega.astro`: o Brasil em 3D com rotas saindo de Goiânia; os pontos vêm de `src/data/mapa.ts` (calculado no build).
- `src/components/v3/`: `Menu`, `Rodape`, `QuemSomos`, `Historia` (diálogo), `NossosSites`, `Entrega`, `Redireciona`. `src/layouts/Pagina.astro`: cabeçalho, ícones, SEO e o script de inclinação (`data-inclinar`).
- `src/styles/v3.css`: tokens de cor e tipografia, botões em pílula, moldura dupla.
- `public/`: vai pro ar como está. `assets/medicao.js` é o Google Analytics compartilhado com os outros projetos: se mudar aqui, avisar que precisa copiar pros outros. `googlee4343bf2118f52f0.html` é a verificação do Google Search Console (não apagar nem renomear). `sitemap.xml`: atualizar o `lastmod` quando o conteúdo mudar.
- `public/assets/og/og-image.html`: fonte da prévia que aparece no WhatsApp. Depois de editar, gere de novo o `og-image.jpg` em 1200×630 e aumente o `?v=` em `Pagina.astro` (o WhatsApp guarda a prévia antiga).

## Identidade visual

Escuro neutro (`#0A0A0B`), texto em Geist e detalhes em Geist Mono; o dourado (`--ouro*`) só nos botões, na linha de impressão e nos destaques. Sem tema claro. Use as variáveis de `v3.css` em vez de cores soltas.

## Cuidados

- O 3D só carrega quando a seção chega perto da tela, e cada palco para de desenhar fora dela; mantenha assim (celular).
- Peças de terceiros (MakerWorld etc.) com licença não comercial não entram no site sem autorização do autor.
- Safari do iPhone: não tem `animation-timeline` (animações por rolagem) e ignora `textLength` em SVG. Efeitos importantes usam `IntersectionObserver` e HTML/CSS.
- O compactador do build (esbuild) mantém só a última de propriedades duplicadas: em `backdrop-filter`, escreva `-webkit-backdrop-filter` primeiro.
- Textos com a classe `.ph` (sublinhado tracejado) são suposições que os donos ainda precisam confirmar. Quando confirmarem, troque o texto e tire o `.ph`.

## Imagens

- Fotos: 4:5, 1080×1350, JPEG sRGB, no máximo ~250 KB, em `public/assets/fotos/<número>-<nome>.jpg`. Hoje só a `01-casal.jpg` aparece (Quem somos).
- As originais chegam em `~/Desktop/Fotos do site/`, nomeadas só com o número. `npm run fotos` enquadra, comprime e grava com o nome certo. Não use o `/otimizar-imagens` aqui: ele faz commit sozinho.

## Roteiro de teste

Usado pelo `/conferir-site`, no build (`npm run build` e `npx astro preview`), no celular (375px), tablet (768px) e desktop:

1. `npm run testar` sem falhas (links, mensagens prontas do WhatsApp, redirecionamentos e destinos no ar).
2. A página e a 404 abrem sem erros no console.
3. O logo do topo se imprime; as três abas trocam a peça e o "Pedir orçamento"; o mapa 3D aparece.
4. Todo botão de contato (menu, menu do celular, topo, vitrine, Nossos sites, rodapé) fica visível, sem nada por cima, e abre em nova aba. Não envie mensagem no WhatsApp.
5. `/empresas/`, `/eventos/`, `/para-voce/` e os antigos `/site/...` caem na aba certa.
6. "Conheça nossa história" abre e fecha o diálogo.
7. Sem rolagem horizontal em 320px, 375px e 768px; o nome do rodapé cabe inteiro.
