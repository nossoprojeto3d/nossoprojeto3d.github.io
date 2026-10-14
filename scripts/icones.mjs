// Gera os ícones do site a partir de public/assets/logo.png.  npm run icones
// - Aba do navegador (favicon): só o NP, sem fundo e ocupando a altura toda, no mesmo padrão dos outros
//   projetos (catálogo verde, calculadora lilás, Ajuste 3MF laranja); o do site é o dourado.
// - Tela inicial do celular (apple-touch, 192, 512): NP dourado sobre o fundo escuro, porque o sistema não aceita transparência.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = new URL("../", import.meta.url);
const caminho = (p) => fileURLToPath(new URL(p, raiz));
const FUNDO = "#0A0A0B";

/** quadrado de `lado` px com o logo ocupando `escala` da altura; `cantos` arredonda (favicon), ícones de app vão retos (o sistema arredonda) */
async function icone(lado, escala, cantos = 0) {
  const altura = Math.round(lado * escala);
  const logo = await sharp(caminho("public/assets/logo.png")).resize({ height: altura }).png().toBuffer();
  const { width } = await sharp(logo).metadata();
  const fundo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
    <defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#C9A227" stop-opacity=".22"/><stop offset="1" stop-color="#C9A227" stop-opacity="0"/></radialGradient></defs>
    <rect width="${lado}" height="${lado}" rx="${cantos}" fill="${FUNDO}"/><rect width="${lado}" height="${lado}" rx="${cantos}" fill="url(#g)"/></svg>`);
  return sharp(fundo)
    .composite([{ input: logo, left: Math.round((lado - width) / 2), top: Math.round((lado - altura) / 2) }])
    .png()
    .toBuffer();
}

/** favicon no padrão dos outros projetos: NP sem fundo, centralizado e com a altura toda */
async function favicon(lado) {
  const logo = await sharp(caminho("public/assets/logo.png")).trim().resize({ width: lado, height: lado, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return logo;
}

const saidas = {
  "favicon-16.png": await favicon(16),
  "favicon-32.png": await favicon(32),
  "favicon-64.png": await favicon(64),
  "apple-touch-icon.png": await icone(180, 0.6),
  "icon-192.png": await icone(192, 0.6),
  // "maskable": o Android pode recortar em círculo; o logo fica dentro da zona segura (80% do centro)
  "icon-512.png": await icone(512, 0.52)
};
for (const [nome, buf] of Object.entries(saidas)) await writeFile(caminho(`public/assets/icons/${nome}`), buf);

// favicon.ico com PNGs de 16, 32 e 48 dentro (formato ICO aceita PNG embutido)
const pngs = [saidas["favicon-16.png"], saidas["favicon-32.png"], await favicon(48)];
const cab = Buffer.alloc(6 + 16 * pngs.length);
cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(pngs.length, 4);
let deslocamento = cab.length;
pngs.forEach((p, i) => {
  const lado = [16, 32, 48][i];
  const o = 6 + i * 16;
  cab.writeUInt8(lado, o); cab.writeUInt8(lado, o + 1); cab.writeUInt8(0, o + 2); cab.writeUInt8(0, o + 3);
  cab.writeUInt16LE(1, o + 4); cab.writeUInt16LE(32, o + 6);
  cab.writeUInt32LE(p.length, o + 8); cab.writeUInt32LE(deslocamento, o + 12);
  deslocamento += p.length;
});
await writeFile(caminho("public/assets/icons/favicon.ico"), Buffer.concat([cab, ...pngs]));
console.log("ícones gerados:", [...Object.keys(saidas), "favicon.ico"].join(", "));
