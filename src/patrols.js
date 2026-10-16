// Keep existing drone identities and population; only their idle routes change.
export const PATROL_ROUTES={
 'drone-4':[[48,20],[53,20],[57,24],[52,27],[47,23]],
 'drone-6':[[-47,-24],[-47,-18],[-50,-14],[-52,-14]],
 'drone-16':[[-155,28],[-155,36],[-159,38],[-159,32]],
 'drone-17':[[-160,45],[-156,48],[-160,51],[-164,48]],
 'drone-18':[[-162,22],[-158,24],[-158,28],[-164,30]],
 'drone-19':[[-162,118],[-160,113],[-156,114],[-156,120],[-160,125],[-164,124]],
 'drone-20':[[-151,114],[-149,117],[-151,122],[-154,119]],
 'drone-22':[[-48,172],[-44,177],[-48,182],[-52,177]],
 'drone-23':[[-26,161],[-22,165],[-26,169],[-30,165]],
};
export function patrolRoute(id,origin,blocked){
 const desired=PATROL_ROUTES[id]||[[origin.x,origin.z+2.2],[origin.x+2.2,origin.z],[origin.x,origin.z-2.2],[origin.x-2.2,origin.z]],route=[];
 for(const [x,z]of desired){const free=[];for(let dx=-1.5;dx<=1.5;dx+=.5)for(let dz=-1.5;dz<=1.5;dz+=.5){const p={x:x+dx,z:z+dz};if(Math.hypot(p.x-origin.x,p.z-origin.z)<9&&!blocked(p.x,p.z,.4))free.push({...p,d:dx*dx+dz*dz});}free.sort((a,b)=>a.d-b.d);if(free.length&&!route.some(p=>Math.hypot(p.x-free[0].x,p.z-free[0].z)<.5))route.push({x:free[0].x,z:free[0].z});}
 return route.length?route:[{...origin}];
}
export function idlePatrolTarget(enemy,blocked){
 const route=enemy.patrolRoute;if(!route?.length)return null;
 const p=route[enemy.patrolIndex%route.length];if(Math.hypot(enemy.x-p.x,enemy.z-p.z)<.35||blocked(p.x,p.z,.35)){enemy.patrolIndex=(enemy.patrolIndex+1)%route.length;enemy.route=null;enemy.routeAt=-Infinity;return null;}return p;
}
