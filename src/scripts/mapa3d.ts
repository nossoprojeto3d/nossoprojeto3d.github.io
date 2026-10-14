// Mapa 3D "Onde atendemos": o Brasil como uma maquete em relevo, com arcos de envio saindo de Goiânia.
// Os pontos vêm prontos do build (src/data/mapa.ts, em pixels de um SVG 600×600); aqui viram cena.
// Só desenha enquanto está na tela; com "reduzir movimento" fica tudo pronto e parado.
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export interface DadosMapa {
  largura: number;
  contorno: string;
  goiania: [number, number];
  raioRegiao: number;
  rotas: { nome: string; x: number; y: number }[];
}

const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const OURO = new THREE.Color("#E8C873");
const ESCALA = 1 / 100; // 600 px do SVG viram 6 unidades

/** textura de brilho redondo, pra pacotes, cidades e o feixe de Goiânia */
function texturaBrilho() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,240,200,1)");
  g.addColorStop(0.25, "rgba(232,200,115,.7)");
  g.addColorStop(1, "rgba(201,162,39,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** pontinhos do relevo, iguais aos do mapa antigo (um a cada 9 px do SVG) */
function texturaPontos() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d")!;
  x.fillStyle = "#121215";
  x.fillRect(0, 0, 32, 32);
  x.fillStyle = "#5c5139";
  x.beginPath();
  x.arc(16, 16, 4.6, 0, Math.PI * 2);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 9, 1 / 9);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function rotulo(texto: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const x = c.getContext("2d")!;
  x.font = "500 64px 'Geist Mono', ui-monospace, monospace";
  x.textBaseline = "middle";
  x.lineWidth = 14;
  x.strokeStyle = "rgba(10,10,11,.9)";
  x.strokeText(texto, 8, 64);
  x.fillStyle = "#E8C873";
  x.fillText(texto, 8, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.2, 0.3, 1);
  s.center.set(0, 0.5);
  return s;
}

