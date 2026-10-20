import {FINDS} from './homelife.js';
import {SUPPLY_FIELDS} from './food.js';
import {CARGO_NAME,CARGO_WEIGHT,cargoStorageCapacity} from './salvage.js';
import { RESOURCES, RECIPES, DEFAULT_WEAPON, capacity, bagWeight } from './game.js';
export const EQUIPMENT_SLOTS = { weapon: 'Оружие', armor: 'Броня', bag: 'Рюкзак', boots: 'Ботинки' };
export function inventoryItems(state, storage=false) {
  const resources = Object.entries(storage ? state.stash : state.bag).filter(([,n])=>n>0).map(([id,count])=>({ id, count, name: RESOURCES[id].name, kind: 'resource', desc: `${RESOURCES[id].desc||'Материал для рецептов.'} Вес единицы: ${RESOURCES[id].weight}.` }));
  const finds=Object.entries(storage?state.storedFinds:state.finds).filter(([,n])=>n>0).map(([id,count])=>({...RECIPES.find(r=>r.id===id),count,kind:'find'}));
  const cargo=(storage?state.storedCargo:state.cargo).map((c,i)=>({id:`cargo-${i}`,art:`cargo-${c.machine}`,name:CARGO_NAME[c.machine],count:1,kind:'cargo',cargoIndex:i,node:c.node,desc:`Вес: ${CARGO_WEIGHT[c.machine]}. Разбор на станции даёт дополнительные детали и провод; продукция поступит на склад.`}));
  if (storage) return [...resources,...finds,...cargo];
  const supplies = [...Object.entries(SUPPLY_FIELDS),['ammo','ammo']].filter(([,field])=>state[field]>0).map(([id,field])=>({...RECIPES.find(r=>r.id===id), count:state[field], kind:'supply'}));
  const equipped = Object.values(state.equipment);
  const gear = [{...DEFAULT_WEAPON, slot:'weapon', desc:'Надёжная стальная труба для ближнего боя.'}, ...RECIPES.filter(r=>r.slot && state.owned.includes(r.id))].filter(r=>!equipped.includes(r.id)).map(r=>({...r,count:1,kind:'gear'}));
  return [...resources,...finds,...cargo, ...supplies, ...gear];
}
export function equipItem(state, id) {
  const item = id === 'pipe' ? {...DEFAULT_WEAPON,slot:'weapon'} : RECIPES.find(r=>r.id===id);
  if (!item || !Object.hasOwn(EQUIPMENT_SLOTS,item.slot) || id !== 'pipe' && !state.owned.includes(id)) return {ok:false,reason:'Предмет нельзя надеть'};
  if (item.slot === 'bag' && bagWeight(state) > item.capacity) return {ok:false,reason:'Сначала разгрузи рюкзак: добыча не помещается в выбранную сумку'};
  state.equipment[item.slot] = id;
  if (item.slot==='weapon') state.hotbarSelected=state.hotbar.indexOf(id);
  return {ok:true};
}
export function unequipItem(state, slot) {
  if (!Object.hasOwn(EQUIPMENT_SLOTS,slot) || !state.equipment[slot]) return {ok:false,reason:'Ячейка уже свободна'};
  if (slot==='bag' && bagWeight(state)>26) return {ok:false,reason:'Сначала разгрузи рюкзак до 26 веса'};
  state.equipment[slot]=null;
  if(slot==='weapon') state.hotbarSelected=-1;
  return {ok:true};
}
export function withdrawResource(state, id, count) {
  if (!(state.x>=-27&&state.x<=-6&&state.z>=5&&state.z<=27)) return {ok:false,reason:'Склад доступен в убежище'};
  if (!RESOURCES[id] || !Number.isInteger(count) || count<=0 || (state.stash[id]||0)<count) return {ok:false,reason:'Недостаточно на складе'};
  if (bagWeight(state)+RESOURCES[id].weight*count>capacity(state)) return {ok:false,reason:'Недостаточно места в рюкзаке'};
  state.stash[id]-=count; state.bag[id]=(state.bag[id]||0)+count; return {ok:true};
}

// A deliberate transfer is separate from “deposit loot”, which respects pinned resources.
export function inventoryTransferStatus(state,{id,from,count='all',node}={}) {
  if(!(state.x>=-27&&state.x<=-6&&state.z>=5&&state.z<=27))return {ok:false,reason:'Склад доступен в убежище'};
  if(!['bag','storage'].includes(from)||count!=='all'&&(!Number.isSafeInteger(count)||count<1))return {ok:false,reason:'Некорректное количество'};
  const item=inventoryItems(state,from==='storage').find(i=>i.id===id);
  if(!item||!['resource','find','cargo'].includes(item.kind))return {ok:false,reason:'Эту вещь нельзя перенести на склад'};
  if(item.kind==='cargo'&&node!==item.node)return {ok:false,reason:'Груз уже перемещён'};
  const deposit=from==='bag',target=deposit?'storage':'bag';
  const weight=item.kind==='resource'?RESOURCES[id].weight:item.kind==='find'?FINDS[id].weight:CARGO_WEIGHT[(deposit?state.cargo:state.storedCargo)[item.cargoIndex].machine];
  let limit=deposit?item.count:Math.floor((capacity(state)-bagWeight(state)+1e-8)/weight);
  if(item.kind==='resource')limit=Math.min(limit,100000-((deposit?state.stash:state.bag)[id]||0));
  if(item.kind==='find')limit=Math.min(limit,99-((deposit?state.storedFinds:state.finds)[id]||0));
  if(item.kind==='cargo'&&deposit)limit=Math.min(limit,cargoStorageCapacity(state)-state.storedCargo.length);
  const moved=Math.max(0,Math.min(item.count,limit,count==='all'?item.count:count));
  if(!moved||count!=='all'&&moved!==count)return {ok:false,reason:deposit?'На складе нет места':'Недостаточно места в рюкзаке'};
  return {ok:true,item,moved,target,remaining:item.count-moved};
}
export function transferInventory(state,request) {
  const result=inventoryTransferStatus(state,request);if(!result.ok)return result;
  const {item,moved,target}=result,deposit=request.from==='bag';let targetId=item.id;
  if(item.kind==='cargo'){
    const from=deposit?state.cargo:state.storedCargo,to=deposit?state.storedCargo:state.cargo;
    targetId=`cargo-${to.length}`;to.push(from.splice(item.cargoIndex,1)[0]);
  }else{
    const from=item.kind==='resource'?(deposit?state.bag:state.stash):(deposit?state.finds:state.storedFinds);
    const to=item.kind==='resource'?(deposit?state.stash:state.bag):(deposit?state.storedFinds:state.finds);
    from[item.id]-=moved;to[item.id]=(to[item.id]||0)+moved;
  }
  return {...result,targetId,target};
}
