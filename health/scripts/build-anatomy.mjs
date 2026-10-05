#!/usr/bin/env node
// Builds public/anatomy/body.glb from the open BodyParts3D dataset.
//
//   node scripts/build-anatomy.mjs
//
// Source: "BodyParts3D, (c) The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan"
// (STL mirror: github.com/Kevin-Mattheus-Moerman/BodyParts3D). The generated model is therefore CC BY-SA 2.1 JP too.
//
// Pipeline per group: resolve composite FMA ids → download primitive STLs (cached) → merge → weld →
// simplify (meshoptimizer) → smooth normals → quantise (KHR_mesh_quantization) → one named node per group.
import fs from "node:fs/promises";
import path from "node:path";
import { MeshoptSimplifier } from "meshoptimizer";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const CACHE = process.env.ANATOMY_CACHE || path.join(ROOT, ".anatomy-cache");
const OUT = path.join(ROOT, "public", "anatomy", "body.glb");
const BASE = "https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data";

// kind: skin | bone | organ | muscle | vessel. `tris` = triangle budget after simplification.
const GROUPS = [
  { id: "skin", kind: "skin", parts: ["FMA7163"], tris: 30000 },
  {
    id: "skeleton", kind: "bone", tris: 30000,
    parts: ["FMA46565", "FMA13478", "FMA7480", "FMA7485", "FMA9578", "FMA24139", "FMA24140"],
  },
  { id: "brain", kind: "organ", parts: ["FMA50801"], tris: 9000 },
  { id: "pituitary", kind: "organ", parts: ["FMA13889"], tris: 400 },
  { id: "heart", kind: "organ", parts: ["FMA7088"], tris: 7000 },
  { id: "aorta", kind: "vessel", parts: ["FMA3734"], tris: 2500 },
  { id: "vena_cava", kind: "vessel", parts: ["FMA10951"], tris: 1200 },
  { id: "lungs", kind: "organ", parts: ["FMA7309", "FMA7310"], tris: 7000 },
  { id: "trachea", kind: "organ", parts: ["FMA7394"], tris: 1200 },
  { id: "esophagus", kind: "organ", parts: ["FMA7131"], tris: 1000 },
  { id: "diaphragm", kind: "muscle", parts: ["FMA13295"], tris: 2000 },
  { id: "stomach", kind: "organ", parts: ["FMA7148"], tris: 2500 },
  { id: "liver", kind: "organ", parts: ["FMA7197"], tris: 4000 },
  { id: "gallbladder", kind: "organ", parts: ["FMA7202"], tris: 800 },
  { id: "pancreas", kind: "organ", parts: ["FMA7198"], tris: 1500 },
  { id: "spleen", kind: "organ", parts: ["FMA7196"], tris: 1500 },
  { id: "small_intestine", kind: "organ", parts: ["FMA7200"], tris: 7000 },
  { id: "large_intestine", kind: "organ", parts: ["FMA7201"], tris: 5000 },
  { id: "kidneys", kind: "organ", parts: ["FMA7204", "FMA7205"], tris: 3000 },
  { id: "adrenals", kind: "organ", parts: ["FMA15629", "FMA15630"], tris: 800 },
  { id: "bladder", kind: "organ", parts: ["FMA15900"], tris: 1000 },
  // Muscles used by the workout map (both sides merged)
  { id: "m_deltoid", kind: "muscle", parts: ["FMA32521"], tris: 1800 },
  { id: "m_pectoralis", kind: "muscle", parts: ["FMA9627"], tris: 1800 },
  { id: "m_biceps", kind: "muscle", parts: ["FMA37670"], tris: 1400 },
  { id: "m_triceps", kind: "muscle", parts: ["FMA37688"], tris: 1600 },
  { id: "m_forearm", kind: "muscle", parts: ["FMA38485"], tris: 1000 },
  { id: "m_abs", kind: "muscle", parts: ["FMA13377", "FMA13378"], tris: 1200 },
  { id: "m_obliques", kind: "muscle", parts: ["FMA13335"], tris: 1600 },
  { id: "m_lats", kind: "muscle", parts: ["FMA13357"], tris: 1800 },
  { id: "m_trapezius", kind: "muscle", parts: ["FMA9626"], tris: 1800 },
  { id: "m_rhomboids", kind: "muscle", parts: ["FMA13379", "FMA13380"], tris: 800 },
  { id: "m_serratus", kind: "muscle", parts: ["FMA13397"], tris: 1200 },
  { id: "m_glutes", kind: "muscle", parts: ["FMA22314"], tris: 1600 },
  { id: "m_quads", kind: "muscle", parts: ["FMA22428"], tris: 3000 },
  { id: "m_hamstrings", kind: "muscle", parts: ["FMA22356", "FMA22357"], tris: 2000 },
  { id: "m_adductors", kind: "muscle", parts: ["FMA22441", "FMA22443"], tris: 1600 },
  { id: "m_calves", kind: "muscle", parts: ["FMA22541", "FMA22542"], tris: 2000 },
  { id: "m_tibialis", kind: "muscle", parts: ["FMA22532"], tris: 800 },
];

