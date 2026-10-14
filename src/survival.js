export const DRONE_TYPES={
 guardian:{name:'Охранник',vision:6.2,angle:Math.PI*.72,speed:1.8,patrolSpeed:1,windup:.8,damage:11},
 scout:{name:'Дозорный',vision:8,angle:Math.PI*.6,speed:2.3,patrolSpeed:1.3,windup:.65,damage:8},
};
export function gearProfile(state,recipes) {
 const worn=Object.values(state.equipment).map(id=>recipes.find(r=>r.id===id)).filter(Boolean);
 return {speed:worn.reduce((n,r)=>n*(r.speedMultiplier||1),1),visibility:worn.reduce((n,r)=>n*(r.visibilityMultiplier||1),1)};
}
export function segmentHitsRect(ax,az,bx,bz,r) {
 const c=Math.cos(r.rotation||0),s=Math.sin(r.rotation||0),local=(x,z)=>[(x-r.x)*c-(z-r.z)*s,(x-r.x)*s+(z-r.z)*c];
 const a=local(ax,az),b=local(bx,bz);let lo=0,hi=1;
 for(let i=0;i<2;i++){const half=(i?r.d:r.w)/2,delta=b[i]-a[i];if(Math.abs(delta)<1e-8){if(Math.abs(a[i])>half)return false;continue;}let t1=(-half-a[i])/delta,t2=(half-a[i])/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false;}
 return hi>.001&&lo<.999;
}
export function droneSees(enemy,state,lineOfSight,visibility=1) {
 const type=DRONE_TYPES[enemy.kind]||DRONE_TYPES.guardian,d=Math.hypot(state.x-enemy.x,state.z-enemy.z);
 if(d>type.vision*visibility||!lineOfSight)return false;
 const angle=Math.atan2(state.x-enemy.x,state.z-enemy.z)-(enemy.facing||0);
 return enemy.alert>0||d<1.6||Math.cos(angle)>Math.cos(type.angle/2);
}
export function attackCharge(enemy,dt,inReach,visible) {
 const type=DRONE_TYPES[enemy.kind]||DRONE_TYPES.guardian;
 if(!inReach||!visible||enemy.cooldown>0){enemy.windup=0;return false;}
 enemy.windup=(enemy.windup||0)+dt;
 if(enemy.windup<type.windup)return false;
 enemy.windup=0;enemy.cooldown=1.6;return true;
}

export function updateAwareness(enemy,dt,seen,player,distance){
 enemy.suspicion=Math.max(0,Math.min(1,(enemy.suspicion||0)+(seen?dt/.65:-dt*.8)));
 if(seen&&distance<1.8)enemy.suspicion=1;
 if(seen&&enemy.suspicion>=1){enemy.alert=3;enemy.lastSeen={x:player.x,z:player.z};}
 else enemy.alert=Math.max(0,(enemy.alert||0)-dt);
 return enemy.alert>0;
}
export function reactToHit(enemy,player){
 enemy.alert=3;enemy.suspicion=1;enemy.stagger=.18;enemy.windup=0;enemy.route=null;enemy.routeAt=-Infinity;
 const dx=player.x-enemy.originX,dz=player.z-enemy.originZ,d=Math.hypot(dx,dz)||1,f=Math.min(1,8.5/d);enemy.lastSeen={x:enemy.originX+dx*f,z:enemy.originZ+dz*f};
}
