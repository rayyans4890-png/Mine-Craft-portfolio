# 🎮 My Minecraft Folio — The End 🎮

An immersive, Minecraft-inspired 3D portfolio at the end of the world: scroll
to fly a camera out of the void onto a floating End island, through a cozy
house amid obsidian pillars and drifting endermen, past glowing project
paintings and an about-me board — click them to open their panels.

Link-https://rayyans-minecraft-portfolio.netlify.app/

Built with **React Three Fiber**, **three.js**, and **Blender**.

This project is an independent implementation of the experience taught in
[Andrew Woan](https://github.com/andrewwoan)'s 7-hour
[tutorial](https://youtu.be/lf9ZBsi24m4) (his original:
[repo](https://github.com/andrewwoan/woan-minecraft-folio) /
[live site](http://woanminecraftfolio.com/), MIT licensed). The application
code in `src/` was written from scratch for this build; the 3D assets,
audio, fonts and the original `.blend` file are his (and their credited
creators'), used under his MIT license with gratitude.

**How to explore:** wait for the loading bar (the void parts like a curtain) →
click **Enter World** (this unlocks audio) → scroll or drag up/down to fly the
loop, starting with an approach out over the void. The front door opens as you
arrive. Click the pulsating paintings and the "About Me" board inside the
house. The corner buttons toggle music and show folio info/credits. Watch the
endermen — they watch back.

## Where to put YOUR content

| What | File |
| --- | --- |
| Your name, bio, fun facts, link, gallery | `src/ui/panels/AboutPanel.jsx` → `about` object |
| Your projects (image, link, description) | `src/ui/panels/ProjectPanel.jsx` → `PROJECTS` map |
| In-world painting modal titles | `src/experience/models/DetailModel.jsx` → `HOTSPOTS` |
| Door open/close points in the tour | `src/experience/models/DoorModel.jsx` |
| Info modal text & credits | `src/ui/panels/InfoPanel.jsx` |
| Loading screen messages | `src/ui/LoadingScreen.jsx` |
| Camera flight path & rotations | `src/experience/choreography.js` |
| Page title, meta & Open Graph tags | `index.html` |
| About/project images (webp) | `public/images/` |
| 3D models (glb with KTX2 textures) | `public/models/` |
| End terrain, pillars & palette | `src/experience/lib/{endTerrain,endTheme}.js` |
| Procedural End textures & void sky | `src/experience/lib/endTextures.js` |
| Music & sound effects | `public/audio/` |
| Blender source file | `blender/Minecraft-Portfolio.blend` |

## How it works

- **Camera rig** (`experience/`): scroll/drag/swipe input feeds a target
  progress along a closed CatmullRom path (`choreography.js`). Each frame the
  camera group eases toward the path point and toward a keyframed orientation
  through a smoothed quaternion buffer; the perspective camera inside the
  group carries the mouse parallax, so the offset follows the camera's local
  axes. Progress wraps at both ends, so you can scroll forever.
- **The End dimension** (`experience/models/`, `experience/lib/`): the whole
  environment is procedural — no new asset files. A deterministic heightfield
  (`endTerrain.js`) shapes the End island (rolling End-stone hills, a flat pad
  under the house, a ragged rim and a tapering underside) and is rendered as
  one InstancedMesh of visible-only blocks. Ten obsidian pillar towers ring
  the island, five crowned with spinning End crystals. The void sky is a
  CubeTexture painted on canvases at runtime (`endTextures.js`), End stone and
  obsidian are 16×16 nearest-filtered canvas textures, and endermen — box
  figures with fog-piercing eyes — track the camera when it comes close.
  Violet fog swallows the far side of the island into the void.
- **Baked models** (`experience/useBakedModel.js`): every GLB is light-baked,
  so materials are swapped for unlit `MeshBasicMaterial`s (emissive maps for
  glowing parts, alpha-tested maps for foliage) and textures are KTX2
  compressed with the basis transcoder in `public/basis/`. The house and its
  interior were baked under Overworld daylight, so their materials carry a
  gentle violet tint to sit in the End's light.
- **Interactions**: the door and clickable paintings are detached from their
  GLTF scenes and rendered as primitives so React can drive their transforms
  and pointer events. Paintings pulse via a shared heartbeat (`rig.pulse`)
  when the camera is in their window, go full-bright on hover, and open
  zustand-driven modals on click.
- **Audio** (`audio/sfx.js`): a lazy Howler bank — the "Enter World" click
  unlocks it (autoplay policy), the corner button toggles the soundtrack, and
  doors/buttons play effects.
- **Canvas** uses `flat` (no tone mapping — the bake is the look) and
  `eventSource` on the page root so raycast hover keeps working under the DOM UI.

## License

MIT — see [LICENSE.md](./LICENSE.md) (© Andrew Woan, original project).
