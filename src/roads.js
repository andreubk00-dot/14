// Disjoint surface strips: junctions have one owner and world-space UVs.
const merge=values=>{const out=[];for(const [a,b]of values.sort((a,b)=>a[0]-b[0])){const last=out.at(-1);if(last&&a<=last[1]+1e-8)last[1]=Math.max(last[1],b);else out.push([a,b]);}return out;};
const subtract=(values,cuts)=>values.flatMap(([a,b])=>{let parts=[[a,b]];for(const [c,d]of cuts)parts=parts.flatMap(([l,r])=>d<=l||c>=r?[[l,r]]:[[l,Math.min(r,c)],[Math.max(l,d),r]].filter(([l,r])=>r-l>1e-8));return parts;});
export function roadSurfaces(roads,cell=24){
 if(!roads.length)return [];const edges=roads.flatMap(r=>[r.z-r.d/2,r.z+r.d/2]),min=Math.min(...edges),max=Math.max(...edges);
 for(let z=Math.ceil(min/cell)*cell;z<max;z+=cell)edges.push(z);const zs=[...new Set(edges)].sort((a,b)=>a-b),out=[];let previous=new Map();
 for(let i=0;i<zs.length-1;i++){const a=zs[i],b=zs[i+1],z=(a+b)/2,active=roads.filter(r=>Math.abs(z-r.z)<r.d/2),hard=merge(active.filter(r=>!r.garden).map(r=>[r.x-r.w/2,r.x+r.w/2])),soft=subtract(merge(active.filter(r=>r.garden).map(r=>[r.x-r.w/2,r.x+r.w/2])),hard),next=new Map();
  for(const [garden,intervals]of [[false,hard],[true,soft]])for(const [left,right]of intervals)for(let x=left;x<right-1e-8;){const end=Math.min(right,(Math.floor((x+1e-8)/cell)+1)*cell),key=`${garden}:${x}:${end}`,prior=previous.get(key);
   let tile;if(prior&&Math.abs((prior.z+prior.d/2)-a)<1e-8&&Math.abs(a/cell-Math.round(a/cell))>1e-8){prior.d=b-(prior.z-prior.d/2);prior.z=b-prior.d/2;tile=prior;}else {tile={x:(x+end)/2,z,w:end-x,d:b-a,garden};out.push(tile);}next.set(key,tile);x=end;
  }previous=next;
 }return out;
}
// Union boundary, also used for bridge rails without rails across a turning junction.
export function surfaceEdges(rects){
 const xs=[...new Set(rects.flatMap(r=>[r.x-r.w/2,r.x+r.w/2]))].sort((a,b)=>a-b),zs=[...new Set(rects.flatMap(r=>[r.z-r.d/2,r.z+r.d/2]))].sort((a,b)=>a-b),edges=[];
 const inside=(x,z)=>rects.some(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2);
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){const a=xs[i],b=xs[i+1],c=zs[j],d=zs[j+1];if(!inside((a+b)/2,(c+d)/2))continue;
  if(!inside(a-.001,(c+d)/2))edges.push({x:a,z:(c+d)/2,w:0,d:d-c});if(!inside(b+.001,(c+d)/2))edges.push({x:b,z:(c+d)/2,w:0,d:d-c});if(!inside((a+b)/2,c-.001))edges.push({x:(a+b)/2,z:c,w:b-a,d:0});if(!inside((a+b)/2,d+.001))edges.push({x:(a+b)/2,z:d,w:b-a,d:0});
 }return edges;
}
// Curb breaks follow crossing widths, including small footpath entrances.
export function curbSegments(roads,x,minZ,maxZ){return subtract([[minZ,maxZ]],merge(roads.filter(r=>Math.abs(x-r.x)<r.w/2+.35).map(r=>[r.z-r.d/2-.25,r.z+r.d/2+.25])));}
