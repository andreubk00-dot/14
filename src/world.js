import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { HOME, productionInfo } from './game.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const rand = seed => { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; };
const rng = rand(1472);
const Y = new THREE.Vector3(0, 1, 0);
const color = { ground: '#384339', road: '#3a4546', wall: '#77796c', rust: '#785b47', wood: '#766a50', leaf: '#546e4e', dark: '#283b39', cream: '#b3aa89', orange: '#f4bb77' };
const materials = new Map();
const mat = (c, roughness = 0.88, metalness = 0) => {
  const id = c + roughness + metalness;
  if (!materials.has(id)) materials.set(id, new THREE.MeshStandardMaterial({ color: c, roughness, metalness }));
  return materials.get(id);
};
export const LOCATIONS = [
  { id: 'garden', name: 'Заброшенный сад', subtitle: 'Семена · травы · старые запасы', x: -34, z: -5, color: '#b5c68b' },
  { id: 'home', name: 'Ремонтная станция', subtitle: 'Твоё убежище', x: -17, z: 16, color: '#e6b779' },
  { id: 'market', name: 'Старый квартал', subtitle: 'Ткань · дерево · провод', x: 12, z: 4, color: '#a4b6ae' },
  { id: 'depot', name: 'Заброшенное депо', subtitle: 'Металл · детали · опасность', x: -18, z: -22, color: '#b8a186' },
  { id: 'pond', name: 'Затопленный причал', subtitle: 'Рыбалка · редкие находки', x: 20, z: -20, color: '#7ebbb3' },
  { id: 'tower', name: 'Водонапорная башня', subtitle: 'Вода · технические запасы', x: 31, z: -34, color: '#8bbfc7' },
];

