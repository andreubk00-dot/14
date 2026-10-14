import {CARGO_NAME,CARGO_WEIGHT} from './salvage.js';
import { RESOURCES, RECIPES, DEFAULT_WEAPON, capacity, bagWeight } from './game.js';
export const EQUIPMENT_SLOTS = { weapon: 'Оружие', armor: 'Броня', bag: 'Рюкзак', boots: 'Ботинки' };
export function inventoryItems(state, storage=false) {
  const resources = Object.entries(storage ? state.stash : state.bag).filter(([,n])=>n>0).map(([id,count])=>({ id, count, name: RESOURCES[id].name, kind: 'resource', desc: `${RESOURCES[id].desc||'Материал для рецептов.'} Вес единицы: ${RESOURCES[id].weight}.` }));
  const finds=Object.entries(storage?state.storedFinds:state.finds).filter(([,n])=>n>0).map(([id,count])=>({...RECIPES.find(r=>r.id===id),count,kind:'find'}));
  const cargo=(storage?state.storedCargo:state.cargo).map((c,i)=>({id:`cargo-${i}`,art:`cargo-${c.machine}`,name:CARGO_NAME[c.machine],count:1,kind:'cargo',cargoIndex:i,desc:`Вес: ${CARGO_WEIGHT[c.machine]}. Разбор на станции даёт дополнительные детали и провод; продукция поступит на склад.`}));
  if (storage) return [...resources,...finds,...cargo];
  const supplies = [['medkit','medkits'],['meal','meals'],['tea','teas'],['ammo','ammo']].filter(([,field])=>state[field]>0).map(([id,field])=>({...RECIPES.find(r=>r.id===id), count:state[field], kind:'supply'}));
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
