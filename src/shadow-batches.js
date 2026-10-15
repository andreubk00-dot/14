import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Shadow depth ignores the solid surface's colour. Merge only immovable, opaque,
// ordinary front-sided meshes; interactive and fading geometry stays independent.
export function staticShadowBatches(scene,meshes,shadowFrustum){
 const cells=new Map(),center=new THREE.Vector3();
 for(const mesh of meshes){
  const m=mesh.material,g=mesh.geometry;
  if(!mesh.userData.staticBatch||mesh.userData.cutaway||!mesh.castShadow||!mesh.visible||Array.isArray(m)||!m.isMeshStandardMaterial||m.transparent||m.side!==THREE.FrontSide||m.shadowSide!==null||m.map||m.alphaMap||m.displacementMap||m.alphaTest||m.wireframe||m.clippingPlanes?.length||m.polygonOffset)continue;
  g.computeBoundingBox();g.boundingBox.getCenter(center).applyMatrix4(mesh.matrixWorld);
  const key=`${Math.floor(center.x/24)}:${Math.floor(center.z/24)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(mesh);
 }
 const batches=[],material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
 for(const sources of cells.values()){
  if(sources.length<2)continue;
  const parts=sources.map(mesh=>{const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry;const part=new THREE.BufferGeometry().setAttribute('position',g.attributes.position.clone()).applyMatrix4(mesh.matrixWorld);if(g!==mesh.geometry)g.dispose();return part;});
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)continue;
  geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.userData.staticShadowBatch=true;
  // Three asks this separately for the colour camera and directional shadow camera.
  // Accept only the sun's own frustum: the proxy never enters a colour render list.
  const intersects=mesh.intersectsFrustum.bind(mesh);
  mesh.intersectsFrustum=frustum=>frustum===shadowFrustum&&intersects(frustum);
  scene.add(mesh);mesh.updateMatrixWorld(true);mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;
  sources.forEach(m=>m.castShadow=false);batches.push({mesh,sources});
 }
 if(!batches.length)material.dispose();return batches;
}
