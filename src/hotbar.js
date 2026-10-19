import {GUNS} from './combat.js';
import {SUPPLY_FIELDS} from './food.js';
import {FINDS} from './homelife.js';
import { RESOURCES, RECIPES, DEFAULT_WEAPON } from './game.js';
export const DEFAULT_HOTBAR = ['pipe', null, null, 'medkit', null, null];
export const HOTBAR_ITEMS = [{...DEFAULT_WEAPON,slot:'weapon',desc:'Надёжная стальная труба для ближнего боя.'}, ...Object.entries(RESOURCES).map(([id,r])=>({...r,id,kind:'resource'})), ...RECIPES.filter(r => r.slot || Object.hasOwn(SUPPLY_FIELDS,r.id) || r.id==='ammo' || Object.hasOwn(FINDS,r.id))];
export function hotbarItem(state, id) {
  const item = HOTBAR_ITEMS.find(r => r.id === id);
  if (!item) return null;
  const supply = Object.hasOwn(SUPPLY_FIELDS,id), resource=item.kind==='resource', find=Object.hasOwn(FINDS,id);
  const count = supply ? state[SUPPLY_FIELDS[id]] : resource ? state.bag[id]||0 : find ? state.finds[id]||0 : id==='ammo'||GUNS[id] ? state.ammo : null;
  const available = supply||resource||find||id==='ammo' ? count > 0 : id === 'pipe' || state.owned.includes(id);
  return { ...item, count, available, supply, inspect:resource||id==='ammo', find };
}
export function assignHotbar(state, index, id) {
  if (!Number.isInteger(index) || index < 0 || index >= 6) return false;
  const item=id===null?null:hotbarItem(state,id);
  if(id!==null&&(!item||!item.available&&!state.hotbar.includes(id)))return false;
  const selectedId = state.hotbar[state.hotbarSelected];
  const previous = state.hotbar[index], other = id === null ? -1 : state.hotbar.indexOf(id);
  if (other >= 0 && other !== index) state.hotbar[other] = previous;
  state.hotbar[index] = id; state.hotbarSelected = selectedId ? state.hotbar.indexOf(selectedId) : -1; return true;
}
