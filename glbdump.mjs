import fs from "node:fs";
import * as THREE from "three";

const path = process.argv[2];
const buf = fs.readFileSync(path);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
const binStart = 20 + jsonLen + 8;
const bin = buf.subarray(binStart);

function readAccessor(acc) {
  if (acc.bufferView === undefined) return new Float32Array(0);
  const bv = json.bufferViews[acc.bufferView];
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const count = acc.count;
  const comp = acc.componentType;
  const nComp = { SCALAR: 1, VEC3: 3, VEC2: 2 }[acc.type];
  const out = new Float32Array(count * nComp);
  const stride = bv.byteStride || nComp * (comp === 5126 ? 4 : comp === 5125 ? 4 : 2);
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < nComp; c++) {
      const off = base + i * stride + c * (comp === 5126 || comp === 5125 ? 4 : 2);
      let v;
      if (comp === 5126) v = bin.readFloatLE(off);
      else if (comp === 5125) v = bin.readUInt32LE(off);
      else if (comp === 5123) v = bin.readUInt16LE(off);
      else if (comp === 5122) v = bin.readInt16LE(off);
      if (acc.normalized) v = comp === 5123 ? v / 65535 : comp === 5122 ? Math.max(v / 32767, -1) : v;
      out[i * nComp + c] = v;
    }
  }
  return out;
}

function worldMatrix(name) {
  const sceneNodes = json.scenes[json.scene || 0].nodes;
  const parents = {};
  sceneNodes.forEach((n) => (function w(i, p) { parents[i] = p; (json.nodes[i].children || []).forEach((c) => w(c, i)); })(n, null));
  const idx = json.nodes.findIndex((n) => n.name === name);
  const chain = [];
  let cur = idx;
  while (cur !== null && cur !== undefined) { chain.unshift(cur); cur = parents[cur]; }
  const m = new THREE.Matrix4();
  for (const ci of chain) {
    const n = json.nodes[ci];
    const nm = new THREE.Matrix4();
    if (n.matrix) nm.fromArray(n.matrix);
    else nm.compose(
      new THREE.Vector3(...(n.translation || [0, 0, 0])),
      new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])),
      new THREE.Vector3(...(n.scale || [1, 1, 1]))
    );
    m.multiply(nm);
  }
  return m;
}

const mode = process.argv[3] || "bounds";

if (mode === "bounds") {
  const names = process.argv.slice(4).length ? process.argv.slice(4) : json.nodes.map((n) => n.name);
  for (const name of names) {
    const node = json.nodes.find((n) => n.name === name);
    if (!node || node.mesh === undefined) { console.log(name, ": no mesh"); continue; }
    const M = worldMatrix(name);
    const mesh = json.meshes[node.mesh];
    const bb = new THREE.Box3();
    const v = new THREE.Vector3();
    for (const prim of mesh.primitives) {
      const pos = readAccessor(json.accessors[prim.attributes.POSITION]);
      for (let i = 0; i < pos.length; i += 3) {
        v.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(M);
        bb.expandByPoint(v);
      }
    }
    console.log(name, JSON.stringify({ min: bb.min.toArray().map((x) => +x.toFixed(3)), max: bb.max.toArray().map((x) => +x.toFixed(3)) }));
  }
} else if (mode === "region") {
  const [x0, y0, z0, x1, y1, z1] = process.argv.slice(4, 10).map(Number);
  const name = process.argv[10] || "detail_Baked";
  const node = json.nodes.find((n) => n.name === name);
  const M = worldMatrix(name);
  const mesh = json.meshes[node.mesh];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let bb = null;
  let tris = 0;
  const zHist = new Map(), yHist = new Map();
  for (const prim of mesh.primitives) {
    const pos = readAccessor(json.accessors[prim.attributes.POSITION]);
    const idx = prim.indices !== undefined ? readAccessor(json.accessors[prim.indices]) : null;
    const n = idx ? idx.length : pos.length / 3;
    for (let t = 0; t < n; t += 3) {
      const i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2;
      a.set(pos[i0 * 3], pos[i0 * 3 + 1], pos[i0 * 3 + 2]).applyMatrix4(M);
      b.set(pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]).applyMatrix4(M);
      c.set(pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]).applyMatrix4(M);
      const cen = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
      if (cen.x >= x0 && cen.x <= x1 && cen.y >= y0 && cen.y <= y1 && cen.z >= z0 && cen.z <= z1) {
        tris++;
        for (const p of [a, b, c]) {
          if (!bb) bb = new THREE.Box3().setFromPoints([p.clone()]);
          else bb.expandByPoint(p);
        }
        const zk = cen.z.toFixed(3), yk = cen.y.toFixed(2);
        zHist.set(zk, (zHist.get(zk) || 0) + 1);
        yHist.set(yk, (yHist.get(yk) || 0) + 1);
      }
    }
  }
  console.log("tris:", tris, "bounds:", bb ? JSON.stringify({ min: bb.min.toArray().map((x) => +x.toFixed(3)), max: bb.max.toArray().map((x) => +x.toFixed(3)) }) : null);
  console.log("z-layers:", [...zHist.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10));
  console.log("y-layers:", [...yHist.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12));
}
