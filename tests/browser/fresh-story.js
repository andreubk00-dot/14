// End-to-end QA agent: normal movement, harvesting, combat, costs and active time.
// It knows resource locations for repeatability; it grants no items, health or gear.
export async function freshStory(g){
 const {RECIPES,RESOURCES,total,craftStatus,place,productionInfo,harvestProduction,weapon}=await import('/src/game.js');
 const awaitedInventory=await import('/src/game.js'),{interactionKey}=await import('/src/interactions.js');
 const w=g.world,s=g.state,report={milestones:[],loot:[],legs:0,steps:0,minHealth:100,rests:0},used=new Set();
 g.visibilityPaused=false;g.keys.clear();g.ui.close();
 const step=()=>{
  if(s.health<55){if(s.medkits)g.action('use-medkit');else if(s.meals)g.action('use-meal');}
  if(!g.job&&!g.swing){const arm=weapon(s),enemy=w.enemies.filter(e=>e.health>0&&e.alert>0&&Math.hypot(e.x-s.x,e.z-s.z)<=arm.range&&w.canSee(s.x,s.z,e.x,e.z)).sort((a,b)=>Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z))[0];if(enemy)g.attack(enemy);}
  g.tick(1/60);report.steps++;report.minHealth=Math.min(report.minHealth,s.health);if(s.grave)throw Error('Fresh expedition died '+JSON.stringify({milestone:report.milestones.at(-1),x:s.x,z:s.z,health:s.health}));
 };
 const go=(x,z)=>{g.target=null;g.navigate(x,z,false);let n=0;if(!g.path.length&&Math.hypot(s.x-x,s.z-z)>1.5)throw Error(`No route ${x},${z}`);while(g.path.length&&n++<20000)step();if(g.path.length||Math.hypot(s.x-x,s.z-z)>1.5)throw Error(`Stuck ${s.x},${s.z} to ${x},${z}`);g.motion.reset();report.legs++;};
 const home=()=>{go(-19.5,14);g.action('deposit');if(s.health<80){
   const bed=s.placed.find(p=>p.id==='bed')||{x:-22,z:17.7},point=approach(bed);if(!point)throw Error('No rest approach');go(point.x,point.z);g.nearestInteraction();const target=g.interactionCandidates.find(c=>c.type==='bed');if(!target)throw Error('Bed interaction not available');g.preferredInteraction=interactionKey(target);g.interactionLocked=true;g.interact();if(!g.job)throw Error('Rest did not start');while(g.job)step();report.rests++;go(-19.5,14);
  }
  if(s.health<90&&s.medkits<2&&craftStatus(s,RECIPES.find(r=>r.id==='medkit')).ok)g.make('medkit');
 };
 const missing=cost=>Object.fromEntries(Object.entries(cost).map(([id,n])=>[id,Math.max(0,n-total(s,id))]).filter(([,n])=>n>0));
 const approach=node=>{for(let a=0;a<Math.PI*2;a+=Math.PI/4){const x=Math.round(node.x+Math.sin(a)*1.7),z=Math.round(node.z+Math.cos(a)*1.7);if(w.blocked(x,z)||Math.hypot(x-node.x,z-node.z)>2.3||!w.canSee(x,z,node.x,node.z,node.collider,true))continue;const path=w.pathTo(x,z);if(path.length||Math.hypot(s.x-x,s.z-z)<1)return {x,z};}return null;};
 const obtain=cost=>{
  let attempts=0;while(Object.keys(missing(cost)).length){if(attempts++>100)throw Error('Unfunded '+JSON.stringify({cost,missing:missing(cost),bag:s.bag,stash:s.stash}));
   const need=missing(cost),candidates=w.nodes.filter(n=>!n.find&&n.x<208&&n.group.visible&&!used.has(n.id)&&s.depleted[n.id]===undefined&&(!n.requires||s.owned.includes(n.requires))&&(!n.accessGate||s.openedGates.includes(n.accessGate))).map(n=>{
    const benefit=Object.entries(need).reduce((v,[id,count])=>v+Math.min(count,n.loot[id]||0)*(RESOURCES[id].weight||1),0),risk=w.enemies.reduce((v,e)=>v+(e.health>0?Math.max(0,10-Math.hypot(e.x-n.x,e.z-n.z))*1.5:0),0);
    return {n,score:benefit/(12+Math.hypot(n.x-s.x,n.z-s.z)+risk)};
   }).filter(c=>c.score>0).sort((a,b)=>b.score-a.score);
   let chosen,point;for(const c of candidates.slice(0,35)){point=approach(c.n);if(point){chosen=c.n;break;}}
   if(!chosen)throw Error('No available stock '+JSON.stringify({need,owned:s.owned,candidates:candidates.length}));go(point.x,point.z);
   const before=JSON.stringify(s.bag);let combat=0;while(g.swing&&combat++<1200)step();if(g.swing)throw Error('Unable to finish combat before gathering');g.beginNode(chosen);if(g.ui.panel==='salvage')g.action('salvage-quick');if(!g.job)throw Error('Cannot harvest '+chosen.name);let n=0;while(g.job&&n++<2000)step();if(g.job)throw Error('Harvest stuck');
   report.loot.push({id:chosen.id,name:chosen.name,x:chosen.x,z:chosen.z,at:Math.round(s.elapsed)});
   if(s.depleted[chosen.id]!==undefined)used.add(chosen.id);
   // Empty collection means the carried bag must be unloaded, not refilled by a fixture.
   const {bagWeight,capacity}=awaitedInventory;
   if(before===JSON.stringify(s.bag)||capacity(s)-bagWeight(s)<2||s.health<40)home();
  }home();
 };
 const install=id=>{let point;for(let z=24;z>=9&&!point;z-=1)for(let x=-24;x<=-9;x+=1){if(id==='bed'&&z>18)continue;const p={id,x,z,rotation:0};if(!w.blocked(x,z)&&w.placementStatus(p).ok){point=p;break;}}
  if(!point)throw Error('No legal home placement '+id);if(!place(s,id,point.x,point.z,point.rotation,w.colliders))throw Error('Placement refused '+id);w.syncFurniture();
 };
 for(const id of ['bag','axe','spear','wrench','boots','generator','garden','bed','pick','bag2','pump','purifier','solar','radio','dryrack','helper','trailpack']){
  const r=RECIPES.find(r=>r.id===id);obtain(r.cost);if(r.placeable)install(id);else {const result=craftStatus(s,r);if(!result.ok)throw Error('Blocked recipe '+id+': '+result.reason);g.make(id);if(!s.owned.includes(id))throw Error('Craft failed '+id);}
  if(g.ui.panel)g.ui.close();report.milestones.push({id,at:Math.round(s.elapsed),gathered:s.gathered,trips:s.trips});
  // Collect production only when already ready after an outing, never advance clocks by assignment.
  for(const p of s.placed){const info=productionInfo(s,p);if(info&&!info.remaining&&!info.needsLoading&&!info.waitingForRain){harvestProduction(s,p);}}
  g.action('deposit');
 }

 // Prepare one actual carried load for the whole island expedition.
 const {FLOOD_DOCKS,CAMP,BOAT_REPAIR}=await import('/src/floodplain.js'),{RESTORATIONS}=await import('/src/restoration.js'),{withdrawResource}=await import('/src/inventory.js');
 const costs=[BOAT_REPAIR,CAMP.cost,...RESTORATIONS.map(p=>p.cost)],load={};for(const cost of costs)for(const [id,n]of Object.entries(cost))load[id]=(load[id]||0)+n;
 obtain(load);for(const [id,n]of Object.entries(load))if(!withdrawResource(s,id,n).ok)throw Error('Packing failed '+id);
 const dock=id=>FLOOD_DOCKS.find(d=>d.id===id);
 const land=id=>{const d=dock(id);go(d.boat.x,d.boat.z);g.landBoat();if(s.boat.aboard)throw Error('Cannot land '+id);w.flood.update(true);};
 const board=id=>{const d=dock(id);go(d.foot.x,d.foot.z);g.interact();if(!s.boat.aboard)throw Error('Cannot board '+id);};
 const restore=id=>{const p=RESTORATIONS.find(p=>p.id===id);go(p.x,p.z);g.action('start-restoration',{id});if(!g.job)throw Error('Restoration refused '+id);while(g.job)step();if(!s.restoredRoutes.includes(id))throw Error('Restoration not completed '+id);report.milestones.push({id,at:Math.round(s.elapsed)});};
 go(dock('shore').foot.x,dock('shore').foot.z);g.action('field-repair',{id:'boat'});if(!s.boat.repaired)throw Error('Boat repair refused');report.milestones.push({id:'boat',at:Math.round(s.elapsed)});board('shore');land('reedcamp');go(CAMP.x,CAMP.z);g.action('field-repair',{id:'camp'});if(!s.camp.ready)throw Error('Camp repair refused');report.milestones.push({id:'camp',at:Math.round(s.elapsed)});
 go(290.6,57);const pantry=w.nodes.find(n=>n.name==='Провизия под навесом');while(g.swing)step();g.beginNode(pantry);if(!g.job)throw Error('Camp pantry pickup failed');while(g.job)step();go(CAMP.x,CAMP.z);const meals=s.meals;g.action('camp-cook',{id:'meal'});if(s.meals!==meals+1)throw Error('Camp cooking failed');report.campCooking=true;
 board('reedcamp');land('floodhomes');restore('camp-crossing');go(301,49);go(325,35);board('floodhomes');land('floodgardens');restore('garden-crossing');go(358,41);go(358,76);board('floodgardens');land('floodworks');restore('drain-works');go(280,-78);go(277,-71.4);const cache=w.nodes.find(n=>n.name==='Электрика ремонтного зала'),battery=s.bag.battery||0;while(g.swing)step();g.beginNode(cache);if(!g.job)throw Error('Workshop cache pickup failed');while(g.job)step();if(!(s.bag.battery>battery))throw Error('Restored workshop loot unavailable');report.workshopLoot=true;
 board('floodworks');land('shore');home();report.returnedHome=true;report.restored=[...s.restoredRoutes];report.helperCycles=s.helper.cycles;
 report.elapsed=s.elapsed;report.owned=[...s.owned];report.kills=s.kills;report.uniqueNodes=new Set(report.loot.map(n=>n.id)).size;report.visited=[...s.visited];report.placed=s.placed.map(p=>p.id);g.visibilityPaused=true;g.save(false);return report;
}
