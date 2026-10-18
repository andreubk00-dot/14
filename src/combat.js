// Simulation owns hit timing; animation and frame rate do not grant extra damage.
export function swingProfile(id){return MELEE[id]||MELEE.pipe;}
export function swingCanHit(swing,player,target,lineOfSight){
 if(!target||target.health<=0||!lineOfSight)return false;
 const dx=target.x-player.x,dz=target.z-player.z,d=Math.hypot(dx,dz);
 return d<=swing.weapon.range+.05&&(d<.05||Math.cos(Math.atan2(dx,dz)-swing.facing)>=Math.cos(swing.profile.arc));
}
// Resolve against the world at contact: a closer actor can intercept a swing,
// but the direction remains the one committed at its start.
export function selectMeleeTarget(swing,player,enemies,lineOfSight){
 let target=null,nearest=Infinity;
 for(const enemy of enemies){
  if(!swingCanHit(swing,player,enemy,true))continue;
  const distance=(enemy.x-player.x)**2+(enemy.z-player.z)**2;
  if(distance<nearest&&lineOfSight(enemy)){target=enemy;nearest=distance;}
 }
 return target;
}
export function advanceSwing(swing,dt){
 const previous=swing.elapsed;swing.elapsed+=Math.max(0,dt);
 if(!swing.resolved&&previous<=swing.profile.hitAt&&swing.elapsed>=swing.profile.hitAt){swing.resolved=true;return true;}return false;
}

export const MELEE={
 unarmed:{hitAt:.14,duration:.35,arc:.95,push:.12,stamina:4,power:0,mobility:1},
 knife:{hitAt:.11,duration:.28,arc:.65,push:.05,stamina:6,power:0,mobility:1},
 pipe:{hitAt:.2,duration:.48,arc:1.1,push:.25,stamina:9,power:1,mobility:.8},
 spear:{hitAt:.24,duration:.52,arc:.38,push:.35,stamina:12,power:2,mobility:.75},
 heavyaxe:{hitAt:.48,duration:.9,arc:.85,push:.6,stamina:24,power:3,mobility:.45},
};
export const GUNS={stunner:{heat:.6,cooling:.16,spread:.012,movingSpread:.05,power:3},pistol:{heat:.22,cooling:.16,spread:.025,movingSpread:.09},carbine:{heat:.3,cooling:.16,spread:.018,movingSpread:.065}};
export function coolWeapons(state,dt){for(const [id,g]of Object.entries(GUNS)){state.gunHeat[id]=Math.max(0,state.gunHeat[id]-Math.max(0,dt)*g.cooling);if(state.gunHeat[id]<=.3)state.gunLocked[id]=false;}}
export function fireCharge(state,id){
 const g=GUNS[id];if(!g)return {ok:false,reason:'Это не стрелковое оружие'};
 if(state.gunLocked[id])return {ok:false,reason:'Оружие перегрето. R — охладить'};
 if(state.ammo<=0)return {ok:false,reason:'Нет зарядов. Создай их на станции или возьми трубу'};
 state.ammo--;state.gunHeat[id]=Math.min(1,state.gunHeat[id]+g.heat);if(state.gunHeat[id]>=1)state.gunLocked[id]=true;return {ok:true};
}
export function shotSpread(id,moving,aiming){const g=GUNS[id];return (moving?g.movingSpread:g.spread)*(aiming?.25:1);}
export function traceShot(player,facing,range,enemies,clear,spread=0,sample=.5){
 const angle=facing+(Math.max(0,Math.min(1,sample))*2-1)*spread,dx=Math.sin(angle),dz=Math.cos(angle);
 let limit=range;if(!clear(player.x+dx*range,player.z+dz*range)){let lo=0,hi=range;for(let i=0;i<10;i++){const m=(lo+hi)/2;if(clear(player.x+dx*m,player.z+dz*m))lo=m;else hi=m;}limit=lo;}
 let target=null,distance=limit;
 for(const e of enemies){if(e.health<=0)continue;const x=e.x-player.x,z=e.z-player.z,along=x*dx+z*dz,side=x*dz-z*dx,r=.42;if(along<0||Math.abs(side)>r)continue;const contact=Math.max(0,along-Math.sqrt(r*r-side*side));if(contact<distance){target=e;distance=contact;}}
 return {target,x:player.x+dx*distance,z:player.z+dz*distance,angle};
}
export const DODGE={cost:24,duration:.22,speed:11,cooldown:1.05};
export function beginDodge(state,dx,dz){
 if(state.boat.aboard||state.elapsed<(state.dodgeReadyAt||0)||state.stamina<DODGE.cost)return null;
 const d=Math.hypot(dx,dz);if(d<.01)return null;
 state.stamina-=DODGE.cost;state.dodgeReadyAt=state.elapsed+DODGE.cooldown;return {dx:dx/d,dz:dz/d,remaining:DODGE.duration};
}
export function advanceDodge(dodge,dt,move){const time=Math.min(Math.max(0,dt),dodge.remaining),steps=Math.ceil(DODGE.speed*time/.1);for(let i=0;i<steps;i++)move(dodge.dx*DODGE.speed*time/steps,dodge.dz*DODGE.speed*time/steps);dodge.remaining=Math.max(0,dodge.remaining-time);return dodge.remaining>1e-9;}
