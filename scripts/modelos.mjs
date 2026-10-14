// Converte um projeto 3MF do Bambu Studio ou um STL em public/assets/3d/<nome>.glb para o palco 3D do site.
//   npm run modelo -- ~/Downloads/empresas.3mf empresas [frente|em-pe]
//   COR=#D4AF37 npm run modelo -- ~/Downloads/voce.stl voce
// - 3MF: junta as partes com a cor do filamento de cada uma (peças "negativas", como furos, ficam de fora)
//   e decodifica a pintura multicor (paint_color), no mesmo formato do PrusaSlicer/Bambu (TriangleSelector).
// - STL: não tem cor; cada peça solta da mesa vira um nó separado ("parte-0" é a maior), pra montar no site.
// - Simplifica e compacta (meshopt) pra carregar rápido no celular.
// "frente": peça deitada na mesa (chaveiro, placa) fica de pé olhando pra câmera. "em-pe": peça impressa em pé (vaso).
import { readFile, mkdir } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { weld, simplify, quantize, meshopt } from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";

const [, , origem, nome, orientacao = "frente"] = process.argv;
if (!origem || !nome) {
  console.error("uso: npm run modelo -- <arquivo.3mf|arquivo.stl> <nome> [frente|em-pe]");
  process.exit(1);
}
const ehStl = origem.toLowerCase().endsWith(".stl");

// grupos de saída: nome do nó -> { cor, posicoes (soltas, 9 números por triângulo) }
const grupos = new Map();
const girar = orientacao === "em-pe" ? ([x, y, z]) => [x, z, -y] : ([x, y, z]) => [x, y, z];
function adicionar(grupo, cor, a, b, c) {
  if (!grupos.has(grupo)) grupos.set(grupo, { cor, posicoes: [] });
  grupos.get(grupo).posicoes.push(...girar(a), ...girar(b), ...girar(c));
}
let total = 0;

if (ehStl) await lerStl(); else await lerProjeto3mf();

// ---------- STL binário: separa as peças soltas (componentes conectados) ----------
async function lerStl() {
  const b = await readFile(origem);
  const n = b.readUInt32LE(80);
  if (84 + n * 50 !== b.length) throw new Error("só STL binário é aceito");
  const cor = process.env.COR ?? "#D4AF37";
  // vértices iguais (arredondados a 1 µm) viram o mesmo índice, pra achar o que está conectado
  const indice = new Map();
  const tri = new Uint32Array(n * 3);
  const pos = [];
  for (let i = 0; i < n; i++) {
    for (let v = 0; v < 3; v++) {
      const o = 84 + i * 50 + 12 + v * 12;
      const p = [b.readFloatLE(o), b.readFloatLE(o + 4), b.readFloatLE(o + 8)];
      const chave = p.map((x) => Math.round(x * 1000)).join(",");
      let k = indice.get(chave);
      if (k === undefined) { k = pos.length; indice.set(chave, k); pos.push(p); }
      tri[i * 3 + v] = k;
    }
  }
  const pai = new Int32Array(pos.length).map((_, i) => i);
  const raiz = (x) => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  for (let i = 0; i < n; i++) {
    const a = raiz(tri[i * 3]);
    for (const v of [tri[i * 3 + 1], tri[i * 3 + 2]]) { const r = raiz(v); if (r !== a) pai[r] = a; }
  }
  const porPeca = new Map();
  for (let i = 0; i < n; i++) {
    const r = raiz(tri[i * 3]);
    if (!porPeca.has(r)) porPeca.set(r, []);
    porPeca.get(r).push(i);
  }
  // peças minúsculas (sujeira do arquivo) ficam de fora; a maior vira "parte-0"
  const pecas = [...porPeca.values()].filter((t) => t.length > 50).sort((x, y) => y.length - x.length);
  pecas.forEach((lista, j) => {
    for (const i of lista) adicionar(`parte-${j}`, cor, pos[tri[i * 3]], pos[tri[i * 3 + 1]], pos[tri[i * 3 + 2]]);
    total += lista.length;
  });
}

