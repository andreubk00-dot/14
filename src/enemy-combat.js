import {DRONE_TYPES} from './survival.js';
export function segmentDistance(px,pz,ax,az,bx,bz){
 const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1)));
 return Math.hypot(px-ax-dx*t,pz-az-dz*t);
}
export function beginEnemyAttack(enemy,player,visible){
 const type=DRONE_TYPES[enemy.kind];
 if(!type?.attack||enemy.attack||enemy.cooldown>0||!visible||enemy.alert<=0||enemy.stagger>0||enemy.recover>0||Math.hypot(enemy.x-player.x,enemy.z-player.z)>type.reach)return false;
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
  if(a.kind!=='dash'){enemy.recover=type.settle;enemy.attack=null;return {kind:a.kind,x:a.x,z:a.z,damage:type.damage,radius:type.radius};}
  const dx=a.x-enemy.x,dz=a.z-enemy.z,d=Math.hypot(dx,dz)||1;
  a.dx=dx/d;a.dz=dz/d;a.phase='dash';a.elapsed=0;enemy.facing=Math.atan2(dx,dz);return null;
 }
 const step=Math.min(dt,Math.max(0,.32-(a.elapsed-dt))),ox=enemy.x,oz=enemy.z,steps=Math.ceil(9*step/.08);
 // Sweep the whole charge, retaining the safe part before even a thin obstacle.
 for(let i=0;i<steps;i++){const nx=enemy.x+a.dx*9*step/steps,nz=enemy.z+a.dz*9*step/steps;if(blocked(nx,nz,.35)){enemy.attack=null;break;}enemy.x=nx;enemy.z=nz;}
 if(a.elapsed>=.32)enemy.attack=null;if(!enemy.attack)enemy.recover=type.settle;
 return {kind:'dash',ax:ox,az:oz,bx:enemy.x,bz:enemy.z,damage:a.hit?0:type.damage,attack:a};
}

// Continuous projectile collision: a target before cover is hit, one behind it is safe.
// Mutate the existing bolt; no event object or array is allocated on each step.
function boltPathClear(bolt,world,d){return world.canSee(bolt.x,bolt.z,bolt.x+bolt.dx*d,bolt.z+bolt.dz*d)&&!world.blocked(bolt.x+bolt.dx*d,bolt.z+bolt.dz*d,.08);}
export function advanceEnemyBolt(bolt,dt,player,world){
 const step=Math.min(bolt.remaining,12*Math.max(0,dt));if(step<=0)return false;
 const ox=bolt.x,oz=bolt.z;let travel=step;
 if(!boltPathClear(bolt,world,step)){let lo=0,hi=step;for(let i=0;i<10;i++){const mid=(lo+hi)/2;if(boltPathClear(bolt,world,mid))lo=mid;else hi=mid;}travel=lo;bolt.remaining=0;}else bolt.remaining-=step;
 const px=player.x-ox,pz=player.z-oz,along=px*bolt.dx+pz*bolt.dz,side=px*bolt.dz-pz*bolt.dx;
 let hit=false;if(Math.abs(side)<.45){const contact=along-Math.sqrt(.45*.45-side*side);if(along>=0&&contact<=travel){travel=Math.max(0,contact);bolt.remaining=0;hit=true;}}
 bolt.x=ox+bolt.dx*travel;bolt.z=oz+bolt.dz*travel;return hit;
}
