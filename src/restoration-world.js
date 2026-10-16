import * as THREE from 'three';
import {RESTORATIONS,DRAIN_AREA,DRAIN_PASSAGE} from './restoration.js';
import {roadSurfaces,surfaceEdges} from './roads.js';
export class RestorationWorld{
 constructor(w){
  this.world=w;this.routes=[];
  for(const p of RESTORATIONS.filter(p=>p.decks)){
   const root=new THREE.Group(),complete=new THREE.Group(),broken=new THREE.Group();root.name=p.id;root.add(complete,broken);w.scene.add(root);
   for(const r of roadSurfaces(p.decks)){
    w.box(r.x,.12,r.z,r.w,.16,r.d,'#9a8b69',complete);
    const horizontal=r.w>r.d,length=horizontal?r.w:r.d;
    for(let n=-length/2+.5;n<length/2;n+=.6)w.box(r.x+(horizontal?n:0),.205,r.z+(horizontal?0:n),horizontal?.025:r.w,.008,horizontal?r.d:.025,'#655f4d',complete);
   }
   for(const e of surfaceEdges(p.decks)){
    // Keep entrances open; only long perimeter edges carry rails.
    const len=Math.max(e.w,e.d);if(len<3)continue;
    w.box(e.x,.92,e.z,e.w||.085,.1,e.d||.085,'#8e8a6d',complete);
    for(let n=-len/2+.35;n<len/2;n+=2.4)w.box(e.x+(e.w?n:0),.55,e.z+(e.d?n:0),.12,1.15,.12,'#758478',complete);
   }
   for(const e of p.ends){for(const side of [-1,1]){const vertical=Math.abs(e.x-p.decks[0].x)<.1;w.box(e.x+(vertical?side*1.15:0),.38,e.z+(vertical?0:side*1.15),.16,1.2,.16,'#768276',broken);}w.box(e.x,.12,e.z,1.2,.16,1.2,'#8c8061',broken);}
   this.routes.push({p,root,complete,broken});
  }
  this.water=[];
  for(const r of [DRAIN_AREA,DRAIN_PASSAGE]){
   const mat=w.flood?.waterSurface?.material.clone()||w.waterMaterial.clone();mat.fragmentShader=mat.fragmentShader.replace('float edge=smoothstep(.5,.44,length(vUv-.5));','float edge=1.;');
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(r.w-.35,r.d),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(r.x,.57,r.z);mesh.userData.streaming=true;w.scene.add(mesh);this.water.push(mesh);
  }
  const panel=new THREE.Group();panel.name='drain-control';w.scene.add(panel);w.box(278,.65,-57,.12,1.3,.12,'#788c80',panel);w.box(278,1.25,-57,.9,.65,.35,'#748b85',panel);
  const lamp=w.box(278.25,1.32,-56.81,.13,.13,.045,'#ce8b69',panel);lamp.material=new THREE.MeshStandardMaterial({color:'#bf805b',emissive:'#be764c',emissiveIntensity:.9});this.indicator=lamp;this.panel=panel;w.collider(278,-57,.9,.55);
  this.sync();
 }
 sync(){const w=this.world,ids=w.state.restoredRoutes,drained=ids.includes('drain-works');for(const {p,root,complete,broken}of this.routes){root.visible=Math.hypot(w.state.x-p.x,w.state.z-p.z)<125;complete.visible=ids.includes(p.id);broken.visible=!complete.visible;}for(const mesh of this.water){mesh.visible=!drained&&Math.hypot(w.state.x-280,w.state.z+73)<110;mesh.material.uniforms.time.value=w.time;}this.panel.visible=Math.hypot(w.state.x-278,w.state.z+57)<110;this.indicator.material.color.set(drained?'#92c5a4':'#bf805b');this.indicator.material.emissive.set(drained?'#6fae88':'#be764c');}
}
