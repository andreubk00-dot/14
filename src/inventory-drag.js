// Pointer drag works with mouse, pen and touch. Touch may scroll until a short hold.
export function installInventoryDrag(ui, panel) {
  let pending=null, drag=null, hold=null, ghost=null, hover=null, suppressUntil=0;
  const targetAt=(x,y)=>document.elementFromPoint(x,y)?.closest('[data-drop-slot], [data-equip-slot], #inventory-grid');
  const clearHover=()=>{hover?.classList.remove('drop-ready');hover=null;};
  const cancel=()=>{
    clearTimeout(hold);hold=null;pending=null;drag=null;ghost?.remove();ghost=null;clearHover();
    document.body.classList.remove('inventory-dragging');
  };
  const move=(x,y)=>{
    if(!drag)return;
    ghost.style.left=`${x}px`;ghost.style.top=`${y}px`;
    clearHover();const target=targetAt(x,y);
    const item=ui.hotbarInfo(drag.id);
    if(target&&(target.hasAttribute('data-drop-slot')||target.id==='inventory-grid'&&drag.slot!==null||target.dataset.equipSlot===item?.slot)){
      hover=target;hover.classList.add('drop-ready');
    }
    const body=panel.querySelector('.panel-body'),box=body.getBoundingClientRect();
    if(y>box.bottom-44)body.scrollTop+=16;
    else if(y<box.top+44)body.scrollTop-=16;
  };
  const begin=()=>{
    if(!pending)return;drag=pending;clearTimeout(hold);hold=null;
    ghost=document.createElement('div');ghost.className='inventory-drag-ghost';ghost.setAttribute('aria-hidden','true');
    ghost.innerHTML=drag.element.querySelector('.item-icon')?.outerHTML||'';document.body.append(ghost);
    document.body.classList.add('inventory-dragging');move(drag.x,drag.y);
  };
  panel.addEventListener('pointerdown',e=>{
    suppressUntil=0;
    if(ui.panel!=='inventory'||e.button!==0||pending)return;
    const element=e.target.closest('[data-drag-id]');if(!element)return;
    pending={id:element.dataset.dragId,slot:element.hasAttribute('data-drop-slot')?Number(element.dataset.dropSlot):null,element,x:e.clientX,y:e.clientY,pointer:e.pointerId,touch:e.pointerType==='touch'};
    if(pending.touch)hold=setTimeout(begin,280);
  });
  // Global listeners keep the gesture alive when a pointer leaves the window cells.
  window.addEventListener('pointermove',e=>{
    if(!pending||e.pointerId!==pending.pointer)return;
    if(!drag&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>7){
      if(pending.touch){cancel();return;}begin();
    }
    if(drag){e.preventDefault();move(e.clientX,e.clientY);}
  },{passive:false});
  window.addEventListener('pointerup',e=>{
    if(!pending||e.pointerId!==pending.pointer)return;
    const source=drag,target=source?targetAt(e.clientX,e.clientY):null;
    if(source)suppressUntil=performance.now()+450;
    cancel();
    if(!source||ui.panel!=='inventory'||!target)return;
    if(target.hasAttribute('data-drop-slot'))ui.actions('hotbar-assign',{index:target.dataset.dropSlot,id:source.id});
    else if(target.dataset.equipSlot===ui.hotbarInfo(source.id)?.slot)ui.actions('equip',{id:source.id});
    else if(target.id==='inventory-grid'&&source.slot!==null)ui.actions('hotbar-assign',{index:source.slot,id:''});
  });
  panel.addEventListener('click',e=>{if(e.detail!==0&&performance.now()<suppressUntil){suppressUntil=0;e.preventDefault();e.stopPropagation();}},true);
  panel.addEventListener('contextmenu',e=>{
    if(ui.panel!=='inventory')return;
    const slot=e.target.closest('[data-drop-slot]');if(!slot){if(e.target.closest('[data-drag-id]'))e.preventDefault();return;}
    e.preventDefault();ui.actions('hotbar-assign',{index:slot.dataset.dropSlot,id:''});
  });
  panel.addEventListener('touchmove',e=>{if(drag)e.preventDefault();},{passive:false});
  window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);
  window.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
  return cancel;
}
