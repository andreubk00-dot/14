import {test,expect} from '@playwright/test';
const errors=[];
test.beforeEach(async({page})=>{errors.length=0;page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});
test.afterEach(()=>expect(errors).toEqual([]));
async function start(page,patch={}){
 await page.addInitScript(p=>localStorage.setItem('quiet-district-save-v1',JSON.stringify({version:1,x:-16,z:16,stash:{},bag:{},owned:[],equipment:{weapon:'pipe',armor:null,bag:null,boots:null},health:100,stamina:100,elapsed:0,settings:{sound:false,quality:'low'},tutorial:false,...p})),patch);
 await page.goto('/');await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await page.locator('[data-action="start"]').click();
 await page.evaluate(()=>{window.__quietDistrict.visibilityPaused=true;});
}
test('Three finds have clear approaches, stable IDs, distinct rooms and a real workshop bypass',async({page})=>{
 test.setTimeout(240000);await start(page,{owned:['wrench']});
 const audit=await page.evaluate(async()=>{
  const g=window.__quietDistrict,w=g.world,s=g.state,{overlaps}=await import('/src/layout.js');
  const results=w.nodes.slice(385).map(n=>{
   const origin=n.find==='packingdesk'?{x:350,z:24}:n.find==='estatepanel'?{x:155,z:177}:{x:-24,z:-104};s.x=origin.x;s.z=origin.z;
   const points=[];for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=Math.round(n.x+Math.sin(a)*1.7),z=Math.round(n.z+Math.cos(a)*1.7);if(w.blocked(x,z)||!w.canSee(x,z,n.x,n.z,n.collider,true))continue;const path=w.pathTo(x,z);if(path.length)points.push({x,z,steps:path.length});}
   return {id:n.id,find:n.find,approaches:points.length,clips:w.colliders.filter(c=>c!==n.collider&&!c.disabled&&overlaps(n.collider,c,-.03)).length};
  });
  const b=w.buildings.find(b=>b.x===-35&&b.z===-96);
  s.x=-35;s.z=-96;w.updateRoofs(1);const faded=b.roofMeshes.every(m=>m.material.opacity<.04);
  // Walk in through the new north door and out the original south door with active AI.
  s.x=-24;s.z=-104;g.visibilityPaused=false;g.path=[];g.motion.reset();let clipped=false,damage=false;const startHp=s.health;
  for(const [x,z]of [[-35,-104],[-35,-103],[-35,-96],[-35,-88]]){g.navigate(x,z,false);if(!g.path.length&&Math.hypot(s.x-x,s.z-z)>1)throw Error('No workshop route '+x+','+z);let ticks=0;while(g.path.length&&ticks++<10000){g.tick(1/60);clipped||=w.blocked(s.x,s.z,.29);}if(g.path.length)throw Error('Workshop bypass stuck');}
  damage=s.health<startHp;g.visibilityPaused=true;
  // Stream the warehouse through the same normal loader and inspect cutaway details.
  const chunk=w.flood.chunks.find(c=>c.place.id==='floodhomes');w.flood.load(chunk);const warehouse=w.buildings.find(b=>b.id==='floodgarage');s.x=361;s.z=-8;w.updateRoofs(1);
  const kinds=w.buildings.flatMap(b=>b.wallMeshes.filter(m=>m.userData.landmarkDressing).map(m=>({kind:m.userData.landmarkDressing,finite:Array.from(m.geometry.attributes.position.array).every(Number.isFinite),colors:!!m.geometry.attributes.color})));
  return {results,faded,clipped,damage,kinds,warehouseFade:warehouse.roofMeshes.every(m=>m.material.opacity<.04),count:w.nodes.length,old:w.nodes[384].name,kills:s.kills};
 });console.log('Find world audit',JSON.stringify(audit));
 expect(audit.results.map(n=>n.id)).toEqual(['node-385','node-386','node-387']);expect(audit.results.every(n=>n.approaches>0&&n.clips===0)).toBe(true);expect(audit.count).toBe(403);expect(audit.old).toBe('Станок в ремонтном зале');expect(audit.faded&&audit.warehouseFade).toBe(true);expect(audit.clipped||audit.damage).toBe(false);expect(audit.kills).toBe(0);expect(audit.kinds.map(k=>k.kind).sort()).toEqual(['estate','repair','warehouse']);expect(audit.kinds.every(k=>k.finite&&k.colors)).toBe(true);
});
test('Found stations refill through UI, cancel a queue without lost cargo, and survive native reload',async({page})=>{
 test.setTimeout(240000);await start(page,{bag:{wood:4,water:2},stash:{wood:10,water:4},placed:[{id:'packingdesk',x:-16,z:15,rotation:0,harvested:0},{id:'salvagejig',x:-16,z:12,rotation:0,harvested:0},{id:'estatepanel',x:-16,z:10.66,rotation:0,harvested:0}],storedCargo:[{machine:'motor',node:'node-1',loot:{metal:4}},{machine:'appliance',node:'node-2',loot:{metal:2}}]});
 await page.evaluate(()=>{const g=window.__quietDistrict;g.preferredInteraction='packing:packingdesk';g.ui.open('packing');});
 await page.locator('[data-action="packing-remember"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.packingPlan)).toEqual({wood:4,water:2});
 await page.keyboard.press('Escape');await page.keyboard.press('KeyI');await expect(page.locator('#storage-grid')).toBeVisible();await page.locator('[data-action="deposit"]').click();await page.keyboard.press('Escape');
 await page.evaluate(()=>window.__quietDistrict.ui.open('packing'));await page.locator('[data-action="packing-refill"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.bag)).toEqual({wood:4,water:2});const stash=await page.evaluate(()=>window.__quietDistrict.state.stash);await page.locator('[data-action="packing-refill"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.stash)).toEqual(stash);
 await page.keyboard.press('Escape');await page.evaluate(()=>{const g=window.__quietDistrict;g.state.x=-16;g.state.z=13.5;g.ui.open('salvage-workbench');});await page.locator('[data-action="process-salvage-all"]').click();
 const partial=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;for(let i=0;i<210;i++)g.tick(1/60);g.visibilityPaused=true;return {remaining:g.state.storedCargo.length,parts:g.state.stash.parts,queue:g.job.queue.length};});expect(partial).toEqual({remaining:1,parts:3,queue:0});
 await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__quietDistrict.job)).toBeNull();expect(await page.evaluate(()=>window.__quietDistrict.state.storedCargo.length)).toBe(1);await page.evaluate(()=>window.__quietDistrict.save(false));
 const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>errors.push(e.message));restored.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await restored.locator('[data-action="start"]').click();await restored.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;g.ui.open('salvage-workbench');});await restored.locator('[data-action="process-salvage-all"]').click();
  expect(await restored.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;for(let i=0;i<200;i++)g.tick(1/60);g.visibilityPaused=true;return {remaining:g.state.storedCargo.length,parts:g.state.stash.parts,plan:g.state.packingPlan,placed:g.state.placed.map(p=>p.id)};})).toEqual({remaining:0,parts:5,plan:{wood:4,water:2},placed:['packingdesk','salvagejig','estatepanel']});
  await restored.keyboard.press('Escape');await restored.keyboard.press('KeyJ');await expect(restored.locator('#panel')).toContainText('Озеро на стене');await restored.setViewportSize({width:390,height:844});await restored.evaluate(()=>window.__quietDistrict.ui.open('packing'));await expect(restored.locator('#panel')).toContainText('Стол подготовки');expect(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await restored.locator('#panel').evaluate(async p=>{await Promise.all(p.getAnimations().map(a=>a.finished));});const bounds=await restored.locator('#panel').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(-.5);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390.5);await restored.screenshot({path:'/tmp/v27-packing-mobile.png',animations:'disabled'});
 }finally{await restored.close();}
});
