// @ts-check
import { defineConfig } from 'astro/config';

// Publicado no GitHub Pages (repositório nossoprojeto3d.github.io) em https://nossoprojeto3d.com.br/
export default defineConfig({
  site: 'https://nossoprojeto3d.com.br',
  devToolbar: { enabled: false },
  // CSS embutido no HTML: o site é pequeno e assim a primeira pintura não espera outro arquivo
  build: { inlineStylesheets: 'always' }
});