async function lerProjeto3mf() {
const zip = unzipSync(new Uint8Array(await readFile(origem)));
const ler = (caminho) => {
  const dados = zip[caminho.replace(/^\//, "")];
  if (!dados) throw new Error(`não achei ${caminho} dentro do 3MF`);
  return strFromU8(dados);
};
const atributo = (tag, nomeAttr) => new RegExp(`\\b${nomeAttr}="([^"]*)"`).exec(tag)?.[1];

// ---------- matrizes 3MF: "m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32", ponto' = ponto · M ----------
const IDENTIDADE = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const matriz = (t) => (t ? t.trim().split(/\s+/).map(Number) : IDENTIDADE);
const aplicar = (m, [x, y, z]) => [
  x * m[0] + y * m[3] + z * m[6] + m[9],
  x * m[1] + y * m[4] + z * m[7] + m[10],
  x * m[2] + y * m[5] + z * m[8] + m[11]
];
/** primeiro a, depois b */
const compor = (a, b) => {
  const r = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  const t = aplicar(b, [a[9], a[10], a[11]]);
  return [...r, ...t];
};

// ---------- configurações: cor de cada filamento e filamento/tipo de cada parte ----------
const projeto = JSON.parse(ler("Metadata/project_settings.config"));
const cores = projeto.filament_colour; // "#RRGGBB" por filamento (extrusora 1, 2, ...)
const partes = new Map(); // id da parte -> { extrusora, negativa }
const extrusoraObjeto = new Map();
{
  const cfg = ler("Metadata/model_settings.config");
  for (const obj of cfg.split("<object ").slice(1)) {
    const idObj = atributo(obj, "id");
    const ext = /<metadata key="extruder" value="(\d+)"/.exec(obj.split("<part ")[0])?.[1];
    extrusoraObjeto.set(idObj, Number(ext ?? 1));
    for (const parte of obj.split("<part ").slice(1)) {
      partes.set(`${idObj}/${atributo(parte, "id")}`, {
        extrusora: Number(/<metadata key="extruder" value="(\d+)"/.exec(parte)?.[1] ?? ext ?? 1),
        negativa: atributo(parte, "subtype") !== "normal_part"
      });
    }
  }
}

// ---------- pintura: árvore de subdivisão por triângulo (TriangleSelector::deserialize) ----------
const meio = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
function dividir(t, lados, especial) {
  const v = [0, 1, 2].map((j) => t[(especial + j) % 3]);
  if (lados === 1) {
    const L = [v[0], v[1], meio(v[2], v[1]), v[2]];
    return [[L[0], L[1], L[2]], [L[2], L[3], L[0]]];
  }
  if (lados === 2) {
    const L = [v[0], meio(v[1], v[0]), v[1], v[2]];
    L.splice(4, 0, meio(L[0], L[3]));
    return [[L[0], L[1], L[4]], [L[1], L[2], L[4]], [L[2], L[3], L[4]]];
  }
  const L = [v[0], meio(v[1], v[0]), v[1], meio(v[2], v[1]), v[2], meio(v[0], v[2])];
  return [[L[0], L[1], L[5]], [L[1], L[2], L[3]], [L[3], L[4], L[5]], [L[1], L[3], L[5]]];
}
/** devolve [[a, b, c, estado], ...]; estado 0 = cor padrão da parte, N = extrusora N */
function pintura(codigo, a, b, c) {
  const nibbles = [...codigo].reverse().map((h) => parseInt(h, 16));
  let k = 0;
  const folhas = [];
  const no = (t) => {
    const cod = nibbles[k++];
    const lados = cod & 3;
    if (lados === 0) {
      let estado = cod >> 2;
      if (estado === 3) estado = nibbles[k++] + 3;
      folhas.push([...t, estado]);
      return;
    }
    const filhos = dividir(t, lados, cod >> 2);
    for (let i = filhos.length - 1; i >= 0; i--) no(filhos[i]); // o formato guarda os filhos do último pro primeiro
  };
  no([a, b, c]);
  return folhas;
}

// ---------- leitura das malhas ----------

const cacheArquivos = new Map();
function objetosDoArquivo(caminho) {
  if (cacheArquivos.has(caminho)) return cacheArquivos.get(caminho);
  const mapa = new Map();
  for (const bloco of ler(caminho).split("<object ").slice(1)) mapa.set(atributo(bloco, "id"), bloco);
  cacheArquivos.set(caminho, mapa);
  return mapa;
}

function malha(bloco, m, extrusora) {
  const vertices = [];
  for (const v of bloco.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)) vertices.push(aplicar(m, [+v[1], +v[2], +v[3]]));
  let triangulos = 0;
  for (const t of bloco.matchAll(/<triangle ([^>]*)\/>/g)) {
    const a = vertices[+atributo(t[1], "v1")], b = vertices[+atributo(t[1], "v2")], c = vertices[+atributo(t[1], "v3")];
    const codigo = atributo(t[1], "paint_color");
    if (!codigo) { adicionar(cores[extrusora - 1], cores[extrusora - 1], a, b, c); triangulos++; continue; }
    for (const [p, q, r, estado] of pintura(codigo, a, b, c)) {
      adicionar(cores[(estado || extrusora) - 1], cores[(estado || extrusora) - 1], p, q, r);
      triangulos++;
    }
  }
  return triangulos;
}

const principal = "3D/3dmodel.model";
const objetos = objetosDoArquivo(principal);
for (const item of ler(principal).matchAll(/<item ([^>]*)\/>/g)) {
  if (atributo(item[1], "printable") === "0") continue;
  const idObj = atributo(item[1], "objectid");
  const mItem = matriz(atributo(item[1], "transform"));
  const bloco = objetos.get(idObj);
  const componentes = [...bloco.matchAll(/<component ([^>]*)\/>/g)];
  if (componentes.length === 0) { total += malha(bloco, mItem, extrusoraObjeto.get(idObj) ?? 1); continue; }
  for (const comp of componentes) {
    const idParte = atributo(comp[1], "objectid");
    const parte = partes.get(`${idObj}/${idParte}`) ?? { extrusora: extrusoraObjeto.get(idObj) ?? 1, negativa: false };
    if (parte.negativa) continue;
    const arquivo = atributo(comp[1], "p:path") ?? principal;
    const sub = objetosDoArquivo(arquivo).get(idParte);
    total += malha(sub, compor(matriz(atributo(comp[1], "transform")), mItem), parte.extrusora);
  }
}
}

// ---------- glTF: uma malha por cor, simplificada e compactada ----------
const linear = (h) => {
  const c = parseInt(h, 16) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const doc = new Document();
const buffer = doc.createBuffer();
const cena = doc.createScene(nome);
for (const [nomeGrupo, { cor, posicoes }] of grupos) {
  const material = doc.createMaterial(cor)
    .setBaseColorFactor([linear(cor.slice(1, 3)), linear(cor.slice(3, 5)), linear(cor.slice(5, 7)), 1])
    .setRoughnessFactor(0.55).setMetallicFactor(0);
  const acessor = doc.createAccessor().setType("VEC3").setArray(new Float32Array(posicoes)).setBuffer(buffer);
  const primitiva = doc.createPrimitive().setAttribute("POSITION", acessor).setMaterial(material);
  cena.addChild(doc.createNode(nomeGrupo).setMesh(doc.createMesh(nomeGrupo).addPrimitive(primitiva)));
}
await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
const erro = Number(process.env.ERRO ?? 0.0006);
await doc.transform(
  weld(),
  // bordas travadas: as áreas de cada cor continuam encostando umas nas outras, sem frestas
  simplify({ simplifier: MeshoptSimplifier, ratio: 0, error: erro, lockBorder: true }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" })
);
const triangulosFinais = doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);

const destino = new URL(`../public/assets/3d/${nome}.glb`, import.meta.url);
await mkdir(new URL(".", destino), { recursive: true });
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
await io.write(destino.pathname, doc);
const { size } = await import("node:fs").then((fs) => fs.statSync(destino));
console.log(`${nome}.glb: ${total} → ${triangulosFinais} triângulos, ${grupos.size} grupos (${[...grupos.keys()].join(" ")}), ${(size / 1024).toFixed(0)} KB`);
