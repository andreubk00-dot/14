// Geometry shared by movement, furnishing previews and district checks.
export const FURNITURE = {
  lamp:[1.2,.5], bed:[1.5,2.3], garden:[2,1.6], seedbed:[2,1.6],
  chest:[1.32,1.4], sofa:[2.6,1.25], planter:[1,1], rug:[2.2,1.6],
  purifier:[1.7,1], recycler:[1.6,1.3],
};
export function footprint(item) {
  const [w,d]=FURNITURE[item.id]||[1.5,1.5];
  return {x:item.x,z:item.z,w,d,rotation:item.rotation||0,id:item.id};
}
export function solidFootprint(item) { const rect=footprint(item); return item.id==='lamp'?{...rect,w:.14,d:.14}:rect; }
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
export function placementAllowed(item,obstacles,placed,ignore=-1) {
  const rect=footprint(item),c=Math.abs(Math.cos(rect.rotation)),s=Math.abs(Math.sin(rect.rotation));
  const ex=(rect.w*c+rect.d*s)/2,ez=(rect.w*s+rect.d*c)/2;
  if(rect.x-ex < -25 || rect.x+ex > -7 || rect.z-ez < 7 || rect.z+ez > 25) return false;
  // Keep doors, the yard gate and the approach to each interaction clear.
  const passages=[{x:-18,z:19.5,w:2.4,d:2.2},{x:-12,z:16,w:2.2,d:2.4},{x:-8.7,z:20,w:2,d:3},{x:-21,z:14.6,w:2.2,d:1},{x:-13.5,z:18.5,w:1.4,d:1},{x:-22,z:19,w:1.8,d:1}];
  if([...obstacles.filter(o=>!o.disabled),...passages].some(o=>overlaps(rect,o,.12))) return false;
  return placed.every((p,i)=>i===ignore || item.id==='rug' || p.id==='rug' || !overlaps(rect,footprint(p),.15));
}
export function repairFurniture(obstacles,placed) {
  let moved=0;
  placed.forEach((item,index)=>{
    if(placementAllowed(item,obstacles,placed,index)) return;
    const candidates=[];
    for(let x=-24;x<=-8;x++) for(let z=8;z<=24;z++) candidates.push({x,z,distance:Math.hypot(x-item.x,z-item.z)});
    candidates.sort((a,b)=>a.distance-b.distance);
    const target=candidates.find(p=>placementAllowed({...item,x:p.x,z:p.z},obstacles,placed,index));
    if(target) { item.x=target.x;item.z=target.z;moved++; }
  });
  return moved;
}
