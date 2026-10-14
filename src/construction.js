import {overlaps,circleHitsRect,footprint} from './layout.js';
export const STRUCTURES={
 floor:{name:'Деревянный пол',desc:'Модуль 2 × 2 м. Начало пристройки у входа в дом; следующие полы соединяются с ним.',cost:{wood:4,stone:2}},
 wall:{name:'Деревянная стена',desc:'Закрывает край пола. Крыша включена в закрытый контур помещения.',cost:{wood:3,stone:1}},
 window:{name:'Стена с окном',desc:'Окно с деревянной рамой и подоконником.',cost:{wood:3,metal:1,cloth:1}},
 door:{name:'Дверной проём',desc:'Проход шириной 1,2 м. Сохраняет доступ в комнату.',cost:{wood:3,metal:2}},
 dismantle:{name:'Разобрать конструкцию',desc:'Выбери деталь в мире. Материалы возвращаются на домашний склад.',cost:{}},
};
export const partKey=p=>p.id==='floor'?`f:${p.x}:${p.z}`:`e:${p.axis}:${p.x}:${p.z}`;
export const tileEdges=t=>[{x:t.x,z:t.z-1,axis:'x'},{x:t.x,z:t.z+1,axis:'x'},{x:t.x-1,z:t.z,axis:'z'},{x:t.x+1,z:t.z,axis:'z'}];
const link=e=>e.axis==='x'&&e.x===-18&&e.z===19.5;
const floors=parts=>parts.filter(p=>p.id==='floor');
const neighbours=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===2;
const matching=(a,b)=>a.x===b.x&&a.z===b.z&&a.axis===b.axis;
export function structureRect(p){return p.id==='floor'?{...p,w:2,d:2}:p.axis==='x'?{...p,w:2,d:.16}:{...p,w:.16,d:2};}
export function structureColliders(p){
 if(p.id==='floor')return [];
 if(p.id!=='door')return [structureRect(p)];
 return [-.8,.8].map(offset=>p.axis==='x'?{x:p.x+offset,z:p.z,w:.4,d:.16}:{x:p.x,z:p.z+offset,w:.16,d:.4});
}
export function snapStructure(id,x,z,parts,axis=null){
 if(id==='floor')return {id,x:-18+Math.round((x+18)/2)*2,z:20.5+Math.round((z-20.5)/2)*2};
 if(id==='dismantle'){const selected=[...parts].sort((a,b)=>Math.hypot(x-a.x,z-a.z)-Math.hypot(x-b.x,z-b.z))[0];return selected&&Math.hypot(x-selected.x,z-selected.z)<1.5?selected:null;}
 const edges=floors(parts).flatMap(tileEdges).filter(e=>!axis||e.axis===axis);edges.sort((a,b)=>Math.hypot(x-a.x,z-a.z)-Math.hypot(x-b.x,z-b.z));return edges[0]&&Math.hypot(x-edges[0].x,z-edges[0].z)<1.5?{id,...edges[0]}:null;
}
export function connectedFloor(parts){
 const tiles=floors(parts),root=tiles.find(t=>t.x===-18&&t.z===20.5);if(!tiles.length)return true;if(!root)return false;
 const walls=parts.filter(p=>p.id==='wall'||p.id==='window'),seen=new Set([partKey(root)]),queue=[root];
 for(let i=0;i<queue.length;i++)for(const n of tiles){if(seen.has(partKey(n))||!neighbours(queue[i],n))continue;const edge={x:(n.x+queue[i].x)/2,z:(n.z+queue[i].z)/2,axis:n.x===queue[i].x?'x':'z'};if(walls.some(w=>matching(w,edge)))continue;seen.add(partKey(n));queue.push(n);}
 return seen.size===tiles.length;
}
export function closedRooms(parts){
 const tiles=floors(parts),remaining=new Set(tiles),rooms=[];
 const sealed=e=>link(e)||parts.some(p=>p.id!=='floor'&&matching(p,e));
 while(remaining.size){
  const room=[remaining.values().next().value];remaining.delete(room[0]);
  for(let i=0;i<room.length;i++)for(const t of remaining){
   if(!neighbours(room[i],t))continue;
   const edge={x:(t.x+room[i].x)/2,z:(t.z+room[i].z)/2,axis:t.x===room[i].x?'x':'z'};
   if(sealed(edge))continue;remaining.delete(t);room.push(t);
  }
  const boundaries=room.flatMap(tileEdges).filter(e=>room.filter(t=>tileEdges(t).some(q=>matching(q,e))).length===1);
  if(boundaries.every(sealed))rooms.push({tiles:room,boundaries});
 }
 return rooms;
}
export function buildAllowed(state,part,obstacles=[]){
 if(!part||!Object.hasOwn(STRUCTURES,part.id)||part.id==='dismantle')return {ok:false,reason:'Сначала установи пол'};
 const parts=state.construction||[],tiles=floors(parts);if(parts.length>=120)return {ok:false,reason:'Достигнут предел конструкций'};
 if(parts.some(p=>partKey(p)===partKey(part)))return {ok:false,reason:'Здесь уже есть конструкция'};
 if(part.id==='floor'){
  if(part.x<-24||part.x>-10||part.z<20.5||part.z>24.5||!Number.isInteger((part.x+18)/2)||!Number.isInteger((part.z-20.5)/2))return {ok:false,reason:'Выбери место для пристройки во дворе'};
  if(tiles.length&&!tiles.some(t=>neighbours(t,part))||!tiles.length&&(part.x!==-18||part.z!==20.5))return {ok:false,reason:'Пол должен соединяться с входом или другим полом'};
  if(obstacles.some(o=>!o.disabled&&!o.construction&&overlaps({...part,w:1.6,d:1.6},o,.02)))return {ok:false,reason:'Здесь мешает существующий объект'};
 }else{
  if(!tiles.some(t=>tileEdges(t).some(e=>matching(e,part))))return {ok:false,reason:'Стена ставится на край установленного пола'};
  if(link(part))return {ok:false,reason:'Оставь соединение с домом открытым'};
  const colliders=structureColliders(part);if(colliders.some(c=>circleHitsRect(state.x,state.z,.32,c)))return {ok:false,reason:'Отойди от места установки'};
  if(colliders.some(c=>obstacles.some(o=>!o.disabled&&!o.construction&&overlaps(c,o,.03))))return {ok:false,reason:'Конструкция пересекает существующий объект'};
  if(colliders.some(c=>state.placed.some(p=>!['rug','wallclock','wallshelf','fishtrophy'].includes(p.id)&&overlaps(c,footprint(p),.1))))return {ok:false,reason:'Сначала переставь мебель'};
 }
 const next=[...parts,part];if(!connectedFloor(next))return {ok:false,reason:'Эта стена перекроет единственный проход. Выбери дверной проём'};
 if(closedRooms(next).some(room=>state.placed.some(p=>p.id==='raincatcher'&&room.tiles.some(t=>Math.abs(t.x-p.x)<1&&Math.abs(t.z-p.z)<1))))return {ok:false,reason:'Дождевой накопитель должен оставаться под открытым небом'};
 return {ok:true};
}
export function dismantleAllowed(state,part){
 const parts=state.construction||[];if(!part||!parts.includes(part))return {ok:false,reason:'Выбери установленную конструкцию'};
 if(part.id==='floor'){
  if(circleHitsRect(state.x,state.z,.3,structureRect(part)))return {ok:false,reason:'Сойди с пола перед разбором'};
  if(parts.some(p=>p.id!=='floor'&&tileEdges(part).some(e=>matching(e,p))))return {ok:false,reason:'Сначала разбери стены этого пола'};
  if(state.placed.some(p=>overlaps(structureRect(part),footprint(p),0)))return {ok:false,reason:'Сначала переставь мебель с пола'};
 }
 if(!connectedFloor(parts.filter(p=>p!==part)))return {ok:false,reason:'Этот пол соединяет пристройку с домом'};
 return {ok:true};
}
export function cleanConstruction(input){
 const result=[];for(const p of Array.isArray(input)?input.slice(0,120):[]){if(!p||!['floor','wall','window','door'].includes(p.id)||!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;const snapped=snapStructure(p.id,p.x,p.z,result,p.axis);if(!snapped||snapped.x!==p.x||snapped.z!==p.z||p.id!=='floor'&&snapped.axis!==p.axis)continue;const state={construction:result,placed:[],x:-16,z:16};if(buildAllowed(state,snapped).ok)result.push(snapped);}
 return result;
}
