import {SUPPLY_FIELDS} from './food.js';
import { RECIPES, DEFAULT_WEAPON } from './game.js';
export const DEFAULT_HOTBAR = ['pipe', 'axe', 'rod', 'medkit', 'meal', 'tea'];
export const HOTBAR_ITEMS = [DEFAULT_WEAPON, ...RECIPES.filter(r => r.slot === 'weapon' || r.slot === 'tool' || Object.hasOwn(SUPPLY_FIELDS,r.id))];
export function hotbarItem(state, id) {
  const item = HOTBAR_ITEMS.find(r => r.id === id);
  if (!item) return null;
  const field = Object.hasOwn(SUPPLY_FIELDS,id)?SUPPLY_FIELDS[id]:null;
  const count = field ? state[field] : ['pistol', 'carbine'].includes(id) ? state.ammo : null;
  const available = field ? count > 0 : id === 'pipe' || state.owned.includes(id);
  return { ...item, count, available, supply: !!field };
}
export function assignHotbar(state, index, id) {
  if (!Number.isInteger(index) || index < 0 || index >= 6 || id !== null && !HOTBAR_ITEMS.some(r => r.id === id)) return false;
  const selectedId = state.hotbar[state.hotbarSelected];
  const previous = state.hotbar[index], other = id === null ? -1 : state.hotbar.indexOf(id);
  if (other >= 0 && other !== index) state.hotbar[other] = previous;
  state.hotbar[index] = id; state.hotbarSelected = selectedId ? state.hotbar.indexOf(selectedId) : -1; return true;
}
