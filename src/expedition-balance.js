// Plants and natural deposits remain quick to revisit. Stored industrial supplies
// recover more slowly, so an expedition through several places beats waiting at one box.
export function supplyPeriod({type,machine,originalLoot={}}){
 if(type==='drop')return Infinity;
 if(type==='herbs')return 120;
 if(['battery','pumpmodule','filterunit'].some(id=>originalLoot[id]))return 900;
 if(['motor','appliance'].includes(machine))return 600;
 return type==='crate'?480:240;
}
// Stable discovery arrays stay in saves; sets are local to this scan.
export function discoverNearby(state,locations,nodes){
 let changed=false;const places=new Set(state.visited),found=new Set(state.foundNodes);
 for(const l of locations)if(!places.has(l.id)&&(state.x-l.x)**2+(state.z-l.z)**2<=l.radius*l.radius){state.visited.push(l.id);places.add(l.id);changed=true;}
 for(const n of nodes)if(n.id.startsWith('node-')&&!found.has(n.id)&&(state.x-n.x)**2+(state.z-n.z)**2<16){state.foundNodes.push(n.id);found.add(n.id);changed=true;}
 return changed;
}
