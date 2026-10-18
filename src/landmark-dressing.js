import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {colourGeometry} from './static-colours.js';
// Three small vertex-colour batches; no extra lights, floor obstacles or tick work.
export function dressLandmark(w,room,kind){
 const pieces=[],box=(x,y,z,ww,hh,dd,color)=>pieces.push(w.box(x,y,z,ww,hh,dd,color));
 if(kind==='repair'){
  // Overhead trolley tracks and cable trays leave both workshop doors clear.
  for(const x of [-37.5,-32.5])box(x,room.h-.45,-96,.09,.14,9,'#7c9893');
  box(-35,room.h-.5,-98,5.3,.2,.2,'#a69976');box(-35,room.h-.8,-98,.4,.4,.4,'#637e76');
  for(const z of [-99,-97,-95])box(-39.75,2.5,z,.08,.12,1.4,'#a8ad93');
 }else if(kind==='warehouse'){
  // The old water line is below the surviving inventory labels.
  for(const x of [354,356,358,360,362,364,366,368]){
   box(x,.65,-11.8,1.8,.14,.025,'#5a746a');
   box(x,1.9,-11.79,.36,.24,.035,'#c1b38a');
  }
  for(const x of [355,367])box(x,2.65,-8,.09,.12,6,'#91a79a');
 }else{
  // A glazed picture rail and scalloped window valance distinguish the lakeside home.
  box(155,2.55,166.7,6,.09,.09,'#b6a382');
  for(let i=0;i<9;i++)box(151.8+i*.8,2.38,166.7,.5,.25,.06,i%2?'#9babb0':'#b8a39b');
  for(const x of [151,159]){box(x,2,166.7,.24,.75,.06,'#b8a39b');box(x,1.7,166.75,.3,.08,.09,'#c0ab7d');}
 }
 w.scene.updateMatrixWorld(true);
 const parts=pieces.map(m=>colourGeometry(m.geometry.clone().applyMatrix4(m.matrixWorld),m.material.color)),geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 for(const m of pieces){m.removeFromParent();m.geometry.dispose();}
 const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88}),mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.renderOrder=2;w.scene.add(mesh);w.cutawayDetail(mesh,room);material.dispose();mesh.userData.landmarkDressing=kind;
}
