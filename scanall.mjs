import fs from "node:fs";
import * as THREE from "three";

function loadGLB(path) {
  const buf = fs.readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
  const bin = buf.subarray(20 + jsonLen + 8);
  return { json, bin };
}

function readAccessor(json, bin, acc) {
  if (acc.bufferView === undefined) return new Float32Array(0);
  const bv = json.bufferViews[acc.bufferView];
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const count = acc.count;
  const comp = acc.componentType;
  const nComp = { SCALAR: 1, VEC3: 3, VEC2: 2 }[acc.type];
  const out = new Float32Array(count * nComp);
  const stride = bv.byteStride || nComp * (comp === 5126 || comp === 5125 ? 4 : 2);
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < nComp; c++) {
      const off = base + i * stride + c * (comp === 5126 || comp === 5125 ? 4 : 2);
      let v;
      if (comp === 5126) v = bin.readFloatLE(off);
      else if (comp === 5125) v = bin.readUInt32LE(off);
      else if (comp === 5123) v = bin.readUInt16LE(off);
      else if (comp === 5122) v = bin.readInt16LE(off);
      else v = NaN;
      out[i * nComp + c] = v;
    }
  }
  return out;
}

function worldMatrix(json, name) {
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
    else nm.compose(new THREE.Vector3(...(n.translation || [0,0,0])), new THREE.Quaternion(...(n.rotation || [0,0,0,1])), new THREE.Vector3(...(n.scale || [1,1,1])));
    m.multiply(nm);
  }
  return m;
}

const [x0, y0, z0, x1, y1, z1] = process.argv.slice(2, 8).map(Number);
for (const f of fs.readdirSync("public/models")) {
  if (!f.endsWith(".glb")) continue;
  const { json, bin } = loadGLB("public/models/" + f);
  for (const node of json.nodes) {
    if (node.mesh === undefined) continue;
    const M = worldMatrix(json, node.name);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let tris = 0;
    let bb = null;
    for (const prim of json.meshes[node.mesh].primitives) {
      const pos = readAccessor(json, bin, json.accessors[prim.attributes.POSITION]);
      const idx = prim.indices !== undefined ? readAccessor(json, bin, json.accessors[prim.indices]) : null;
      const n = idx ? idx.length : pos.length / 3;
      if (idx && Number.isNaN(idx[0])) continue;
      for (let t = 0; t < n; t += 3) {
        const i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2;
        a.set(pos[i0*3], pos[i0*3+1], pos[i0*3+2]).applyMatrix4(M);
        b.set(pos[i1*3], pos[i1*3+1], pos[i1*3+2]).applyMatrix4(M);
        c.set(pos[i2*3], pos[i2*3+1], pos[i2*3+2]).applyMatrix4(M);
        const cen = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
        if (cen.x >= x0 && cen.x <= x1 && cen.y >= y0 && cen.y <= y1 && cen.z >= z0 && cen.z <= z1) {
          tris++;
          for (const p of [a, b, c]) {
            if (!bb) bb = new THREE.Box3().setFromPoints([p.clone()]);
            else bb.expandByPoint(p);
          }
        }
      }
    }
    if (tris > 0) console.log(f, node.name, "tris:", tris, JSON.stringify({ min: bb.min.toArray().map(v=>+v.toFixed(3)), max: bb.max.toArray().map(v=>+v.toFixed(3)) }));
  }
}
