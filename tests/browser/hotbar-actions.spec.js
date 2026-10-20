import {test,expect} from '@playwright/test';
test('Equipment shortcuts respect bag capacity, materials inspect or report absence, and empty slots open the bag',async({page})=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('quiet-district-save-v1',JSON.stringify({version:1,x:-20,z:14,bag:{wood:45},stash:{},owned:['armor','bag','bag2'],equipment:{weapon:'pipe',bag:'bag2'},settings:{sound:false,quality:'low'},tutorial:false})));
 await page.goto('/');await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await page.locator('[data-action="start"]').click();await page.evaluate(()=>window.__quietDistrict.visibilityPaused=true);await page.keyboard.press('KeyI');
 for(const [id,index] of [['armor',1],['bag',2],['wood',4]]){
  await page.locator(`#inventory-grid [data-id="${id}"]`).click();await page.locator(`#panel [data-drop-slot="${index}"]`).click();
 }
 await page.keyboard.press('Escape');await page.keyboard.press('Digit2');expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.armor)).toBe('armor');
 await page.keyboard.press('Digit3');expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.bag)).toBe('bag2');await expect(page.locator('#toasts')).toContainText('Сначала разгрузи');
 await page.keyboard.press('Digit5');await expect(page.locator('.item-details')).toContainText('Дерево');await expect(page.locator('.item-details')).toBeInViewport();
 await expect(page.locator('#storage-grid')).toBeVisible();await page.locator('[data-action="deposit"]').click();await page.keyboard.press('Escape');await page.keyboard.press('Digit5');await expect(page.locator('#panel')).toBeHidden();await expect(page.locator('#toasts')).toContainText('Дерево: в рюкзаке нет');
 await page.keyboard.press('Digit6');await expect(page.locator('#panel')).toBeVisible();expect(await page.evaluate(()=>window.__quietDistrict.state.bag.wood||0)).toBe(0);expect(await page.evaluate(()=>window.__quietDistrict.state.stash.wood)).toBe(45);
 expect(errors).toEqual([]);
});
