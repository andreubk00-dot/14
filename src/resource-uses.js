import {RESOURCES,RECIPES,CONTRACTS,craftStatus,contractStatus,total} from './game.js';
import {STATION_UPGRADES} from './upgrades.js';
import {STRUCTURES} from './construction.js';
// Read-only inspector of existing uses. No objectives, world markers or new recipes.
export function resourceUses(state,id){
 if(!Object.hasOwn(RESOURCES,id))return [];
 const uses=[];
 for(const r of RECIPES){
  if(!r.cost[id]||r.schematic&&!state.notes.includes(r.schematic)||!r.repeatable&&!r.placeable&&state.owned.includes(r.id))continue;
  const status=craftStatus(state,r);uses.push({key:'recipe:'+r.id,id:r.id,name:r.name,art:r.id,kind:'Рецепт',count:r.cost[id],reason:status.ok?'Есть материалы':status.reason,action:'inspect-recipe'});
 }
 for(const [base,spec]of Object.entries(STATION_UPGRADES)){
  if(!spec.cost[id])continue;const stations=[...state.placed,...state.packedFurniture].filter(p=>p.id===base);if(stations.length&&stations.every(p=>p.upgrade===1))continue;
  const index=state.placed.findIndex(p=>p.id===base&&p.upgrade!==1),ready=Object.entries(spec.cost).every(([id,n])=>total(state,id)>=n);
  uses.push({key:'upgrade:'+base,id:base,name:spec.name,art:base,kind:'Улучшение',count:spec.cost[id],reason:index<0?'Сначала установи: '+RECIPES.find(r=>r.id===base).name:ready?'Есть материалы':'Не хватает материалов',action:index<0?'inspect-recipe':'inspect-upgrade',index});
 }
 for(const [key,r]of Object.entries(STRUCTURES))if(r.cost[id])uses.push({key:'structure:'+key,id:key,name:r.name,art:'build',kind:'Пристройка',count:r.cost[id],reason:'Строительство у убежища',action:'architecture'});
 for(const c of CONTRACTS){if(!c.cost[id]||c.requires&&!state.owned.includes(c.requires))continue;const status=contractStatus(state,c);uses.push({key:'order:'+c.id,id:c.id,name:c.title,art:'board',kind:'Обмен',count:c.cost[id],reason:status.ok?'Можно передать дома':status.reason,action:'orders'});}
 return uses;
}
