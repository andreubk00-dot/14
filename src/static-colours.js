import * as THREE from 'three';
const keys=new WeakMap();
// Only immutable, ordinary, untextured surfaces can share a white material.
// Every other material setting remains part of the key.
export function staticColourKey(material){
 if(!material?.isMeshStandardMaterial||material.isMeshPhysicalMaterial||material.transparent||material.opacity!==1||material.vertexColors||material.side!==THREE.FrontSide||material.shadowSide!==null||material.alphaTest||material.wireframe||material.clippingPlanes?.length||material.emissive.getHex()!==0||material.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)return null;
 if(Object.keys(material.userData).length)return null;
 if(Object.values(material).some(v=>v?.isTexture))return null;
 if(!keys.has(material)){const data=material.toJSON();for(const key of ['uuid','name','metadata','color'])delete data[key];keys.set(material,JSON.stringify(data));}
 return keys.get(material);
}
export function colourGeometry(geometry,colour){
 const values=new Float32Array(geometry.attributes.position.count*3);
 for(let i=0;i<values.length;i+=3){values[i]=colour.r;values[i+1]=colour.g;values[i+2]=colour.b;}
 geometry.setAttribute('color',new THREE.BufferAttribute(values,3));return geometry;
}
