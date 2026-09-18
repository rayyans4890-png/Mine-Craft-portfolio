import { NodeIO } from "@gltf-transform/core";
import { KHRTextureBasisu } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions([KHRTextureBasisu]);
const doc = await io.read("public/models/DetailT-v1.glb");
const root = doc.getRoot();
for (const scene of root.listScenes()) {
  console.log("SCENE:", scene.getName());
  for (const node of scene.listChildren()) {
    const t = node.getTranslation().map((v) => v.toFixed(4)).join(",");
    const mesh = node.getMesh() ? node.getMesh().getName() : "-";
    console.log(`  ${node.getName()} | t: ${t} | mesh: ${mesh}`);
  }
}
