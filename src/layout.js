// Geometry shared by movement, furnishing previews and district checks.
import {gridPath} from './navigation.js';
export const FURNITURE = {
 pumpcontroller:[1.1,.7],cagelamp:[.8,.8],workawning:[2.8,1.8],
 salvagejig:[1.4,.8],packingdesk:[1.4,.8],estatepanel:[1.4,.15],
 cargorack:[1.8,.75],
 yardfence:[2,.2],yardgate:[2,.2],yardpath:[2,2],
 campstove:[1.06,.86],toolcabinet:[1.4,.7],
  desklamp:[.75,.65],homeradio:[1,.65],wallshelf:[1.4,.24],raincatcher:[1.2,1.2],dryrack:[2.1,1.1],gearrack:[1.8,.7],fishtrophy:[.8,.15],foundlamp:[.8,.8],armchair:[1.4,1.3],recordplayer:[1.2,.75],wallclock:[.8,.15],cropbed:[2,1.6],bouquet:[.6,.6],lamp:[1.2,.5], bed:[1.5,2.3], garden:[2,1.6], seedbed:[2,1.6],
  chest:[1.32,1.4], sofa:[2.6,1.25], planter:[1,1], rug:[2.2,1.6],
  purifier:[1.7,1], recycler:[1.6,1.3],
};
export function footprint(item) {
  const [w,d]=FURNITURE[item.id]||[1.5,1.5];
  return {x:item.x,z:item.z,w,d,rotation:item.rotation||0,id:item.id};
}
export function solidFootprint(item) { const rect=footprint(item); return item.id==='lamp'?{...rect,w:.14,d:.14}:rect; }
export function furnitureColliders(item){
 if(item.id==='workawning'){const r=item.rotation||0,c=Math.cos(r),s=Math.sin(r);return [-1.25,1.25].flatMap(x=>[-.75,.75].map(z=>({x:item.x+x*c+z*s,z:item.z-x*s+z*c,w:.12,d:.12,rotation:r})));}
 if(['rug','yardpath','wallclock','wallshelf','fishtrophy','estatepanel'].includes(item.id))return [];
 if(item.id!=='yardgate'||!item.open)return [solidFootprint(item)];
 const c=Math.cos(item.rotation||0),s=Math.sin(item.rotation||0),rect=(x,z,w,d)=>({x:item.x+x*c+z*s,z:item.z-x*s+z*c,w,d,rotation:item.rotation||0});
 return [rect(-.94,0,.12,.2),rect(.94,0,.12,.2),rect(-.82,-.82*(item.openSide||1),.14,1.64)];
}
export function yardRouteClear(state,item,obstacles,ignore=-1){
 if(!['yardgate','yardfence'].includes(item.id))return true;
 const solids=[...obstacles.filter(o=>!o.disabled),...state.placed.filter((_,i)=>i!==ignore).flatMap(furnitureColliders),...furnitureColliders(item)];
 const blocked=(x,z)=>x<-52||x>-12||z<10||z>54||solids.some(r=>circleHitsRect(x/2,z/2,.3,r));
 const start={x:Math.round(state.x*2),z:Math.round(state.z*2)},goal={x:-36,z:41};
 if(blocked(start.x,start.z)||blocked(goal.x,goal.z))return false;
 return (start.x===goal.x&&start.z===goal.z)||gridPath(start,goal,blocked,2000).length>0;
}
function axes(r) { const c=Math.cos(r.rotation||0),s=Math.sin(r.rotation||0); return [[c,-s],[s,c]]; }
export function overlaps(a,b,gap=0) {
  const aa=axes(a),bb=axes(b),dx=b.x-a.x,dz=b.z-a.z;
  return [...aa,...bb].every(([x,z])=>{
    const project=(r,ax)=>(r.w/2)*Math.abs(x*ax[0][0]+z*ax[0][1])+(r.d/2)*Math.abs(x*ax[1][0]+z*ax[1][1]);
    return Math.abs(dx*x+dz*z)<project(a,aa)+project(b,bb)+gap;
  });
}
export function circleHitsRect(x,z,radius,rect) {
  const c=Math.cos(rect.rotation||0),s=Math.sin(rect.rotation||0),dx=x-rect.x,dz=z-rect.z;
  const lx=dx*c-dz*s,lz=dx*s+dz*c;
  const ex=Math.max(Math.abs(lx)-rect.w/2,0),ez=Math.max(Math.abs(lz)-rect.d/2,0);
  return ex*ex+ez*ez<radius*radius || (Math.abs(lx)<rect.w/2 && Math.abs(lz)<rect.d/2);
}
export function placementStatus(item,obstacles,placed,ignore=-1,construction=[]) {
 const yard=['yardfence','yardgate','yardpath'].includes(item.id),flat=item.id==='rug'||item.id==='yardpath';
 if(yard&&(overlaps(footprint(item),{x:-18,z:15,w:12,d:9},.12)||construction.some(p=>p.id==='floor'&&overlaps(footprint(item),{...p,w:2,d:2},.05))))return {ok:false,reason:'Ограду и дорожки ставят во дворе, вне дома и пристройки'};
 if(['wallclock','fishtrophy','wallshelf','estatepanel'].includes(item.id)) {
  const anchor=clockAnchor(item.x,item.z,item.id,construction);
  if(!anchor||Math.hypot(item.x-anchor.x,item.z-anchor.z)>=.05||Math.cos((item.rotation||0)-anchor.rotation)<=.99)return {ok:false,reason:'Выбери стену внутри убежища'};
  if(placed.some((p,i)=>i!==ignore&&['wallclock','fishtrophy','wallshelf','estatepanel'].includes(p.id)&&Math.hypot(p.x-item.x,p.z-item.z)<=(footprint(p).w+footprint(item).w)/2+.1))return {ok:false,reason:'Этот участок стены уже занят'};
  return {ok:true};
 }
 const rect=footprint(item),c=Math.abs(Math.cos(rect.rotation)),s=Math.abs(Math.sin(rect.rotation));
 const ex=(rect.w*c+rect.d*s)/2,ez=(rect.w*s+rect.d*c)/2;
 if(rect.x-ex < -25 || rect.x+ex > -7 || rect.z-ez < 7 || rect.z+ez > (construction.length?25.5:25))return {ok:false,reason:'Вещь должна целиком помещаться в границы убежища'};
 if(item.id==='workawning'&&(overlaps(rect,{x:-18,z:15,w:12,d:9},.2)||construction.some(p=>p.id==='floor'&&overlaps(rect,{...p,w:2,d:2},.05))))return {ok:false,reason:'Навес ставится во дворе, вне дома и пристройки'};
 if(item.id==='raincatcher'&&overlaps(rect,{x:-18,z:15,w:12,d:9},.1))return {ok:false,reason:'Накопителю нужен открытый участок двора'};
 const passages=[{x:-18,z:19.5,w:2.4,d:2.2},{x:-12,z:16,w:2.2,d:2.4},{x:-8.7,z:20,w:2,d:3},{x:-21,z:14.6,w:2.2,d:1},{x:-13.5,z:18.5,w:1.4,d:1},{x:-22,z:19,w:1.8,d:1}];
 const doors=construction.filter(p=>p.id==='door').map(p=>p.axis==='x'?{x:p.x,z:p.z,w:1.2,d:1.5}:{x:p.x,z:p.z,w:1.5,d:1.2});
 if([...doors,...(flat?[]:passages)].some(o=>overlaps(rect,o,.12)))return {ok:false,reason:'Оставь свободными дверь и подход к станции'};
 if(obstacles.some(o=>!o.disabled&&overlaps(rect,o,.12)))return {ok:false,reason:'Здесь мешает стена или другой объект'};
 if(placed.some((p,i)=>i!==ignore&&!flat&&p.id!=='yardpath'&&!['wallclock','fishtrophy','wallshelf','estatepanel'].includes(p.id)&&p.id!=='rug'&&overlaps(rect,footprint(p),yard&&['yardfence','yardgate'].includes(p.id)?0:.15)))return {ok:false,reason:'Здесь уже стоит мебель'};
 return {ok:true};
}
export function placementAllowed(...args){return placementStatus(...args).ok;}
// Small increments keep mouse placement precise without changing structural module snapping.
export const furniturePoint=(x,z)=>({x:Math.round(x*10)/10,z:Math.round(z*10)/10});
export function repairFurniture(obstacles,placed,construction=[]) {
  let moved=0;
  placed.forEach((item,index)=>{
    if(placementAllowed(item,obstacles,placed,index,construction)) return;
    if(['wallclock','fishtrophy','wallshelf','estatepanel'].includes(item.id)) {
      const spots=[];for(let x=-23;x<=-13;x+=.5) {const p=clockAnchor(x,10.66,item.id,construction);if(placementAllowed({...item,...p},obstacles,placed,index,construction)) spots.push(p);}
      spots.sort((a,b)=>Math.hypot(a.x-item.x,a.z-item.z)-Math.hypot(b.x-item.x,b.z-item.z));if(spots[0]) {Object.assign(item,spots[0]);moved++;}return;
    }
    const candidates=[];
    for(let x=-24;x<=-8;x++) for(let z=8;z<=24;z++) candidates.push({x,z,distance:Math.hypot(x-item.x,z-item.z)});
    candidates.sort((a,b)=>a.distance-b.distance);
    const target=candidates.find(p=>placementAllowed({...item,x:p.x,z:p.z},obstacles,placed,index,construction));
    if(target) { item.x=target.x;item.z=target.z;moved++; }
  });
  return moved;
}

