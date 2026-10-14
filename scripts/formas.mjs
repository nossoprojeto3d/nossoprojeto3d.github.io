// Gera src/data/formas.ts com os contornos (SVG path) usados pelas peças 3D.
// O navegador só recebe o texto do path; potrace e opentype ficam no build.
// Rode de novo se trocar o logo ou os textos da lembrancinha: npm run formas
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import potrace from "potrace";
import opentype from "opentype.js";

const raiz = new URL("../", import.meta.url);

// Logo: usa só a transparência do PNG (o dourado tem degradê e atrapalharia o contorno)
const mascara = await sharp(fileURLToPath(new URL("public/assets/logo.png", raiz)))
  .resize({ height: 1200 })
  .extractChannel("alpha")
  .negate()
  .png()
  .toBuffer();
const logoSvg = await new Promise((ok, erro) =>
  potrace.trace(mascara, { threshold: 128, turdSize: 20, optTolerance: 0.4 }, (e, svg) => (e ? erro(e) : ok(svg)))
);
const logo = /<path d="([^"]+)"/.exec(logoSvg)[1];
const [, largura, altura] = /width="(\d+)" height="(\d+)"/.exec(logoSvg).map(Number);

// Lembrancinha de mesa: textos em Pacifico, fonte grossa que imprime bem em 3D
const arquivoFonte = await readFile(new URL("node_modules/@fontsource/pacifico/files/pacifico-latin-400-normal.woff", raiz));
const fonte = opentype.parse(arquivoFonte.buffer.slice(arquivoFonte.byteOffset, arquivoFonte.byteOffset + arquivoFonte.byteLength));

// letra por letra e com conversão própria pra texto: o toPathData do opentype.js 2.0 gera "NaN" em números perto de inteiros
function contornoTexto(texto) {
  const tamanho = 200;
  const escala = tamanho / fonte.unitsPerEm;
  const caminho = new opentype.Path();
  let x = 0;
  const glifos = fonte.stringToGlyphs(texto);
  glifos.forEach((g, i) => {
    for (const c of g.getPath(0, 0, tamanho).commands) {
      const m = { ...c };
      for (const k of ["x", "x1", "x2"]) if (k in m) m[k] += x;
      caminho.commands.push(m);
    }
    x += g.advanceWidth * escala + (glifos[i + 1] ? (fonte.getKerningValue(g, glifos[i + 1]) || 0) * escala : 0);
  });
  const n = (v) => String(Math.round(v * 10) / 10);
  const d = caminho.commands.map((c) =>
    c.type === "Z" ? "Z" : c.type === "Q" ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : c.type === "C" ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`
  ).join("");
  if (d.includes("NaN")) throw new Error(`contorno de "${texto}" com NaN`);
  const { x1, y1, x2, y2 } = caminho.getBoundingBox();
  return { texto, d, caixa: { x1, y1, x2, y2 } };
}
const lembranca = ["B-day", "Júnior e Thai"].map(contornoTexto);

const saida = `// Gerado por scripts/formas.mjs (npm run formas). Não edite à mão.
export const LOGO = { d: ${JSON.stringify(logo)}, largura: ${largura}, altura: ${altura} };
export const LEMBRANCA = ${JSON.stringify(lembranca)};
`;
await writeFile(new URL("src/data/formas.ts", raiz), saida);
console.log(`formas.ts: logo ${largura}×${altura} (${logo.length} caracteres), lembrancinha: ${lembranca.map((l) => `${l.texto} (${l.d.length})`).join(", ")}`);