async function fetchCached(rel) {
  const file = path.join(CACHE, rel.replace(/\//g, "_"));
  try {
    return await fs.readFile(file);
  } catch {}
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}/${rel}`);
    if (res.status === 404) return null;
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.mkdir(CACHE, { recursive: true });
      await fs.writeFile(file, buf);
      return buf;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw new Error(`Download failed: ${rel}`);
}

async function compositeMap() {
  const txt = (await fetchCached("composite_parts.txt")).toString("utf8");
  const map = new Map();
  for (const line of txt.split("\n").slice(1)) {
    const [comp, , prim] = line.trim().split("\t");
    if (!comp || !prim) continue;
    if (!map.has(comp)) map.set(comp, new Set());
    map.get(comp).add(prim);
  }
  return map;
}

function resolve(id, map, seen = new Set()) {
  if (seen.has(id)) return [];
  seen.add(id);
  const kids = map.get(id);
  if (!kids) return [id];
  return [...kids].flatMap((k) => resolve(k, map, seen));
}

function parseStl(buf) {
  const n = buf.readUInt32LE(80);
  const out = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    for (let j = 0; j < 9; j++) out[i * 9 + j] = buf.readFloatLE(o + j * 4);
  }
  return out;
}

/** Merges duplicate vertices (STL is a triangle soup). */
function weld(soup) {
  const map = new Map();
  const pos = [];
  const idx = new Uint32Array(soup.length / 3);
  for (let v = 0; v < soup.length / 3; v++) {
    const x = soup[v * 3], y = soup[v * 3 + 1], z = soup[v * 3 + 2];
    const key = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`;
    let i = map.get(key);
    if (i === undefined) {
      i = pos.length / 3;
      map.set(key, i);
      pos.push(x, y, z);
    }
    idx[v] = i;
  }
  return { positions: new Float32Array(pos), indices: idx };
}

function compact(positions, indices) {
  const remap = new Int32Array(positions.length / 3).fill(-1);
  const pos = [];
  const out = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    if (remap[v] === -1) {
      remap[v] = pos.length / 3;
      pos.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
    }
    out[i] = remap[v];
  }
  return { positions: new Float32Array(pos), indices: out };
}

function normals(positions, indices) {
  const n = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3];
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) {
      n[k] += nx;
      n[k + 1] += ny;
      n[k + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

/** Procedural thyroid (not in BodyParts3D): two lobes + isthmus, placed below the thyroid cartilage. */
async function thyroid() {
  const buf = await fetchCached("stl/FMA55099.stl");
  const soup = parseStl(buf);
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < soup.length; i += 3)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], soup[i + k]);
      max[k] = Math.max(max[k], soup[i + k]);
    }
  const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2, top = min[2];
  const pos = [], idx = [];
  const ellipsoid = (ox, oy, oz, rx, ry, rz, seg = 14) => {
    const base = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI;
      for (let j = 0; j <= seg; j++) {
        const ph = (j / seg) * Math.PI * 2;
        pos.push(ox + rx * Math.sin(th) * Math.cos(ph), oy + ry * Math.sin(th) * Math.sin(ph), oz + rz * Math.cos(th));
      }
    }
    for (let i = 0; i < seg; i++)
      for (let j = 0; j < seg; j++) {
        const a = base + i * (seg + 1) + j, b = a + seg + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
  };
  ellipsoid(cx - 13, cy - 4, top - 18, 7, 8, 20);
  ellipsoid(cx + 13, cy - 4, top - 18, 7, 8, 20);
  ellipsoid(cx, cy - 9, top - 28, 9, 4, 5);
  return { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
}

async function buildGroup(g, map) {
  const prims = [...new Set(g.parts.flatMap((p) => resolve(p, map)))];
  const soups = [];
  let missing = 0;
  for (const p of prims) {
    const buf = await fetchCached(`stl/${p}.stl`);
    if (!buf) {
      missing++;
      continue;
    }
    soups.push(parseStl(buf));
  }
  if (!soups.length) throw new Error(`${g.id}: no geometry (${prims.join(",")})`);
  const total = soups.reduce((a, s) => a + s.length, 0);
  const soup = new Float32Array(total);
  let o = 0;
  for (const s of soups) {
    soup.set(s, o);
    o += s.length;
  }
  let { positions, indices } = weld(soup);
  const before = indices.length / 3;
  const target = Math.min(indices.length, g.tris * 3);
  if (indices.length > target) {
    let [simp] = MeshoptSimplifier.simplify(indices, positions, 3, target, 0.05, ["Prune"]);
    if (simp.length > target * 1.3) simp = MeshoptSimplifier.simplifySloppy(indices, positions, 3, null, target, 0.05)[0];
    indices = simp;
  }
  ({ positions, indices } = compact(positions, indices));
  console.log(`${g.id.padEnd(16)} ${String(prims.length - missing).padStart(3)} parts  ${before} → ${indices.length / 3} tris${missing ? `  (${missing} missing)` : ""}`);
  return { positions, indices };
}

