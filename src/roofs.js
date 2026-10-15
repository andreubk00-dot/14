export function isInsideBuilding(building, x, z) {
  return Math.abs(x-building.x) <= building.w/2 + 0.25 && Math.abs(z-building.z) <= building.d/2 + 0.25;
}
export function fadeOpacity(current, target, dt) {
  return current + (target-current)*(1-Math.exp(-Math.max(0,dt)*8));
}

// Fully restored walls belong in the opaque pass so they can reject hidden fragments.
export function updateCutawayMaterial(material,target,dt){
 const next=fadeOpacity(material.opacity,target,dt);
 material.opacity=Math.abs(next-target)<=.0001?target:next;
 const transparent=material.opacity<1;
 if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
 material.depthWrite=material.opacity>.98;
 return material.opacity===target;
}
