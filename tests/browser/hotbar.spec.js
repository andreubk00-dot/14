import {test,expect} from '@playwright/test';
async function start(page,patch={}){
 await page.addInitScript(p=>localStorage.setItem('quiet-district-save-v1',JSON.stringify({version:1,x:-20,z:14,health:45,stamina:100,bag:{wood:4,metal:3},stash:{},owned:['axe','pistol','armor','bag'],ammo:8,medkits:2,settings:{sound:false,quality:'low'},tutorial:false,...p})),patch);
 await page.goto('/');await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await page.locator('[data-action="start"]').click();await page.evaluate(()=>window.__quietDistrict.visibilityPaused=true);
}
async function drag(page,from,to){
 await from.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
}
const slot=(page,n)=>page.locator(`#panel [data-drop-slot="${n}"]`);
const item=(page,id)=>page.locator(`#inventory-grid [data-id="${id}"]`);
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('quiet-district-save-v1')));
test('Free hotbar drags from bag and equipment, swaps, clears, cancels and survives native reload',async({page,context})=>{
 test.setTimeout(240000);const errors=[];const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};watch(page);
 await start(page);await page.keyboard.press('KeyI');await expect(page.locator('.inventory-tabs')).toHaveCount(0);await expect(page.locator('#panel [data-drop-slot]')).toHaveCount(6);
 const initial=await state(page);
 await drag(page,item(page,'axe'),slot(page,1));expect((await state(page)).hotbar[1]).toBe('axe');
 await drag(page,page.locator('[data-equip-slot="weapon"]'),slot(page,2));expect((await state(page)).hotbar.slice(0,3)).toEqual([null,'axe','pipe']);
 await drag(page,slot(page,2),slot(page,1));expect((await state(page)).hotbar.slice(0,3)).toEqual([null,'pipe','axe']);expect((await state(page)).hotbarSelected).toBe(1);
 await drag(page,slot(page,2),page.locator('#inventory-grid .empty').first());expect((await state(page)).hotbar[2]).toBe(null);expect((await state(page)).owned).toContain('axe');
 // Return a weapon to equipment using the same gesture, without altering its shortcut.
 await drag(page,item(page,'pistol'),page.locator('[data-equip-slot="weapon"]'));expect((await state(page)).equipment.weapon).toBe('pistol');
 await drag(page,item(page,'wood'),slot(page,4));expect((await state(page)).hotbar[4]).toBe('wood');
 // Invalid drop and Escape never assign or lose items.
 await drag(page,item(page,'axe'),page.locator('.panel-header h2'));expect((await state(page)).hotbar[2]).toBe(null);
 const a=await item(page,'axe').boundingBox();await page.mouse.move(a.x+20,a.y+20);await page.mouse.down();await page.mouse.move(a.x+40,a.y+30);await expect(page.locator('.inventory-drag-ghost')).toBeVisible();await page.keyboard.press('Escape');await page.mouse.up();await expect(page.locator('.inventory-drag-ghost')).toHaveCount(0);expect((await state(page)).hotbar[2]).toBe(null);
 await page.keyboard.press('KeyI');await slot(page,4).click({button:'right'});expect((await state(page)).hotbar[4]).toBe(null);
 await item(page,'medkit').click();await slot(page,5).click();expect((await state(page)).hotbar[5]).toBe('medkit');expect((await state(page)).hotbar[3]).toBe(null);
 await item(page,'armor').click();await slot(page,0).click();
 await page.screenshot({path:'/tmp/v41-inventory-desktop.png'});
 const saved=await state(page);expect(saved.bag).toEqual(initial.bag);expect(saved.owned).toEqual(initial.owned);expect(saved.medkits).toBe(2);await page.close();
 const restored=await context.newPage();watch(restored);try{
 await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await restored.locator('[data-action="start"]').click();await restored.evaluate(()=>window.__quietDistrict.visibilityPaused=true);
 expect((await state(restored)).hotbar).toEqual(saved.hotbar);expect((await state(restored)).equipment.weapon).toBe('pistol');await restored.keyboard.press('Digit6');expect((await state(restored)).medkits).toBe(1);expect((await state(restored)).health).toBe(90);
 await restored.keyboard.press('Digit2');expect((await state(restored)).equipment.weapon).toBe('pipe');await restored.keyboard.press('Digit1');expect((await state(restored)).equipment.armor).toBe('armor');
 expect(errors).toEqual([]);
 }finally{await restored.close();}
});
test('Touch inventory supports tap assignment, held dragging, clearing and scroll without overflow',async({browser})=>{
 test.setTimeout(240000);const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
 await start(page);await page.locator('#hotbar [data-action="inventory"]').tap();await item(page,'axe').tap();await slot(page,1).tap();expect((await state(page)).hotbar[1]).toBe('axe');
 // Actual touch events, not dispatching drag/drop handlers.
 const cdp=await ctx.newCDPSession(page),a=await item(page,'wood').boundingBox(),b=await slot(page,4).boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});await page.waitForTimeout(340);
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+a.width/2+(b.x+b.width/2-a.x-a.width/2)*i/8,y:a.y+a.height/2+(b.y+b.height/2-a.y-a.height/2)*i/8}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect((await state(page)).hotbar[4]).toBe('wood');
 await slot(page,4).tap();await page.locator('.clear-hotbar').tap();expect((await state(page)).hotbar[4]).toBe(null);expect((await state(page)).bag.wood).toBe(4);
 await page.screenshot({path:'/tmp/v41-inventory-mobile.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await slot(page,0).boundingBox()).width).toBeGreaterThanOrEqual(44);
 const before=(await state(page)).hotbar;
 const touch=await item(page,'metal').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x+20,y:touch.y+20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x+20,y:touch.y-100}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 expect((await state(page)).hotbar).toEqual(before);await expect(page.locator('.inventory-drag-ghost')).toHaveCount(0);
 await page.locator('#panel [data-action="close"]').tap();await page.screenshot({path:'/tmp/v41-hud-mobile.png'});expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
