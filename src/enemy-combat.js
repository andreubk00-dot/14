import {DRONE_TYPES} from './survival.js';
export function segmentDistance(px,pz,ax,az,bx,bz){
 const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1)));
 return Math.hypot(px-ax-dx*t,pz-az-dz*t);
}
export function beginEnemyAttack(enemy,player,visible){
 const type=DRONE_TYPES[enemy.kind];
 if(!type?.attack||enemy.attack||enemy.cooldown>0||!visible||enemy.alert<=0||enemy.stagger>0||Math.hypot(enemy.x-player.x,enemy.z-player.z)>type.reach)return false;
 enemy.facing=Math.atan2(player.x-enemy.x,player.z-enemy.z);
 enemy.attack={kind:type.attack,x:player.x,z:player.z,elapsed:0,phase:'windup'};enemy.windup=.001;return true;
}
export function advanceEnemyAttack(enemy,dt,blocked){
 const a=enemy.attack,type=DRONE_TYPES[enemy.kind];if(!a)return null;
 a.elapsed+=dt;
 if(a.phase==='windup'){
  enemy.windup=Math.min(a.elapsed,type.windup);
  if(a.elapsed+1e-9<type.windup)return null;
  enemy.windup=0;enemy.cooldown=type.recovery;
  if(a.kind!=='dash'){enemy.attack=null;return {kind:a.kind,x:a.x,z:a.z,damage:type.damage,radius:type.radius};}
  const dx=a.x-enemy.x,dz=a.z-enemy.z,d=Math.hypot(dx,dz)||1;
  a.dx=dx/d;a.dz=dz/d;a.phase='dash';a.elapsed=0;enemy.facing=Math.atan2(dx,dz);return null;
 }
 const step=Math.min(dt,Math.max(0,.32-(a.elapsed-dt))),ox=enemy.x,oz=enemy.z,nx=ox+a.dx*9*step,nz=oz+a.dz*9*step;
 if(blocked(nx,nz,.35)){enemy.attack=null;return null;}
 enemy.x=nx;enemy.z=nz;if(a.elapsed>=.32)enemy.attack=null;
 return {kind:'dash',ax:ox,az:oz,bx:nx,bz:nz,damage:a.hit?0:type.damage,attack:a};
}
