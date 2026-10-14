// Peças do palco 3D. Todas ficam em pé sobre y = 0 e centradas em x/z, com altura perto de 2 unidades.
// Peças reais vêm de public/assets/3d/*.glb (gerados de 3MF por scripts/modelos.mjs); as outras são exemplos feitos no código.
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGO, LEMBRANCA } from "../data/formas";
import { url } from "../data/links";

export type NomePeca = "logo" | "starlink" | "lembranca" | "pomo";

export interface Peca {
  grupo: THREE.Group;
  /** materiais que recebem o efeito de impressão (corte, camadas e brilho do bico) */
  materiais: THREE.Material[];
  /** "volta" gira inteira; "balanco" vai e volta (peças achatadas ficariam de lado) */
  giro: "volta" | "balanco";
  /** movimento próprio da peça a cada quadro (ex.: asas batendo); t em segundos */
  animar?: (t: number, imprimindo: boolean) => void;
  /**
   * Impressão própria, no lugar do corte que sobe: recebe o andamento (0 a 1), mostra o que já foi
   * "impresso" e devolve onde está a ponta do bico (coordenadas do grupo), ou null se o bico some.
   */
  desenho?: (progresso: number) => THREE.Vector3 | null;
}

// cores de filamento (PLA)
const COR = {
  ouro: "#D4AF37",
  branco: "#ECEAE4",
};

