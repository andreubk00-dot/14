// A single layout drives rendering, movement, hull clearance and save validation.
export const RESTORATIONS=[
 {id:'camp-crossing',name:'Мостки к стоянке',x:325,z:35,duration:5,cost:{wood:10,metal:3,parts:2},joins:['reedcamp','floodhomes'],decks:[{x:301,z:42,w:2.8,d:14},{x:312,z:35,w:24,d:2.8}],ends:[{x:301,z:49},{x:324,z:35}],desc:'Прямой пеший путь между жилой улицей и стоянкой. Лодка останется для дальних вылазок.'},
 {id:'garden-crossing',name:'Мостки к садам',x:358,z:76,duration:5,cost:{wood:10,metal:3,wire:2},joins:['floodhomes','floodgardens'],decks:[{x:358,z:58,w:2.8,d:34}],ends:[{x:358,z:41},{x:358,z:75}],desc:'Восстанови переход от садов к жилой улице: урожай можно будет унести пешком.'},
 {id:'drain-works',name:'Осушить ремонтный зал',x:278,z:-57,duration:8,cost:{parts:4,wire:4,pumpmodule:1},desc:'Подключи запасной насос. Вода уйдёт из ремонтного зала, откроются техника и сквозной выход за мастерскую.'},
 {id:'quarry-workshop',name:'Мастерская Каменного разреза',x:-171.3,z:118.1,duration:6,cost:{metal:6,wire:2,parts:2,battery:1},desc:'Восстанови питание рабочего стола. Здесь можно будет делать заряды и аптечки из принесённых материалов, продолжая дальнюю вылазку.'},
];
export const DRAIN_AREA={x:280,z:-73,w:14,d:8};
export const DRAIN_PASSAGE={x:280,z:-68,w:4,d:2};
export const cleanRestorations=value=>[...new Set((Array.isArray(value)?value:[]).filter(id=>RESTORATIONS.some(p=>p.id===id)))];
export const restoredDecks=ids=>RESTORATIONS.filter(p=>ids?.includes(p.id)&&p.decks).flatMap(p=>p.decks);
export const inDeck=(x,z,r,pad=0)=>Math.abs(x-r.x)<=r.w/2+pad&&Math.abs(z-r.z)<=r.d/2+pad;
export function onRestoredDeck(x,z,ids=[],pad=0){for(const p of RESTORATIONS)if(p.decks&&ids.includes(p.id))for(const r of p.decks)if(inDeck(x,z,r,pad))return true;return false;}
const drainRegions=[DRAIN_AREA,DRAIN_PASSAGE];
export const drainBlocked=(x,z,r=0,ids=[])=>!ids.includes('drain-works')&&drainRegions.some(a=>inDeck(x,z,a,r));
export function joinedRegion(id,ids=[]){const linked=new Set([id]);let changed=true;while(changed){changed=false;for(const p of RESTORATIONS)if(ids.includes(p.id)&&p.joins?.some(i=>linked.has(i)))for(const i of p.joins)if(!linked.has(i)){linked.add(i);changed=true;}}return [...linked].sort()[0];}
export function restorationStatus(state,id){
 const p=RESTORATIONS.find(p=>p.id===id);if(!p)return {ok:false,reason:'Неизвестное место ремонта'};
 if(state.restoredRoutes?.includes(id))return {ok:false,reason:'Уже восстановлено'};
 if(state.boat.aboard||Math.hypot(state.x-p.x,state.z-p.z)>2.6)return {ok:false,reason:'Подойди к месту ремонта'};
 if(!state.owned.includes('wrench'))return {ok:false,reason:'Нужен гаечный ключ'};
 if(p.decks?.some(r=>inDeck(state.boat.x,state.boat.z,r,1.6)))return {ok:false,reason:'Сначала отведи лодку от перехода'};
 if(!Object.entries(p.cost).every(([key,n])=>(state.bag[key]||0)>=n))return {ok:false,reason:'Материалы должны быть в рюкзаке'};
 return {ok:true};
}
export function restoreRoute(state,id){const result=restorationStatus(state,id);if(!result.ok)return result;const p=RESTORATIONS.find(p=>p.id===id);for(const [key,n]of Object.entries(p.cost))state.bag[key]-=n;(state.restoredRoutes??=[]).push(id);return {ok:true};}
