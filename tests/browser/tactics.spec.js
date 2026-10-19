import {test,expect} from '@playwright/test';
const errors=[];
test.beforeEach(async({page})=>{errors.length=0;page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});
test.afterEach(()=>expect(errors).toEqual([]));
async function start(page,patch={}){
 await page.addInitScript(p=>localStorage.setItem('quiet-district-save-v1',JSON.stringify({version:1,x:8,z:-3,health:100,stamina:100,elapsed:0,stash:{},bag:{},owned:[],equipment:{weapon:'pipe',armor:null,bag:null,boots:null},settings:{sound:false,quality:'low'},tutorial:false,...p})),patch);
 await page.goto('/');await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await page.locator('[data-action="start"]').click();await page.evaluate(()=>window.__quietDistrict.visibilityPaused=true);
}
test('Committed attack shapes charge visibly, follow their real target and leave an actual retreat window',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-19,z:14});
 const report=await page.evaluate(async()=>{
  const g=window.__quietDistrict,w=g.world,{updateEnemyWarning}=await import('/src/enemy-signals.js');const rows=[];
  for(const kind of ['warden','runner','gunner']){
   for(const other of w.enemies)other.health=0;for(const b of g.enemyBolts||[])w.scene.remove(b.mesh);g.enemyBolts=[];
   const e=w.enemies.find(e=>e.kind===kind);g.state.x=8;g.state.z=-3;Object.assign(e,{x:8,z:kind==='gunner'?-9:-5,originX:8,originZ:kind==='gunner'?-9:-5,health:e.maxHealth,alert:3,suspicion:1,cooldown:0,recover:0,stagger:0,attack:null,windup:0,lastSeen:{x:8,z:-3}});
   g.updateEnemies(.1);if(!e.attack)throw Error('No real attack '+kind);updateEnemyWarning(e,w,true);const geometry=e.warning.geometry,opacity=e.warning.material.opacity,locked={x:e.attack.x,z:e.attack.z},facing=e.facing;
   geometry.computeBoundingBox();const bounds={x:geometry.boundingBox.max.x-geometry.boundingBox.min.x,z:geometry.boundingBox.max.z-geometry.boundingBox.min.z};
   g.state.x=11;g.updateEnemies(.15);updateEnemyWarning(e,w,true);const fixed=e.attack.x===locked.x&&e.attack.z===locked.z&&e.facing===facing,charging=e.warning.material.opacity>opacity;
   let frames=0;while(e.attack&&frames++<120)g.updateEnemies(1/60);const settled=e.recover>0,position={x:e.x,z:e.z};g.updateEnemies(.1);const paused=e.x===position.x&&e.z===position.z;updateEnemyWarning(e,w,true);
   rows.push({kind,bounds,fixed,charging,settled,paused,hidden:!e.warning.visible,hp:g.state.health});
  }
  // Indoor and displaced aiming retain the committed point above the floor.
  const e=w.enemies.find(e=>e.kind==='gunner');Object.assign(e,{x:-18,z:14,facing:Math.PI/2,windup:.2,attack:{kind:'shot',x:-18,z:16,elapsed:.2}});updateEnemyWarning(e,w,true);const indoor=e.warning.position.y>.205,geometry=e.warning.geometry;e.x+=.2;updateEnemyWarning(e,w,true);const displaced=Math.abs(e.warning.rotation.y-Math.atan2(-.2,2))<1e-8&&e.attack.warningX===e.x&&e.warning.geometry===geometry;
  // A final real shot warning for visual inspection, using the existing model.
  Object.assign(e,{x:-158,z:116,originX:-158,originZ:116,facing:0,alert:3,attack:null,windup:0});g.state.x=-158;g.state.z=122;e.cooldown=0;e.recover=0;g.updateEnemies(.35);w.player.position.set(g.state.x,.18,g.state.z);g.ui.region(w.location(),false);g.ui.context(null);w.cameraCenter.set(-158,0,119);w.freezeBuildCamera=true;w.viewSize=22;w.resize();w.update(.016,false,true);w.renderer.getContext().finish();return {rows,indoor,displaced,visual:{visible:e.warning.visible,windup:e.windup,length:e.warning.scale.z}};
 });console.log('Attack windows',JSON.stringify(report));expect(report.rows.every(r=>r.fixed&&r.charging&&r.settled&&r.paused&&r.hidden&&r.hp===100)).toBe(true);expect(report.rows[0].bounds.x).toBeCloseTo(2);expect(report.rows[1].bounds.z).toBeGreaterThan(4);expect(report.rows[2].bounds.x).toBeLessThan(.2);expect(report.indoor&&report.displaced).toBe(true);expect(report.visual.visible).toBe(true);expect(report.visual.windup).toBeGreaterThan(0);expect(report.visual.length).toBeGreaterThan(1);await page.screenshot({path:'/tmp/v30-telegraph.png'});
});
test('Quarry loading cover stops a real bolt, preserves hits before cover and leaves both side routes open',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-151.5,z:108.6});
 const report=await page.evaluate(async()=>{
  const g=window.__quietDistrict,w=g.world,{COMBAT_COVERS}=await import('/src/encounters.js'),{ROADS}=await import('/src/district.js');const c=COMBAT_COVERS[0];
  const roads=ROADS.filter(r=>Math.abs(r.x-c.x)<(r.w+c.w+.1)/2&&Math.abs(r.z-c.z)<(r.d+c.d+.1)/2),buildings=w.buildings.filter(b=>Math.abs(b.x-c.x)<(b.w+c.w)/2&&Math.abs(b.z-c.z)<(b.d+c.d)/2),nodes=w.nodes.filter(n=>Math.abs(n.x-c.x)<c.w/2+.65&&Math.abs(n.z-c.z)<c.d/2+.65);
  const spawn=()=>{const b={x:-151.5,z:113,dx:0,dz:-1,remaining:9,damage:12};b.mesh=w.enemyBolt(b);g.enemyBolts=[b];return g.enemyBolts;};
  const before=g.state.health,a=spawn();g.updateEnemyBolts(.5);const covered=g.state.health===before&&a.length===0&&a===g.enemyBolts;
  g.state.z=112;const b=spawn();g.updateEnemyBolts(.5);const exposed=g.state.health===before-12&&b.length===0;g.updateEnemyBolts(.5);const once=g.state.health===before-12;
  g.state.z=108.6;g.motion.reset();g.visibilityPaused=false;let steps=0,clipped=false;
  for(const [x,z]of [[-149.3,108.6],[-149.3,112],[-154,112],[-155,104]]){g.navigate(x,z,false);if(!g.path.length&&Math.hypot(g.state.x-x,g.state.z-z)>1)throw Error('No cover bypass');while(g.path.length&&steps++<2000){g.tick(1/60);clipped||=w.blocked(g.state.x,g.state.z,.299);}if(Math.hypot(g.state.x-x,g.state.z-z)>1)throw Error('Cover route stuck');g.motion.reset();}
  g.visibilityPaused=true;return {roads:roads.length,buildings:buildings.length,nodes:nodes.length,covered,exposed,once,clipped,steps,count:w.nodes.length};
 });console.log('Quarry cover',JSON.stringify(report));expect(report).toMatchObject({roads:0,buildings:0,nodes:0,covered:true,exposed:true,once:true,clipped:false,count:403});
});
test('Hit labels report interruption and retain the same DOM nodes across animation frames',async({page})=>{
 test.setTimeout(180000);await start(page,{owned:['knife','heavyaxe'],equipment:{weapon:'knife'}});
 const report=await page.evaluate(()=>{
  const g=window.__quietDistrict,w=g.world,e=w.enemies.find(e=>e.kind==='warden');for(const other of w.enemies)if(other!==e)other.health=0;
  Object.assign(e,{x:8,z:-4.3,originX:8,originZ:-4.3,health:100,windup:.5,attack:{kind:'slam',phase:'windup'},stagger:0});g.attack(e);g.updateSwing(.12);const light=w.floating.at(-1).text;
  g.swing=null;g.attackCooldown=0;g.state.equipment.weapon='heavyaxe';g.state.stamina=100;g.attack(e);g.updateSwing(.49);const heavy=w.floating.at(-1).text;
  g.ui.floating(w.floating,w);const nodes=[...document.querySelectorAll('#floating-text .float-label')];let created=0;const observer=new MutationObserver(records=>{for(const r of records)created+=r.addedNodes.length;});observer.observe(document.getElementById('floating-text'),{childList:true});
  for(let i=0;i<200;i++)g.ui.floating(w.floating,w);const records=observer.takeRecords();observer.disconnect();const stable=nodes.every((n,i)=>n===document.querySelectorAll('#floating-text .float-label')[i])&&records.length===0;
  w.floating.length=0;g.ui.floating(w.floating,w);const empty=document.querySelectorAll('#floating-text .float-label').length===0;
  g.state.health=5;const bolts=[{x:8,z:-3,dx:0,dz:1,remaining:0,damage:12},{x:8,z:-4,dx:0,dz:1,remaining:9,damage:12}];for(const b of bolts)b.mesh=w.enemyBolt(b);g.enemyBolts=bolts;const died=g.updateEnemyBolts(.1),deathCleared=died&&g.enemyBolts.length===0&&bolts.every(b=>!b.mesh.parent);return {light,heavy,stable,empty,deathCleared};
 });expect(report).toMatchObject({light:'−11 · Атака не сбита',heavy:'−42 · Атака сбита',stable:true,empty:true,deathCleared:true});
});
