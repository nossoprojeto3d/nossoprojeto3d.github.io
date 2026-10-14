// @ts-check
import { defineConfig } from 'astro/config';

// Publicado no GitHub Pages em https://nossoprojeto3d.github.io/site/
export default defineConfig({
  site: 'https://nossoprojeto3d.github.io',
  base: '/site',
  devToolbar: { enabled: false },
  // CSS embutido no HTML: o site é pequeno e assim a primeira pintura não espera outro arquivo
  build: { inlineStylesheets: 'always' },
  // no npm run dev, prepara de uma vez as partes do three que só carregam depois (modelos .glb);
  // sem isso o Vite reorganiza no meio da navegação e a peça 3D da aba não aparece ("Outdated Optimize Dep")
  vite: { optimizeDeps: { include: ['three', 'three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/libs/meshopt_decoder.module.js', 'three/examples/jsm/loaders/SVGLoader.js'] } }
});