export class World {
  constructor(container, state) {
    this.state = state; this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#273b3e');
    this.scene.fog = new THREE.FogExp2('#344747', 0.017);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 180);
    this.viewSize = 36; this.cameraCenter = new THREE.Vector3(state.x + 2, 0, state.z - 2);
    this.camera.position.set(state.x + 28, 33, state.z + 31);
    this.camera.lookAt(this.cameraCenter);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.7, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
        void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float v=smoothstep(.25,.92,length((vUv-.5)*vec2(1.,.85)));c*=1.-v*.26;
        float grain=fract(sin(dot(vUv*vec2(1831.,921.)+floor(time*12.),vec2(12.9898,78.233)))*43758.5453);c+=(grain-.5)*.014;
        gl_FragColor=vec4(c,1.);}`,
    });
    this.composer.addPass(this.grade);
    this.colliders = []; this.nodes = []; this.enemies = []; this.floating = []; this.lights = [];
    this.pickables = []; this.fogs = []; this.mixers = []; this.placedGroups = [];
    this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(Y, 0); this.time = 0;
    this.buildWorld(); this.batchStaticGeometry(); this.buildPlayer(); this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.applyProgress();
    for (const drop of state.drops) this.addDrop(drop);
  }
  batchStaticGeometry() {
    this.scene.updateMatrixWorld(true);
    const batches = new Map();
    const excluded = new Set([this.genIndicator, this.towerIndicator, this.water, this.destination, this.selectionRing,
      this.homeLamp.glow, this.homeLamp.spill, ...this.lights.flatMap(l => [l.glow, l.spill])]);
    this.scene.traverse(mesh => {
      if (!mesh.isMesh || excluded.has(mesh) || this.pickables.includes(mesh) || mesh.material.isShaderMaterial || mesh.material.transparent) return;
      let parent = mesh;
      while (parent) { if (parent === this.bridgeGroup || parent === this.solarRoof) return; parent = parent.parent; }
      const key = mesh.material.uuid;
      if (!batches.has(key)) batches.set(key, { material: mesh.material, meshes: [] });
      batches.get(key).meshes.push(mesh);
    });
    for (const batch of batches.values()) {
      if (batch.meshes.length < 2) continue;
      const parts = batch.meshes.map(mesh => {
        let geometry = mesh.geometry.clone();
        if (geometry.index) { const old = geometry; geometry = old.toNonIndexed(); old.dispose(); }
        return geometry.applyMatrix4(mesh.matrixWorld);
      });
      const geometry = mergeGeometries(parts);
      parts.forEach(p => p.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, batch.material); merged.castShadow = true; merged.receiveShadow = true;
      for (const mesh of batch.meshes) { mesh.parent.remove(mesh); mesh.geometry.dispose(); }
      this.scene.add(merged);
    }
  }
  box(x, y, z, w, h, d, c, parent = this.scene, extra) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), extra || mat(c));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  cylinder(x, y, z, r, h, c, parent = this.scene, vertices = 10) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, vertices), mat(c));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  collider(x, z, w, d) { this.colliders.push({ x, z, w, d }); }
  texture(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = kind === 'road' ? '#414949' : '#455044'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8000; i++) {
      const c = 40 + rng() * 70;
      ctx.fillStyle = `rgba(${c},${c + 5},${c},${rng() * 0.25})`;
      ctx.fillRect(rng() * 256, rng() * 256, rng() * 3 + 1, rng() * 2 + 1);
    }
    if (kind === 'road') {
      ctx.strokeStyle = '#303a39'; ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); let x = rng() * 256, z = rng() * 256; ctx.moveTo(x, z); for (let j = 0; j < 5; j++) { x += rng() * 20 - 10; z += rng() * 20; ctx.lineTo(x, z); } ctx.stroke(); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(14, 14); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }
  label(text, x, y, z, width = 4, fg = '#ddcfaf', bg = '#283a35', parent = this.scene) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg; ctx.globalAlpha = 0.4; ctx.strokeRect(8, 8, 496, 112); ctx.globalAlpha = 1;
    ctx.fillStyle = fg; ctx.font = '500 45px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 67);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  lamp(x, z, height = 4.5, powered = true, parent = this.scene) {
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    this.cylinder(0, height / 2, 0, 0.055, height, '#3c4945', group, 6);
    this.box(0.23, height, 0, 0.65, 0.08, 0.32, '#55605b', group);
    const glow = this.box(0.23, height - 0.08, 0, 0.35, 0.09, 0.21, '#ffce8c', group, new THREE.MeshStandardMaterial({ color: '#ffe1aa', emissive: '#ffb764', emissiveIntensity: powered ? 3 : 0 }));
    const light = new THREE.PointLight('#ffc58c', powered ? 15 : 0, 10, 1.5); light.position.set(0.2, height - 0.3, 0); group.add(light);
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: this.glowTexture(), color: '#d5aa66', transparent: true, opacity: powered ? 0.15 : 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    spill.rotation.x = -Math.PI / 2; spill.position.y = 0.06; group.add(spill);
    this.lights.push({ light, glow, spill, base: powered ? 15 : 0 });
    return { group, light, glow, spill };
  }
  glowTexture() {
    if (this._glow) return this._glow;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,.8)'); gradient.addColorStop(0.35, 'rgba(255,255,255,.28)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); this._glow = new THREE.CanvasTexture(canvas); return this._glow;
  }
  buildWorld() {
    const hemisphere = new THREE.HemisphereLight('#adc4c7', '#454532', 2.1); this.scene.add(hemisphere); this.ambient = hemisphere;
    const sun = new THREE.DirectionalLight('#ffcf93', 3.0); sun.position.set(-35, 35, -12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -65; sun.shadow.camera.right = sun.shadow.camera.top = 65;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 120; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; this.scene.add(sun); this.sun = sun;
    const ground = this.box(0, -0.22, 0, 100, 0.4, 100, color.ground);
    ground.material = new THREE.MeshStandardMaterial({ map: this.texture('ground'), roughness: 0.96 });
    const road = this.box(0, 0.015, 1, 7.8, 0.04, 87, color.road);
    road.material = new THREE.MeshStandardMaterial({ map: this.texture('road'), roughness: 0.6, metalness: 0.12 });
    this.box(3, 0.01, 3, 67, 0.05, 6, color.road).material = road.material;
    for (let z = -39; z < 41; z += 7) this.box(0, 0.048, z, 0.09, 0.008, 2.1, '#a19b7c');
    for (const x of [-4.25, 4.25]) { this.box(x, 0.1, 0, 0.4, 0.18, 86, '#777b70'); }
    for (let z = -34; z < 35; z += 14) this.lamp(z % 3 ? -4.3 : 4.3, z, 5.2, z > -10);
    for (let i = 0; i < 19; i++) this.puddle(rng() * 7 - 3.5, rng() * 78 - 39, 0.9 + rng() * 2.5, 0.5 + rng());
    this.reflection = new Reflector(new THREE.CircleGeometry(1, 40), { clipBias: 0.003, textureWidth: 384, textureHeight: 384, color: '#68847b' });
    this.reflection.rotation.x = -Math.PI / 2; this.reflection.scale.set(2.5, 1.15, 1); this.reflection.position.set(-0.8, 0.06, 17);
    this.reflection.material.uniforms.time = { value: 0 };
    this.reflection.material.vertexShader = this.reflection.material.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vLocal;').replace('vUv = textureMatrix', 'vLocal = position.xy; vUv = textureMatrix');
    this.reflection.material.fragmentShader = this.reflection.material.fragmentShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vLocal; uniform float time;').replace('vec4 base = texture2DProj( tDiffuse, vUv );', 'vec4 uv = vUv; uv.x += sin(vLocal.y * 14.0 + time * 0.6) * 0.0015 * uv.w; vec4 base = texture2DProj(tDiffuse, uv);').replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );', 'vec3 water = mix(vec3(0.08, 0.13, 0.12), base.rgb, 0.55); float edge = 1.0 - smoothstep(0.65, 1.0, length(vLocal)); gl_FragColor = vec4(water, edge * 0.8);');
    this.reflection.material.transparent = true; this.reflection.material.depthWrite = false;
    this.scene.add(this.reflection);
    this.buildHome(); this.buildMarket(); this.buildDepot(); this.buildPond(); this.buildTower();
    // Treelines frame the district, leaving the traversable paths readable.
    for (let i = 0; i < 130; i++) {
      const x = rng() * 87 - 43.5, z = rng() * 87 - 43.5;
      if (Math.hypot(x + 34, z + 5) < 8) continue;
      if (Math.abs(x) < 6 || Math.abs(z - 3) < 5 || this.blocked(x, z, 2)) continue;
      if (Math.hypot(x + 17, z - 16) < 13 || Math.hypot(x - 20, z + 20) < 12) continue;
      this.tree(x, z, 0.75 + rng() * 0.7);
    }
    for (let i = 0; i < 75; i++) {
      const x = rng() * 75 - 37.5, z = rng() * 75 - 37.5;
      if (Math.abs(x) < 5 || Math.abs(z - 3) < 4 || this.blocked(x, z, 1)) continue;
      this.bush(x, z, 0.3 + rng() * 0.5);
    }
    this.buildGarden();
    this.createNodes(); this.createEnemies(); this.createAtmosphere(); this.buildBridge();
    this.destination = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.37, 32), new THREE.MeshBasicMaterial({ color: '#ecd4a0', transparent: true, opacity: 0.6, depthWrite: false }));
    this.destination.rotation.x = -Math.PI / 2; this.destination.position.y = 0.1; this.destination.visible = false; this.scene.add(this.destination);
    this.selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.85, 40), new THREE.MeshBasicMaterial({ color: '#eacb8c', transparent: true, opacity: 0.75, depthWrite: false }));
    this.selectionRing.rotation.x = -Math.PI / 2; this.selectionRing.position.y = 0.12; this.selectionRing.visible = false; this.scene.add(this.selectionRing);
  }
  puddle(x, z, w, d) {
    const geometry = new THREE.CircleGeometry(1, 24);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#67837e', roughness: 0.1, metalness: 0.65, transparent: true, opacity: 0.42 }));
    mesh.rotation.x = -Math.PI / 2; mesh.scale.set(w, d, 1); mesh.position.set(x, 0.052, z); this.scene.add(mesh);
  }
  tree(x, z, s = 1) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(s); this.scene.add(group);
    this.cylinder(0, 1.5, 0, 0.18, 3, '#6b6048', group, 7);
    const shade = ['#536b4b', '#687957', '#405c49'][Math.floor(rng() * 3)];
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55 - i * 0.25, 0), mat(shade));
      mesh.position.set((rng() - 0.5) * 0.8, 2.8 + i * 0.85, (rng() - 0.5) * 0.8); mesh.scale.y = 1.1; mesh.rotation.y = rng() * 6; mesh.castShadow = true; group.add(mesh);
    }
    this.collider(x, z, 0.65 * s, 0.65 * s); return group;
  }
  bush(x, z, s = 0.5, parent = this.scene) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat('#536d4b')); mesh.position.set(x, s * 0.5, z); mesh.scale.set(1.4, 0.8, 1.1); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  crate(x, z, s = 1, parent = this.scene) {
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    this.box(0, 0.45 * s, 0, s, 0.9 * s, s, '#877957', group);
    for (const y of [0.1, 0.76]) this.box(0, y * s, 0.51 * s, 1.05 * s, 0.12 * s, 0.06, '#5f614d', group);
    for (const x of [-0.4, 0.4]) this.box(x * s, 0.45 * s, 0.53 * s, 0.1 * s, 0.85 * s, 0.06, '#b2a17a', group);
    return group;
  }
  building(x, z, w, d, h, shade, sign) {
    const group = new THREE.Group(); group.position.set(x, 0, z); this.scene.add(group);
    this.box(0, 0.13, 0, w + 0.3, 0.25, d + 0.3, '#77786d', group);
    this.box(0, h / 2, -d / 2, w, h, 0.32, shade, group);
    this.box(-w / 2, h / 2, 0, 0.32, h, d, shade, group);
    this.box(w / 2, h / 2, -d * 0.15, 0.32, h, d * 0.7, shade, group);
    this.box(-w * 0.3, h / 2, d / 2, w * 0.4, h, 0.32, shade, group);
    this.box(w * 0.3, h / 2, d / 2, w * 0.4, h, 0.32, shade, group);
    for (let xx = -w / 2 + 1.4; xx < w / 2 - 0.5; xx += 2.8) {
      this.box(xx, h * 0.65, -d / 2 + 0.18, 1.2, 1.35, 0.05, '#3e5350', group);
      this.box(xx, h * 0.65, -d / 2 + 0.24, 0.07, 1.4, 0.07, '#b1ab91', group);
      this.box(xx, h * 0.65, -d / 2 + 0.24, 1.25, 0.07, 0.07, '#b1ab91', group);
    }
    this.box(0, h + 0.14, -d * 0.35, w + 0.55, 0.27, d * 0.4, '#53615a', group);
    this.box(0, h - 0.2, d / 2, w + 0.3, 0.18, 0.65, '#6f7567', group);
    if (sign) this.label(sign, 0, h - 0.95, d / 2 + 0.19, w * 0.73, '#ccbe98', '#46594c', group);
    this.collider(x, z - d / 2, w, 0.6); this.collider(x - w / 2, z, 0.6, d);
    this.collider(x + w / 2, z - d * 0.15, 0.6, d * 0.7);
    this.collider(x - w * 0.3, z + d / 2, w * 0.4, 0.6); this.collider(x + w * 0.3, z + d / 2, w * 0.4, 0.6);
    for (let i = 0; i < 8; i++) this.box(rng() * (w - 1) - w / 2 + 0.5, 0.32, rng() * (d - 1) - d / 2 + 0.5, 0.2 + rng() * 0.35, 0.13, 0.2 + rng() * 0.35, '#8b8975', group);
    return group;
  }
  buildHome() {
    const x = -18, z = 15;
    this.box(x, 0.09, z, 12, 0.2, 9, '#827b63');
    // Open cutaway walls keep the interior legible from the isometric camera.
    this.box(x, 1.8, z - 4.5, 12, 3.6, 0.25, '#8c8d76'); this.collider(x, z - 4.5, 12, 0.5);
    this.box(x - 6, 1.8, z, 0.25, 3.6, 9, '#777c6b'); this.collider(x - 6, z, 0.5, 9);
    for (let xx = -23; xx < -12; xx += 1) this.box(xx, 0.205, z, 0.04, 0.015, 9, '#655f4e');
    this.box(x, 3.7, z - 3.5, 12.6, 0.25, 2.7, '#4a6056');
    for (let xx = -24; xx <= -12; xx += 0.55) this.box(xx, 3.85, z - 3.5, 0.045, 0.06, 2.7, '#6c7b6b');
    // Roof beams, worn paint and climbing plants give the cutaway shelter a lived-in silhouette.
    for (const xx of [-23.8, -18, -12.2]) this.box(xx, 2, 10.6, 0.14, 3.6, 0.2, '#66725e');
    this.box(-18, 1.25, 10.67, 11.5, 0.035, 0.035, '#a6a27f');
    for (let i = 0; i < 12; i++) {
      const leaf = this.bush(-23.75 + rng() * 0.25, 10.8 + rng() * 1.5, 0.2 + rng() * 0.15);
      leaf.position.y = 1 + rng() * 2.2;
    }
    this.box(-18, 0.4, 20.6, 11.2, 0.8, 0.22, '#6e7868');
    // Entrance gap and garden border.
    this.box(-8.7, 0.3, 16, 0.18, 0.6, 17, '#5b6858');
    for (let zz = 8; zz < 25; zz += 2) this.box(-8.7, 0.75, zz, 0.22, 1.5, 0.22, '#7c7b60');
    this.label('РЕМОНТНАЯ СТАНЦИЯ', -18, 2.9, 10.65, 7.4);
    this.label('ДОМ', -10.5, 1.7, 20.8, 1.5, '#e9c993');
    this.box(-10.5, 0.8, 20.65, 0.08, 1.6, 0.08, '#756e54');
    // Crafting bench.
    this.bench = new THREE.Group(); this.bench.position.set(-21, 0, 13); this.scene.add(this.bench);
    this.box(0, 1.05, 0, 2.8, 0.22, 1.25, '#9a8964', this.bench);
    for (const xx of [-1, 1]) for (const zz of [-0.4, 0.4]) this.box(xx, 0.5, zz, 0.12, 1, 0.12, '#56635a', this.bench);
    this.box(-0.55, 1.32, 0, 0.65, 0.35, 0.6, '#596d65', this.bench);
    this.box(0.65, 1.2, 0.1, 0.6, 0.1, 0.4, '#c3b28a', this.bench);
    this.label('МАСТЕРСКАЯ', -21, 1.9, 10.7, 2.8);
    this.crate(-13.5, 17, 1.2); this.crate(-13.6, 15.5, 0.8);
    this.box(-22, 0.4, 17.7, 2.2, 0.5, 1.3, '#68776c'); this.box(-22, 0.7, 17.7, 2.3, 0.3, 1.35, '#a29b79');
    this.box(-22.7, 0.95, 17.7, 0.55, 0.18, 1.15, '#c2bba0');
    this.box(-19.4, 0.25, 17.9, 2.4, 0.025, 1.7, '#9c805c');
    for (let i = 0; i < 5; i++) this.box(-19.4, 0.267, 17.3 + i * 0.28, 2.1, 0.006, 0.035, '#c2a276');
    this.box(-23.25, 1, 15.6, 0.6, 2, 1.2, '#7b826b');
    for (let y = 0.4; y < 2; y += 0.5) { this.box(-22.93, y, 15.6, 0.08, 0.08, 1.15, '#a2a080'); this.box(-22.87, y + 0.18, 15.4, 0.08, 0.25, 0.35, '#b4a576'); }
    this.cylinder(-20, 0.42, 19, 0.32, 0.7, '#a7916a');
    this.cylinder(-20, 0.79, 19, 0.43, 0.12, '#a99b78');
    this.generator = new THREE.Group(); this.generator.position.set(-11, 0, 11.4); this.scene.add(this.generator);
    this.box(0, 0.6, 0, 1.5, 1.15, 1.1, '#6c7662', this.generator); this.cylinder(0, 0.63, 0.62, 0.4, 0.11, '#344b44', this.generator).rotation.x = Math.PI / 2;
    this.box(-0.45, 1.2, 0, 0.13, 0.8, 0.13, '#535f55', this.generator);
    this.genIndicator = this.box(0.48, 0.9, 0.57, 0.12, 0.12, 0.06, '#b1664d', this.generator, new THREE.MeshStandardMaterial({ color: '#b1664d', emissive: '#b1664d', emissiveIntensity: 0.5 }));
    this.homeLamp = this.lamp(-17, 14, 3.2, false);
    this.porchLamp = this.lamp(-10, 21.5, 3.4, true);
    this.homeLight = new THREE.PointLight('#ffbf75', 0, 14, 1.5); this.homeLight.position.set(-19, 2.8, 15); this.scene.add(this.homeLight);
    // A tiny stove remains the warm heart of the unpowered house.
    this.box(-23, 0.65, 12.3, 0.8, 1.3, 0.8, '#424d45');
    this.box(-23, 0.6, 12.72, 0.45, 0.3, 0.04, '#ffc473', this.scene, new THREE.MeshStandardMaterial({ color: '#f9a758', emissive: '#fba458', emissiveIntensity: 3 }));
    const fire = new THREE.PointLight('#ffb46b', 7, 6, 1.5); fire.position.set(-23, 0.8, 13); this.scene.add(fire);
    this.cylinder(-23, 2.3, 12.3, 0.09, 2.2, '#4e584c');
    this.radio = new THREE.Group(); this.radio.position.set(-19, 1.15, 11.4); this.scene.add(this.radio);
    this.box(0, 0, 0, 0.75, 0.4, 0.35, '#63796b', this.radio); this.cylinder(0.2, 0.5, 0, 0.018, 0.8, '#a4ad92', this.radio);
    this.stationIcon = this.marker(-21, 2.4, 13, '#e5bd7b');
    this.box(-14.5, 1.6, 12.2, 1.5, 1.4, 0.15, '#9b8763');
    for (const xx of [-14.9, -14.2]) this.box(xx, 1.65, 12.3, 0.45, 0.65, 0.02, '#d3c8a3').rotation.z = xx < -14.5 ? 0.12 : -0.08;
    this.solarRoof = new THREE.Group(); this.scene.add(this.solarRoof);
    for (let i = 0; i < 3; i++) {
      this.box(-22 + i * 3.3, 3.99, 11.5, 2.5, 0.12, 1.8, '#344b59', this.solarRoof);
      for (let j = 0; j < 4; j++) this.box(-23 + i * 3.3 + j * 0.65, 4.057, 11.5, 0.025, 0.012, 1.7, '#879990', this.solarRoof);
    }
  }
  buildMarket() {
    this.building(13, 4, 10, 8, 5, '#8b8974', 'ПРОДУКТЫ');
    this.building(15, 19, 11, 8, 6.3, '#747e72', 'ЖИЛОЙ ДОМ');
    this.building(29, 6, 9, 11, 7.2, '#78837a', 'АТЕЛЬЕ');
    this.box(14, 0.45, 7, 3, 0.7, 0.7, '#6e7465');
    for (let i = 0; i < 3; i++) this.box(14 + i * 0.9 - 0.9, 1.6, 0.8, 0.75, 2.3, 0.35, '#666e62');
    for (let z = 12; z < 17; z += 0.9) this.box(28, 1.15, z, 0.09, 2.3, 0.07, '#697b71');
    this.car(6.9, 15, -0.22, '#8e765a'); this.car(5.8, -4, 0.08, '#617b75');
    this.tree(24, 18, 1.5); this.tree(8, 25, 1.1); this.tree(29, -2, 1.3);
    this.lamp(8.1, 9.5, 4, true);
    // Faded awning, exposed brick and storefront planters.
    for (let i = 0; i < 8; i++) this.box(9.5 + i, 3.45, 8.5, 0.95, 0.08, 1.3, i % 2 ? '#8b8969' : '#596d5a').rotation.x = 0.12;
    for (let i = 0; i < 12; i++) this.box(8.5 + (i % 4) * 0.5, 0.5 + Math.floor(i / 4) * 0.23, 8.18, 0.46, 0.19, 0.035, i % 2 ? '#a08d70' : '#8d846d');
    for (const x of [8.4, 17.6]) { this.box(x, 0.3, 8.8, 0.7, 0.6, 0.7, '#8d7c5e'); this.bush(x, 8.8, 0.5).position.y = 0.8; }
    this.label('СТАРЫЙ КВАРТАЛ', 6.5, 2.1, 8.2, 3.2, '#cbbd9e'); this.box(6.5, 1.0, 8.1, 0.08, 2, 0.08, '#6f7564');
  }
  car(x, z, rotation, c) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; this.scene.add(group);
    this.box(0, 0.65, 0, 1.9, 0.6, 3.8, c, group); this.box(0, 1.2, -0.2, 1.75, 0.6, 1.8, c, group);
    this.box(0, 1.22, 0.73, 1.55, 0.4, 0.035, '#4c6964', group);
    for (const xx of [-0.95, 0.95]) for (const zz of [-1.15, 1.15]) { const tire = this.cylinder(xx, 0.4, zz, 0.38, 0.16, '#303b35', group); tire.rotation.z = Math.PI / 2; }
    this.box(0, 0.5, 1.94, 1.6, 0.16, 0.1, '#8f9786', group); this.collider(x, z, 2, 4); return group;
  }
  buildDepot() {
    this.building(-19, -25, 16, 12, 5.5, '#76857d', 'ДЕПО · 04');
    this.box(-12, 1.5, -14, 5, 3, 2.7, '#8a7155'); this.collider(-12, -14, 5, 2.7);
    for (let x = -14; x < -10; x += 0.5) this.box(x, 1.5, -12.6, 0.055, 2.8, 0.055, '#a29276');
    for (let i = 0; i < 4; i++) this.cylinder(-25 + i * 1.2, 0.6, -18, 0.4, 1.2, i % 2 ? '#7e775d' : '#65776d');
    for (const x of [-20, -17]) { this.box(x, 0.09, -31, 0.07, 0.1, 20, '#8d8c75'); }
    for (let z = -40; z < -20; z += 1) this.box(-18.5, 0.06, z, 4, 0.06, 0.18, '#615f4e');
    this.lamp(-9, -22, 5, false); this.tree(-29, -11, 1.5);
    this.label('ОСТОРОЖНО', -7.5, 2.0, -11, 2, '#d0b383', '#685f43'); this.box(-7.5, 0.9, -11.1, 0.07, 1.8, 0.07, '#77765f');
  }
  buildBridge() {
    this.box(-17, 0.035, -11, 22, 0.07, 2.2, '#344b48');
    this.bridgeGroup = new THREE.Group(); this.scene.add(this.bridgeGroup);
    for (let i = 0; i < 10; i++) this.box(-18 + i * 0.33, 0.2, -11, 0.28, 0.19, 4.2, '#998667', this.bridgeGroup);
    for (const zz of [-13, -9]) { this.box(-16.5, 0.85, zz, 3.4, 0.09, 0.09, '#b2a17b', this.bridgeGroup); }
    this.bridgeCollider = { x: -17, z: -11, w: 22, d: 2.2, bridge: true }; this.colliders.push(this.bridgeCollider);
  }
  buildPond() {
    const pondGeometry = new THREE.CircleGeometry(9.5, 64);
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, colorA: { value: new THREE.Color('#446b65') }, colorB: { value: new THREE.Color('#8ba79b') } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time;uniform vec3 colorA;uniform vec3 colorB;varying vec2 vUv;
        void main(){vec2 p=vUv*22.;float wave=sin(p.x*2.+p.y*.7+time*.65)*sin(p.y*3.-time*.4);float streak=pow(max(0.,sin(p.x*3.+p.y*4.+wave+time*.3)),18.);
        float edge=smoothstep(.5,.44,length(vUv-.5));vec3 c=mix(colorA,colorB,.35+wave*.12)+vec3(.22,.19,.12)*streak;gl_FragColor=vec4(c,edge*.94);}`,
      transparent: true, side: THREE.DoubleSide,
    });
    this.water = new THREE.Mesh(pondGeometry, this.waterMaterial); this.water.rotation.x = -Math.PI / 2; this.water.position.set(23, 0.055, -24); this.water.scale.set(1, 0.85, 1); this.scene.add(this.water);
    for (let x = 15; x < 21; x += 0.4) this.box(x, 0.25, -17, 0.34, 0.3, 2.3, '#8d8566');
    this.box(18, 0.09, -17, 6, 0.12, 0.13, '#647161');
    for (const xx of [15, 20.7]) for (const zz of [-16, -18]) this.cylinder(xx, 0.7, zz, 0.1, 1.4, '#787559');
    this.fishingMarker = this.marker(19.7, 0.9, -17, '#87c5be');
    this.tree(12, -21, 1.5); this.tree(29, -15, 1.25);
    for (let i = 0; i < 30; i++) {
      const angle = rng() * Math.PI * 2, r = 8.7 + rng();
      const x = 23 + Math.cos(angle) * r, z = -24 + Math.sin(angle) * r * 0.85;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rng() * 0.5), mat('#7e8774')); stone.position.set(x, 0.12, z); stone.scale.y = 0.55; this.scene.add(stone);
    }
    this.label('ЗАТОПЛЕННЫЙ ПРИЧАЛ', 13, 2.0, -14, 3.5, '#c7c4a6'); this.box(13, 0.9, -14.1, 0.07, 1.8, 0.07, '#77765f');
  }
  marker(x, y, z, c) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTexture(), color: c, transparent: true, opacity: 0.6, depthWrite: false }));
    sprite.position.set(x, y, z); sprite.scale.set(1.5, 1.5, 1); this.scene.add(sprite); return sprite;
  }
  buildGarden() {
    this.box(-34, 0.03, -5, 11, 0.07, 10, '#4e5941');
    for (const x of [-38, -30]) {
      for (const z of [-9, -1]) this.box(x, 1.5, z, 0.12, 3, 0.12, '#9c987c');
      this.box(x, 3, -5, 0.15, 0.15, 8.4, '#9c987c');
    }
    for (const z of [-9, -1]) this.box(-34, 3, z, 8.4, 0.15, 0.15, '#9c987c');
    for (const z of [-7, -3]) {
      this.box(-34, 0.2, z, 5, 0.4, 1.4, '#887757');
      this.box(-34, 0.42, z, 4.8, 0.05, 1.2, '#3d4631');
      for (let x = -36; x <= -32; x++) this.bush(x, z, 0.45);
    }
    this.label('ЗАБРОШЕННЫЙ САД', -34, 2.5, 0, 4, '#d7d8b3');
    this.lamp(-29, -4, 3.5, false);
  }
  buildTower() {
    const x = 31, z = -35;
    this.box(x, 0.1, z, 6, 0.2, 6, '#7f897b');
    for (const xx of [-1.6, 1.6]) for (const zz of [-1.6, 1.6]) this.box(x + xx, 3.1, z + zz, 0.2, 6.2, 0.2, '#667e77');
    this.cylinder(x, 6.7, z, 2.4, 2.7, '#84988b', this.scene, 16);
    this.cylinder(x, 8.2, z, 2.5, 0.18, '#596e62', this.scene, 16);
    for (let y = 0.7; y < 6.2; y += 0.4) this.box(x + 1.7, y, z + 1.9, 0.6, 0.05, 0.05, '#a8ae91');
    this.cylinder(x - 1.7, 1.3, z + 2.3, 0.12, 2.6, '#789289');
    this.box(30, 0.7, -31, 1.2, 1.4, 0.8, '#617b6f');
    this.towerIndicator = this.box(30, 1.1, -30.57, 0.22, 0.1, 0.04, '#8a6b53', this.scene, new THREE.MeshStandardMaterial({ color: '#a58664', emissive: '#a58664', emissiveIntensity: 0.3 }));
    this.towerLight = new THREE.PointLight('#8bcbc7', 0, 7, 1.5); this.towerLight.position.set(30, 1.7, -31); this.scene.add(this.towerLight);
    this.label('ВОДОНАПОРНАЯ БАШНЯ', 27, 2.2, -30, 4); this.box(27, 1, -30.1, 0.1, 2, 0.1, '#7c876d');
    this.collider(x, z, 4.3, 4.3);
  }
  createNodes() {
    const definitions = [
      ['scrap', 'Куча металлолома', -7, 17, { metal: 4, parts: 1 }],
      ['wood', 'Старые доски', -7, 10, { wood: 5 }],
      ['herbs', 'Дикие травы', -11, 25, { herbs: 3 }],
      ['wood', 'Доски у ограды', -27, 20, { wood: 5 }],
      ['herbs', 'Полевой сбор', -27, 9, { herbs: 3 }],
      ['crate', 'Хозяйственный ящик', 9, 5, { wood: 3, cloth: 3 }],
      ['electronics', 'Старый электрощит', 11.5, 1, { wire: 3, parts: 1 }],
      ['cloth', 'Забытая сумка', 16, 6, { cloth: 4, herbs: 1 }],
      ['scrap', 'Сломанная техника', 15, 2.5, { metal: 4, wire: 2 }],
      ['crate', 'Ящик на крыльце', 11, 15, { wood: 4, cloth: 2 }],
      ['electronics', 'Радиоприёмник', 17.5, 17, { parts: 2, wire: 2 }],
      ['cloth', 'Шкаф с одеждой', 13, 20, { cloth: 5 }],
      ['scrap', 'Разобранный мотор', 23, 4, { metal: 4, parts: 2 }],
      ['electronics', 'Щиток в ателье', 27, 2, { wire: 3, parts: 2 }],
      ['crate', 'Закрытый контейнер', 31, 8, { parts: 4, metal: 6, wire: 3 }, 'cutter'],
      ['wood', 'Сухая древесина', -6, -4, { wood: 5 }],
      ['tree', 'Поваленное дерево', -12, -5, { wood: 9 }, 'axe'],
      ['tree', 'Старый дуб', -29, 2, { wood: 10 }, 'axe'],
      ['ore', 'Металлическая жила', -27, -5, { metal: 8 }, 'pick'],
      ['scrap', 'Железнодорожный лом', -23, -15, { metal: 5, parts: 2 }],
      ['electronics', 'Технический щит', -21, -23, { wire: 4, parts: 3 }],
      ['crate', 'Запас ремонтной бригады', -14, -23, { metal: 6, parts: 4 }, 'cutter'],
      ['scrap', 'Старый генератор', -24, -27, { metal: 7, wire: 3, parts: 3 }],
      ['herbs', 'Прибрежные травы', 11, -16, { herbs: 4 }],
      ['wood', 'Выброшенные доски', 10, -10, { wood: 5 }],
      ['crate', 'Рыбацкий ящик', 17, -13, { cloth: 3, wire: 2 }],
      ['electronics', 'Щит у водонапорной башни', 27, -33, { wire: 4, parts: 3 }],
      ['crate', 'Запасы насосной станции', 35, -29, { metal: 6, parts: 4 }, 'cutter'],
      ['herbs', 'Травы у башни', 34, -24, { herbs: 4 }],
      ['crate', 'Семена в герметичном ящике', -36, -5, { seeds: 3, cloth: 2 }, 'cutter'],
      ['herbs', 'Уцелевшие посадки', -32, -5, { seeds: 2, herbs: 4 }],
      ['electronics', 'Система полива сада', -30, -9, { parts: 3, wire: 3 }],
      ['wood', 'Доски старой теплицы', -38, -2, { wood: 7 }],
    ];
    definitions.forEach(([type, name, x, z, loot, requires], i) => {
      const group = new THREE.Group(); group.position.set(x, 0.16, z); this.scene.add(group);
      if (type === 'crate') { this.crate(0, 0, 1, group); }
      else if (type === 'wood' || type === 'tree') {
        for (let j = 0; j < (type === 'tree' ? 4 : 3); j++) this.box(0, 0.13 + j * 0.17, j % 2 * 0.15, type === 'tree' ? 2.3 : 1.5, 0.15, 0.4, j % 2 ? '#9a8b61' : '#7c7655', group).rotation.y = j * 0.1;
      } else if (type === 'herbs') {
        for (let j = 0; j < 5; j++) { this.bush((j % 3 - 1) * 0.3, Math.floor(j / 3) * 0.3, 0.35, group); this.cylinder((j % 3 - 1) * 0.3, 0.5, Math.floor(j / 3) * 0.3, 0.04, 0.07, '#cbb898', group, 6); }
      } else if (type === 'electronics') {
        this.box(0, 0.6, 0, 0.9, 1.1, 0.6, '#64746a', group); this.box(0, 0.7, 0.32, 0.6, 0.45, 0.04, '#a5a081', group);
        for (let j = 0; j < 3; j++) this.box(-0.2 + j * 0.2, 0.7, 0.35, 0.05, 0.28, 0.02, '#837550', group);
      } else if (type === 'cloth') {
        this.box(0, 0.28, 0, 1, 0.45, 0.65, '#99957f', group); this.box(0, 0.4, 0, 0.12, 0.4, 0.67, '#5e695a', group);
      } else {
        for (let j = 0; j < 4; j++) this.box((rng() - 0.5) * 0.7, 0.2 + j * 0.12, (rng() - 0.5) * 0.6, 0.6 + rng() * 0.3, 0.25, 0.5, j % 2 ? '#7f897a' : '#626f67', group).rotation.y = rng() * 3;
      }
      const marker = this.marker(x, 1.5, z, type === 'herbs' ? '#a9c181' : '#e7c993');
      const node = { id: `node-${i}`, type, name, x, z, loot: { ...(this.state.nodeLoot[`node-${i}`] || loot) }, originalLoot: { ...loot }, requires, group, marker, respawnTime: type === 'herbs' ? 120 : 240 };
      group.traverse(mesh => { mesh.userData.node = node; if (mesh.isMesh) this.pickables.push(mesh); });
      this.nodes.push(node);
    });
  }
  createEnemies() {
    for (const [i, [x, z]] of [[8, -4], [26, 11], [-11, -18], [-22, -24]].entries()) {
      const group = new THREE.Group(); group.position.set(x, 1, z); this.scene.add(group);
      const core = this.box(0, 0, 0, 0.65, 0.35, 0.65, '#646f67', group);
      this.box(0, 0, 0.34, 0.35, 0.07, 0.05, '#e39b6b', group, new THREE.MeshStandardMaterial({ color: '#e39b6b', emissive: '#db7847', emissiveIntensity: 2 }));
      const deadAt = this.state.droneDeaths[`drone-${i}`] ?? -1;
      const enemy = { id: `drone-${i}`, x, z, originX: x, originZ: z, health: deadAt >= 0 && this.state.elapsed - deadAt < 180 ? 0 : 52, maxHealth: 52, group, core, cooldown: 0, deadAt, seed: rng() * 10 };
      group.traverse(mesh => { mesh.userData.enemy = enemy; if (mesh.isMesh) this.pickables.push(mesh); }); this.enemies.push(enemy);
    }
  }
  addDrop(drop) {
    const group = this.crate(drop.x, drop.z, 0.65);
    const marker = this.marker(drop.x, 1.2, drop.z, '#e7c993');
    const node = { ...drop, type: 'drop', name: 'Обломки охранного дрона', group, marker, loot: { ...drop.loot }, originalLoot: { ...drop.loot }, respawnTime: Infinity };
    group.traverse(mesh => { if (mesh.isMesh) { mesh.userData.node = node; this.pickables.push(mesh); } });
    this.nodes.push(node); return node;
  }
  createAtmosphere() {
    const geometry = new THREE.BufferGeometry(), positions = [], phases = [];
    for (let i = 0; i < 200; i++) { positions.push(rng() * 90 - 45, 0.5 + rng() * 6, rng() * 90 - 45); phases.push(rng() * 6.28); }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.motes = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#e4cba2', size: 0.09, map: this.glowTexture(), transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.motePhases = phases; this.moteOrigins = [...positions]; this.scene.add(this.motes);
    for (let i = 0; i < 17; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(15 + rng() * 16, 6 + rng() * 9), new THREE.MeshBasicMaterial({ map: this.glowTexture(), color: '#b3c4b9', transparent: true, opacity: 0.07, depthWrite: false }));
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(rng() * 85 - 42.5, 0.4 + rng(), rng() * 85 - 42.5); mesh.rotation.z = rng() * 3;
      mesh.userData.originX = mesh.position.x; mesh.userData.phase = rng() * 6; this.scene.add(mesh); this.fogs.push(mesh);
    }
    // Soft shafts catch the warm dusk light between the trees.
    for (let i = 0; i < 5; i++) {
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 16), new THREE.MeshBasicMaterial({ map: this.glowTexture(), color: '#ecd2a1', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      shaft.position.set(-24 + i * 7, 5, 9 + i * 2); shaft.rotation.set(0, -0.5, -0.5); this.scene.add(shaft);
    }
  }
  buildPlayer() {
    this.player = new THREE.Group(); this.player.position.set(this.state.x, 0.18, this.state.z); this.scene.add(this.player);
    this.playerVisual = new THREE.Group(); this.player.add(this.playerVisual);
    this.fallback = new THREE.Group(); this.playerVisual.add(this.fallback);
    this.cylinder(0, 0.75, 0, 0.26, 0.9, '#a9aa83', this.fallback);
    this.box(0, 1.42, 0, 0.4, 0.4, 0.4, '#c6b48b', this.fallback);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: '#172b25', transparent: true, opacity: 0.26, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.03; this.player.add(this.shadow);
    this.playerLight = new THREE.PointLight('#ffc585', 0, 9, 1.6); this.playerLight.position.set(0, 1.6, 0); this.player.add(this.playerLight);
    this.weaponRoot = new THREE.Group(); this.weaponRoot.position.set(0.4, 0.9, -0.2); this.playerVisual.add(this.weaponRoot);
  }
  async loadAssets(onProgress) {
    const loader = new GLTFLoader(); this.assets = {};
    const names = ['character', 'grass', 'grass-small', 'blaster', 'blaster-repeater', 'enemy-flying'];
    let completed = 0;
    await Promise.all(names.map(async name => {
      const folder = name === 'character' ? 'characters/' : ['grass', 'grass-small'].includes(name) ? 'nature/' : '';
      const source = globalThis.__quietAssets?.[name] || `/assets/models/${folder}${name}.glb`;
      const asset = await loader.loadAsync(source);
      this.assets[name] = asset; onProgress?.(++completed / names.length);
    }));
    this.fallback.visible = false;
    this.character = cloneSkeleton(this.assets.character.scene);
    const extras = []; this.character.traverse(object => { if (/^(Knife|Knife_Offhand|Throwable|1H_Crossbow|2H_Crossbow)$/.test(object.name)) extras.push(object); });
    for (const extra of extras) extra.parent?.remove(extra);
    const bounds = new THREE.Box3().setFromObject(this.character), size = bounds.getSize(new THREE.Vector3());
    const scale = 1.85 / size.y; this.character.scale.setScalar(scale); this.character.position.y = -bounds.min.y * scale;
    this.character.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    this.playerVisual.add(this.character);
    this.limbs = ['leg-left', 'leg-right', 'arm-left', 'arm-right'].map(name => this.character.getObjectByName(name)).filter(Boolean);
    if (this.assets.character.animations.length) {
      this.playerMixer = new THREE.AnimationMixer(this.character); this.mixers.push(this.playerMixer);
      this.actions = {};
      for (const original of this.assets.character.animations) {
        const clip = original.clone(); clip.tracks = clip.tracks.filter(track => !/^(Knife|Knife_Offhand|Throwable|1H_Crossbow|2H_Crossbow)\./.test(track.name));
        this.actions[clip.name.toLowerCase()] = this.playerMixer.clipAction(clip);
      }
      this.idleAction = this.actions.idle;
      this.walkAction = this.actions.walking_a || this.actions.running_a;
      this.runAction = this.actions.running_a;
      this.idleAction?.play(); this.walkAction?.play(); this.walkAction?.setEffectiveWeight(0);
      this.runAction?.play(); this.runAction?.setEffectiveWeight(0);
    }
    this.helperModel = cloneSkeleton(this.character);
    this.helperModel.position.set(-18, 0.18, 21); this.helperModel.rotation.y = Math.PI;
    this.helperModel.traverse(mesh => { if (mesh.isMesh) {
      mesh.material = mesh.material.clone(); mesh.material.color.multiply(new THREE.Color('#dbc3a0'));
    } });
    this.scene.add(this.helperModel);
    this.helperMixer = new THREE.AnimationMixer(this.helperModel);
    const helperClip = this.actions?.idle?.getClip();
    if (helperClip) { this.helperMixer.clipAction(helperClip).play(); this.mixers.push(this.helperMixer); }
    this.helperModel.visible = this.state.owned.includes('helper');
    const hand = this.character.getObjectByName('handslotr');
    if (hand) { hand.add(this.weaponRoot); this.weaponRoot.position.set(0, 0, 0); }
    for (const enemy of this.enemies) {
      enemy.group.children.slice().forEach(child => { if (child.isMesh) { const index = this.pickables.indexOf(child); if (index >= 0) this.pickables.splice(index, 1); } enemy.group.remove(child); });
      const model = this.assets['enemy-flying'].scene.clone();
      const b = new THREE.Box3().setFromObject(model), s = b.getSize(new THREE.Vector3()); model.scale.setScalar(1.2 / Math.max(s.x, s.y, s.z));
      enemy.group.add(model); model.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.userData.enemy = enemy; this.pickables.push(mesh); } });
    }
    // Use downloaded vegetation meshes as instanced ground cover.
    for (const name of ['grass', 'grass-small']) {
      const source = this.assets[name].scene;
      source.traverse(child => {
        if (!child.isMesh) return;
        source.updateMatrixWorld(true);
        const geometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
        const instances = new THREE.InstancedMesh(geometry, child.material, 300);
        const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
        let used = 0;
        for (let i = 0; i < 900 && used < 300; i++) {
          const x = rng() * 86 - 43, z = rng() * 86 - 43;
          if (Math.abs(x) < 4.5 || Math.abs(z - 3) < 3.4 || this.blocked(x, z, 1) || (x > -25 && x < -8 && z > 10 && z < 20)) continue;
          p.set(x, 0.02, z); quaternion.setFromAxisAngle(Y, rng() * 6.28); s.setScalar(0.7 + rng() * 0.6); matrix.compose(p, quaternion, s); instances.setMatrixAt(used++, matrix);
        }
        instances.count = used; instances.receiveShadow = true; this.scene.add(instances);
      });
    }
    this.updateEquipment();
  }
  updateEquipment() {
    this.renderDirty = true;
    this.weaponRoot.clear(); const id = this.state.equipment.weapon;
    if (id === 'pistol' || id === 'carbine') {
      if (!this.assets) return;
      const model = this.assets[id === 'pistol' ? 'blaster' : 'blaster-repeater'].scene.clone();
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()); model.scale.setScalar(0.8 / Math.max(size.x, size.y, size.z)); this.weaponRoot.add(model);
    } else { const pipe = this.cylinder(0, 0, -0.3, id === 'spear' ? 0.04 : 0.06, id === 'spear' ? 1.8 : 0.8, '#b2b8a0', this.weaponRoot, 6); pipe.rotation.x = 0.7; }
    this.playerLight.intensity = this.state.owned.includes('lantern') && this.state.lanternOn !== false ? 3.5 : 0;
  }
  playCharacterAction(name) {
    const action = this.actions?.[name]; if (!action || action === this.idleAction || action === this.walkAction) return;
    this.oneShot?.action.stop();
    action.reset().setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.setEffectiveWeight(1).play();
    this.oneShot = { action, remaining: Math.min(action.getClip().duration, 1.8) };
  }
  applyProgress() {
    this.renderDirty = true;
    if (this.helperModel) this.helperModel.visible = this.state.owned.includes('helper');
    const powered = this.state.owned.includes('generator');
    this.homeLight.intensity = powered ? 25 : 0;
    this.homeLamp.light.intensity = powered ? 13 : 0; this.homeLamp.glow.material.emissiveIntensity = powered ? 3 : 0; this.homeLamp.spill.material.opacity = powered ? 0.18 : 0;
    this.genIndicator.material.color.set(powered ? '#a9cc83' : '#b1664d'); this.genIndicator.material.emissive.set(powered ? '#a9cc83' : '#b1664d');
    this.bridgeGroup.visible = this.state.owned.includes('bridge');
    this.bridgeCollider.disabled = this.bridgeGroup.visible;
    this.solarRoof.visible = this.state.owned.includes('solar');
    const water = this.state.owned.includes('pump'); this.towerLight.intensity = water ? 7 : 0;
    this.towerIndicator.material.emissive.set(water ? '#8ccac2' : '#a58664'); this.towerIndicator.material.emissiveIntensity = water ? 2.5 : 0.3;
    this.syncNodes();
  }
  syncNodes() {
    for (const node of this.nodes) {
      const time = this.state.depleted[node.id];
      const visible = time === undefined || this.state.elapsed - time >= node.respawnTime;
      if (visible && !node.group.visible) { node.loot = { ...node.originalLoot }; delete this.state.nodeLoot[node.id]; }
      node.group.visible = visible; node.marker.visible = visible;
    }
  }
  blocked(x, z, radius = 0.3) {
    if (x < -43 || x > 43 || z < -43 || z > 43) return true;
    // Pond shoreline; dock remains navigable.
    if (Math.pow((x - 23) / 9, 2) + Math.pow((z + 24) / 7.4, 2) < 1 && !(x < 21.5 && z > -18.1)) return true;
    return this.colliders.some(c => !c.disabled && Math.abs(x - c.x) < c.w / 2 + radius && Math.abs(z - c.z) < c.d / 2 + radius);
  }
  move(x, z) {
    if (!this.blocked(x, this.state.z)) this.state.x = x;
    if (!this.blocked(this.state.x, z)) this.state.z = z;
    this.player.position.set(this.state.x, 0.18, this.state.z);
  }
  pathTo(x, z) {
    // Grid A* routes around cars, walls and the water rather than walking into them.
    const sx = Math.round(this.state.x), sz = Math.round(this.state.z);
    const key = (x, z) => `${x},${z}`;
    let gx = Math.round(x), gz = Math.round(z);
    if (this.blocked(gx, gz)) {
      let best = null;
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
        const cx = gx + dx, cz = gz + dz, d = Math.hypot(cx - x, cz - z);
        if (!this.blocked(cx, cz) && (!best || d < best.d)) best = { x: cx, z: cz, d };
      }
      if (!best) return []; gx = best.x; gz = best.z;
    }
    const open = [{ x: sx, z: sz, g: 0, f: Math.hypot(gx - sx, gz - sz) }], costs = new Map([[key(sx, sz), 0]]), came = new Map(), closed = new Set();
    let target = null, iterations = 0;
    while (open.length && iterations++ < 8000) {
      let index = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[index].f) index = i;
      const node = open.splice(index, 1)[0], nk = key(node.x, node.z);
      if (closed.has(nk)) continue; closed.add(nk);
      if (node.x === gx && node.z === gz) { target = nk; break; }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = node.x + dx, nz = node.z + dz, nextKey = key(nx, nz);
        if (this.blocked(nx, nz) || (dx && dz && (this.blocked(node.x + dx, node.z) || this.blocked(node.x, node.z + dz)))) continue;
        const cost = node.g + Math.hypot(dx, dz);
        if (cost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, cost); came.set(nextKey, nk); open.push({ x: nx, z: nz, g: cost, f: cost + Math.hypot(gx - nx, gz - nz) });
      }
    }
    if (!target) return [];
    const path = [];
    while (target !== key(sx, sz)) { const [x, z] = target.split(',').map(Number); path.unshift({ x, z }); target = came.get(target); if (!target) return []; }
    return path;
  }
  pointer(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect(); this.mouse.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const point = new THREE.Vector3(); this.raycaster.ray.intersectPlane(this.plane, point);
    const intersections = this.raycaster.intersectObjects(this.pickables, false);
    const hit = intersections.find(i => {
      let parent = i.object; while (parent) { if (!parent.visible) return false; parent = parent.parent; } return true;
    });
    return { point, node: hit?.object.userData.node, enemy: hit?.object.userData.enemy };
  }
  screenPosition(x, y, z) {
    const p = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.container.clientWidth, y: (-p.y * 0.5 + 0.5) * this.container.clientHeight };
  }
  setDestination(x, z) { this.destination.position.set(x, 0.1, z); this.destination.visible = true; }
  addPlaced(item) {
    const group = this.makeFurniture(item.id); group.position.set(item.x, 0.24, item.z); group.rotation.y = item.rotation; this.scene.add(group);
    this.placedGroups.push({ item, group }); return group;
  }
  makeFurniture(id, ghost = false) {
    const group = new THREE.Group();
    if (id === 'lamp') {
      this.lamp(0, 0, 3, !ghost, group);
    } else if (['garden', 'seedbed'].includes(id)) {
      this.box(0, 0.2, 0, 2, 0.4, 1.6, '#8c7a55', group); this.box(0, 0.42, 0, 1.8, 0.06, 1.4, '#4a4b34', group);
      for (let i = 0; i < 6; i++) {
        const plant = this.bush((i % 3 - 1) * 0.5, (Math.floor(i / 3) - 0.5) * 0.6, 0.27, group);
        plant.position.y = 0.56; plant.userData.gardenPlant = true;
      }
    } else if (id === 'chest') this.crate(0, 0, 1.25, group);
    else if (id === 'bed') {
      this.box(0, 0.25, 0, 1.5, 0.35, 2.3, '#756f54', group); this.box(0, 0.5, 0.2, 1.5, 0.25, 1.8, '#a4ae91', group); this.box(0, 0.64, -0.7, 1.2, 0.15, 0.55, '#d6cab0', group);
    } else if (id === 'sofa') {
      this.box(0, 0.45, 0, 2.3, 0.7, 1, '#9e8f69', group); this.box(0, 0.9, -0.4, 2.3, 0.8, 0.25, '#8f825f', group);
      for (const x of [-1, 1]) this.box(x, 0.8, 0, 0.3, 0.6, 1.2, '#9e8f69', group);
      this.box(0.4, 0.9, -0.15, 0.45, 0.45, 0.2, '#b7ac89', group);
    } else if (id === 'planter') { this.cylinder(0, 0.3, 0, 0.4, 0.6, '#ad8867', group); for (let i = 0; i < 5; i++) this.bush(Math.cos(i) * 0.25, Math.sin(i) * 0.25, 0.43, group).position.y = 0.7; }
    else if (id === 'rug') this.box(0, 0.015, 0, 2.2, 0.035, 1.6, '#aa825c', group);
    else if (id === 'purifier') {
      this.cylinder(-0.4, 0.7, 0, 0.4, 1.4, '#617e76', group); this.cylinder(0.5, 0.5, 0, 0.35, 1, '#8b9f8b', group);
      this.box(0, 1.15, 0, 1, 0.12, 0.12, '#a0b9aa', group); this.box(-0.4, 0.75, 0.42, 0.2, 0.65, 0.03, '#77aaa9', group);
    } else if (id === 'recycler') {
      this.box(0, 0.6, 0, 1.6, 1.2, 1.2, '#667d6b', group); this.box(0, 1.3, 0, 1.2, 0.2, 1, '#9a9c7a', group);
      this.cylinder(0.4, 0.65, 0.63, 0.3, 0.1, '#b8b49a', group, 10).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) this.box(-0.4, 0.4 + i * 0.2, 0.62, 0.35, 0.055, 0.04, '#384f45', group);
    }
    if (ghost) group.traverse(mesh => { if (mesh.isMesh) { mesh.material = mesh.material.clone(); mesh.material.transparent = true; mesh.material.opacity = 0.5; mesh.castShadow = false; } });
    return group;
  }
  createGhost(id) { this.removeGhost(); this.ghost = this.makeFurniture(id, true); this.scene.add(this.ghost); return this.ghost; }
  removeGhost() {
    if (this.ghost) {
      const descendants = new Set(); this.ghost.traverse(child => { descendants.add(child); if (child.isMesh) { child.geometry.dispose(); if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose(); } });
      this.lights = this.lights.filter(entry => !descendants.has(entry.light));
      this.scene.remove(this.ghost); this.ghost = null;
    }
  }
  floatingText(text, x, z, c = '#e6cc98', icons = []) {
    this.floating.push({ text, x, z, icons, color: c, life: 1.6, y: 1.6 });
  }
  impact(x, y, z, color = '#ffca7a', scale = 1) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sprite.position.set(x, y, z); sprite.scale.setScalar(scale); this.scene.add(sprite);
    this.effects ||= []; this.effects.push({ mesh: sprite, life: 0.3, max: 0.3 });
  }
  shot(x, z, tx, tz) {
    const points = [new THREE.Vector3(x, 1.15, z), new THREE.Vector3(tx, 1.1, tz)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#ffe0a1', transparent: true, opacity: 1 }));
    this.scene.add(line); this.effects ||= []; this.effects.push({ mesh: line, life: 0.15, max: 0.15 }); this.impact(tx, 1.1, tz);
  }
  update(dt, moving, focus = true) {
    this.time += dt;
    const player = this.player;
    if (focus) {
      const desired = new THREE.Vector3(this.state.x + 1, 0, this.state.z - 1);
      this.cameraCenter.lerp(desired, 1 - Math.exp(-dt * 5));
    } else {
      this.cameraCenter.lerp(new THREE.Vector3(-12, 0, 13), 1 - Math.exp(-dt * 1.5));
    }
    this.camera.position.copy(this.cameraCenter).add(new THREE.Vector3(27, 33, 31)); this.camera.lookAt(this.cameraCenter);

    if (this.oneShot) { this.oneShot.remaining -= dt; if (this.oneShot.remaining <= 0) { this.oneShot.action.stop(); this.oneShot = null; } }
    if (this.walkAction) {
      const busy = !!this.oneShot, running = moving && this.running;
      const blend = 1 - Math.exp(-dt * 14);
      const weight = (action, target) => action?.setEffectiveWeight(THREE.MathUtils.lerp(action.getEffectiveWeight(), target, blend));
      weight(this.walkAction, moving && !running ? 1 : 0); weight(this.runAction, running ? 1 : 0);
      this.walkAction.setEffectiveTimeScale(Math.max(0.45, (this.moveSpeed || 0) / 4.1));
      this.runAction?.setEffectiveTimeScale(Math.max(0.6, (this.moveSpeed || 0) / 6.765));
      weight(this.idleAction, !moving && !busy ? 1 : 0);
      if (this.oneShot) this.oneShot.action.setEffectiveWeight(moving ? 0.5 : 1);
    }
    for (const mixer of this.mixers) mixer.update(dt);
    if (Number.isFinite(this.facing)) {
      const delta = Math.atan2(Math.sin(this.facing - this.playerVisual.rotation.y), Math.cos(this.facing - this.playerVisual.rotation.y));
      this.playerVisual.rotation.y += delta * (1 - Math.exp(-dt * 18));
    }
    if (!this.walkAction && this.character) this.character.position.y = moving ? Math.sin(this.time * 12) * 0.07 : Math.sin(this.time * 2) * 0.015;
    if (!this.walkAction) for (let i = 0; i < (this.limbs?.length || 0); i++) {
      const target = moving ? Math.sin(this.time * 10 + (i % 2) * Math.PI) * (i < 2 ? 0.4 : -0.25) : 0;
      this.limbs[i].rotation.x = THREE.MathUtils.lerp(this.limbs[i].rotation.x, target, Math.min(1, dt * 12));
    }
    this.waterMaterial.uniforms.time.value = this.time;
    this.reflection.material.uniforms.time.value = this.time;
    for (const fog of this.fogs) fog.position.x = fog.userData.originX + Math.sin(this.time * 0.035 + fog.userData.phase) * 4;
    const pos = this.motes.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { pos.setX(i, this.moteOrigins[i * 3] + Math.sin(this.time * 0.16 + this.motePhases[i]) * 0.6); pos.setY(i, this.moteOrigins[i * 3 + 1] + Math.sin(this.time * 0.25 + this.motePhases[i]) * 0.4); }
    pos.needsUpdate = true;
    for (const enemy of this.enemies) { enemy.group.position.set(enemy.x, 1.2 + Math.sin(this.time * 2 + enemy.seed) * 0.13, enemy.z); enemy.group.visible = enemy.health > 0; }
    this.stationIcon.material.opacity = 0.4 + Math.sin(this.time * 2) * 0.14;
    for (const { item, group } of this.placedGroups) if (['garden', 'seedbed'].includes(item.id)) {
      const growth = 0.4 + Math.min(1, Math.max(0, (this.state.elapsed - item.harvested) / productionInfo(this.state, item).interval)) * 0.6;
      group.traverse(mesh => { if (mesh.userData.gardenPlant) mesh.scale.set(1.4 * growth, 0.8 * growth, 1.1 * growth); });
    }
    this.fishingMarker.material.opacity = 0.45 + Math.sin(this.time * 1.5) * 0.15;
    for (const node of this.nodes) if (node.marker.visible) node.marker.position.y = 1.45 + Math.sin(this.time * 1.8 + node.x) * 0.12;
    for (const f of this.floating) { f.life -= dt; f.y += dt * 0.65; } this.floating = this.floating.filter(f => f.life > 0);
    for (const effect of this.effects || []) {
      effect.life -= dt; effect.mesh.material.opacity = Math.max(0, effect.life / effect.max);
      if (effect.life <= 0) { this.scene.remove(effect.mesh); effect.mesh.geometry?.dispose(); effect.mesh.material.dispose(); }
    }
    this.effects = (this.effects || []).filter(e => e.life > 0);
    this.grade.uniforms.time.value = this.time;
    const night = (Math.sin(this.state.elapsed / 240 + 0.9) + 1) / 2;
    this.sun.intensity = 1.3 + night * 1.7; this.ambient.intensity = 1.55 + night * 0.55;
    this.scene.fog.density = 0.016 + (1 - night) * 0.005;
    this.player.visible = focus;
    this.renderDirty = false;
    if (this.state.settings.quality === 'low') this.renderer.render(this.scene, this.camera); else this.composer.render();
  }
  resize() {
    this.renderDirty = true;
    const width = this.container.clientWidth, height = this.container.clientHeight, aspect = width / height;
    this.camera.left = -this.viewSize * aspect / 2; this.camera.right = this.viewSize * aspect / 2; this.camera.top = this.viewSize / 2; this.camera.bottom = -this.viewSize / 2; this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height); this.composer.setSize(width, height);
  }
  zoom(delta) { this.viewSize = THREE.MathUtils.clamp(this.viewSize + delta * 0.025, 23, 52); this.resize(); }
  setQuality(quality) { this.state.settings.quality = quality; this.renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.7)); this.renderer.shadowMap.enabled = quality !== 'low'; if (this.reflection) this.reflection.visible = quality !== 'low'; this.resize(); }
  location() { return LOCATIONS.reduce((best, location) => Math.hypot(this.state.x - location.x, this.state.z - location.z) < Math.hypot(this.state.x - best.x, this.state.z - best.z) ? location : best); }
}