function formasDoPath(d: string): THREE.Shape[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="#000" fill-rule="evenodd"/></svg>`;
  return new SVGLoader().parse(svg).paths.flatMap((p) => p.toShapes());
}

/** Extrusão de um contorno SVG (y para baixo) já virado, escalado para `altura` e com a base em y = 0. */
function extrudarSvg(d: string, altura: number, alturaOriginal: number, profundidade: number, chanfro: number) {
  const g = new THREE.ExtrudeGeometry(formasDoPath(d), {
    depth: profundidade,
    bevelEnabled: true,
    bevelThickness: chanfro,
    bevelSize: chanfro * 0.7,
    bevelSegments: 2,
    curveSegments: 5
  });
  const e = altura / alturaOriginal;
  // inverte y (SVG cresce para baixo) e z junto: duas inversões mantêm a frente das faces para fora
  g.scale(e, -e, -e);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.computeVertexNormals();
  return g;
}

function material(cor: string, rugosidade: number, metal: number) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: rugosidade, metalness: metal });
}

/**
 * Logo "desenhado com filamento": como na primeira camada de uma impressão, o bico traça o contorno
 * de cada parte do NP com um fio dourado aceso; quando os contornos fecham, o miolo se preenche numa
 * placa fina de ouro e o fio fica como borda luminosa. Mantém as linhas finas do logo original.
 */
function logo(): Peca {
  const altura = 2.2;
  const espessura = 0.07;
  const e = altura / LOGO.altura;
  const formas = formasDoPath(LOGO.d);

  // placa: o desenho do logo com pouca espessura, centrada e com a base em y = 0
  const gPlaca = new THREE.ExtrudeGeometry(formas, { depth: espessura / e, bevelEnabled: true, bevelThickness: 3, bevelSize: 2, bevelSegments: 2, curveSegments: 6 });
  gPlaca.scale(e, -e, -e);
  gPlaca.computeBoundingBox();
  const b = gPlaca.boundingBox!;
  const centro = new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2);
  gPlaca.translate(-centro.x, -centro.y, -centro.z);
  gPlaca.computeVertexNormals();
  const mPlaca = material(COR.ouro, 0.34, 1);
  mPlaca.transparent = true;
  mPlaca.opacity = 0;
  const placa = new THREE.Mesh(gPlaca, mPlaca);

  // contornos (paredes) de cada parte, na frente da placa, na ordem em que o bico passa
  const frente = espessura / 2 + 0.008;
  const paraCena = (p: THREE.Vector2) => new THREE.Vector3(p.x * e - centro.x, -p.y * e - centro.y, frente);
  const contornos = formas.flatMap((f) => [f.getPoints(8), ...f.holes.map((h) => h.getPoints(8))]).map((pts) => pts.map(paraCena));
  contornos.sort((p, q) => Math.min(...p.map((v) => v.x)) - Math.min(...q.map((v) => v.x)));

  const QUENTE = new THREE.Color("#FFE2A0"); // fio saindo do bico
  const FRIO = new THREE.Color("#E3BC5E"); // fio já assentado, depois do preenchimento
  const mFio = new THREE.MeshBasicMaterial({ color: QUENTE.clone(), toneMapped: false });
  const mHalo = new THREE.MeshBasicMaterial({ color: "#E8B84A", transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const grupo = new THREE.Group();
  grupo.add(placa);
  let total = 0;
  const fios = contornos.map((pts) => {
    const caminho = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < pts.length; i++) caminho.add(new THREE.LineCurve3(pts[i], pts[(i + 1) % pts.length]));
    const comprimento = caminho.getLength();
    const passos = Math.max(32, Math.round(comprimento * 120));
    const gFio = new THREE.TubeGeometry(caminho, passos, 0.0065, 6, false);
    const gHalo = new THREE.TubeGeometry(caminho, passos, 0.02, 6, false);
    const fio = new THREE.Mesh(gFio, mFio);
    const halo = new THREE.Mesh(gHalo, mHalo);
    grupo.add(fio, halo);
    const inicio = total;
    total += comprimento;
    return { caminho, gFio, gHalo, inicio, comprimento };
  });

  const bico = new THREE.Vector3();
  const CONTORNO = 0.72; // até aqui o bico desenha as paredes; depois preenche
  return {
    grupo,
    materiais: [mPlaca],
    giro: "balanco",
    desenho(progresso) {
      // 1) contornos, um depois do outro, na velocidade do comprimento de cada um
      const feito = Math.min(progresso / CONTORNO, 1) * total;
      let ponta: THREE.Vector3 | null = null;
      for (const f of fios) {
        const parte = THREE.MathUtils.clamp((feito - f.inicio) / f.comprimento, 0, 1);
        for (const g of [f.gFio, f.gHalo]) g.setDrawRange(0, Math.floor((g.index!.count / 3) * parte) * 3);
        if (parte > 0 && parte < 1) ponta = f.caminho.getPointAt(parte, bico);
      }
      // 2) preenchimento: a placa aparece e o bico varre o logo em zigue-zague
      const enchendo = THREE.MathUtils.clamp((progresso - CONTORNO) / (1 - CONTORNO), 0, 1);
      mPlaca.opacity = enchendo;
      mPlaca.transparent = enchendo < 1;
      // o fio esfria e o brilho baixa conforme a placa se preenche: fica só um filete dourado na borda
      mFio.color.copy(QUENTE).lerp(FRIO, enchendo);
      mHalo.opacity = 0.14 * (1 - enchendo) + 0.04;
      if (!ponta && enchendo > 0 && enchendo < 1) {
        const larg = b.max.x - b.min.x;
        ponta = bico.set(-larg / 2 + (0.5 + 0.5 * Math.sin(enchendo * 60)) * larg, enchendo * altura, frente);
      }
      return progresso >= 1 ? null : ponta;
    }
  };
}

/** Material de PLA com a cor exata (matcap, sem luz da cena): o mesmo das peças reais. */
function pla(cor: string, plano = false) {
  const m = new THREE.MeshMatcapMaterial({ color: cor, matcap: luzDeEstudio(), flatShading: plano });
  m.toneMapped = false;
  return m;
}

/** Lembrancinha de mesa: placa em arco com "B-day / Júnior e Thai" em relevo e um vira-lata caramelo sentado na frente. */
function lembranca(): Peca {
  const cores = { placa: "#F4F1EA", caramelo: "#C98642", orelha: "#9A5B25", creme: "#F4E3C3", marrom: "#4A2E1F", preto: "#1E1A18" };
  const m = Object.fromEntries(Object.entries(cores).map(([k, c]) => [k, pla(c, k === "placa")])) as Record<keyof typeof cores, THREE.MeshMatcapMaterial>;
  const grupo = new THREE.Group();
  const add = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, esc?: [number, number, number], rotZ = 0) => {
    const malha = new THREE.Mesh(g, mat);
    malha.position.set(x, y, z);
    if (esc) malha.scale.set(...esc);
    malha.rotation.z = rotZ;
    grupo.add(malha);
    return malha;
  };

  // base retangular de cantos arredondados (a placa encaixa nela)
  const retangulo = (l: number, a: number, r: number) => {
    const f = new THREE.Shape();
    f.moveTo(-l / 2 + r, -a / 2);
    f.lineTo(l / 2 - r, -a / 2); f.quadraticCurveTo(l / 2, -a / 2, l / 2, -a / 2 + r);
    f.lineTo(l / 2, a / 2 - r); f.quadraticCurveTo(l / 2, a / 2, l / 2 - r, a / 2);
    f.lineTo(-l / 2 + r, a / 2); f.quadraticCurveTo(-l / 2, a / 2, -l / 2, a / 2 - r);
    f.lineTo(-l / 2, -a / 2 + r); f.quadraticCurveTo(-l / 2, -a / 2, -l / 2 + r, -a / 2);
    return f;
  };
  const gBase = new THREE.ExtrudeGeometry(retangulo(2.3, 0.95, 0.18), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 12 });
  gBase.rotateX(-Math.PI / 2);
  gBase.translate(0, 0.02, 0);
  add(gBase, m.placa, 0, 0, 0);
  const topoBase = 0.14;

  // placa em arco, em pé no fundo da base
  const largura = 2.1, alturaPlaca = 1.95, raio = largura / 2;
  const arco = new THREE.Shape();
  arco.moveTo(-raio, 0);
  arco.lineTo(raio, 0);
  arco.lineTo(raio, alturaPlaca - raio);
  arco.absarc(0, alturaPlaca - raio, raio, 0, Math.PI, false);
  arco.lineTo(-raio, 0);
  const gPlaca = new THREE.ExtrudeGeometry(arco, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 48 });
  gPlaca.translate(0, 0, -0.05);
  const zPlaca = -0.22;
  add(gPlaca, m.placa, 0, topoBase, zPlaca);
  const frente = zPlaca + 0.065;

  // textos em relevo na frente da placa
  const [bday, nomes] = LEMBRANCA;
  const linha = (l: typeof bday, larguraAlvo: number, mat: THREE.Material, base: number) => {
    const w = l.caixa.x2 - l.caixa.x1, h = l.caixa.y2 - l.caixa.y1;
    const alt = larguraAlvo * (h / w);
    const g = extrudarSvg(l.d, alt, h, 0.06 * (h / alt), 3);
    add(g, mat, 0, base, frente + 0.03);
    return alt;
  };
  const altNomes = linha(nomes, 1.7, m.marrom, topoBase + 0.86);
  linha(bday, 0.95, m.caramelo, topoBase + 0.86 + altNomes + 0.03);

  // vira-lata caramelo sentado, na frente da placa
  const b = topoBase;
  const esfera = (r: number) => new THREE.SphereGeometry(r, 32, 24);
  add(esfera(0.25), m.caramelo, 0, b + 0.27, 0.12, [1, 1.1, 0.85]);                    // corpo
  for (const s of [-1, 1]) add(esfera(0.15), m.caramelo, s * 0.17, b + 0.13, 0.08, [1, 0.8, 1.1]); // coxas
  add(esfera(0.15), m.creme, 0, b + 0.33, 0.29, [1, 1.25, 0.6]);                       // peito
  for (const s of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.06, 0.18, 6, 16), m.caramelo, s * 0.09, b + 0.16, 0.3); // patas da frente
    add(esfera(0.075), m.creme, s * 0.09, b + 0.04, 0.34, [1, 0.6, 1.2]);               // patinhas
  }
  add(esfera(0.2), m.caramelo, 0, b + 0.62, 0.22);                                     // cabeça
  add(esfera(0.1), m.creme, 0, b + 0.57, 0.39, [1.15, 0.8, 1]);                        // focinho
  add(esfera(0.035), m.preto, 0, b + 0.61, 0.48);                                      // nariz
  for (const s of [-1, 1]) {
    add(esfera(0.028), m.preto, s * 0.08, b + 0.67, 0.38);                             // olhos
    add(esfera(0.1), m.orelha, s * 0.19, b + 0.62, 0.2, [0.55, 1.25, 0.35], s * 0.35); // orelhas caídas
  }
  const rabo = add(new THREE.TorusGeometry(0.12, 0.035, 10, 28, Math.PI * 1.2), m.caramelo, 0.26, b + 0.2, -0.02);
  rabo.rotation.set(0, Math.PI / 2, 0.6);                                              // rabinho enrolado

  return { grupo, materiais: Object.values(m), giro: "balanco" };
}

/** "Luz" pintada num círculo: branco puro no meio (cor exata) e cinza nas bordas (laterais e fundo da peça). */
let matcap: THREE.CanvasTexture | null = null;
function luzDeEstudio() {
  if (matcap) return matcap;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  // centro um pouco acima do meio: faces de frente e de cima ficam com a cor exata, as de baixo escurecem
  const g = x.createRadialGradient(128, 100, 0, 128, 100, 150);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.55, "#ffffff");
  g.addColorStop(0.85, "#c4c4c4");
  g.addColorStop(1, "#8a8a8a");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  matcap = new THREE.CanvasTexture(c);
  matcap.colorSpace = THREE.SRGBColorSpace;
  return matcap;
}

/** Peça real a partir de um .glb: cada cor vira um material de PLA com faces retas (peças de CAD não têm curvas suaves). */
export async function modelo(arquivo: string, altura: number, giro: Peca["giro"]): Promise<Peca> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js")
  ]);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url(`assets/3d/${arquivo}.glb`));
  const materiais: THREE.Material[] = [];
  const luz = luzDeEstudio();
  gltf.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    // matcap: não reage às luzes nem aos reflexos da cena. A face de frente mostra a cor oficial do filamento,
    // as laterais escurecem pra dar volume, e sem tone mapping a cor sai igual ao hex do Bambu Studio.
    const m = new THREE.MeshMatcapMaterial({ matcap: luz, flatShading: true });
    m.color.copy((o.material as THREE.MeshStandardMaterial).color);
    m.toneMapped = false;
    o.material = m;
    materiais.push(m);
  });
  // escala pra altura pedida, base em y = 0 e centro em x/z
  const modeloCena = gltf.scene;
  let caixa = new THREE.Box3().setFromObject(modeloCena);
  modeloCena.scale.multiplyScalar(altura / (caixa.max.y - caixa.min.y));
  caixa = new THREE.Box3().setFromObject(modeloCena);
  const centro = caixa.getCenter(new THREE.Vector3());
  modeloCena.position.sub(new THREE.Vector3(centro.x, caixa.min.y, centro.z));
  const grupo = new THREE.Group();
  grupo.add(modeloCena);
  return { grupo, materiais, giro };
}

/** Geometria com posições em float e já no lugar do nó (os .glb vêm quantizados, com escala no nó). */
function geometriaSolta(malha: THREE.Mesh) {
  malha.updateWorldMatrix(true, false);
  const p = malha.geometry.attributes.position;
  const pos = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) pos.set([p.getX(i), p.getY(i), p.getZ(i)], i * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  if (malha.geometry.index) g.setIndex(malha.geometry.index.clone());
  g.applyMatrix4(malha.matrixWorld);
  g.computeVertexNormals();
  return g;
}

/** Pomo de ouro: a bolinha e as duas asas vêm soltas da mesa de impressão (voce.glb) e são montadas aqui. */
async function pomo(): Promise<Peca> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js")
  ]);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url("assets/3d/voce.glb"));
  const partes: THREE.BufferGeometry[] = [];
  gltf.scene.traverse((o) => { if (o instanceof THREE.Mesh) partes.push(geometriaSolta(o)); });
  const caixas = partes.map((g) => { g.computeBoundingBox(); return g.boundingBox!; });
  // a bolinha é a peça mais alta saindo da mesa (z); as outras duas são as asas, deitadas
  const iBola = caixas.reduce((m, c, i) => (c.max.z - c.min.z > caixas[m].max.z - caixas[m].min.z ? i : m), 0);
  const gBola = partes[iBola];
  const centro = caixas[iBola].getCenter(new THREE.Vector3());
  const raio = (caixas[iBola].max.x - caixas[iBola].min.x) / 2;
  gBola.translate(-centro.x, -centro.y, -centro.z);

  const mOuro = material(COR.ouro, 0.27, 1);
  const mAsa = material("#EFE4BF", 0.32, 0.8);
  const montagem = new THREE.Group();
  montagem.add(new THREE.Mesh(gBola, mOuro));

  // cada asa: raiz (ponta de cima, mais estreita) presa na lateral da bolinha, aberta pra cima e de frente pra câmera
  const abertura = THREE.MathUtils.degToRad(32);
  const asas: { pivo: THREE.Group; lado: number }[] = [];
  partes.forEach((g, i) => {
    if (i === iBola) return;
    const p = g.attributes.position;
    let raiz = 0, ponta = 0;
    for (let k = 0; k < p.count; k++) {
      if (p.getY(k) > p.getY(raiz)) raiz = k;
      if (p.getY(k) < p.getY(ponta)) ponta = k;
    }
    const vRaiz = new THREE.Vector3().fromBufferAttribute(p, raiz);
    const vPonta = new THREE.Vector3().fromBufferAttribute(p, ponta);
    const lado = Math.sign(vPonta.x - vRaiz.x) || 1;
    const meioZ = (caixas[i].min.z + caixas[i].max.z) / 2;
    g.translate(-vRaiz.x, -vRaiz.y, -meioZ);
    const atual = Math.atan2(vPonta.y - vRaiz.y, vPonta.x - vRaiz.x);
    const alvo = lado > 0 ? abertura : Math.PI - abertura;
    g.rotateZ(alvo - atual);
    // as penas têm que ficar penduradas abaixo da nervura; se a maior parte da asa ficou acima da linha
    // raiz → ponta, espelha em torno dessa linha. O relevo das penas continua virado pra câmera;
    // a ordem dos vértices de cada triângulo é trocada pra as faces não ficarem do avesso.
    const cima = new THREE.Vector2(-Math.sin(alvo), Math.cos(alvo));
    if (cima.y < 0) cima.negate();
    let soma = 0;
    for (let k = 0; k < p.count; k++) soma += p.getX(k) * cima.x + p.getY(k) * cima.y;
    if (soma > 0) {
      g.rotateZ(-alvo);
      g.scale(1, -1, 1);
      g.rotateZ(alvo);
      const idx = g.index!;
      for (let k = 0; k < idx.count; k += 3) {
        const b = idx.getX(k + 1);
        idx.setX(k + 1, idx.getX(k + 2));
        idx.setX(k + 2, b);
      }
      g.computeVertexNormals();
    }
    const pivo = new THREE.Group();
    pivo.position.set(lado * raio * 0.9, raio * 0.2, 0);
    pivo.add(new THREE.Mesh(g, mAsa));
    montagem.add(pivo);
    asas.push({ pivo, lado });
  });

  // escala pra altura de ~1.9 e base em y = 0
  let caixa = new THREE.Box3().setFromObject(montagem);
  montagem.scale.setScalar(1.9 / (caixa.max.y - caixa.min.y));
  caixa = new THREE.Box3().setFromObject(montagem);
  const c = caixa.getCenter(new THREE.Vector3());
  montagem.position.sub(new THREE.Vector3(c.x, caixa.min.y, c.z));
  const grupo = new THREE.Group();
  grupo.add(montagem);

  // asas batendo: rápido enquanto imprime, depois só um bater leve
  let amplitude = 0.55;
  return {
    grupo,
    materiais: [mOuro, mAsa],
    giro: "balanco",
    animar(t, imprimindo) {
      const alvo = imprimindo ? 0.55 : 0.1;
      amplitude += (alvo - amplitude) * 0.04;
      const freq = imprimindo ? 15 : 5;
      for (const { pivo, lado } of asas) pivo.rotation.set(0, -lado * 0.35, lado * amplitude * Math.sin(t * freq));
    }
  };
}

export const PECAS: Record<NomePeca, () => Peca | Promise<Peca>> = {
  logo,
  starlink: () => modelo("empresas", 1.9, "balanco"),
  lembranca,
  pomo
};
