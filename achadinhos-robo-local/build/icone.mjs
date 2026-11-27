// Ícone do Nossos Achadinhos: etiqueta de preço amarela com "%" sobre o verde-escuro.
// Gera os ícones do app (Mac e Windows) e os do site (aba e atalho no celular).
//   node build/icone.mjs   (dentro de achadinhos-robo-local; usa o sharp daqui)
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const VERDE = '#0E3A34', AMARELO = '#FFD23F';
const aqui = p => fileURLToPath(new URL(p, import.meta.url));

/* desenho num quadro de 1000 x 1000: etiqueta na diagonal (ponta e furo em cima à esquerda) com o % em pé, vazado em verde */
const ARTE = `
  <g transform="translate(510 510) rotate(45) translate(-360 -175)">
    <path d="M0 175 L150 0 L540 0 L540 350 L150 350 Z" fill="${AMARELO}" stroke="${AMARELO}" stroke-width="64" stroke-linejoin="round"/>
    <circle cx="125" cy="175" r="38" fill="${VERDE}"/>
  </g>
  <g fill="none" stroke="${VERDE}" stroke-width="30" stroke-linecap="round">
    <circle cx="488" cy="478" r="42"/>
    <circle cx="622" cy="612" r="42"/>
    <line x1="640" y1="450" x2="470" y2="640"/>
  </g>`;

/* placa de `lado` px: `margem` transparente em volta (padrão do Mac) e `raio` nos cantos (0 = reto, o sistema arredonda) */
function svg(lado, margem = 0, raio = 0) {
  const placa = lado - 2 * margem, k = placa / 1000;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
    <rect x="${margem}" y="${margem}" width="${placa}" height="${placa}" rx="${raio}" fill="${VERDE}"/>
    <g transform="translate(${margem} ${margem}) scale(${k})">${ARTE}</g></svg>`);
}

const png = (lado, margem, raio) => sharp(svg(lado, margem, raio)).png().toBuffer();

const saidas = [
  ['icon.png', png(1024, 100, 185)],                                  // Mac: placa 824 com cantos e margem, como os outros apps
  ['icon-win.png', png(512, 0, 96)],                                  // Windows: placa inteira com cantos arredondados
  ['../../public/achadinhos/icone-512.png', png(512, 0, 0)],          // site (maskable: o sistema recorta)
  ['../../public/achadinhos/icone-192.png', png(192, 0, 0)],
  ['../../public/achadinhos/icone-180.png', png(180, 0, 0)]           // iPhone arredonda sozinho
];
for (const [arq, buf] of saidas) await writeFile(aqui(arq), await buf);
console.log('Ícones gerados:', saidas.map(s => s[0]).join(', '));
