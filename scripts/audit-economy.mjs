import assert from 'node:assert/strict';
import {RECIPES,RESOURCES,CONTRACTS,COOKING_RECIPES,freshState,craft,cookCamp,productionInfo} from '../src/game.js';
import {SUPPLY_FIELDS} from '../src/food.js';
import {CAMP,BOAT_REPAIR} from '../src/floodplain.js';
import {RESTORATIONS} from '../src/restoration.js';
import {STATION_UPGRADES} from '../src/upgrades.js';
import {STRUCTURES} from '../src/construction.js';
import {CROPS} from '../src/homelife.js';
const consumers=[...RECIPES,...CONTRACTS,...RESTORATIONS,...Object.values(STATION_UPGRADES),...Object.values(STRUCTURES),...Object.values(CROPS),{cost:BOAT_REPAIR},{cost:CAMP.cost}];
for(const c of consumers)for(const [id,n]of Object.entries(c.cost||{})){assert.ok(Object.hasOwn(RESOURCES,id),'Unknown material '+id);assert.ok(Number.isInteger(n)&&n>0);}
const visit=(id,chain=[])=>{assert.ok(!chain.includes(id),'Recipe prerequisite cycle '+[...chain,id]);const r=RECIPES.find(r=>r.id===id);assert.ok(r,'Missing recipe '+id);if(r.requires)visit(r.requires,[...chain,id]);};for(const r of RECIPES)visit(r.id);
const cooking=COOKING_RECIPES.map(id=>{const r=RECIPES.find(r=>r.id===id),a=freshState(),b=freshState(),field=SUPPLY_FIELDS[id],before=a[field];a.stash={...r.cost};b.bag={...r.cost};b.x=CAMP.x;b.z=CAMP.z;b.camp.ready=true;assert.ok(craft(a,id).ok);assert.ok(cookCamp(b,id).ok);assert.equal(a[field]-before,b[field]-before);return {id,cost:r.cost,homeOutput:a[field]-before,campOutput:b[field]-before};});
const stages=['bag','axe','spear','wrench','boots','generator','garden','bed','pick','bag2','pump','purifier','solar','radio','dryrack','helper','trailpack'];
const sum=costs=>{const result={};for(const cost of costs)for(const [id,n]of Object.entries(cost))result[id]=(result[id]||0)+n;return result;};
const production=(owned,upgrade=0)=>{const s=freshState();s.owned=owned;return Object.fromEntries(['garden','seedbed','purifier','recycler'].map(id=>{const p=productionInfo(s,{id,harvested:0,upgrade});return [id,{interval:p.interval,loot:p.loot,cost:p.cost||{}}];}));};
const materialUses=Object.fromEntries(Object.keys(RESOURCES).map(id=>[id,consumers.filter(c=>c.cost?.[id]).length]));assert.ok(Object.values(materialUses).every(n=>n>0),'A resource has no sink');
console.log(JSON.stringify({recipeCount:RECIPES.length,materialUses,coreCost:sum(stages.map(id=>RECIPES.find(r=>r.id===id).cost)),islandLoad:sum([BOAT_REPAIR,CAMP.cost,...RESTORATIONS.filter(p=>['camp-crossing','garden-crossing','drain-works'].includes(p.id)).map(p=>p.cost)]),cooking,baseProduction:production([]),developedProduction:production(['pump','solar','tooling'],1),notes:['Costs unchanged; this is a data audit, not player retention evidence.','Field cooking uses the carried bag, never the home stash.']},null,2));
