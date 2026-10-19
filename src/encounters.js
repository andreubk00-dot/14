// Loading stock beside the main path; protects the northern approach from the
// existing quarry gunner without blocking the west bypass or adding any loot.
export const COMBAT_COVERS=[{id:'quarry-loading',x:-151.5,z:110,w:2.6,d:.8,h:1.35}];
export function buildCombatCover(w){
 for(const c of COMBAT_COVERS){
  w.box(c.x,.1,c.z,c.w+.1,.2,c.d+.1,'#776d55');
  for(const dx of [-.66,.66]){w.box(c.x+dx,.75,c.z,1.24,1.1,c.d,'#7b8775');for(const y of [.3,1.18])w.box(c.x+dx,y,c.z+.415,1.26,.09,.035,'#b1a385');}
  const collider=w.collider(c.x,c.z,c.w+.1,c.d+.1);collider.cover=true;
 }
}
