import {STRUCTURES,buildAllowed,closedRooms,structureColliders} from './construction.js';
import {SpatialIndex} from './spatial.js';
import {DistrictReflections} from './reflections.js';
import {DRONE_TYPES,segmentHitsRect} from './survival.js';
import {gridPath} from './navigation.js';
import { GATES, gateForPoint, weatherAt } from './expedition.js';
import { FINDS, MEMORIES, SCENES,RESOURCE_SITES, machineKind, cropInfo } from './homelife.js';
import { LOCATIONS, ROADS, WORLD_LIMIT, cycleLoot } from './district.js';
export { LOCATIONS } from './district.js';
import { circleHitsRect, footprint, solidFootprint, placementAllowed, repairFurniture } from './layout.js';
import { isInsideBuilding, fadeOpacity } from './roofs.js';
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

const rand = seed => { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; };
const rng = rand(1472);
const overlapsPlayer=(item,state)=>item.id!=='rug'&&!['wallclock','fishtrophy','wallshelf'].includes(item.id) && circleHitsRect(state.x,state.z,.4,footprint(item));
const Y = new THREE.Vector3(0, 1, 0);
const color = { ground: '#384339', road: '#3a4546', wall: '#77796c', rust: '#785b47', wood: '#766a50', leaf: '#546e4e', dark: '#283b39', cream: '#b3aa89', orange: '#f4bb77' };
const materials = new Map();
const mat = (c, roughness = 0.88, metalness = 0) => {
  const id = c + roughness + metalness;
  if (!materials.has(id)) materials.set(id, new THREE.MeshStandardMaterial({ color: c, roughness, metalness }));
  return materials.get(id);
};


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
    this.canopies=[];this.mirrors=null;this.gates=[];this.memories=MEMORIES;this.buildings = []; this.colliders = [];this.collisionIndex=new SpatialIndex();this.shelterIndex=new SpatialIndex(); this.nodes = []; this.enemies = []; this.floating = []; this.lights = [];
    this.pickables = []; this.fogs = []; this.mixers = []; this.placedGroups = [];
    this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(Y, 0); this.time = 0;
    this.buildWorld(); this.batchStaticGeometry(); this.buildPlayer(); this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.applyProgress();this.rebuildConstruction();
    for (const drop of state.drops) this.addDrop(drop);
  }
  batchStaticGeometry() {
    this.scene.updateMatrixWorld(true);
    const batches = new Map();
    const excluded = new Set([this.genIndicator, this.towerIndicator, this.water, this.destination, this.selectionRing,
      this.homeLamp.glow, this.homeLamp.spill, ...this.lights.flatMap(l => [l.glow, l.spill].filter(Boolean))]);
    this.scene.traverse(mesh => {
      if (mesh.userData.cutaway || mesh.userData.resourceStump || mesh.isInstancedMesh || !mesh.isMesh || excluded.has(mesh) || this.pickables.includes(mesh) || mesh.material.isShaderMaterial || mesh.material.transparent) return;
      let parent = mesh;
      while (parent) { if (this.gates.some(g=>g.group===parent) || parent === this.bridgeGroup || parent === this.solarRoof || parent === this.precisionTool || parent === this.receiverModel) return; parent = parent.parent; }
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
  collider(x, z, w, d, rotation = 0) { const rect={x,z,w,d,rotation}; this.colliders.push(rect);this.collisionIndex.add(rect);return rect; }
  wall(x,z,w,d,h,shade,parent=this.scene) { const mesh=this.box(x,h/2,z,w,h,d,shade,parent); const p=parent.position; this.collider(x+p.x,z+p.z,w,d); return mesh; }
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
  lamp(x, z, height = 4.5, powered = true, parent = this.scene, mounted = false) {
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    if (!mounted) { this.cylinder(0, height / 2, 0, 0.055, height, '#3c4945', group, 6); if(parent===this.scene) this.collider(x,z,.14,.14); }
    else this.box(0,height-.15,-.15,.12,.3,.35,'#3c4945',group);
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
    const ground = this.box(0, -0.22, 0, 140, 0.4, 140, color.ground);
    ground.material = new THREE.MeshStandardMaterial({ map: this.texture('ground'), roughness: 0.96 });
    const roadMaterial=new THREE.MeshStandardMaterial({map:this.texture('road'),roughness:.6,metalness:.12});
    for(const r of ROADS) this.box(r.x,.015,r.z,r.w,.04,r.d,color.road).material=roadMaterial;
    for (let z = -39; z < 41; z += 7) this.box(0, 0.048, z, 0.09, 0.008, 2.1, '#a19b7c');
    for (const x of [-4.25, 4.25]) { this.box(x, 0.1, 0, 0.4, 0.18, 126, '#777b70'); }
    for (let z = -34; z < 35; z += 14) this.lamp(z % 3 ? -4.3 : 4.3, z, 5.2, z > -10);
    this.mirrors=new DistrictReflections(this);this.reflection=this.mirrors.capture;
    for (let i = 0; i < 19; i++) this.puddle(rng() * 7 - 3.5, rng() * 78 - 39, 0.9 + rng() * 2.5, 0.5 + rng());
    this.mirrors.surface(-.8,17,2.5,1.15);this.mirrors.surface(-18,23,2,1);
    this.buildHome(); this.buildMarket(); this.buildDepot(); this.furnishExpeditions(); this.buildOutskirts(); this.buildScenes(); this.buildExpandedDistrict(); this.buildNewQuarter(); this.buildDeepDistrict(); this.buildPond(); this.buildTower();
    // Treelines frame the district, leaving the traversable paths readable.
    for (let i = 0; i < 180; i++) {
      const x = rng() * 126 - 63, z = rng() * 126 - 63;
      if (Math.hypot(x + 34, z + 5) < 8) continue;
      if (this.onRoad(x,z,1.5) || this.blocked(x, z, 2) || this.buildings.some(b=>isInsideBuilding({...b,w:b.w+2,d:b.d+2},x,z))) continue;
      if (Math.hypot(x + 17, z - 16) < 13 || Math.hypot(x - 20, z + 20) < 12) continue;
      this.tree(x, z, 0.75 + rng() * 0.7);
    }
    for (let i = 0; i < 100; i++) {
      const x = rng() * 124 - 62, z = rng() * 124 - 62;
      if (this.onRoad(x,z,1) || this.blocked(x, z, 1) || this.buildings.some(b=>isInsideBuilding(b,x,z))) continue;
      this.bush(x, z, 0.3 + rng() * 0.5);
    }
    this.buildGarden();
    this.createNodes(); this.createEnemies(); this.createAtmosphere(); this.buildBridge();
    this.wetMaterials=[ground.material,roadMaterial];for(const material of this.wetMaterials)material.userData.dryRoughness=material.roughness;
    this.destination = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.37, 32), new THREE.MeshBasicMaterial({ color: '#ecd4a0', transparent: true, opacity: 0.6, depthWrite: false }));
    this.destination.rotation.x = -Math.PI / 2; this.destination.position.y = 0.1; this.destination.visible = false; this.scene.add(this.destination);
    this.selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.85, 40), new THREE.MeshBasicMaterial({ color: '#eacb8c', transparent: true, opacity: 0.75, depthWrite: false }));
    this.selectionRing.rotation.x = -Math.PI / 2; this.selectionRing.position.y = 0.12; this.selectionRing.visible = false; this.scene.add(this.selectionRing);
  }
  puddle(x, z, w, d) {
    if(this.mirrors)return this.mirrors.surface(x,z,w,d);
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
  createRoof(x,z,w,d,h,shade,pitch=.22,style='gable') {
    const group = new THREE.Group(); group.position.set(x,0,z); this.scene.add(group);
    if(style==='hip') {
      const hw=(w+.9)/2,hd=(d+.8)/2,ridge=Math.max(0,(w-d)/2),rise=hd*Math.tan(pitch),points=[[-hw,h,-hd],[hw,h,-hd],[hw,h,hd],[-hw,h,hd],[-ridge,h+rise,0],[ridge,h+rise,0]],faces=ridge>0?[[0,1,5],[0,5,4],[2,3,4],[2,4,5],[3,0,4],[1,2,5]]:[[0,1,4],[1,2,4],[2,3,4],[3,0,4]];
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(faces.flatMap(f=>[...f].reverse().flatMap(i=>points[i])),3));geo.computeVertexNormals();
      const top=new THREE.Mesh(geo,mat(shade));top.castShadow=true;top.receiveShadow=true;group.add(top);
      this.box(0,h-.04,0,w+.5,.08,d+.4,shade,group);return group;
    }
    const angle = pitch, half = (d+0.8)/2;
    for (const side of [-1,1]) {
      const roof = this.box(0,h+half*Math.tan(angle)/2+0.1,side*half/2,w+0.9,0.18,half/Math.cos(angle),shade,group);
      roof.rotation.x = side*angle;
      for(let xx=-w/2;xx<=w/2;xx+=1.2) {
        const seam=this.box(xx,roof.position.y+0.11,roof.position.z,0.035,0.025,half/Math.cos(angle),'#91a298',group); seam.rotation.x=roof.rotation.x;
      }
    }
    for(const xx of [-w/2,w/2]) {
      const rise=half*Math.tan(angle), vertices=[];
      for(const offset of [-.1,.1]) vertices.push(xx+offset,h,-half, xx+offset,h,half, xx+offset,h+rise,0);
      const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1,0,0,1,0,.5,1],2));
      geometry.setIndex([0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5]); geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,mat(shade)); mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh);
    }
    group.updateMatrixWorld(true);
    const batches=new Map();
    for(const mesh of [...group.children]) {
      const key=mesh.material.uuid;
      if(!batches.has(key)) batches.set(key,{material:mesh.material,parts:[],meshes:[]});
      const batch=batches.get(key); batch.parts.push(mesh.geometry.clone().applyMatrix4(mesh.matrix)); batch.meshes.push(mesh);
    }
    for(const batch of batches.values()) {
      const geometry=mergeGeometries(batch.parts); batch.parts.forEach(p=>p.dispose());
      if(!geometry) continue;
      for(const mesh of batch.meshes) { group.remove(mesh); mesh.geometry.dispose(); }
      const merged=new THREE.Mesh(geometry,batch.material); merged.castShadow=true; merged.receiveShadow=true; group.add(merged);
    }
    return group;
  }
  registerBuilding(x,z,w,d,roof,structures,h=3.6) {
    const roofMeshes=[], wallMeshes=[], copies=new Map();
    const mark=(mesh,list)=>{
      if(!mesh.isMesh) return;
      mesh.userData.cutaway=true;
      const key=`${list===roofMeshes?'roof':'wall'}:${mesh.material.uuid}`;
      if(!copies.has(key)) {const copy=mesh.material.clone();copy.userData.baseOpacity=mesh.material.opacity;copies.set(key,copy);}
      mesh.material=copies.get(key);
      mesh.material.transparent=true; mesh.material.depthWrite=false; mesh.renderOrder=2;
      list.push(mesh);
    };
    roof.traverse(mesh=>mark(mesh,roofMeshes));
    for(const object of structures) object.traverse(mesh=>{
      if(mesh.isMesh && (mesh===object || mesh.position.y>0.8 || object===this.solarRoof)) mark(mesh,wallMeshes);
    });
    const batches=new Map(), mergedWalls=[];
    for(const mesh of wallMeshes) {
      mesh.updateMatrix();
      const key=`${mesh.parent.uuid}:${mesh.material.uuid}`;
      if(!batches.has(key)) batches.set(key,[]); batches.get(key).push(mesh);
    }
    for(const meshes of batches.values()) {
      if(meshes.length===1) { mergedWalls.push(meshes[0]); continue; }
      const parts=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrix)), geometry=mergeGeometries(parts);
      parts.forEach(p=>p.dispose());
      if(!geometry) { mergedWalls.push(...meshes); continue; }
      const parent=meshes[0].parent, merged=new THREE.Mesh(geometry,meshes[0].material);
      merged.userData.cutaway=true; merged.castShadow=true; merged.receiveShadow=true; merged.renderOrder=2;
      for(const mesh of meshes) { parent.remove(mesh); mesh.geometry.dispose(); }
      parent.add(merged); mergedWalls.push(merged);
    }
    wallMeshes.splice(0,wallMeshes.length,...mergedWalls);
    const building={x,z,w,d,roofMeshes,wallMeshes,inside:isInsideBuilding({x,z,w,d},this.state.x,this.state.z)};
    for(const mesh of roofMeshes) { mesh.material.opacity=building.inside?0.035:mesh.material.userData.baseOpacity; mesh.material.depthWrite=!building.inside&&mesh.material.opacity>.98; }
    for(const mesh of wallMeshes) { mesh.material.opacity=building.inside?0.13:mesh.material.userData.baseOpacity; mesh.material.depthWrite=!building.inside&&mesh.material.opacity>.98; }
    const detailStart=building.wallMeshes.length;
    for(const xOffset of [-w*.3,w*.3]){const frame=new THREE.Group();frame.position.set(x+xOffset,0,z+d/2+.2);this.scene.add(frame);
      this.cutawayDetail(this.box(0,Math.min(1.3,h*.45),-.04,1.06,.94,.02,'#3e5350',frame),building);
      for(const [xx,yy,ww,hh]of [[-.53,Math.min(1.3,h*.45),.08,.95],[.53,Math.min(1.3,h*.45),.08,.95],[0,Math.min(1.3,h*.45)-.5,1.14,.08],[0,Math.min(1.3,h*.45)+.5,1.14,.08],[0,Math.min(1.3,h*.45),.05,.95]])this.cutawayDetail(this.box(xx,yy,0,ww,hh,.055,'#b1ab91',frame),building);
      this.cutawayDetail(this.box(0,Math.min(1.3,h*.45)-.53,.055,1.3,.09,.16,'#b1ab91',frame),building);
    }
    const doorHeight=Math.min(2.1,h*.7);
    for(const offset of [-w*.1+.035,w*.1-.035])this.cutawayDetail(this.box(x+offset,doorHeight/2,z+d/2+.13,.09,doorHeight,.12,'#b1ab91'),building);
    this.cutawayDetail(this.box(x,doorHeight,z+d/2+.13,w*.2+.14,.12,.12,'#b1ab91'),building);
    if(roofMeshes.every(m=>(m.material.userData.baseOpacity??1)>.8)){const shade=wallMeshes.find(m=>m.material.color)?.material.color.getHexString()||'77796c';this.cutawayDetail(this.box(x,(h+doorHeight)/2,z+d/2,w*.2,h-doorHeight,.3,'#'+shade),building);}
    this.mergeBuildingDetails(building,detailStart);
    this.buildings.push(building);this.shelterIndex.add(building,.25);
  }
  mergeBuildingDetails(building,start){
    const meshes=building.wallMeshes.splice(start),colors=new Set(meshes.map(m=>m.material.color.getHexString())),batches=new Map();for(let i=building.wallMeshes.length-1;i>=0;i--){const m=building.wallMeshes[i];let parent=m,animated=false;while(parent){if(parent===this.solarRoof)animated=true;parent=parent.parent;}if(!animated&&!m.material.map&&!m.userData.canopyBounds&&(m.material.userData.baseOpacity??1)===1&&colors.has(m.material.color.getHexString()))meshes.push(...building.wallMeshes.splice(i,1));}this.scene.updateMatrixWorld(true);
    for(const m of meshes){const key=m.material.color.getHexString();if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);}
    for(const group of batches.values()){const parts=group.map(m=>m.geometry.clone().applyMatrix4(m.matrixWorld)),geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry){building.wallMeshes.push(...group);continue;}const material=group[0].material;for(const m of group){m.parent.remove(m);m.geometry.dispose();if(m.material!==material)m.material.dispose();}const merged=new THREE.Mesh(geometry,material);merged.userData.cutaway=true;merged.renderOrder=2;material.opacity=building.inside?.13:1;material.depthWrite=!building.inside;merged.castShadow=!building.inside;merged.receiveShadow=true;this.scene.add(merged);building.wallMeshes.push(merged);}
  }
  updateRoofs(dt) {
    for(const b of this.buildings) {
      b.inside=isInsideBuilding(b,this.state.x,this.state.z);
      const updated=new Set();
      for(const [meshes,target] of [[b.roofMeshes,b.inside?0.035:1],[b.wallMeshes,b.inside?0.13:1]]) {
        for(const mesh of meshes) {
          const canopy=mesh.userData.canopyBounds,under=b.inside||canopy&&isInsideBuilding(canopy,this.state.x,this.state.z);
          if(!updated.has(mesh.material)) { mesh.material.opacity=fadeOpacity(mesh.material.opacity,under?(canopy?.035:target):(mesh.material.userData.baseOpacity??1),dt); mesh.material.depthWrite=mesh.material.opacity>.98; updated.add(mesh.material); }
          mesh.castShadow=!under&&(mesh.material.userData.baseOpacity??1)>.8;
        }
      }
    }
  }
  building(x, z, w, d, h, shade, sign, options={}) {
    const group = new THREE.Group(); group.position.set(x, 0, z); this.scene.add(group);
    this.box(0, 0.09, 0, w + 0.3, 0.2, d + 0.3, '#77786d', group);
    const wallHeight=options.greenhouse?.6:h;
    this.wall(0,-d/2,w,.32,wallHeight,shade,group);
    this.wall(-w/2,0,.32,d,wallHeight,shade,group);
    this.wall(w/2,0,.32,d,wallHeight,shade,group);
    this.wall(-w*.3,d/2,w*.4,.32,wallHeight,shade,group);
    this.wall(w*.3,d/2,w*.4,.32,wallHeight,shade,group);
    if(!options.greenhouse) for (let xx = -w / 2 + 1.4; xx < w / 2 - 0.5; xx += 2.8) {
      this.box(xx, h * 0.65, -d / 2 + 0.18, 1.2, 1.35, 0.05, '#3e5350', group);
      this.box(xx, h * 0.65, -d / 2 + 0.24, 0.07, 1.4, 0.07, '#b1ab91', group);
      this.box(xx, h * 0.65, -d / 2 + 0.24, 1.25, 0.07, 0.07, '#b1ab91', group);
    }

    if(options.greenhouse) {
      const glass=new THREE.MeshStandardMaterial({color:'#b0ccb8',roughness:.18,metalness:.12,transparent:true,opacity:.35,depthWrite:false});
      for(const [xx,zz,ww,dd] of [[0,-d/2,w,.035],[-w/2,0,.035,d],[w/2,0,.035,d],[-w*.3,d/2,w*.4,.035],[w*.3,d/2,w*.4,.035]]) this.box(xx,(h+.6)/2,zz,ww,h-.6,dd,'#b0ccb8',group,glass);
      for(const xx of [-w/2,-w/4,0,w/4,w/2]) this.box(xx,h/2,-d/2,.1,h,.12,'#6d8177',group);
      for(const xx of [-w/2,-w*.1,w*.1,w/2]) this.box(xx,h/2,d/2,.1,h,.12,'#6d8177',group);
      for(const xx of [-w/2,w/2]) {this.box(xx,h/2,0,.12,h,.1,'#6d8177',group);this.box(xx,h-.1,0,.12,.12,d,'#6d8177',group);}
      this.box(0,h-.1,-d/2,w,.12,.12,'#6d8177',group);
    }
    this.box(0, h - 0.2, d / 2, w + 0.3, 0.18, 0.65, '#6f7567', group);
    if(sign){const plaque=this.label(sign,0,h-.55,d/2+(options.signOffset??.24),w*.73,'#ccbe98','#46594c',group);plaque.scale.y=Math.min(1,.65/(w*.73/4));}
    for (let i = 0; i < 8; i++) this.box(rng() * (w - 1) - w / 2 + 0.5, 0.255, rng() * (d - 1) - d / 2 + 0.5, 0.2 + rng() * 0.35, 0.13, 0.2 + rng() * 0.35, '#8b8975', group);
    const roof = this.createRoof(x,z,w,d,h,options.greenhouse?'#9ab7a6':options.roofColor||'#566d65',options.pitch??.22,options.roofStyle||'gable');
    if(options.greenhouse) roof.traverse(mesh=>{if(mesh.isMesh&&mesh.material.color.getHexString()==='9ab7a6') {mesh.material=mesh.material.clone();mesh.material.opacity=.5;mesh.material.transparent=true;}});
    this.registerBuilding(x,z,w,d,roof,[group],h);
    return group;
  }
  buildHome() {
    const x = -18, z = 15;
    this.box(x, 0.09, z, 12, 0.2, 9, '#827b63');
    // Exterior shell and movement share the same wall dimensions.
    const backWall = this.wall(x,z-4.5,12,.25,3.6,'#8c8d76');
    const sideWall = this.wall(x-6,z,.25,9,3.6,'#777c6b');
    const frontWalls=[this.wall(-21.6,19.5,4.8,.25,3.6,'#8c8d76'),this.wall(-14.4,19.5,4.8,.25,3.6,'#8c8d76')];
    const rightWalls=[this.wall(-12,12.65,.25,4.3,3.6,'#777c6b'),this.wall(-12,18.35,.25,2.3,3.6,'#777c6b')];
    for (let xx = -23; xx < -12; xx += 1) this.box(xx, 0.205, z, 0.04, 0.015, 9, '#655f4e');
    this.homeRoof = this.createRoof(x,z,12,9,3.6,'#4a6056');
    // Roof beams, worn paint and climbing plants give the cutaway shelter a lived-in silhouette.
    for (const xx of [-23.8, -18, -12.2]) this.box(xx, 2, 10.6, 0.14, 3.6, 0.2, '#66725e');
    this.box(-18, 1.25, 10.67, 11.5, 0.035, 0.035, '#a6a27f');
    for (let i = 0; i < 12; i++) {
      const leaf = this.bush(-23.75 + rng() * 0.25, 10.8 + rng() * 1.5, 0.2 + rng() * 0.15);
      leaf.position.y = 1 + rng() * 2.2;
    }
    for(const xx of [-21.4,-14.6]) this.wall(xx,20.6,4.4,.22,.8,'#6e7868');
    // Entrance gap and garden border.
    for(const [zz,length] of [[13,11],[23.5,2]]) this.wall(-8.7,zz,.18,length,.6,'#5b6858');
    for (const zz of [8,10,12,14,16,18.5,21.5,24]) this.box(-8.7, 0.75, zz, 0.22, 1.5, 0.22, '#7c7b60');
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
    this.homeLamp = this.lamp(-18, 10.85, 3.2, false, this.scene, true);
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
    this.solarRoof.position.set(-18,3.6+.1+(4.9-3.1)*Math.tan(.22)+.18,11.9); this.solarRoof.rotation.x=-.22;
    for (let i = 0; i < 3; i++) {
      this.box(-3.3 + i * 3.3, 0, 0, 2.5, 0.12, 1.8, '#344b59', this.solarRoof);
      for (let j = 0; j < 4; j++) this.box(-4.3 + i * 3.3 + j * .65, .067, 0, .025, .012, 1.7, '#879990', this.solarRoof);
    }
    for(const [xx,zz,ww,dd] of [[-21,13,2.8,1.25],[-13.5,17,1.2,1.2],[-13.6,15.5,.8,.8],[-22,17.7,2.3,1.35],[-23.25,15.6,.6,1.2],[-23,12.3,.8,.8],[-11,11.4,1.5,1.1],[-20,19,.86,.86]]) this.collider(xx,zz,ww,dd);
    this.precisionTool=new THREE.Group();this.precisionTool.position.set(-20.35,1.16,13);this.scene.add(this.precisionTool);this.box(0,.18,0,.6,.35,.5,'#8ba19a',this.precisionTool);this.cylinder(0,.5,0,.035,.35,'#d6c7a3',this.precisionTool);
    this.receiverModel=new THREE.Group();this.receiverModel.position.set(-13.5,1.08,17);this.scene.add(this.receiverModel);this.box(0,.45,0,.8,.9,.65,'#7c8874',this.receiverModel);this.box(0,.95,0,.6,.1,.5,'#b7ab7d',this.receiverModel);
    this.registerBuilding(x,z,12,9,this.homeRoof,[backWall,sideWall,...frontWalls,...rightWalls,this.solarRoof]);
  }
  buildMarket() {
    this.building(13, 4, 10, 8, 5, '#8b8974', 'ПРОДУКТЫ');
    this.building(15, 19, 11, 8, 6.3, '#747e72', 'ЖИЛОЙ ДОМ',{roofStyle:'hip',pitch:.3});
    this.box(11, -.01, 24.2, 1.8, .07, 1.7, '#8c866c');
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
  buildScenes() {
    // A bus shelter faces the street; the narrow roof covers the bench only.
    for(const x of [7,11]) {this.box(x,1.3,37,.12,2.6,.12,'#6e7c70');this.collider(x,37,.12,.12);}
    this.box(9,2.65,37,4.5,.13,1.1,'#788477');this.box(8.5,.6,36.7,2.6,.16,.55,'#9b8965');this.collider(8.5,36.7,2.6,.55);
    for(const x of [7.6,9.4])this.box(x,.28,36.7,.12,.56,.45,'#607160');
    this.label('ОСТАНОВКА · 12',9,2.3,37.15,3);
    this.box(-27,.025,32.5,2.2,.045,1.5,'#aa8f78');
    for(const x of [-30.8,-29.2])this.box(x,.35,32,.15,.7,.8,'#66745e');this.box(-30,.78,32,2.2,.15,1.2,'#9c8963');this.collider(-30,32,2.2,1.2);
    for(const x of [-27.4,-26.8])this.cylinder(x,.14,32.2,.08,.14,'#c6bea3');
    this.box(52,.5,22,2,1,1,'#817b62');this.collider(52,22,2,1);
    this.cylinder(54.5,.55,23.5,.4,1.1,'#6e8274');this.collider(54.5,23.5,.8,.8);
    for(const n of MEMORIES) {const h=n.id==='bus'?.7:n.id==='yard'?1.01:n.id==='salvage'?.21:.065;this.box(n.x,h,n.z,.3,.012,.23,'#e0d6b8');}
  }
  buildExpandedDistrict() {
    // Three silhouettes: a low timber hut, a tall factory and a house with veranda.
    this.building(27,50,8,7,3.1,'#8d8163','РЫБАЦКИЙ ДОМ',{pitch:.36,roofColor:'#778773'});
    for(const x of [23.3,30.7])for(let y=.6;y<3;y+=.4)this.box(x,y,50,.12,.06,6.7,'#baa27a');
    this.canopy(27,54.8,9,2.5,2.65,'#a59b75');
    this.box(27,.025,54.8,9,.05,2.5,'#8a8163');
    this.box(24.5,.7,49,1.5,1.4,.7,'#978267');this.collider(24.5,49,1.5,.7);
    this.box(30,.45,50,1.1,.9,1.6,'#797d64');this.collider(30,50,1.1,1.6);
    this.building(51,-50,14,10,6.4,'#6e817c','СКЛАД ТЕХНИКИ',{pitch:.07,roofColor:'#83928b',signOffset:.4});
    for(const x of [44.3,47.5,54.5,57.7])this.box(x,3.2,-44.78,.18,6.4,.18,'#b6aa83');
    for(const x of [47.5,54.5])this.box(x,2.8,-44.76,2.5,1.1,.06,'#b6c4ae');
    this.building(40.5,-50,5,7,3,'#8c8a71','',{pitch:.3,roofColor:'#7f745e'});
    this.canopy(43,-48,2,4,2.8,'#6e8177');
    this.box(55,1,-53,2,2,1,'#798773');this.collider(55,-53,2,1);
    this.building(-44,56,10,10,4.6,'#9d9480','СТАРЫЙ ДВОР',{pitch:.3,roofColor:'#847d68',roofStyle:'hip'});
    this.canopy(-44,62.1,12,2.4,3.3,'#a39575');
    this.box(-44,.025,62.1,12,.05,2.4,'#8b8268');
    // Shutters, a chimney and an asymmetric lean-to distinguish the residence.
    for(const x of [-47.5,-40.5])this.cutawayDetail(this.box(x,2.5,61.2,1.8,1.4,.1,'#70897e'),this.buildings.at(-1));
    this.cutawayDetail(this.box(-46.5,5.15,55,1,2.8,1,'#b19d7e'),this.buildings.at(-1),true);
    this.box(-51,1,56,2,2,3,'#8f8b72');this.collider(-51,56,2,3);
    const shed=this.box(-51,2.2,56,2.4,.13,3.4,'#736f5a');shed.rotation.z=.12;
    for(const z of [53.5,56.5]) {this.box(-36,.2,z,3,.4,1.3,'#8f7e55');for(const x of [-37,-36,-35])this.bush(x,z,.3);}
    for(const x of [-49,-39]) {this.box(x,1.5,48,.12,3,.12,'#827861');this.collider(x,48,.12,.12);}
    this.box(-44,2.6,48,10,.04,.04,'#b8b09b');for(const x of [-47,-45,-42])this.box(x,2,48,.8,1,.035,'#c5bf9f');
    // A living space with a separate bedroom, hearth and kitchen counter.
    const residence=this.buildings.at(-1);
    const partition=this.wall(-42.5,57,.18,3,2.8,'#a99a7d');partition.material=partition.material.clone();partition.material.transparent=true;partition.material.userData.baseOpacity=1;partition.userData.cutaway=true;residence.wallMeshes.push(partition);
    this.box(-47.8,.6,54.5,1.2,1.2,2,'#928267');this.collider(-47.8,54.5,1.2,2);this.box(-47.8,1.25,54.5,1.3,.1,2.1,'#b7aa8b');
    this.cylinder(-47.8,1.36,54,.25,.08,'#526960');this.cylinder(-47.8,1.41,54,.13,.06,'#c1b090');
    this.box(-48.4,.9,58,.7,1.8,1.2,'#7f7966');this.collider(-48.4,58,.7,1.2);this.box(-48,1.05,58,.035,.55,.75,'#394b43');
    this.box(-40.5,.4,58.1,1.5,.5,2.1,'#817653');this.box(-40.5,.73,58.1,1.5,.16,2.1,'#b4baa1');this.box(-40.5,.85,57.4,1.2,.1,.5,'#d2c8ad');this.collider(-40.5,58.1,1.5,2.1);
    // Net and oars hang above the hut floor, away from the approach to the rod.
    for(const x of [25,25.7]){const oar=this.box(x,1.65,46.78,.07,2.4,.07,'#bc9b6b');oar.rotation.z=.15;this.box(x+.14,2.8,46.78,.23,.4,.07,'#b2996b');}
    for(let x=28.5;x<30.8;x+=.3)this.box(x,1.8,46.8,.025,1.4,.025,'#a4b095');
    for(let y=1.2;y<2.5;y+=.25)this.box(29.5,y,46.8,2.3,.025,.025,'#a4b095');
    this.box(56,.5,-49,2.2,1,1.4,'#978765');this.collider(56,-49,2.2,1.4);for(const x of [55.3,56,56.7])this.box(x,1.1,-49,.55,.2,1.3,'#b6a77b');
    this.box(39,.65,-51.5,1.4,1.3,1,'#7e8979');this.collider(39,-51.5,1.4,1);
    // Existing places gain recognizable silhouettes without changing their doors.
    this.canopy(-49,37.6,6,1.8,2.8,'#abb2a0');
    this.cutawayDetail(this.box(-53,4.8,31,1.1,2.2,1.1,'#b9b3a0'),this.buildings.find(b=>b.x===-49),true);
    this.cutawayDetail(this.box(31.7,8.1,4,.8,2.4,.8,'#a79174'),this.buildings.find(b=>b.x===29),true);
    this.canopy(51,18.2,10,2.1,3.2,'#74827b');
    for(const gate of GATES) {
      const group=new THREE.Group();group.position.set(gate.x,0,gate.z);this.scene.add(group);
      if(gate.kind){for(let i=0;i<4;i++){const plank=this.box(0,.14+i*.2,(i%2-.5)*.22,gate.w-.08,.2,.34,gate.kind==='boards'?'#a48962':'#7e928b',group);plank.rotation.y=(i%2?.06:-.06);}if(gate.kind==='metal')for(const x of [-1,1])this.box(x,.65,0,.12,1.3,.6,'#a79d7d',group);}
      else this.box(0,1.1,0,gate.w,2.2,.14,'#7c8270',group);
      if(!gate.kind&&gate.tool==='cutter')for(let x=-.6;x<=.6;x+=.3)this.box(x,1.1,.12,.23,.07,.06,'#bcae81',group);
      else if(!gate.kind){this.box(0,1.1,.12,1.5,.13,.08,'#a99b75',group);for(const x of [-.6,.6])this.cylinder(x,1.1,.2,.08,.08,'#b2bda4',group,8).rotation.x=Math.PI/2;}
      this.gates.push({...gate,group,collider:this.collider(gate.x,gate.z,gate.w,gate.d)});
    }
    this.syncGates();
  }
  cutawayDetail(mesh,building,roof=false) {
    mesh.material=mesh.material.clone();mesh.material.transparent=true;mesh.material.userData.baseOpacity=1;mesh.userData.cutaway=true;(roof?building.roofMeshes:building.wallMeshes).push(mesh);return mesh;
  }
  canopy(x,z,w,d,h,color) {
    const roof=this.box(x,h,z,w,.12,d,color);
    roof.material=roof.material.clone();roof.material.transparent=true;roof.material.userData.baseOpacity=1;roof.userData.cutaway=true;
    const b=this.buildings.reduce((best,b)=>Math.hypot(b.x-x,b.z-z)<Math.hypot(best.x-x,best.z-z)?b:best);roof.userData.canopyBounds={x,z,w,d};this.canopies.push(roof.userData.canopyBounds);this.shelterIndex.add(roof.userData.canopyBounds,.25);b.roofMeshes.push(roof);
    for(const xx of [x-w/2+.12,x+w/2-.12]) {this.box(xx,h/2,z+d/2-.12,.14,h,.14,color);this.collider(xx,z+d/2-.12,.14,.14);}
  }
  sheltered(x,z) {return [...this.shelterIndex.query(x,z)].some(b=>isInsideBuilding(b,x,z));}
  syncGates() {for(const g of this.gates){const opened=this.state.openedGates.includes(g.id);g.group.visible=!opened;g.collider.disabled=opened;}this.renderDirty=true;}
  createReeds(){
    this.reedBases=[];
    for(const [x,z,rx,rz]of [[23,-24,10,8.5],[30,59,7.5,4.3]])for(let i=0;i<18;i++){const a=i*.35;const xx=x+Math.cos(a)*rx,zz=z+Math.sin(a)*rz;if(this.blocked(xx,zz,.2)||this.onRoad(xx,zz,.4))continue;for(let j=0;j<3;j++)this.reedBases.push({x:xx+Math.sin(j*2)*.22,z:zz+Math.cos(j*2)*.22,h:.6+(i%4)*.12,phase:i+j});}
    this.reedStems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.026,1,5),mat('#829771'),this.reedBases.length);
    this.reedHeads=new THREE.InstancedMesh(new THREE.CylinderGeometry(.055,.045,.23,6),mat('#a5966c'),this.reedBases.length);this.scene.add(this.reedStems,this.reedHeads);this.reedStems.frustumCulled=this.reedHeads.frustumCulled=false;this.updateReeds(true);
  }
  updateReeds(force=false){
    if(!this.reedStems||!force&&(this.time-(this.reedTime||0)<.1||![[23,-24],[30,59]].some(([x,z])=>Math.hypot(x-this.state.x,z-this.state.z)<25)))return;
    this.reedTime=this.time;const obj=new THREE.Object3D(),q=new THREE.Quaternion(),axis=new THREE.Vector3(0,0,1),tip=new THREE.Vector3();
    this.reedBases.forEach((b,i)=>{q.setFromAxisAngle(axis,Math.sin(this.time*.85+b.phase)*.075);obj.quaternion.copy(q);obj.position.set(b.x,.06+b.h/2,b.z);obj.scale.set(1,b.h,1);obj.updateMatrix();this.reedStems.setMatrixAt(i,obj.matrix);tip.set(0,b.h/2,0).applyQuaternion(q);obj.position.add(tip);obj.scale.set(1,1,1);obj.updateMatrix();this.reedHeads.setMatrixAt(i,obj.matrix);});this.reedStems.instanceMatrix.needsUpdate=this.reedHeads.instanceMatrix.needsUpdate=true;
  }
  createRain() {
    const count=240,positions=new Float32Array(count*6);this.rainSeeds=[];
    for(let i=0;i<count;i++)this.rainSeeds.push([rng()*34-17,rng()*34-17,rng()*10]);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.rain=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#b0c4be',transparent:true,opacity:0,depthWrite:false}));this.rain.frustumCulled=false;this.scene.add(this.rain);
    const rippleGeo=new THREE.RingGeometry(.12,.15,12);rippleGeo.rotateX(-Math.PI/2);
    this.rainRipples=new THREE.InstancedMesh(rippleGeo,new THREE.MeshBasicMaterial({color:'#b6ccc1',transparent:true,opacity:0,depthWrite:false}),20);this.rainRipples.frustumCulled=false;this.scene.add(this.rainRipples);
  }
  updateRain(dt,weather) {
    const strength=weather.rain;for(const material of this.wetMaterials||[])material.roughness=material.userData.dryRoughness-strength*.24;
    if(strength<=.01){this.rain.visible=false;this.rainRipples.visible=false;return;}
    this.rain.visible=strength>.01;this.rain.material.opacity=strength*.25;
    const p=this.rain.geometry.attributes.position;
    for(let i=0;i<this.rainSeeds.length;i++){const [dx,dz,phase]=this.rainSeeds[i],x=this.state.x+dx,z=this.state.z+dz,y=((phase-this.time*8)%10+10)%10;const inside=this.sheltered(x,z);p.setXYZ(i*2,x,y,z);p.setXYZ(i*2+1,x+.08,inside?y:y+.55,z+.04);if(inside)p.setXYZ(i*2+1,x,y,z);}
    p.needsUpdate=true;this.rainRipples.visible=strength>.01;this.rainRipples.material.opacity=strength*.3;
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3();
    for(let i=0;i<20;i++){const back=i>=10,t=(this.time*.6+i*.117)%1,angle=i*2.4,x=(back?30:23)+Math.sin(angle)*(back?5:6),z=(back?59:-24)+Math.cos(angle)*(back?2.3:4.5);matrix.compose(v.set(x,.065,z),q,new THREE.Vector3(1+t*4,1,1+t*4));this.rainRipples.setMatrixAt(i,matrix);}this.rainRipples.instanceMatrix.needsUpdate=true;
    for(const material of this.wetMaterials||[])material.roughness=material.userData.dryRoughness-strength*.24;
  }
  partition(building,x,z,w,d,h=2.8) {
    const mesh=this.wall(x,z,w,d,h,'#999780');this.cutawayDetail(mesh,building);return mesh;
  }
  buildDeepDistrict() {
    this.building(49,-25,10,8,3.7,'#849b91','НАСОСНАЯ',{pitch:.09,roofColor:'#657f79',signOffset:.3});
    const pump=this.buildings.at(-1);pump.ambience='water';for(const [x,h]of [[47.5,.8],[48.7,1.2],[50.3,.6]])this.cutawayDetail(this.box(x,.5+h/2,-28.86,.22,h,.012,'#607b69'),pump);this.canopy(49,-19.8,11,2.2,2.9,'#8a9b8d');
    this.partition(pump,49,-26,6,.18,2.8);const feed=this.cylinder(49,1.5,-28.5,.09,6,'#89a39b');feed.rotation.z=Math.PI/2;this.cutawayDetail(feed,pump);for(const x of [47,50])this.cutawayDetail(this.box(x,1.45,-28.68,.1,.3,.4,'#657c71'),pump);
    this.box(46,.65,-27.8,1.2,1.3,1.1,'#678f87');this.collider(46,-27.8,1.2,1.1);
    for(const x of [46.5,49.5]){this.cylinder(x,.62,-25,.28,.9,'#78998e');this.box(x,.3,-25,1,.18,1,'#697e73');this.collider(x,-25,1,1);}
    this.box(52,.75,-27.3,1.1,1.5,.8,'#9dac97');this.collider(52,-27.3,1.1,.8);
    const basin=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.5),new THREE.MeshStandardMaterial({color:'#638c83',transparent:true,opacity:.65,roughness:.12,metalness:.35}));basin.rotation.x=-Math.PI/2;basin.position.set(52,.202,-25);this.scene.add(basin);
    for(const z of [-27.5,-23.5]){this.box(53.65,.36,z,.12,.3,2.3,'#687c68');this.box(53.5,.205,z,.25,.02,2.4,'#45594c');}
    this.building(-15,-48,13,10,4.7,'#8c8a78','ГАРАЖ БРИГАДЫ',{pitch:.12,roofStyle:'hip',roofColor:'#756f5e',signOffset:.35});
    const garage=this.buildings.at(-1);garage.ambience='metal';for(const x of [-19.5,-18])this.cutawayDetail(this.box(x,2,-42.86,.16,.7,.012,'#80684c'),garage);this.canopy(-15,-41.8,14,2.4,3.3,'#9c9475');
    for(const x of [-19,-11]){this.box(x,.4,-49,1.8,.8,3.8,'#6c7d70');this.collider(x,-49,1.8,3.8);this.box(x,.87,-49,1.9,.14,3.9,'#a3ab8d');}
    this.box(-15,.21,-49,2.2,.025,4.5,'#45594f');for(const x of [-16.25,-13.75])this.box(x,.25,-49,.12,.1,4.6,'#ad9b75');
    this.box(-19.2,.8,-44.8,2,1.6,.8,'#978369');this.collider(-19.2,-44.8,2,.8);
    for(const x of [-20.8,-9.2]){const rack=this.box(x,2,-48,.12,3.6,.25,'#a59b79');this.cutawayDetail(rack,garage);}
    for(const [z,d,h,shade,pitch]of [[50,8,3.3,'#b19a7d',.38],[59,6,3,'#8d9a89',.28]]){
      this.building(10,z,8,d,h,shade,z===50?'ДОМ С КУХНЕЙ':'ШВЕЙНЫЙ ДОМ',{pitch,roofStyle:z===50?'gable':'hip',roofColor:z===50?'#86755e':'#657f71'});const b=this.buildings.at(-1);b.ambience='room';
      this.partition(b,11.5,z-1,.15,2.6,2.5);this.canopy(10,z+d/2+.9,9,1.8,2.4,shade);
      if(z===50){this.box(7.1,.7,48,1.2,1.4,1.5,'#91856e');this.collider(7.1,48,1.2,1.5);this.box(8.4,.8,51.5,1.5,.14,1,'#b2a07b');this.collider(8.4,51.5,1.5,1);for(const x of [7.82,8.98])for(const z of [51.15,51.85])this.box(x,.46,z,.09,.54,.09,'#857456');for(const x of [8,8.7])this.cylinder(x,.95,51.5,.09,.16,'#d2c6aa');}
      else {this.box(7.4,.75,60,1.6,.15,1,'#b7a17d');this.collider(7.4,60,1.6,1);for(const x of [6.76,8.04])for(const zz of [59.65,60.35])this.box(x,.44,zz,.09,.5,.09,'#857456');this.box(7.3,1,60,.55,.4,.35,'#607c6e');this.box(12.7,.45,61.5,1,.9,1.6,'#7f8e79');this.collider(12.7,61.5,1,1.6);}
    }
    // Both fences can be walked around. Opening their gates keeps the direct route clear.
    for(const [x,z,left,right]of [[-15,-37,-24,-6],[49,-16,42,56]]){
      for(const [a,b]of [[left,x-1.5],[x+1.5,right]]){this.wall((a+b)/2,z,b-a,.16,1,'#7d876c');for(let xx=a;xx<=b;xx+=2)this.box(xx,.7,z,.15,1.4,.18,'#a19778');}
    }
    this.lamp(42,-18,3.6,true);this.lamp(-6,-39,3.7,true);this.lamp(4.8,56,3.2,true);
    for(const [x,z,w,d]of [[44,-18,1.5,.8],[-12,-39,2,1],[13,56,1.6,.7]])this.mirrors.surface(x,z,w,d);
    for(const [x,z]of [[46,-20.7],[-10,-42.6],[6.3,49]]){this.box(x,.215,z,.7,.012,.5,'#6c705d');this.box(x+.2,.22,z+.15,.15,.018,.18,'#a39774');}
  }
  ambience() {const b=this.buildings.find(b=>isInsideBuilding(b,this.state.x,this.state.z));if(!b)return 'outside';return b.ambience||'room';}
  buildNewQuarter() {
    this.building(26,36,12,8,3.8,'#a09579','КАФЕ У САДА',{roofStyle:'hip',pitch:.34,signOffset:.3});
    const cafe=this.buildings.at(-1);this.canopy(26,41.1,13,2.2,2.9,'#a59170');this.box(26,.025,41.1,13,.05,2.2,'#928667');
    this.partition(cafe,28.5,34.5,.18,3.8);this.box(30.5,.7,34.5,2.2,1.4,2,'#7d897b');this.collider(30.5,34.5,2.2,2);
    this.box(30.5,1.46,34.5,2.3,.12,2.1,'#b8b59f');this.cylinder(30.1,1.58,34.5,.23,.1,'#475a50');
    for(const z of [34.5,38]){this.box(23,.76,z,1.5,.14,1.2,'#ac966f');this.collider(23,z,1.5,1.2);for(const x of [21.8,24.2]){this.box(x,.4,z,.6,.12,.7,'#87947b');this.box(x,.95,z-.28,.6,1,.12,'#87947b');this.collider(x,z,.6,.7);}}
    this.building(-52,-20,8,10,5.4,'#718685','ПОДСТАНЦИЯ',{pitch:.06,roofColor:'#9ba49b',signOffset:.35});
    const station=this.buildings.at(-1);this.partition(station,-52.92,-21,5.84,.18,3.8);
    // A clear door-sized break on the eastern side connects the switch room.
    for(const x of [-54.5,-52.5]){this.box(x,1.2,-23,1,2.4,1.2,'#7a9086');this.collider(x,-23,1,1.2);this.box(x,1.7,-22.36,.6,.2,.04,'#c9b77e');}
    this.canopy(-52,-13.9,9,2.2,3.2,'#718581');
    this.lamp(-46.5,-14,3.8,true);this.lamp(19.5,42,3.7,true);
    const clinic=this.buildings.find(b=>b.x===-49);this.partition(clinic,-48,32,.16,3,2.5);
    const residence=this.buildings.find(b=>b.x===15);this.partition(residence,18,18.5,.16,3,2.8);
    this.box(11.6,.7,18.5,1.3,1.4,1.2,'#8f826b');this.collider(11.6,18.5,1.3,1.2);this.box(11.6,1.46,18.5,1.4,.12,1.3,'#b9ac8b');
    for(const [x,z,w,d]of [[19,38,2,1],[-47,-16,2.4,1.2],[24,43,2.2,.8],[-12,20.5,1.5,.7]])this.mirrors.surface(x,z,w,d);
  }
  buildOutskirts() {
    this.building(-49,32,10,9,4.6,'#92978a','КЛИНИКА');
    this.building(51,12,14,10,4.8,'#74857e','РЕМОНТ ТЕХНИКИ');
    this.building(-42,-44,10,8,3.3,'#7d9a89','ОРАНЖЕРЕЯ',{greenhouse:true});
    // Beds and washstand tell the clinic's story without map instructions.
    for(const z of [30,34]) {
      this.box(-50,.4,z,2.1,.5,1.2,'#6f8078');this.box(-50,.72,z,2.1,.16,1.2,'#bcb8a0');
      this.box(-50.7,.87,z,.5,.15,1.1,'#d3cdb6');this.collider(-50,z,2.1,1.2);
    }
    this.box(-45.5,.7,34,1,1.4,.6,'#8d9991');this.collider(-45.5,34,1,.6);
    this.box(-45.5,1.45,34,1.1,.12,.7,'#c0c2ad');
    this.label('ПЕРЕВЯЗОЧНАЯ',-49,3,27.7,3.7);
    // A covered service yard, spare tyres and work tables keep entrances clear.
    this.box(46.5,.7,9,2,1.4,1,'#8c846c');this.collider(46.5,9,2,1);
    this.box(54,1,15,2.2,2,1,'#667770');this.collider(54,15,2.2,1);
    for(const z of [20,22]) {this.cylinder(57,.3,z,.45,.6,'#3b4844');this.collider(57,z,.9,.9);}
    this.car(49,25,.12,'#8a826f');
    this.lamp(42.5,21,4,true);this.lamp(-40,39,3.6,true);
    // Raised beds and surviving foliage grow along the greenhouse sides.
    for(const x of [-45.3,-38.7]) {
      this.box(x,.45,-44,1.2,.9,3.4,'#889178');this.collider(x,-44,1.2,3.4);
      for(const z of [-45.1,-44,-42.9]) {const plant=this.bush(x,z,.5);plant.position.y=.95;}
    }
    this.box(-42,.4,-47.1,2,.8,.7,'#87997b');this.collider(-42,-47.1,2,.7);
    this.label('СЕМЕННОЙ ФОНД',-42,2.2,-47.8,3);
    // Physical signs stand beside the paths; they do not set a destination.
    for(const [x,z,text] of [[-39,25,'КЛИНИКА'],[40,-4,'РЕМОНТ'],[-33,-34,'ОРАНЖЕРЕЯ']]) {
      this.box(x,1,z,.12,2,.12,'#7d8069');this.label(text,x,1.7,z+.08,2.5);this.collider(x,z,.12,.12);
    }
    for(const [x,z] of [[-59,29],[-58,43],[-46,45],[60,5],[61,19],[48,32],[-52,-44],[-49,-53],[-35,-53]]) this.tree(x,z,1.1);
  }
  furnishExpeditions() {
    const shelf=(x,z,w,h,d,shade) => {
      const group=new THREE.Group(); group.position.set(x,0,z); this.scene.add(group);
      for(const xx of [-w/2+.08,w/2-.08]) this.box(xx,h/2,0,.12,h,d,shade,group);
      for(const y of [.25,h*.5,h-.15]) this.box(0,y,0,w,.1,d,shade,group);
      this.collider(x,z,w,d);
      return group;
    };
    const shop=shelf(16.7,3.5,1.3,2.1,3,'#79816a');
    for(let i=0;i<4;i++) this.box(0,.48+(i%2)*.95,-1+i*.7,.55,.38,.45,i%2?'#a39065':'#879b71',shop);
    const tailor=shelf(32.3,5,1.2,2.4,3.4,'#787e6c');
    for(let i=0;i<5;i++) this.box(0,.48+(i%2)*1.05,-1.3+i*.6,.75,.25,.5,i%2?'#9e8da3':'#95a897',tailor);
    const depot=shelf(-25.8,-24,1.3,2.8,4,'#697870');
    for(let i=0;i<4;i++) this.box(0,.55+(i%2)*1.15,-1.4+i*.9,.85,.5,.6,'#8c8a70',depot);
    // Low counters leave the doorway and collection routes clear.
    this.box(10.8,.65,2.5,2.4,1.3,.8,'#8a8267'); this.collider(10.8,2.5,2.4,.8);
    this.box(29.4,.6,9,2.2,1.2,1.1,'#8b816a'); this.collider(29.4,9,2.2,1.1);
    this.label('ЗАПАСЫ',16.7,1.9,5.03,1.8);
    this.label('ТКАНИ',32.3,2.2,6.75,1.5);
    this.label('ДЕТАЛИ',-25.8,2.6,-21.95,1.7);
  }
  car(x, z, rotation, c) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; this.scene.add(group);
    this.box(0, 0.65, 0, 1.9, 0.6, 3.8, c, group); this.box(0, 1.2, -0.2, 1.75, 0.6, 1.8, c, group);
    this.box(0, 1.22, 0.73, 1.55, 0.4, 0.035, '#4c6964', group);
    for (const xx of [-0.95, 0.95]) for (const zz of [-1.15, 1.15]) { const tire = this.cylinder(xx, 0.4, zz, 0.38, 0.16, '#303b35', group); tire.rotation.z = Math.PI / 2; }
    this.box(0, 0.5, 1.94, 1.6, 0.16, 0.1, '#8f9786', group); this.collider(x, z, 2, 4, rotation); return group;
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
    this.collider(-23.1,-11,9.8,2.2); this.collider(-10.4,-11,8.8,2.2);
    this.collider(-16.5,-13,3.4,.09); this.collider(-16.5,-9,3.4,.09);
    this.bridgeCollider = { x: -17, z: -11, w: 22, d: 2.2, bridge: true }; this.colliders.push(this.bridgeCollider);this.collisionIndex.add(this.bridgeCollider);
  }
  buildPond() {
    const pondGeometry = new THREE.CircleGeometry(9.5, 64);
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, colorA: { value: new THREE.Color('#446b65') }, colorB: { value: new THREE.Color('#8ba79b') } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time;uniform vec3 colorA;uniform vec3 colorB;varying vec2 vUv;
        void main(){vec2 p=vUv*22.;float wave=sin(p.x*2.+p.y*.7+time*.65)*sin(p.y*3.-time*.4);float streak=pow(max(0.,sin(p.x*3.+p.y*4.+wave+time*.3)),18.);
        float edge=smoothstep(.5,.44,length(vUv-.5));vec3 c=mix(colorA,colorB,.35+wave*.12)+vec3(.025,.023,.018)*streak;gl_FragColor=vec4(c,edge*.94);}`,
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
    const backwater=new THREE.Mesh(new THREE.CircleGeometry(7,48),this.waterMaterial);backwater.rotation.x=-Math.PI/2;backwater.position.set(30,.055,59);backwater.scale.set(1,.55,1);this.scene.add(backwater);
    for(let x=25.5;x<29.5;x+=.4)this.box(x,.09,55.2,.34,.12,2,'#978967');
    this.marker(28,.9,55.2,'#87c5be');
    this.mirrors.surface(23,-24,9.5,9.5*.85,true);this.mirrors.surface(30,59,7,7*.55,true);
    this.createRain();this.createReeds();
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
      ['crate', 'Ящик на крыльце', 11, 24.2, { wood: 4, cloth: 2 }],
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
      ['crate', 'Уцелевшие продукты магазина', 14, 4, { vegetables:3,herbs: 2, water: 2 }],
      ['cloth', 'Рулоны ткани ателье', 30, 5, { cloth: 6, wire: 2 }],
      ['crate', 'Комплект деталей депо', -18, -26.5, { parts: 3, metal: 4, wire: 2 }, 'cutter'],
      ['cloth','Шкаф перевязочной',-52,31,{cloth:7,herbs:3}],
      ['crate','Запас клиники',-46,30,{water:3,cloth:4,medicine:2}],
      ['herbs','Лекарственные растения',-54,39,{herbs:5}],
      ['scrap','Двигатель на разборку',48,10,{metal:7,parts:3}],
      ['electronics','Сервисный щит',55,9,{wire:5,parts:3}],
      ['crate','Запертый инструментальный ящик',53,13,{parts:6,metal:5,wire:3},'cutter'],
      ['wood','Доски у мастерской',46,22,{wood:7}],
      ['herbs','Уцелевшие посадки оранжереи',-42,-43,{herbs:6,seeds:2}],
      ['crate','Закрытый семенной фонд',-44,-46.3,{seeds:6,cloth:2},'cutter'],
      ['crate','Ящик садовника',-40,-41.5,{water:3,seeds:2,wood:3}],
      ['find','Светильник из клиники',-46,33,{},null,'foundlamp'],
      ['find','Оставленное кресло',-29,35,{},null,'armchair'],
      ['find','Часы у остановки',10,35.7,{},null,'wallclock'],
      ['find','Проигрыватель в квартире',16,21,{},null,'recordplayer'],
      ['scrap','Стиральная машина',14,18,{metal:5,wire:2},null,null,'appliance'],
      ['scrap','Снятый двигатель',52,20,{metal:6,parts:3},null,null,'motor'],
      ['cloth','Бельё во дворе',-46,49,{cloth:5}],
      ['herbs','Уцелевший огород',-36,53.5,{vegetables:4,seeds:2}],
      ['crate','Запасы кладовой',-44,55,{cloth:5,wood:4,vegetables:2}],
      ['crate','Шкаф с инструментами',-41,53,{parts:3,metal:3}],
      ['scrap','Двигатель со склада',48,-52,{metal:6,parts:4},null,null,'motor'],
      ['electronics','Распределительный щит',53,-52,{wire:5,parts:3}],
      ['crate','Ремонтные запасы',51,-48,{parts:5,wire:3}],
      ['crate','Ящик в пристройке',40.5,-50,{wood:4,cloth:2}],
      ['crate','Корзина рыбака',26,49,{fish:2,vegetables:2}],
      ['crate','Продукты у навеса',30,54,{vegetables:3,herbs:2}],
      ['wood','Доски у двора',-53,49,{wood:6}],
      ['scrap','Старая техника у склада',59,-47,{metal:4,wire:2},null,null,'appliance'],
      ['crate','Кладовая кафе',26,34,{vegetables:4,herbs:3}],
      ['crate','Банки и ткань кухни',30,38,{water:3,cloth:3}],
      ['wood','Доски у террасы',20,44,{wood:5}],
      ['herbs','Зелень у кафе',34,40,{herbs:4,seeds:2}],
      ['electronics','Щит подстанции',-54,-18,{wire:6,parts:4}],
      ['crate','Монтажные запасы',-50,-23,{parts:4,metal:4}],
      ['scrap','Снятый генератор',-54,-11,{metal:6,parts:3},null,null,'motor'],
      ['crate','Ящик ремонтной бригады',-46,-24,{cloth:3,medicine:1}],
      ['crate','Сухие фильтры насосной',47,-23,{filterunit:2,cloth:2}],
      ['scrap','Резервный насос',51,-23,{pumpmodule:1,metal:3},'wrench',null,'motor'],
      ['electronics','Контроллер насосной',51,-27.5,{battery:1,wire:3}],
      ['crate','Запас уплотнений',47,-28,{parts:4,cloth:3}],
      ['scrap','Агрегат на стенде',-19,-52,{pumpmodule:1,metal:4},'wrench',null,'motor'],
      ['electronics','Батарейный шкаф',-11,-52,{battery:2,wire:3}],
      ['crate','Ящик ремонтника',-15,-45,{parts:4,metal:3}],
      ['wood','Сухие доски под навесом',-20,-40.8,{wood:6}],
      ['crate','Хозяйственная полка',12.6,48,{filterunit:1,water:2}],
      ['cloth','Ткани швейного дома',9,60,{cloth:5}],
      ['crate','Кухонная кладовая',12.5,52,{vegetables:4,herbs:2}],
      ['herbs','Сад переулка',17,58,{herbs:4,flowers:3}],
      ['find','Лампа ремонтника',-9.5,-45,{},null,'desklamp'],
      ['find','Приёмник из кафе',26,38.5,{},null,'homeradio'],
      ['find','Упакованная полка',7,57.5,{},null,'wallshelf'],
      ...RESOURCE_SITES.map(([type,x,z],i)=>[type,type==='tree'?`Дерево у тропы ${i+1}`:`Каменный валун ${i-5}`,x,z,type==='tree'?{wood:8,seeds:1}:{stone:6,metal:1},type==='tree'?'axe':'pick',null,type==='tree'?'standingtree':'quarry']),
    ];
    definitions.forEach(([type, name, x, z, loot, requires, find, machine], i) => {
      const group = new THREE.Group(); group.position.set(x,this.furnitureElevation(x,z),z); this.scene.add(group);
      const kind=machineKind({type,name,machine});
      if(kind==='standingtree'||kind==='quarry'){this.makeResourceNode(group,kind);}
      else if(find==='wallshelf'){this.crate(0,0,1,group);}
      else if(find) {const model=this.makeFurniture(find);model.scale.setScalar(.6);group.add(model);if(find==='wallclock')this.crate(0,0,1,group);}
      else if(kind==='motor') {this.box(0,.55,0,1.15,.8,.8,'#667970',group);for(const xx of [-.4,0,.4])this.cylinder(xx,1.05,0,.13,.4,'#83958a',group,8);this.box(0,.075,0,1.35,.15,.95,'#857c62',group);}
      else if(kind==='radio') {this.box(0,.3,0,.9,.5,.4,'#83917d',group);this.cylinder(.3,.85,0,.015,.8,'#b2bca0',group,6);this.box(-.15,.35,.22,.4,.3,.025,'#4c6253',group);for(const x of [-.3,.3])for(const z of [-.15,.15])this.box(x,.025,z,.08,.05,.06,'#647564',group);}
      else if(kind==='appliance') {this.box(0,.65,0,1,1.25,.8,'#8d9a8e',group);const drum=this.cylinder(0,.6,.43,.29,.055,'#435c57',group,12);drum.rotation.x=Math.PI/2;this.box(0,1.15,.43,.8,.1,.05,'#b4b49a',group);for(const x of [-.38,.38])for(const z of [-.28,.28])this.box(x,.0125,z,.1,.025,.08,'#69796c',group);}
      else if (type === 'crate') { this.crate(0, 0, 1, group); }
      else if (type === 'wood' || type === 'tree') {
        for (let j = 0; j < (type === 'tree' ? 4 : 3); j++) this.box(0, 0.13 + j * 0.17, j % 2 * 0.15, type === 'tree' ? 2.3 : 1.5, 0.15, 0.4, j % 2 ? '#9a8b61' : '#7c7655', group).rotation.y = j * 0.1;
      } else if (type === 'herbs') {
        for (let j = 0; j < 5; j++) { this.bush((j % 3 - 1) * 0.3, Math.floor(j / 3) * 0.3, 0.35, group); this.cylinder((j % 3 - 1) * 0.3, 0.5, Math.floor(j / 3) * 0.3, 0.04, 0.07, '#cbb898', group, 6); }
      } else if (type === 'electronics') {
        this.box(0,.55,0,.9,1.1,.6,'#64746a',group); this.box(0, 0.7, 0.32, 0.6, 0.45, 0.04, '#a5a081', group);
        for (let j = 0; j < 3; j++) this.box(-0.2 + j * 0.2, 0.7, 0.35, 0.05, 0.28, 0.02, '#837550', group);
      } else if (type === 'cloth') {
        this.box(0, 0.28, 0, 1, 0.45, 0.65, '#99957f', group); this.box(0, 0.4, 0, 0.12, 0.4, 0.67, '#5e695a', group);
      } else {
        for (let j = 0; j < 4; j++) this.box((rng() - 0.5) * 0.7, 0.2 + j * 0.12, (rng() - 0.5) * 0.6, 0.6 + rng() * 0.3, 0.25, 0.5, j % 2 ? '#7f897a' : '#626f67', group).rotation.y = rng() * 3;
      }
      const marker = this.marker(x, 1.5, z, type === 'herbs' ? '#a9c181' : '#e7c993');
      const node = { id: `node-${i}`, type, name, x, z, loot: { ...(this.state.nodeLoot[`node-${i}`] || cycleLoot(`node-${i}`,loot,this.state.depleted[`node-${i}`]===undefined?0:Math.floor(this.state.elapsed/(type==='herbs'?120:240)))) }, originalLoot: { ...loot }, requires, find, accessGate:gateForPoint(x,z), machine:kind, group, marker, respawnTime: type === 'herbs' ? 120 : 240 };
      if(kind||find||type==='crate') {const f=find?footprint({id:find,x:0,z:0}):null;const size=kind==='standingtree'?[.6,.6]:kind==='quarry'?[2.1,1.6]:find?(['wallclock','wallshelf'].includes(find)?[1.05,1.13]:[f.w*.6,f.d*.6]):type==='crate'?[1.05,1.13]:kind==='motor'?[1.35,.95]:kind==='appliance'?[1,.8]:kind==='radio'?[.9,.4]:[.9,.6];node.collider=this.collider(x,z,...size);}
      group.traverse(mesh => { mesh.userData.node = node; if (mesh.isMesh) this.pickables.push(mesh); });
      if(this.state.depleted[node.id]!==undefined && this.state.elapsed-this.state.depleted[node.id]>=node.respawnTime && !this.state.nodeLoot[node.id]) this.state.nodeLoot[node.id]={...node.loot};
      if(kind==='standingtree'){node.stump=this.cylinder(x,.13,z,.24,.26,'#a58d65');node.stump.visible=false;node.stump.userData.resourceStump=true;}this.nodes.push(node);
    });
  }
  createEnemies() {
    for (const [i, [x, z]] of [[8, -4], [26, 11], [-11, -18], [-22, -24], [50,20], [56,12],[-47,-21],[-56,-13]].entries()) {
      const group = new THREE.Group(); group.position.set(x, 1, z); this.scene.add(group);
      const core = this.box(0, 0, 0, 0.65, 0.35, 0.65, '#646f67', group);
      this.box(0, 0, 0.34, 0.35, 0.07, 0.05, '#e39b6b', group, new THREE.MeshStandardMaterial({ color: '#e39b6b', emissive: '#db7847', emissiveIntensity: 2 }));
      const deadAt = this.state.droneDeaths[`drone-${i}`] ?? -1;
      const kind=[0,5,7].includes(i)?'scout':'guardian';
      const enemy = {kind,facing:0,alert:0,windup:0,patrolIndex:0, id: `drone-${i}`, x, z, originX: x, originZ: z, health: deadAt >= 0 && this.state.elapsed - deadAt < 180 ? 0 : 52, maxHealth: 52, group, core, cooldown: 0, deadAt, seed: rng() * 10 };
      group.traverse(mesh => { mesh.userData.enemy = enemy; if (mesh.isMesh) this.pickables.push(mesh); }); const type=DRONE_TYPES[kind],vertices=[0,0,0];for(let a=-type.angle/2;a<=type.angle/2+.001;a+=type.angle/24)vertices.push(Math.sin(a)*type.vision,0,Math.cos(a)*type.vision);
      const geo=new THREE.BufferGeometry(),indices=[];geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));for(let j=1;j<vertices.length/3-1;j++)indices.push(0,j+1,j);geo.setIndex(indices);geo.computeVertexNormals();
      enemy.cone=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:kind==='scout'?'#9ab6ac':'#c6a875',transparent:true,opacity:.06,depthWrite:false,side:THREE.DoubleSide}));enemy.cone.position.set(x,.058,z);this.scene.add(enemy.cone);
      enemy.warning=new THREE.Mesh(new THREE.RingGeometry(.65,.74,32),new THREE.MeshBasicMaterial({color:'#f2a36b',transparent:true,opacity:.8,depthWrite:false}));enemy.warning.rotation.x=-Math.PI/2;enemy.warning.visible=false;this.scene.add(enemy.warning);this.enemies.push(enemy);
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
    for (let i = 0; i < 200; i++) { positions.push(rng() * 128 - 64, 0.5 + rng() * 6, rng() * 128 - 64); phases.push(rng() * 6.28); }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.motes = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#e4cba2', size: 0.09, map: this.glowTexture(), transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.motePhases = phases; this.moteOrigins = [...positions]; this.scene.add(this.motes);
    for (let i = 0; i < 17; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(15 + rng() * 16, 6 + rng() * 9), new THREE.MeshBasicMaterial({ map: this.glowTexture(), color: '#b3c4b9', transparent: true, opacity: 0.07, depthWrite: false }));
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(rng() * 124 - 62, 0.4 + rng(), rng() * 124 - 62); mesh.rotation.z = rng() * 3;
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
        const instances = new THREE.InstancedMesh(geometry, child.material, 450);
        const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
        let used = 0;
        for (let i = 0; i < 1350 && used < 450; i++) {
          const x = rng() * 126 - 63, z = rng() * 126 - 63;
          if (this.onRoad(x,z,.5) || this.blocked(x, z, 1) || this.buildings.some(b=>isInsideBuilding(b,x,z))) continue;
          p.set(x, 0.02, z); quaternion.setFromAxisAngle(Y, rng() * 6.28); s.setScalar(0.7 + rng() * 0.6); matrix.compose(p, quaternion, s); instances.setMatrixAt(used++, matrix);
        }
        instances.count = used; instances.receiveShadow = true; this.scene.add(instances);
      });
    }
    this.updateEquipment();
  }
  setHarvestTool(id) {if(this.harvestTool===id)return;this.harvestTool=id;this.updateEquipment();}
  updateEquipment() {
    this.renderDirty = true;
    this.playerLight.intensity = this.state.owned.includes('lantern') && this.state.lanternOn !== false ? 3.5 : 0;
    this.weaponRoot.traverse(m=>{if(m.userData.generatedHandItem)m.geometry.dispose();});this.weaponRoot.clear(); const id = this.harvestTool||this.state.equipment.weapon;
    if (!id) return;
    if(id==='axe'||id==='pick'){
      const handle=this.cylinder(0,0,-.25,.035,.85,'#937954',this.weaponRoot,8);handle.rotation.x=.7;handle.userData.generatedHandItem=true;
      const head=this.box(0,.29,-.5,id==='axe'?.34:.6,.12,.065,'#b5bab0',this.weaponRoot);head.userData.generatedHandItem=true;
    }else if (id === 'pistol' || id === 'carbine') {
      if (!this.assets) return;
      const model = this.assets[id === 'pistol' ? 'blaster' : 'blaster-repeater'].scene.clone();
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()); model.scale.setScalar(0.8 / Math.max(size.x, size.y, size.z)); this.weaponRoot.add(model);
    } else { const pipe = this.cylinder(0, 0, -0.3, id === 'spear' ? 0.04 : 0.06, id === 'spear' ? 1.8 : 0.8, '#b2b8a0', this.weaponRoot, 6); pipe.rotation.x = 0.7;pipe.userData.generatedHandItem=true; }
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
    this.precisionTool.visible=this.state.owned.includes('tooling');this.receiverModel.visible=this.state.owned.includes('receiver');
    this.solarRoof.visible = this.state.owned.includes('solar');
    const water = this.state.owned.includes('pump'); this.towerLight.intensity = water ? 7 : 0;
    this.towerIndicator.material.emissive.set(water ? '#8ccac2' : '#a58664'); this.towerIndicator.material.emissiveIntensity = water ? 2.5 : 0.3;
    this.syncNodes();
  }
  syncNodes() {
    for (const node of this.nodes) {
      const time = this.state.depleted[node.id];
      let visible=node.find?!this.state.findClaims.includes(node.id):time===undefined||this.state.elapsed-time>=node.respawnTime;
      // A restored container must wait until the player leaves its footprint.
      if(visible&&!node.find&&time!==undefined&&node.collider&&circleHitsRect(this.state.x,this.state.z,.3,node.collider)) visible=false;
      if (visible && !node.group.visible && !node.find) {this.state.brokenNodes=this.state.brokenNodes.filter(id=>id!==node.id); node.loot = {...(this.state.nodeLoot[node.id]||cycleLoot(node.id,node.originalLoot,Math.floor(this.state.elapsed/node.respawnTime)))}; this.state.nodeLoot[node.id]={...node.loot}; }
      node.group.visible=visible;node.marker.visible=visible;const broken=this.state.brokenNodes.includes(node.id);if(node.group.userData.standing){node.group.userData.standing.visible=!broken;node.group.userData.shards.visible=broken;}if(node.stump)node.stump.visible=!visible;if(node.collider)node.collider.disabled=!visible||broken;
    }
  }
  onRoad(x,z,margin=0) {return [...ROADS,...SCENES,...this.canopies].some(r=>Math.abs(x-r.x)<r.w/2+margin&&Math.abs(z-r.z)<r.d/2+margin);}
  canSee(ax,az,bx,bz){return ![...this.collisionIndex.query(Math.min(ax,bx),Math.min(az,bz),Math.max(ax,bx),Math.max(az,bz))].some(r=>!r.disabled&&(r.w>.45||r.d>.45)&&segmentHitsRect(ax,az,bx,bz,r))&&!this.state.placed.some(p=>!['rug','wallclock','fishtrophy','wallshelf'].includes(p.id)&&segmentHitsRect(ax,az,bx,bz,solidFootprint(p)));}
  blocked(x, z, radius = 0.3) {
    if (x < -WORLD_LIMIT || x > WORLD_LIMIT || z < -WORLD_LIMIT || z > WORLD_LIMIT) return true;
    if(Math.pow((x-30)/6.8,2)+Math.pow((z-59)/3.7,2)<1&&!(x>=25.2&&x<=29.5&&z<56.2))return true;
    // Pond shoreline; dock remains navigable.
    if (Math.pow((x - 23) / 9, 2) + Math.pow((z + 24) / 7.4, 2) < 1 && !(x < 21.5 && z > -18.1)) return true;
    return [...this.collisionIndex.query(x-radius,z-radius,x+radius,z+radius)].some(c => !c.disabled && circleHitsRect(x,z,radius,c)) || this.state.placed.some(p=>p.id!=='rug'&&!['wallclock','fishtrophy','wallshelf'].includes(p.id) && circleHitsRect(x,z,radius,solidFootprint(p)));
  }
  repairFurniture() { return repairFurniture(this.colliders,this.state.placed); }
  furnitureElevation(x,z) { return this.buildings.some(b=>isInsideBuilding(b,x,z))||this.state.construction.some(p=>p.id==='floor'&&Math.abs(x-p.x)<=1&&Math.abs(z-p.z)<=1)?.205:.025; }
  canPlace(item,ignore=-1) {
    if(item.id==='raincatcher'&&this.sheltered(item.x,item.z))return false;return placementAllowed(item,this.colliders,this.state.placed,ignore) && !overlapsPlayer(item,this.state);
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
    return gridPath({x:sx,z:sz},{x:gx,z:gz},(x,z)=>this.blocked(x,z),(WORLD_LIMIT*2+3)**2,(ax,az,bx,bz)=>[...this.collisionIndex.query(Math.min(ax,bx)-.3,Math.min(az,bz)-.3,Math.max(ax,bx)+.3,Math.max(az,bz)+.3)].some(r=>r.construction&&!r.disabled&&segmentHitsRect(ax,az,bx,bz,{...r,w:r.w+.6,d:r.d+.6})));
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
    const group = this.makeFurniture(item.id); group.position.set(item.x, this.furnitureElevation(item.x,item.z), item.z); group.rotation.y = item.rotation; this.scene.add(group);
    this.decorateStation(item,group);this.placedGroups.push({ item, group }); return group;
  }
  decorateStation(item,group){
    if(item.upgrade!==1)return;
    if(item.id==='raincatcher'){this.cylinder(.32,.7,0,.22,.8,'#8ab9ac',group,10);this.box(-.22,1.5,0,.28,.4,.32,'#c6ccb0',group);}
    if(item.id==='dryrack'){const fan=this.cylinder(0,1.45,.46,.22,.12,'#c2c5a4',group,12);fan.rotation.x=Math.PI/2;this.box(.65,.28,.3,.25,.45,.25,'#7c9b83',group);}
    if(item.id==='recycler'){this.box(.52,1.3,0,.35,.6,.35,'#95bba5',group);this.box(0,.95,.54,.5,.15,.08,'#d0ba76',group);}
    group.userData.stationUpgrade=1;
  }
  refreshStation(item){const entry=this.placedGroups.find(e=>e.item===item);if(entry&&!entry.group.userData.stationUpgrade)this.decorateStation(item,entry.group);this.renderDirty=true;}
  makeFurniture(id, ghost = false) {
    const group = new THREE.Group();
    if (id === 'lamp') {
      group.userData.fixture={...this.lamp(0,0,3,!ghost,group),base:15};
    } else if(id==='raincatcher') {
      this.cylinder(0,.6,0,.48,1.2,'#819a90',group,12);this.cylinder(0,1.22,0,.54,.12,'#b5b99f',group,12);this.cylinder(0,1.3,0,.4,.035,'#4c716d',group,12);this.box(0,.3,.52,.12,.12,.18,'#b4ad86',group);
    } else if(id==='dryrack') {
      for(const x of [-.9,.9]){this.box(x,.9,0,.12,1.8,.9,'#9d8760',group);this.box(0,1.8,0,2.1,.12,1.1,'#bdac80',group);}
      for(const y of [.55,1.15]){this.box(0,y,0,1.8,.08,1,'#66786b',group);for(const x of [-.55,0,.55])this.box(x,y+.1,0,.35,.12,.45,'#a8b9a4',group);}
    } else if(id==='gearrack') {
      for(const x of [-.8,.8])this.box(x,1,0,.12,2,.7,'#827959',group);for(const y of [.15,1,1.9])this.box(0,y,0,1.8,.1,.7,'#a4956c',group);this.box(-.4,1.35,0,.5,.6,.35,'#a6ac89',group);this.box(.4,.55,0,.5,.6,.35,'#8b9f92',group);
    } else if(id==='fishtrophy') {
      this.box(0,1.8,0,.85,.5,.07,'#a88e65',group);this.box(0,1.8,.055,.6,.22,.06,'#89b4b3',group);const tail=this.box(-.33,1.8,.055,.15,.18,.06,'#92bcbd',group);tail.rotation.z=Math.PI/4;this.box(.23,1.85,.095,.04,.04,.015,'#314a46',group);
    } else if(id==='wallshelf'){
      this.box(0,1.55,.11,1.4,.12,.24,'#a9956a',group);for(const x of [-.5,.5])this.box(x,1.37,.04,.07,.3,.1,'#607868',group);for(const x of [-.35,0,.35]){this.cylinder(x,1.74,.1,.09,.25,'#aeb4a1',group,8);this.cylinder(x,1.87,.1,.095,.035,'#7e8c78',group,8);}
    } else if(id==='homeradio'){
      this.box(0,.57,0,1,.12,.65,'#9c8761',group);for(const x of [-.38,.38])for(const z of [-.22,.22])this.box(x,.27,z,.08,.54,.08,'#6c7c67',group);this.box(0,.85,0,.8,.43,.38,'#9ba58c',group);this.box(-.14,.86,.205,.38,.28,.025,'#4c6b60',group);this.cylinder(.24,.85,.23,.06,.04,'#d4bd86',group,8).rotation.x=Math.PI/2;this.cylinder(.25,1.38,-.1,.012,.7,'#bfc5ad',group,6);
    } else if(id==='desklamp'){
      this.box(0,.56,0,.75,.12,.65,'#a28b65',group);for(const x of [-.27,.27])for(const z of [-.22,.22])this.box(x,.25,z,.08,.5,.08,'#7a876c',group);this.cylinder(0,.65,0,.16,.07,'#839c90',group,12);this.cylinder(0,.9,0,.025,.48,'#779086',group);this.cylinder(0,1.17,0,.22,.18,'#c7b27d',group,8);const glow=this.cylinder(0,1.07,0,.14,.025,'#ffe0a0',group);glow.material=new THREE.MeshStandardMaterial({color:'#ffe0a0',emissive:'#ffc17c',emissiveIntensity:ghost?0:2});const light=new THREE.PointLight('#ffd39a',ghost?0:5,6,1.5);light.position.set(0,1.03,0);group.add(light);this.lights.push({light,glow,base:ghost?0:5});group.userData.fixture={light,glow,base:5};
    } else if(id==='foundlamp') {
      this.cylinder(0,.05,0,.28,.1,'#7d856b',group);this.cylinder(0,.7,0,.045,1.3,'#69796c',group);
      this.cylinder(0,1.35,0,.32,.32,'#c6ae7b',group,8);
      const glow=this.cylinder(0,1.2,0,.17,.04,'#ffe0a0',group);glow.material=new THREE.MeshStandardMaterial({color:'#ffe0a0',emissive:'#ffc17c',emissiveIntensity:ghost?0:2});
      const light=new THREE.PointLight('#ffd39a',ghost?0:7,8,1.5);light.position.set(0,1.15,0);group.add(light);this.lights.push({light,glow,base:ghost?0:7});
      group.userData.fixture={light,glow,base:7};
    } else if(id==='armchair') {
      this.box(0,.55,0,1.05,.4,.9,'#9d806b',group);this.box(0,1.05,-.43,1.15,.95,.2,'#8d7566',group);
      for(const x of [-.6,.6]) {this.box(x,.85,0,.2,.45,1.1,'#b29373',group);for(const z of [-.4,.4])this.box(x,.2,z,.13,.4,.13,'#586458',group);}
      this.box(0,.8,0,.95,.1,.8,'#c0a185',group);
    } else if(id==='wallclock') {
      const frame=this.cylinder(0,1.8,0,.4,.07,'#9a7d59',group,24);frame.rotation.x=Math.PI/2;
      const face=this.cylinder(0,1.8,.045,.34,.03,'#ddd5b3',group,24);face.rotation.x=Math.PI/2;
      for(let i=0;i<12;i++) {const angle=i*Math.PI/6;const tick=this.box(Math.sin(angle)*.27,1.8+Math.cos(angle)*.27,.07,.025,.06,.025,'#465e53',group);tick.rotation.z=-angle;}
      for(const [tag,length,width] of [['clockMinute',.26,.022],['clockHour',.18,.035]]) {const hand=new THREE.Group();hand.position.set(0,1.8,.09);hand.userData[tag]=true;group.add(hand);this.box(0,length/2,0,width,length,.025,'#43574f',hand);}
    } else if(id==='recordplayer') {
      this.box(0,.75,0,1.15,.12,.7,'#9a8059',group);for(const x of [-.48,.48])for(const z of [-.23,.23])this.box(x,.35,z,.09,.7,.09,'#61715d',group);
      this.box(0,.9,0,.9,.18,.55,'#bda275',group);this.cylinder(-.15,1.01,0,.21,.025,'#334b42',group,20);this.cylinder(-.15,1.028,0,.055,.012,'#b58b6b',group,12);
      this.box(.24,1.035,.03,.025,.03,.33,'#b0baa6',group).rotation.y=-.4;
    } else if(id==='bouquet') {
      this.cylinder(0,.3,0,.16,.6,'#a58a67',group,8);for(const x of [-.15,0,.15]) {this.cylinder(x,.65,0,.02,.55,'#698b5d',group,6);this.cylinder(x,.96,0,.1,.08,'#d6a6b8',group,6);}
    } else if (['garden', 'seedbed','cropbed'].includes(id)) {
      this.box(0, 0.2, 0, 2, 0.4, 1.6, '#8c7a55', group); this.box(0, 0.42, 0, 1.8, 0.06, 1.4, '#4a4b34', group);
      for (let i = 0; i < 6; i++) {
        const plant = this.bush((i % 3 - 1) * 0.5, (Math.floor(i / 3) - 0.5) * 0.6, 0.27, group);
        plant.position.y=.56;plant.userData.gardenPlant=true;
        if(id==='cropbed') {plant.userData.cropLeaf=true;plant.visible=false;const fruit=this.cylinder(plant.position.x,.65,plant.position.z,.08,.16,'#d69eb6',group,6);fruit.material=fruit.material.clone();fruit.userData.cropFruit=true;fruit.visible=false;}
      }
    } else if (id === 'chest') this.crate(0, 0, 1.25, group);
    else if (id === 'bed') {
      this.box(0, 0.25, 0, 1.5, 0.35, 2.3, '#756f54', group); this.box(0, 0.5, 0.2, 1.5, 0.25, 1.8, '#a4ae91', group); this.box(0, 0.64, -0.7, 1.2, 0.15, 0.55, '#d6cab0', group);
      for(const xx of [-.6,.6]) for(const zz of [-1,1]) this.box(xx,.05,zz,.12,.1,.12,'#59665c',group);
    } else if (id === 'sofa') {
      this.box(0, 0.45, 0, 2.3, 0.7, 1, '#9e8f69', group); this.box(0, 0.9, -0.4, 2.3, 0.8, 0.25, '#8f825f', group);
      for (const x of [-1, 1]) this.box(x, 0.8, 0, 0.3, 0.6, 1.2, '#9e8f69', group);
      this.box(0.4, 0.9, -0.15, 0.45, 0.45, 0.2, '#b7ac89', group);
      for(const xx of [-1,1]) for(const zz of [-.4,.4]) this.box(xx,.1,zz,.12,.2,.12,'#59665c',group);
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
  syncFurniture() {
    for(const {item,group} of this.placedGroups) {
      const f=group.userData.fixture;if(!f)continue;
      const on=item.enabled!==false&&(item.id!=='lamp'||this.state.owned.includes('generator'));
      f.light.intensity=on?f.base:0;f.glow.material.emissiveIntensity=on?2:0;if(f.spill)f.spill.material.opacity=on?.15:0;
    }
  }
  makeResourceNode(group,kind) {
    const standing=new THREE.Group(),shards=new THREE.Group();group.add(standing,shards);group.userData.standing=standing;group.userData.shards=shards;
    if(kind==='standingtree'){
      this.cylinder(0,1.5,0,.18,3,'#65513c',standing);
      for(const [y,r]of [[2.7,1.1],[3.5,.95],[4.2,.65]]){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0),mat('#526b47'));m.position.y=y;m.scale.y=.8;m.castShadow=true;standing.add(m);}
      for(const z of [-.28,.28]){const m=this.cylinder(0,.17,z,.16,1.5,'#786344',shards);m.rotation.z=Math.PI/2;}
    }else{
      for(const [x,y,z,r]of [[0,.65,0,.8],[-.6,.4,.15,.5],[.55,.35,-.25,.45]]){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),mat('#81877b'));m.position.set(x,y,z);m.scale.z=.85;m.castShadow=true;m.receiveShadow=true;standing.add(m);}
      for(let i=0;i<5;i++)this.box((i%3-1)*.35,.1,Math.floor(i/3)*.35-.2,.26,.18,.25,'#8c9081',shards);
    }
    shards.visible=false;
  }
  makeStructurePart(part,parent) {
    const group=new THREE.Group();group.position.set(part.x,0,part.z);group.rotation.y=part.axis==='z'?Math.PI/2:0;parent.add(group);
    if(part.id==='floor'){
      this.box(0,.09,0,2,.2,2,'#635d4d',group);
      for(let i=0;i<8;i++)this.box(0,.195,(i-3.5)*.25,1.98,.015,.235,'#998267',group);
    }else if(part.id==='wall')this.box(0,1.59,0,2,2.8,.16,'#8c8065',group);
    else if(part.id==='door'){
      for(const x of [-.8,.8])this.box(x,1.59,0,.4,2.8,.16,'#8c8065',group);
      this.box(0,2.69,0,1.2,.6,.16,'#8c8065',group);
      for(const x of [-.62,.62])this.box(x,1.29,0,.07,2.2,.17,'#c3b08c',group);
    }else{
      this.box(0,.64,0,2,.9,.16,'#8c8065',group);this.box(0,2.64,0,2,.7,.16,'#8c8065',group);
      for(const x of [-.78,.78])this.box(x,1.69,0,.44,1.2,.16,'#8c8065',group);
      const glass=mat('#80a7a0',.18,.25).clone();glass.transparent=true;glass.opacity=.38;glass.userData.baseOpacity=.38;this.box(0,1.69,0,1.12,1.2,.04,'',group,glass);
      for(const x of [-.58,0,.58])this.box(x,1.69,0,.06,1.25,.16,'#c3b08c',group);
      for(const y of [1.08,2.3])this.box(0,y,0,1.2,.06,.16,'#c3b08c',group);
    }
    group.traverse(m=>{if(m.isMesh&&!m.material.userData.baseOpacity)m.material=m.material.clone();});return group;
  }
  rebuildConstruction() {
    if(this.constructionGroup){this.constructionGroup.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});this.scene.remove(this.constructionGroup);}
    this.colliders=this.colliders.filter(c=>!c.construction);this.collisionIndex=new SpatialIndex();for(const c of this.colliders)this.collisionIndex.add(c);
    const root=new THREE.Group();this.scene.add(root);this.constructionGroup=root;const batches=new Map(),rooms=closedRooms(this.state.construction);this.constructionRooms=rooms;
    for(const p of this.state.construction){this.makeStructurePart(p,root);for(const c of structureColliders(p)){c.construction=true;this.colliders.push(c);this.collisionIndex.add(c);}}
    const floorMeshes=new Set();root.traverse(m=>{if(m.isMesh&&m.position.y<.3)floorMeshes.add(m);});
    const roofMeshes=new Set();for(const room of rooms)for(const t of room.tiles)roofMeshes.add(this.box(t.x,3.04,t.z,2.16,.12,2.16,'#4d605b',root,mat('#4d605b').clone()));
    root.updateMatrixWorld(true);root.traverse(m=>{if(!m.isMesh)return;const type=roofMeshes.has(m)?'roof':floorMeshes.has(m)?'floor':'wall',key=type+':'+m.material.color.getHexString()+':'+(m.material.userData.baseOpacity??1);if(!batches.has(key))batches.set(key,{type,material:m.material,meshes:[]});batches.get(key).meshes.push(m);});
    this.constructionWalls=[];this.constructionRoofs=[];
    for(const batch of batches.values()){
      const pieces=batch.meshes.map(m=>{let g=m.geometry.clone();if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}return g.applyMatrix4(m.matrixWorld);}),geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());
      const material=batch.material.clone();material.transparent=batch.type!=='floor'||material.transparent;material.userData.baseOpacity=batch.material.userData.baseOpacity??1;
      const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
      for(const m of batch.meshes){m.parent.remove(m);m.geometry.dispose();m.material.dispose();}
      if(batch.type==='wall')this.constructionWalls.push(mesh);if(batch.type==='roof')this.constructionRoofs.push(mesh);
    }
    this.shelterIndex=new SpatialIndex();for(const r of [...this.buildings,...this.canopies])this.shelterIndex.add(r,.25);for(const room of rooms)for(const t of room.tiles)this.shelterIndex.add({...t,w:2.16,d:2.16});
    for(const {item,group}of this.placedGroups)group.position.y=this.furnitureElevation(item.x,item.z);
    this.updateConstructionRoofs(1);this.renderDirty=true;
  }
  updateConstructionRoofs(dt) {
    const inside=this.buildings.some(b=>b.x===-18&&b.z===15&&isInsideBuilding(b,this.state.x,this.state.z))||this.state.construction.some(p=>p.id==='floor'&&Math.abs(p.x-this.state.x)<1&&Math.abs(p.z-this.state.z)<1);
    for(const [meshes,target]of [[this.constructionWalls,inside?.13:1],[this.constructionRoofs,inside?.035:1]])for(const m of meshes||[]){m.material.opacity=fadeOpacity(m.material.opacity,target*(m.material.userData.baseOpacity??1),dt);m.material.depthWrite=m.material.opacity>.98;m.castShadow=!inside&&(m.material.userData.baseOpacity??1)>.8;}
  }
  canBuildStructure(part) {
    const result=buildAllowed(this.state,part,this.colliders);if(!result.ok)return result;
    if(Object.entries(STRUCTURES[part.id].cost).some(([id,n])=>(this.state.bag[id]||0)+(this.state.stash[id]||0)<n))return {ok:false,reason:'Недостаточно материалов'};return result;
  }
  createStructureGhost(id) {this.removeGhost();this.ghost=new THREE.Group();this.ghost.userData.structureId=null;this.scene.add(this.ghost);return this.ghost;}
  updateStructureGhost(part,valid) {
    const ghost=this.ghost;if(!ghost)return;ghost.visible=!!part;if(!part)return;
    if(ghost.userData.structureId!==part.id){while(ghost.children.length){const c=ghost.children[0];c.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});ghost.remove(c);}this.makeStructurePart({id:part.id,x:0,z:0,axis:'x'},ghost);ghost.traverse(m=>{if(m.isMesh){m.material.transparent=true;m.material.opacity=.45;m.material.depthWrite=false;m.castShadow=false;}});ghost.userData.structureId=part.id;}
    ghost.position.set(part.x,0,part.z);ghost.rotation.y=part.axis==='z'?Math.PI/2:0;ghost.traverse(m=>{if(m.isMesh)m.material.color.set(valid?'#81d6ad':'#ed886e');});
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
    this.time += dt; this.updateRoofs(dt);this.updateConstructionRoofs(dt);this.syncFurniture();const weather=weatherAt(this.state.elapsed);this.updateRain(dt,weather);
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
    this.waterMaterial.uniforms.time.value = this.time;this.updateReeds();

    for (const fog of this.fogs) fog.position.x = fog.userData.originX + Math.sin(this.time * 0.035 + fog.userData.phase) * 4;
    const pos = this.motes.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { pos.setX(i, this.moteOrigins[i * 3] + Math.sin(this.time * 0.16 + this.motePhases[i]) * 0.6); pos.setY(i, this.moteOrigins[i * 3 + 1] + Math.sin(this.time * 0.25 + this.motePhases[i]) * 0.4); }
    pos.needsUpdate = true;
    for(const e of this.enemies){const near=Math.hypot(e.x-this.state.x,e.z-this.state.z)<13&&e.health>0;e.cone.visible=near;e.cone.position.set(e.x,.058,e.z);e.cone.rotation.y=e.facing;e.cone.material.opacity=e.alert>0?.1:.04;e.warning.visible=near&&e.windup>0;e.warning.position.set(e.x,.065,e.z);e.warning.scale.setScalar(1+(e.windup||0));}
    for (const enemy of this.enemies) { enemy.group.position.set(enemy.x, 1.2 + Math.sin(this.time * 2 + enemy.seed) * 0.13, enemy.z); enemy.group.visible = enemy.health > 0; }
    this.stationIcon.material.opacity = 0.4 + Math.sin(this.time * 2) * 0.14;
    for (const { item, group } of this.placedGroups) if (['garden', 'seedbed'].includes(item.id)) {
      const growth = 0.4 + Math.min(1, Math.max(0, (this.state.elapsed - item.harvested) / productionInfo(this.state, item).interval)) * 0.6;
      group.traverse(mesh => { if (mesh.userData.gardenPlant) mesh.scale.set(1.4 * growth, 0.8 * growth, 1.1 * growth); });
    }
    for(const {item,group} of this.placedGroups) {
      if(item.id==='cropbed') {const info=cropInfo(this.state,item);group.traverse(mesh=>{if(mesh.userData.cropLeaf) {mesh.visible=!!info;const growth=.2+(info?.progress||0)*.8;mesh.scale.set(1.4*growth,.8*growth,1.1*growth);mesh.position.y=.44+.216*growth;}if(mesh.userData.cropFruit) {mesh.visible=!!info&&info.progress>.8&&item.crop!=='herbs';if(info) {mesh.material.color.set(info.color);mesh.position.y=.48+info.progress*.47;}}});}
      if(item.id==='wallclock') {const minutes=17*60+42+this.state.elapsed/2;group.traverse(hand=>{if(hand.userData.clockMinute)hand.rotation.z=-minutes%60/60*Math.PI*2;if(hand.userData.clockHour)hand.rotation.z=-(minutes/60)%12/12*Math.PI*2;});}
    }
    this.fishingMarker.material.opacity = 0.45 + Math.sin(this.time * 1.5) * 0.15;
    for (const node of this.nodes) { node.marker.visible=node.group.visible&&Math.hypot(node.x-this.state.x,node.z-this.state.z)<9; if(node.marker.visible) node.marker.position.y = 1.45 + Math.sin(this.time * 1.8 + node.x) * 0.12; }
    for (const f of this.floating) { f.life -= dt; f.y += dt * 0.65; } this.floating = this.floating.filter(f => f.life > 0);
    for (const effect of this.effects || []) {
      effect.life -= dt; effect.mesh.material.opacity = Math.max(0, effect.life / effect.max);
      if (effect.life <= 0) { this.scene.remove(effect.mesh); effect.mesh.geometry?.dispose(); effect.mesh.material.dispose(); }
    }
    this.effects = (this.effects || []).filter(e => e.life > 0);
    this.grade.uniforms.time.value = this.time;
    const night = weather.daylight;
    this.sun.intensity = (1.3 + night * 1.7)*(1-weather.rain*.35); this.ambient.intensity = (1.55 + night * .55)*(1-weather.rain*.12);
    this.scene.fog.density = 0.016 + (1 - night) * 0.005+weather.rain*.006;
    this.player.visible = focus;
    this.mirrors.update(this.time,this.camera,this.state.settings.quality!=='low',this.renderDirty);
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
  setQuality(quality) { this.state.settings.quality = quality; this.renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.7)); this.renderer.shadowMap.enabled = quality !== 'low'; if(this.reflection)this.reflection.visible=false;this.renderDirty=true; this.resize(); }
  location() { return LOCATIONS.reduce((best, location) => Math.hypot(this.state.x - location.x, this.state.z - location.z) < Math.hypot(this.state.x - best.x, this.state.z - best.z) ? location : best); }
}
