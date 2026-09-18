import { NodeIO } from "@gltf-transform/core";
import { KHRTextureBasisu, KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3 from "draco3";

const io = new NodeIO()
  .registerExtensions([KHRTextureBasisu, KHRDracoMeshCompression])
  .registerDependencies({ "draco3d.decoder": await draco3.createDecoderModule() });

for (const file of ["public/models/ExtrasT-transformed.glb", "public/models/ExtrasTwoT-transformed.glb"]) {
  console.log("=====", file);
  const doc = await io.read(file);
  for (const scene of doc.getRoot().listScenes()) {
    for (const node of scene.listChildren()) {
      const t = node.getTranslation().map((v) => v.toFixed(3)).join(",");
      const r = node.getRotation().map((v) => v.toFixed(2)).join(",");
      const mesh = node.getMesh() ? node.getMesh().getName() : "-";
      console.log(`  ${node.getName()} | t:${t} | r:${r} | mesh:${mesh}`);
    }
  }
}
