# Бесплатные сторонние ассеты

## Kenney — Starter Kit 3D Platformer
- Source: https://github.com/KenneyNL/Starter-Kit-3D-Platformer
- Commit: 3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0
- Files: models/nature/character.glb, grass.glb, grass-small.glb and nature/Textures/colormap.png

## Kenney — Starter Kit FPS
- Source: https://github.com/KenneyNL/Starter-Kit-FPS
- Commit: 185fd2326d74a5cf858cffc616f87cf9696f9cc0
- Files: models/blaster.glb, blaster-repeater.glb, enemy-flying.glb and Textures/colormap.png

Both upstream READMEs explicitly license 3D models under CC0:
https://creativecommons.org/publicdomain/zero/1.0/
Commercial use is permitted. Upstream software MIT notice is retained in KENNEY-MIT-LICENSE.txt.

Architecture, props, lighting, procedural textures and sound synthesis are created for this project.
All assets are bundled locally; the game does not fetch third-party assets at runtime.

## KayKit — Character Pack: Adventurers
- Creator: Kay Lousberg, https://kaylousberg.com/
- Source: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- Commit: 672074b73ba276876a19e8816ecdc5241817ab47
- Model: Rogue_Hooded.glb, shipped as models/characters/character.glb
- License: CC0 1.0 Universal, full notice in KAYKIT-LICENSE.txt.
- Changes: unused animation clips and binary data pruned; geometry, skeleton and embedded texture preserved. Ten clips retained for gameplay.
- This model replaces the original Kenney robot. Kenney assets still provide vegetation, drones and blasters.

## Quaternius / Tomás Laulhé — RobotExpressive (heavy warden)
- Creator: https://quaternius.com/ ; credit names as supplied in upstream README: Tomás Laulhé and Don McCurdy (conversion and morph targets).
- Source: https://github.com/mrdoob/three.js/tree/9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8/examples/models/gltf/RobotExpressive
- Three.js tag r186, commit 9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8.
- File: models/enemies/warden.glb, downloaded unchanged (463988 bytes).
- SHA-256: 047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319.
- Upstream explicitly states CC0 1.0 in models/enemies/WARDEN-README.md. Full CC0 legal text retained in ENEMIES-CC0-LICENSE.txt and embedded in the standalone HTML.
- The game selects the ready Idle, Walking and Punch animations; the source model is unchanged. Runtime scaling places the feet on the ground.

## Kenney — ready runner robot
- Source: https://github.com/KenneyNL/Starter-Kit-3D-Platformer/tree/3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0/models
- Files: models/enemies/runner.glb and enemies/Textures/colormap.png, downloaded unchanged from the pinned source.
- Model SHA-256: 7112f6a08400914f9da546f3e6029e947cc9eab2b4a6da5eb99776111289efb1.
- CC0 1.0, as explicitly stated by the upstream README. Commercial use permitted. Runtime selects the provided idle/walk animations.
- Gunner drones reuse the ready Kenney enemy-flying and blaster models from the FPS kit credited above; no generated character geometry is used for the new enemies.
