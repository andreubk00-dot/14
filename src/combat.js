// Simulation owns hit timing; animation and frame rate do not grant extra damage.
export function swingProfile(id){return id==='spear'?{hitAt:.24,duration:.52,arc:.38,push:.35}:id==='unarmed'?{hitAt:.14,duration:.35,arc:.95,push:.12}:{hitAt:.2,duration:.48,arc:1.1,push:.25};}
export function swingCanHit(swing,player,target,lineOfSight){
 if(!target||target.health<=0||!lineOfSight)return false;
 const dx=target.x-player.x,dz=target.z-player.z,d=Math.hypot(dx,dz);
 return d<=swing.weapon.range+.05&&(d<.05||Math.cos(Math.atan2(dx,dz)-swing.facing)>=Math.cos(swing.profile.arc));
}
export function advanceSwing(swing,dt){
 const previous=swing.elapsed;swing.elapsed+=Math.max(0,dt);
 if(!swing.resolved&&previous<=swing.profile.hitAt&&swing.elapsed>=swing.profile.hitAt){swing.resolved=true;return true;}return false;
}
