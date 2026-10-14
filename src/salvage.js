export const CARGO_LIMIT=200;
export const CARGO_WEIGHT={appliance:8,motor:10};
export const CARGO_NAME={appliance:'Бытовая техника для разбора',motor:'Агрегат для разбора'};
export function cleanCargo(input,resources){
 return (Array.isArray(input)?input:[]).slice(0,CARGO_LIMIT).flatMap(p=>{
  if(!p||!Object.hasOwn(CARGO_WEIGHT,p.machine)||!/^node-\d{1,3}$/.test(p.node||''))return [];
  const loot={};for(const id of Object.keys(resources))if(Number.isInteger(p.loot?.[id])&&p.loot[id]>0)loot[id]=Math.min(100,p.loot[id]);
  return Object.keys(loot).length?[{machine:p.machine,node:p.node,loot}]:[];
 });
}
export function cargoLoot(cargo,state){return {...cargo.loot,parts:(cargo.loot.parts||0)+(cargo.machine==='motor'?3:2)+(state?.owned.includes('precisionbench')?1:0),wire:(cargo.loot.wire||0)+1};}

export const cargoStorageCapacity=state=>Math.min(CARGO_LIMIT,4+12*state.placed.filter(p=>p.id==='cargorack').length);
export const salvageDuration=state=>state.owned.includes('precisionbench')?1.6:3.2;
