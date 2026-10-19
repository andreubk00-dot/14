import * as THREE from 'three';
import {DRONE_TYPES} from './survival.js';
import {FLOOD_DOCKS,insideRect} from './floodplain.js';
import {onRestoredDeck} from './restoration.js';
const amber=new THREE.Color('#efc17f'),danger=new THREE.Color('#ed896d'),cold=new THREE.Color('#a5dcda');
const ring=new THREE.RingGeometry(.91,1,32);ring.rotateX(-Math.PI/2);
function capsule(radius,length){const s=new THREE.Shape();s.moveTo(-radius,0);s.lineTo(-radius,length);s.absarc(0,length,radius,Math.PI,0,true);s.lineTo(radius,0);s.absarc(0,0,radius,0,Math.PI,true);const g=new THREE.ShapeGeometry(s,12);g.rotateX(Math.PI/2);return g;}
const dash=capsule(.8,2.88),beam=new THREE.PlaneGeometry(.16,1);beam.rotateX(Math.PI/2);beam.translate(0,0,.5);
function warningElevation(world,x,z){
 if(onRestoredDeck(x,z,world.state.restoredRoutes))return .265;
 for(const dock of FLOOD_DOCKS)if(insideRect(x,z,dock))return .26;
 return world.furnitureElevation(x,z)+.06;
}
export function createEnemyWarning(){
 const warning=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:amber,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));warning.visible=false;warning.renderOrder=2;return warning;
}
export function updateEnemyWarning(enemy,world,near){
 const w=enemy.warning,a=enemy.attack,t=DRONE_TYPES[enemy.kind]||DRONE_TYPES.guardian;w.visible=near&&enemy.windup>0;if(!w.visible)return;
 const progress=Math.min(1,enemy.windup/t.windup);w.material.color.lerpColors(a?.kind==='shot'?cold:amber,danger,progress);w.material.opacity=.35+progress*.5;
 w.rotation.set(0,0,0);w.scale.set(1,1,1);
 if(a?.kind==='dash'){
  w.geometry=dash;w.position.set(enemy.x,Math.max(warningElevation(world,enemy.x,enemy.z),warningElevation(world,a.x,a.z)),enemy.z);w.rotation.y=Math.atan2(a.x-enemy.x,a.z-enemy.z);
 }else if(a?.kind==='shot'){
  // Aim is committed at attack start, and the line stops at existing cover.
  const facing=Math.atan2(a.x-enemy.x,a.z-enemy.z);
  if(a.warningLength===undefined||a.elapsed>=(a.nextWarningAt||0)||a.warningX!==enemy.x||a.warningZ!==enemy.z){a.nextWarningAt=a.elapsed+.15;a.warningX=enemy.x;a.warningZ=enemy.z;let lo=0,hi=9;if(world.canSee(enemy.x,enemy.z,enemy.x+Math.sin(facing)*hi,enemy.z+Math.cos(facing)*hi))lo=hi;else for(let i=0;i<10;i++){const m=(lo+hi)/2;if(world.canSee(enemy.x,enemy.z,enemy.x+Math.sin(facing)*m,enemy.z+Math.cos(facing)*m))lo=m;else hi=m;}a.warningLength=lo;}
  w.geometry=beam;w.position.set(enemy.x,Math.max(warningElevation(world,enemy.x,enemy.z),warningElevation(world,a.x,a.z)),enemy.z);w.rotation.y=facing;w.scale.z=a.warningLength;
 }else{
  const x=a?.x??enemy.x,z=a?.z??enemy.z,r=a?(t.radius||1.7):1.7;w.geometry=ring;w.position.set(x,warningElevation(world,x,z),z);w.scale.set(r,1,r);
 }
}