export function clockAnchor(x,z,id='wallclock',construction=[]) {
 const padding=Math.max(0,(FURNITURE[id]?.[0]||.8)-.8)/2;
 const candidates=[];
 for(const [axis,fixed,start,end,rotation] of [['z',10.66,-23.4,-12.6,0],['x',-23.84,11.2,18.8,Math.PI/2],['z',19.34,-23.4,-19.8,Math.PI],['z',19.34,-16.2,-12.6,Math.PI],['x',-12.16,11.2,14.2,-Math.PI/2],['x',-12.16,17.8,18.8,-Math.PI/2]]) {
  const value=Math.max(start+padding,Math.min(end-padding,axis==='z'?x:z));const p=axis==='z'?{x:value,z:fixed,rotation}:{x:fixed,z:value,rotation};candidates.push(p);
 }
 for(const wall of construction.filter(p=>p.id==='wall')){
  const half=(FURNITURE[id]?.[0]||.8)/2+.1;if(half>=1)continue;
  for(const side of [-1,1]){const value=Math.max(-1+half,Math.min(1-half,wall.axis==='x'?x-wall.x:z-wall.z));candidates.push(wall.axis==='x'?{x:wall.x+value,z:wall.z+side*.105,rotation:side>0?0:Math.PI}:{x:wall.x+side*.105,z:wall.z+value,rotation:side>0?Math.PI/2:-Math.PI/2});}
 }
 candidates.sort((a,b)=>Math.hypot(x-a.x,z-a.z)-Math.hypot(x-b.x,z-b.z));
 return Math.hypot(x-candidates[0].x,z-candidates[0].z)<=2.2?candidates[0]:null;
}
