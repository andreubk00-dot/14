import * as THREE from 'three';
import {INDUSTRY_BUILDINGS,INDUSTRY_FENCE,INDUSTRY_GATE,INDUSTRY_WET,INDUSTRY_PROJECTS,INDUSTRY_OPEN_LEAVES} from './industry.js';
// Static details participate in the world's existing spatial colour batches.
export function buildIndustry(w){
 for(const b of INDUSTRY_BUILDINGS){
  w.building(b.x,b.z,b.w,b.d,b.h,b.shade,b.sign,b);const room=w.buildings.at(-1);Object.assign(room,{industryId:b.id,ambience:['power','pump','workshop','switch','warehouse'].includes(b.theme)?'metal':'room'});
  const start=room.wallMeshes.length;
  const box=(x,y,z,a,h,d,c)=>w.box(b.x+x,y,b.z+z,a,h,d,c);
  const solid=(x,z,a,d,cover=true)=>{const c=w.collider(b.x+x,b.z+z,a,d);c.cover=cover;return c;};
  const detail=m=>w.cutawayDetail(m,room);
  // A clear centre aisle always joins both real door openings.
  if(['power','pump'].includes(b.theme)){
   for(const x of [-b.w/2+2.5,b.w/2-2.5])for(const z of b.theme==='pump'?[-10,0,10]:[-4,4]){
    box(x,.35,z,2.6,.3,3,'#77867c');w.cylinder(b.x+x,1.05,b.z+z,.8,1.1,'#748e88',w.scene,12);box(x,1.7,z,1.5,.16,1.8,'#b0b39a');solid(x,z,2.7,3);
    for(const dz of [-.7,.7])detail(box(x,2.15,z+dz,.08,.85,.08,'#b4a483'));
   }
   // Raised pipes and roof beams lift with the building cutaway.
   for(const x of [-b.w/2+1,b.w/2-1]){const pipe=box(x,2.65,0,.2,.2,b.d-2,'#929f8a');detail(pipe);}
   for(const z of [-b.d/3,0,b.d/3])w.cutawayDetail(box(0,b.h-.35,z,b.w,.2,.22,'#64786f'),room,true);
   if(b.theme==='pump'){box(-5,.91,3,1.4,.08,.9,'#ab9670');for(const dx of [-.55,.55])for(const dz of [-.3,.3])box(-5+dx,.45,3+dz,.08,.9,.08,'#758d7f');solid(-5,3,1.4,.9,false);}
   if(b.theme==='power')for(const x of [-5,5])w.cutawayDetail(w.cylinder(b.x+x,b.h+1.8,b.z-5,.45,3.6,'#8e8e76',w.scene,10),room,true);
  }else if(b.theme==='home'){
   box(-3,.45,-1,1.5,.55,2.2,'#86775e');box(-3,.79,-1,1.4,.15,2,'#b6beaa');box(-3,.88,-.5,1.42,.06,1.1,'#9fae91');solid(-3,-1,1.5,2.2);
   box(3,.85,-2,2,.14,1,'#a38c64');solid(3,-2,2,1,false);box(3,1.03,-2,.32,.18,.26,'#c0b997');
  }else if(b.theme==='sewing'){
   box(-3,.9,-1,2.3,.14,1,'#ac936a');box(-3,1.15,-1,.7,.38,.45,'#587b73');solid(-3,-1,2.3,1);
   for(const z of [-2,0,2])box(3,.7,z,1.4,1.2,1.4,'#9ca18b');solid(3,0,1.4,5.4);
  }else if(b.theme==='kitchen'){
   box(-5,.8,-3,3,1.4,1.1,'#88988c');solid(-5,-3,3,1.1);
   for(const x of [-3,3]){box(x,.85,0,2.6,.13,1.2,'#ae986d');solid(x,0,2.6,1.2);for(const dx of [-.7,.7])w.cylinder(b.x+x+dx,.99,b.z,.13,.1,'#d1c3a1',w.scene,8);}
  }else{
   for(const x of [-b.w/2+2,b.w/2-2]){
    for(const z of [-2,2])box(x,1,z,2,.14,2,'#a1926b');solid(x,0,2,6);
    for(const y of [.4,1.4,2.4]){box(x,y,0,2,.1,6,'#76887b');for(const z of [-1.8,1.8])box(x,y+.35,z,1.4,.55,.9,b.theme==='switch'?'#83a49a':'#a89a75');}
   }
  }
  if(b.theme==='power'){
   for(const dx of [-8,-4,4,8]){detail(box(dx,3.9,b.d/2+.2,2.2,1.6,.04,'#415e5c'));for(const x of [-1.1,0,1.1])detail(box(dx+x,3.9,b.d/2+.24,.055,1.7,.06,'#a0b1a1'));for(const y of [3.05,3.9,4.75])detail(box(dx,y,b.d/2+.24,2.25,.055,.06,'#a0b1a1'));}
   detail(box(0,5.25,b.d/2+.18,b.w,.13,.16,'#b6ab8c'));
  }
  w.mergeBuildingDetails(room,start);
 }
 for(const b of INDUSTRY_BUILDINGS.filter(b=>['power','workshop','kitchen'].includes(b.theme)))w.canopy(b.x,b.z+b.d/2+1.1,b.theme==='power'?6:4,2.2,2.8,'#8b9c89');
 for(let x=-184;x<384;x+=24)for(let z=-358;z<-214;z+=24){if(x>-112&&x<66)continue;const dx=Math.sin(x*13+z)*5,dz=Math.cos(z*7-x)*4;w.tree(x+dx,z+dz,.75+Math.abs(Math.sin(x+z))*.3);}
 for(const z of [-269,-260]){w.cylinder(-85,1.2,z,1.5,2.3,'#82978d',w.scene,12);w.collider(-85,z,3,3).cover=true;for(const x of [-85.8,-84.2])w.cylinder(x,2.8,z,.16,.9,'#adb49a',w.scene,8);}
 for(const f of INDUSTRY_FENCE){w.box(f.x,.15,f.z,f.w,.3,f.d,'#71887d');for(const y of [.75,1.9])w.box(f.x,y,f.z,f.w,.09,.09,'#92a38e');for(let x=f.x-f.w/2;x<f.x+f.w/2;x+=.55)w.box(x,1.15,f.z,.035,1.9,.035,'#80988b');w.collider(f.x,f.z,f.w,f.d).cover=true;for(let x=f.x-f.w/2;x<f.x+f.w/2;x+=4)w.box(x,1.22,f.z,.13,2.44,.4,'#adb098');}
 for(const [x,z]of [[-96,-218],[-96,-256],[-96,-312],[45,-237],[44,-282],[46,-329],[-84,-365],[-8,-367]]){w.tree(x,z,.85);}
 // Authored puddles share the existing reflection camera.
 for(const [x,z,a,b]of [[-5,-243,2.3,1.1],[-79,-284,2.1,.8],[6,-329,2.8,1.2],[-82,-336,1.8,.8]])w.mirrors.surface(x,z,a,b);
}
// Only moving/powered details live outside static batches; distant work is skipped.
export class IndustryWorld{
 constructor(w){
  this.world=w;this.lastKey='';this.lastNear=false;this.root=new THREE.Group();this.root.name='north-power-state';w.scene.add(this.root);
  this.gate=new THREE.Group();this.root.add(this.gate);this.gateLeaves=[];this.openLeaves=[];const gate=INDUSTRY_GATE;
  for(const side of [-1,1]){const leaf=new THREE.Group();leaf.position.set(gate.x+side*gate.w/2,0,gate.z);this.gate.add(leaf);w.box(-side*gate.w/4,1.2,0,gate.w/2-.05,2.4,.2,'#7f9385',leaf);for(const y of [.5,1.2,1.9])w.box(-side*gate.w/4,y,.14,gate.w/2-.2,.055,.04,'#abb49a',leaf);w.mergeFurnitureGeometry(leaf);this.gateLeaves.push({leaf,side});const open=INDUSTRY_OPEN_LEAVES[side<0?0:1],c=w.collider(open.x,open.z,open.w,open.d);c.cover=true;this.openLeaves.push(c);}
  this.gateCollider=w.collider(gate.x,gate.z,gate.w,gate.d);this.gateCollider.cover=true;
  this.windows=[];this.spills=[];this.ceilingLamps=[];
  const material=new THREE.MeshStandardMaterial({color:'#ffd19b',emissive:'#ffbd72',emissiveIntensity:1.5,transparent:true,opacity:.8,depthWrite:false});
  for(const b of INDUSTRY_BUILDINGS){for(const dx of [-b.w*.3,b.w*.3]){const m=w.box(b.x+dx,1.3,b.z+b.d/2+.225,1,.85,.012,'',this.root,material);this.windows.push({mesh:m,building:w.buildings.find(r=>r.industryId===b.id)});}
   if(['power','pump','workshop'].includes(b.theme))for(const dz of b.theme==='pump'?[-10,0,10]:b.theme==='power'?[-4,4]:[0]){const mesh=w.box(b.x,b.h-.5,b.z+dz,1.3,.08,.3,'',this.root,material);this.ceilingLamps.push({mesh,building:w.buildings.find(r=>r.industryId===b.id)});}
   const spill=new THREE.Mesh(new THREE.PlaneGeometry(3.7,2.3),new THREE.MeshBasicMaterial({color:'#edb879',transparent:true,opacity:.12,depthWrite:false}));spill.rotation.x=-Math.PI/2;spill.position.set(b.x,.051,b.z+b.d/2+1.8);this.root.add(spill);this.spills.push(spill);
  }
  this.indicators=INDUSTRY_PROJECTS.map(p=>{
   w.box(p.x,.65,p.z,.12,1.3,.12,'#8b9b89',this.root);w.box(p.x,1.3,p.z,.8,.65,.35,'#708d83',this.root);
   w.collider(p.x,p.z,.8,.4);
   const material=new THREE.MeshStandardMaterial({color:'#d7a16d',emissive:'#b78450',emissiveIntensity:1});const bulb=w.box(p.x+.22,1.35,p.z+.19,.1,.1,.035,'',this.root,material);return {p,bulb};
  });
  const r=INDUSTRY_WET,waterMat=w.waterMaterial.clone();waterMat.fragmentShader=waterMat.fragmentShader.replace('float edge=smoothstep(.5,.44,length(vUv-.5));','float edge=1.;');
  this.water=new THREE.Mesh(new THREE.PlaneGeometry(r.w,r.d),waterMat);this.water.rotation.x=-Math.PI/2;this.water.position.set(r.x,.55,r.z);this.root.add(this.water);
  // One light services the closest powered frontage, rather than one light per window.
  this.light=new THREE.PointLight('#ffd09a',0,11,1.7);w.scene.add(this.light);this.sync(true);
 }
 sync(force=false){
  const w=this.world,s=w.state,near=s.z<-190&&s.x>-125&&s.x<75,ids=s.restoredRoutes,powered=ids.includes('grid-feed'),drained=ids.includes('grid-drain'),opened=ids.includes('grid-gate');
  const key=[powered,drained,opened].join(':');this.gateCollider.disabled=opened;for(const c of this.openLeaves)c.disabled=!opened;
  if(force||this.lastKey!==key||this.lastNear!==near){this.lastKey=key;this.lastNear=near;this.root.visible=near;this.gate.visible=true;for(const {leaf,side}of this.gateLeaves)leaf.rotation.y=opened?-side*Math.PI/2:0;this.water.visible=!drained;for(const m of this.spills)m.visible=powered;
   for(const {p,bulb}of this.indicators){const ready=ids.includes(p.id);bulb.material.color.set(ready?'#a9d6b1':powered?'#e3c582':'#bd8c6e');bulb.material.emissive.copy(bulb.material.color);}w.renderDirty=true;
  }
  if(!near){this.light.intensity=0;return;}
  if(!drained)this.water.material.uniforms.time.value=w.time;
  let best=null,distance=Infinity;for(const win of this.windows){win.mesh.visible=powered&&!win.building.inside;const d=Math.hypot(win.mesh.position.x-s.x,win.mesh.position.z-s.z);if(win.mesh.visible&&d<distance){distance=d;best=win.mesh;}}
  let inside=false,insideDistance=Infinity;for(const lamp of this.ceilingLamps){lamp.mesh.visible=powered;if(lamp.building.inside){const d=Math.hypot(lamp.mesh.position.x-s.x,lamp.mesh.position.z-s.z);if(d<insideDistance){insideDistance=d;best=lamp.mesh;inside=true;}}}if(inside)distance=insideDistance;
  this.light.intensity=powered&&distance<20?5:0;if(best)this.light.position.set(best.position.x,inside?best.position.y-.25:1.7,best.position.z+(inside?0:1.1));
 }
}