export function criarMapa(canvas: HTMLCanvasElement, dados: DadosMapa) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return; // sem WebGL: fica o mapa plano que está atrás do canvas
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const maquete = new THREE.Group();
  cena.add(maquete);

  // pixel do SVG -> ponto na mesa (x pro leste, z pro sul)
  const meio = dados.largura / 2;
  const naMesa = (px: number, py: number, y = 0) => new THREE.Vector3((px - meio) * ESCALA, y, (py - meio) * ESCALA);

  // ---------- o Brasil em relevo ----------
  const espessura = 0.09;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${dados.contorno}"/></svg>`;
  const formas = new SVGLoader().parse(svg).paths.flatMap((p) => p.toShapes());
  const gPais = new THREE.ExtrudeGeometry(formas, { depth: espessura, bevelEnabled: false, curveSegments: 2 });
  // rotação de +90° em x: o plano do desenho deita na mesa sem espelhar; a face de trás (z = 0) vira o topo
  gPais.rotateX(Math.PI / 2);
  gPais.scale(ESCALA, 1, ESCALA);
  gPais.translate(-meio * ESCALA, 0, -meio * ESCALA);
  const topo = new THREE.MeshBasicMaterial({ map: texturaPontos(), side: THREE.DoubleSide });
  const lado = new THREE.MeshBasicMaterial({ color: "#0d0d10", side: THREE.DoubleSide });
  maquete.add(new THREE.Mesh(gPais, [topo, lado]));

  // borda dourada fininha no topo do relevo
  for (const forma of formas) {
    const pts = forma.getPoints(2).map((p) => naMesa(p.x, p.y, 0.002));
    const linha = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: "#6b5a2c", transparent: true, opacity: 0.9 }));
    maquete.add(linha);
  }

  // sombra suave embaixo da maquete
  const brilho = texturaBrilho();
  // alphaMap lê o tom de cinza: branco no meio (sombra cheia) e preto nas bordas (some)
  const cSombra = document.createElement("canvas");
  cSombra.width = cSombra.height = 128;
  const xs = cSombra.getContext("2d")!;
  const gs = xs.createRadialGradient(64, 64, 0, 64, 64, 64);
  gs.addColorStop(0, "#fff");
  gs.addColorStop(1, "#000");
  xs.fillStyle = gs;
  xs.fillRect(0, 0, 128, 128);
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.6, alphaMap: new THREE.CanvasTexture(cSombra), depthWrite: false })
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = -espessura - 0.01;
  maquete.add(sombra);

  // ---------- Goiânia: região, feixe de luz e ondas ----------
  const g = naMesa(dados.goiania[0], dados.goiania[1], 0.004);
  const raio = dados.raioRegiao * ESCALA;
  const regiao = new THREE.Mesh(new THREE.CircleGeometry(raio, 48), new THREE.MeshBasicMaterial({ color: OURO, transparent: true, opacity: 0.12, depthWrite: false }));
  regiao.rotation.x = -Math.PI / 2;
  regiao.position.copy(g);
  maquete.add(regiao);
  const borda = new THREE.Mesh(new THREE.RingGeometry(raio * 0.97, raio, 64), new THREE.MeshBasicMaterial({ color: OURO, transparent: true, opacity: 0.7, depthWrite: false }));
  borda.rotation.x = -Math.PI / 2;
  borda.position.copy(g);
  maquete.add(borda);
  const ondas = [0, 1].map(() => {
    const o = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: OURO, transparent: true, opacity: 0, depthWrite: false }));
    o.rotation.x = -Math.PI / 2;
    o.position.copy(g);
    maquete.add(o);
    return o;
  });
  // feixe: um tubo de luz que some pra cima
  const gFeixe = new THREE.CylinderGeometry(0.018, 0.05, 1.1, 24, 1, true);
  gFeixe.translate(0, 0.55, 0);
  const cores = new Float32Array(gFeixe.attributes.position.count * 3);
  for (let i = 0; i < gFeixe.attributes.position.count; i++) {
    const a = 1 - gFeixe.attributes.position.getY(i) / 1.1;
    cores.set([0.91 * a, 0.78 * a, 0.45 * a], i * 3);
  }
  gFeixe.setAttribute("color", new THREE.BufferAttribute(cores, 3));
  const feixe = new THREE.Mesh(gFeixe, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  feixe.position.copy(g);
  maquete.add(feixe);
  const nucleo = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: OURO, blending: THREE.AdditiveBlending, depthWrite: false }));
  nucleo.scale.setScalar(0.5);
  nucleo.position.copy(g).add(new THREE.Vector3(0, 0.03, 0));
  maquete.add(nucleo);
  const nome = rotulo("Goiânia");
  nome.position.copy(g).add(new THREE.Vector3(raio + 0.08, 0.12, 0));
  maquete.add(nome);

  // ---------- rotas: arcos que sobem de Goiânia e descem em cada capital ----------
  const matRota = new THREE.MeshBasicMaterial({ color: OURO, transparent: true, opacity: 0.85, depthWrite: false });
  const rotas = dados.rotas.map((r, i) => {
    const fim = naMesa(r.x, r.y, 0.004);
    const distancia = g.distanceTo(fim);
    const meioArco = g.clone().lerp(fim, 0.5).add(new THREE.Vector3(0, 0.25 + distancia * 0.32, 0));
    const curva = new THREE.QuadraticBezierCurve3(g.clone(), meioArco, fim);
    const tubo = new THREE.TubeGeometry(curva, 64, 0.007, 6, false);
    const malha = new THREE.Mesh(tubo, matRota);
    tubo.setDrawRange(0, quieto ? Infinity : 0);
    maquete.add(malha);

    const cidade = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.055, 32), new THREE.MeshBasicMaterial({ color: OURO, transparent: true, opacity: 0.9, depthWrite: false }));
    cidade.rotation.x = -Math.PI / 2;
    cidade.position.copy(fim);
    maquete.add(cidade);
    const clarao = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: OURO, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    clarao.scale.setScalar(0.35);
    clarao.position.copy(fim).add(new THREE.Vector3(0, 0.02, 0));
    maquete.add(clarao);

    const pacote = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: "#fff3cf", blending: THREE.AdditiveBlending, depthWrite: false }));
    pacote.scale.setScalar(0.16);
    pacote.visible = false;
    maquete.add(pacote);

    return { curva, tubo, total: tubo.index!.count, clarao, pacote, atraso: i * 0.09, velocidade: 0.28 + (i % 4) * 0.05, fase: (i * 0.37) % 1 };
  });

  // ---------- câmera, tamanho e movimento ----------
  let alvoX = 0, alvoY = 0, inclX = 0, inclY = 0;
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !quieto) {
    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      alvoX = ((e.clientX - r.left) / r.width - 0.5) * 0.35;
      alvoY = ((e.clientY - r.top) / r.height - 0.5) * 0.12;
    });
    canvas.addEventListener("pointerleave", () => (alvoX = alvoY = 0));
  }

  function enquadrar() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // mais longe em telas estreitas, pra o país inteiro caber
    const d = 8.6 / Math.min(1, camera.aspect);
    camera.position.set(0, d * 0.8, d * 0.6);
    camera.lookAt(0, 0, 0.12);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(enquadrar).observe(canvas);
  enquadrar();

  let inicio = -1;
  let visivel = false;
  let rodando = false;
  const agora = () => performance.now() / 1000;

  function quadro() {
    if (!visivel) { rodando = false; return; }
    const t = agora();
    if (inicio < 0) inicio = t;
    const vida = t - inicio;

    // a maquete acompanha o mouse devagar e balança de leve
    inclX += (alvoX - inclX) * 0.05;
    inclY += (alvoY - inclY) * 0.05;
    maquete.rotation.y = inclX + (quieto ? 0 : Math.sin(t * 0.18) * 0.06);
    maquete.rotation.x = inclY;

    // ondas de Goiânia
    ondas.forEach((o, i) => {
      const f = ((t * 0.45 + i * 0.5) % 1);
      o.scale.setScalar(raio * (0.3 + f * 2.2));
      (o.material as THREE.MeshBasicMaterial).opacity = quieto ? 0 : 0.8 * (1 - f);
    });
    (feixe.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(t * 2.2) * 0.15;

    for (const r of rotas) {
      // arco se desenha; depois o pacote viaja e a cidade acende quando ele chega
      const desenho = quieto ? 1 : Math.min(Math.max((vida - r.atraso) / 1.4, 0), 1);
      r.tubo.setDrawRange(0, Math.floor(r.total * (1 - Math.pow(1 - desenho, 3)) / 3) * 3);
      if (quieto || desenho < 1) continue;
      const p = (t * r.velocidade + r.fase) % 1;
      r.pacote.visible = true;
      r.pacote.position.copy(r.curva.getPoint(p));
      // a cidade acende quando o pacote está chegando (fim da volta) e apaga logo depois que ele "entrega"
      const clarao = p > 0.88 ? (p - 0.88) / 0.12 : Math.max(0, 1 - p / 0.12);
      (r.clarao.material as THREE.SpriteMaterial).opacity = clarao * 0.9;
    }

    renderer.render(cena, camera);
    canvas.dataset.pronto = "1";
    if (quieto) { rodando = false; return; } // parado: um quadro basta
    requestAnimationFrame(quadro);
  }

  const acordar = () => {
    if (rodando || !visivel) return;
    rodando = true;
    requestAnimationFrame(quadro);
  };
  let naTela = false;
  new IntersectionObserver(([e]) => {
    naTela = e.isIntersecting;
    visivel = naTela && !document.hidden;
    acordar();
  }, { threshold: 0.15 }).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    visivel = naTela && !document.hidden;
    acordar();
  });
  // o nome usa a fonte do site; redesenha quando ela terminar de carregar
  document.fonts?.ready.then(() => {
    const novo = rotulo("Goiânia");
    novo.position.copy(nome.position);
    maquete.remove(nome);
    maquete.add(novo);
  });
}
