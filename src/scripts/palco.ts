// Palco 3D: mostra uma peça "sendo impressa" camada por camada e depois deixa girar com o dedo.
// Só desenha enquanto está na tela; com "reduzir movimento", a peça aparece pronta e parada.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PECAS, type NomePeca, type Peca } from "./pecas";

export interface Palco {
  mostrar(nome: NomePeca): Promise<void>;
  /** para de desenhar enquanto outra coisa ocupa o lugar do palco (ex.: imagem da peça) */
  pausar(pausado: boolean): void;
}

interface Opcoes {
  /** duração da impressão, em segundos */
  duracao?: number;
  /** avisa o andamento da impressão (0 a 1), para a legenda "Camada x de y" */
  aoImprimir?: (progresso: number) => void;
}

const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ALTURA_CAMADA = 0.022;
const agora = () => performance.now() / 1000;

export function criarPalco(canvas: HTMLCanvasElement, opcoes: Opcoes = {}): Palco | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null; // sem WebGL: fica a imagem parada que está atrás do canvas
  }
  const duracao = opcoes.duracao ?? 3;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // mantém a saturação das cores de PLA (o ACES deixava tudo pastel)
  renderer.toneMappingExposure = 1.1;
  renderer.localClippingEnabled = true;

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 1.35;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const luz = new THREE.DirectionalLight("#fff4e0", 1.9);
  luz.position.set(2.5, 4, 6);
  // contraluz fria por trás, para destacar o contorno da peça do fundo escuro
  const contraluz = new THREE.DirectionalLight("#cfd8ff", 1.4);
  contraluz.position.set(-4, 3, -5);
  cena.add(luz, contraluz, new THREE.AmbientLight("#ffffff", 0.3));

  // sombra de contato: um degradê no chão, barato e suave
  const sombra = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,.55)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  })();
  cena.add(sombra);

  // bico da impressora: corre sobre a camada atual e sobe quando termina
  const bico = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), new THREE.MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.4, metalness: 0.8 }));
  corpo.position.y = 0.16;
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 16), new THREE.MeshStandardMaterial({ color: "#E8C873", roughness: 0.25, metalness: 1, emissive: "#C9A227", emissiveIntensity: 0.35 }));
  ponta.rotation.x = Math.PI;
  ponta.position.y = 0.05;
  const brilho = new THREE.PointLight("#ffb347", 0.9, 1.2, 2);
  bico.add(corpo, ponta, brilho);
  cena.add(bico);

  // corte: tudo acima de y = corte some; o brilho dourado marca a camada sendo impressa
  const plano = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const uCorte = { value: 0 };
  const uBrilho = { value: 0 };

  function prepararMaterial(m: THREE.Material, fechada: boolean) {
    m.side = THREE.DoubleSide;
    m.clippingPlanes = [plano];
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uCorte = uCorte;
      sh.uniforms.uBrilho = uBrilho;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vY;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvY = (modelMatrix * vec4(transformed, 1.0)).y;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying float vY;\nuniform float uCorte;\nuniform float uBrilho;`)
        // linhas de camada, de leve, como numa peça impressa de verdade
        .replace("#include <color_fragment>", `#include <color_fragment>
          float faixa = 0.5 + 0.5 * sin(vY * 6.2831853 / ${ALTURA_CAMADA.toFixed(4)});
          diffuseColor.rgb *= 1.0 - 0.05 * faixa;`)
        .replace("#include <dithering_fragment>", `#include <dithering_fragment>
          // por dentro: em peça fechada vira a "tampa" do corte; em peça aberta (vaso) só escurece
          if (!gl_FrontFacing) gl_FragColor.rgb = ${fechada ? "diffuseColor.rgb * 0.75 + 0.06" : "gl_FragColor.rgb * 0.55"};
          float perto = 1.0 - smoothstep(0.0, 0.045, abs(vY - uCorte));
          gl_FragColor.rgb += uBrilho * perto * vec3(1.0, 0.7, 0.25) * 1.4;`);
    };
    m.customProgramCacheKey = () => `np3d-${fechada}`;
  }

  const cache = new Map<NomePeca, Peca>();
  let atual: Peca | null = null;
  let altura = 1;
  let caixa = new THREE.Box3();
  let inicio = 0;
  let imprimindo = false;

  // giro: arrastar na horizontal gira a peça; na vertical a página continua rolando (touch-action: pan-y)
  let giro = 0, velocidade = 0, arrastando = false, ultimoX = 0, ultimoToque = -10;
  canvas.addEventListener("pointerdown", (e) => {
    arrastando = true;
    ultimoX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!arrastando) return;
    const dx = e.clientX - ultimoX;
    ultimoX = e.clientX;
    velocidade = dx * 0.012;
    giro += velocidade;
    ultimoToque = agora();
  });
  const soltar = () => (arrastando = false);
  canvas.addEventListener("pointerup", soltar);
  canvas.addEventListener("pointercancel", soltar);

  function enquadrar() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tamanho = caixa.getSize(new THREE.Vector3());
    const centro = caixa.getCenter(new THREE.Vector3());
    // distância para caber a altura e a largura, com folga
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const dAltura = (tamanho.y * 0.62) / Math.tan(vfov / 2);
    const dLargura = (Math.max(tamanho.x, tamanho.z) * 0.62) / Math.tan(vfov / 2) / camera.aspect;
    const d = Math.max(dAltura, dLargura) + tamanho.z;
    camera.position.set(0, centro.y + d * 0.2, d);
    camera.lookAt(0, centro.y * 0.92, 0);
    camera.updateProjectionMatrix();
  }

  // peças reais carregam um arquivo; se a pessoa trocar de aba no meio, vale só a última escolha
  let pedido = 0;
  async function mostrar(nome: NomePeca) {
    const meu = ++pedido;
    let p = cache.get(nome);
    if (!p) {
      try {
        p = await PECAS[nome]();
      } catch {
        return; // sem o arquivo, fica o que já estava na tela
      }
      p.materiais.forEach((m) => prepararMaterial(m, true));
      cache.set(nome, p);
    }
    if (meu !== pedido) return;
    if (atual) cena.remove(atual.grupo);
    atual = p;
    cena.add(p.grupo);
    p.grupo.rotation.y = 0;
    caixa = new THREE.Box3().setFromObject(p.grupo);
    altura = caixa.max.y;
    const largura = Math.max(caixa.max.x - caixa.min.x, caixa.max.z - caixa.min.z);
    sombra.scale.setScalar(largura * 1.5);
    giro = 0;
    velocidade = 0;
    enquadrar();
    inicio = agora();
    imprimindo = !quieto;
    uCorte.value = quieto ? altura + 1 : 0;
    acordar();
  }

  let naTela = false;
  let pausado = false;
  let visivel = false;
  let rodando = false;
  let anterior = agora();

  function quadro() {
    if (!visivel || !atual) {
      rodando = false;
      return;
    }
    const t = agora();
    const dt = Math.min(t - anterior, 0.05);
    anterior = t;

    // impressão: o corte sobe com um leve "ease-out"; o bico vai e volta sobre a camada
    if (imprimindo) {
      const p = Math.min((t - inicio) / duracao, 1);
      const suave = 1 - Math.pow(1 - p, 1.6);
      uCorte.value = suave * (altura + 0.02);
      uBrilho.value = p < 1 ? 1 : 0;
      const larg = (caixa.max.x - caixa.min.x) * 0.4;
      const prof = (caixa.max.z - caixa.min.z) * 0.4;
      bico.position.set(Math.sin(t * 9) * larg, uCorte.value, Math.cos(t * 6.3) * prof);
      bico.visible = true;
      opcoes.aoImprimir?.(p);
      if (p >= 1) {
        imprimindo = false;
        uCorte.value = altura + 1;
      }
    } else if (bico.visible) {
      // termina: o bico sobe e some
      bico.position.y += dt * 2.5;
      if (bico.position.y > altura + 1.2) bico.visible = false;
    }
    brilho.intensity = imprimindo ? 0.9 : 0;
    if (!quieto) atual.animar?.(t, imprimindo);

    // giro automático para depois de alguns segundos sem toque; com inércia ao soltar
    if (!arrastando) {
      velocidade *= 0.94;
      giro += velocidade;
    }
    const parado = t - ultimoToque < 2.5 || quieto;
    if (atual.giro === "volta") {
      if (!parado) giro += dt * 0.35;
      atual.grupo.rotation.y = giro;
    } else {
      const balanco = parado ? 0 : Math.sin((t - inicio) * 0.6) * 0.5;
      atual.grupo.rotation.y = giro + balanco;
    }

    plano.constant = uCorte.value;
    renderer.render(cena, camera);
    if (!canvas.dataset.pronto) canvas.dataset.pronto = "1";
    requestAnimationFrame(quadro);
  }

  function acordar() {
    if (rodando || !visivel) return;
    rodando = true;
    anterior = agora();
    requestAnimationFrame(quadro);
  }

  new IntersectionObserver(([e]) => {
    naTela = e.isIntersecting;
    visivel = naTela && !document.hidden && !pausado;
    acordar();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    visivel = naTela && !document.hidden && !pausado;
    acordar();
  });
  new ResizeObserver(enquadrar).observe(canvas);

  function pausar(p: boolean) {
    pausado = p;
    visivel = naTela && !document.hidden && !pausado;
    acordar();
  }

  return { mostrar, pausar };
}