// ── GLB writer with KHR_mesh_quantization (int16 positions, int8 normals)
function writeGlb(meshes) {
  const chunks = [];
  let offset = 0;
  const bufferViews = [], accessors = [], gltfMeshes = [], nodes = [];
  const push = (bytes, extra) => {
    const pad = (4 - (offset % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      offset += pad;
    }
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...extra });
    chunks.push(bytes);
    offset += bytes.length;
    return bufferViews.length - 1;
  };

  // A single uniform transform keeps normals valid and relative positions intact.
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const m of meshes)
    for (let i = 0; i < m.positions.length; i += 3)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], m.positions[i + k]);
        max[k] = Math.max(max[k], m.positions[i + k]);
      }
  const scale = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);

  for (const m of meshes) {
    const vc = m.positions.length / 3;
    const pos = Buffer.alloc(vc * 8);
    const nrm = Buffer.alloc(vc * 4);
    const qmin = [32767, 32767, 32767], qmax = [0, 0, 0];
    const n = normals(m.positions, m.indices);
    for (let v = 0; v < vc; v++) {
      for (let k = 0; k < 3; k++) {
        const q = Math.round(((m.positions[v * 3 + k] - min[k]) / scale) * 32767);
        pos.writeInt16LE(q, v * 8 + k * 2);
        qmin[k] = Math.min(qmin[k], q);
        qmax[k] = Math.max(qmax[k], q);
        nrm.writeInt8(Math.round(n[v * 3 + k] * 127), v * 4 + k);
      }
    }
    const big = vc > 65535;
    const ind = Buffer.alloc(m.indices.length * (big ? 4 : 2));
    m.indices.forEach((x, i) => (big ? ind.writeUInt32LE(x, i * 4) : ind.writeUInt16LE(x, i * 2)));

    const pv = push(pos, { byteStride: 8, target: 34962 });
    const nv = push(nrm, { byteStride: 4, target: 34962 });
    const iv = push(ind, { target: 34963 });
    const a0 = accessors.length;
    accessors.push(
      { bufferView: pv, componentType: 5122, normalized: true, count: vc, type: "VEC3", min: qmin, max: qmax }, // integer units for normalized accessors (glTF spec)
      { bufferView: nv, componentType: 5120, normalized: true, count: vc, type: "VEC3" },
      { bufferView: iv, componentType: big ? 5125 : 5123, count: m.indices.length, type: "SCALAR" }
    );
    gltfMeshes.push({ name: m.id, primitives: [{ attributes: { POSITION: a0, NORMAL: a0 + 1 }, indices: a0 + 2 }] });
    nodes.push({ name: m.id, mesh: gltfMeshes.length - 1, extras: { kind: m.kind } });
  }

  // Root node: dequantise (×scale, +min) and convert BodyParts3D (mm, Z-up) to metres, Y-up, centred on the floor.
  const s = scale / 1000;
  const cx = (min[0] + max[0]) / 2 / 1000, cy = (min[1] + max[1]) / 2 / 1000, zmin = min[2] / 1000;
  const root = {
    name: "body",
    children: nodes.map((_, i) => i),
    // column-major 4x4: x' = x, y' = z, z' = -y   (after scale + offset)
    matrix: [s, 0, 0, 0, 0, 0, -s, 0, 0, s, 0, 0, min[0] / 1000 - cx, min[2] / 1000 - zmin, -(min[1] / 1000 - cy), 1],
  };
  nodes.push(root);

  const bin = Buffer.concat(chunks);
  const json = {
    asset: { version: "2.0", generator: "soul-health build-anatomy", copyright: "BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 JP" },
    extensionsUsed: ["KHR_mesh_quantization"],
    extensionsRequired: ["KHR_mesh_quantization"],
    scene: 0,
    scenes: [{ nodes: [nodes.length - 1] }],
    nodes,
    meshes: gltfMeshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };
  let jsonBuf = Buffer.from(JSON.stringify(json));
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
  const binPadded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binPadded.length, 8);
  const ch = (len, type) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(len, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  return Buffer.concat([header, ch(jsonBuf.length, 0x4e4f534a), jsonBuf, ch(binPadded.length, 0x004e4942), binPadded]);
}

async function main() {
  await MeshoptSimplifier.ready;
  const map = await compositeMap();
  const only = process.argv.slice(2);
  const meshes = [];
  for (const g of GROUPS) {
    if (only.length && !only.includes(g.id)) continue;
    try {
      meshes.push({ id: g.id, kind: g.kind, ...(await buildGroup(g, map)) });
    } catch (e) {
      console.warn(`⚠ skipped ${g.id}: ${e.message}`);
    }
  }
  if (!only.length || only.includes("thyroid")) {
    meshes.push({ id: "thyroid", kind: "organ", ...(await thyroid()) });
    console.log("thyroid          procedural");
  }
  const glb = writeGlb(meshes);
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, glb);
  const tris = meshes.reduce((a, m) => a + m.indices.length / 3, 0);
  console.log(`\nWrote ${path.relative(ROOT, OUT)}: ${(glb.length / 1e6).toFixed(2)} MB, ${meshes.length} meshes, ${tris} triangles`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
