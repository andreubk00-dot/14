import {roadSurfaces} from './roads.js';
import {WORLD_BOUNDS,FLOOD_PLACES,FLOOD_PATHS} from './floodplain.js';
export {WORLD_BOUNDS} from './floodplain.js';
import {OUTLAND_LIMIT,OUTLAND_PLACES,OUTLAND_PATHS} from './outlands.js';
import {ORCHARD_PATHS} from './orchard.js';
import {FRONTIER_LOCATIONS,FRONTIER_ROADS,QUARTERS} from './frontier.js';
export const WORLD_LIMIT=OUTLAND_LIMIT;
export const LOCATIONS=[
 ...OUTLAND_PLACES,...FLOOD_PLACES,
 ...FRONTIER_LOCATIONS,
 {id:'laundry',name:'Прачечная клиники',label:'Прачечная',subtitle:'Чистое бельё · медицинские запасы',x:-58,z:35,color:'#b5c5bf',radius:5,note:'Маленький двор за клиникой. Бельё сложено отдельно от разобранной машины; пустые корзины остались у двери.'},
 {id:'dispatch',name:'Старая диспетчерская',label:'Диспетчерская',subtitle:'Ремонтные запасы · резервное питание',x:58,z:-36,color:'#9eb9c0',radius:6,note:'Пульт смены и шкаф ремонтных запасов. Антенна ещё стоит; питание давно отключено.'},
 {id:'pumpstation',name:'Затопленная насосная',label:'Насосная',subtitle:'Фильтры · насосы · влажные залы',x:49,z:-25,color:'#94c0b9',radius:8,note:'Вода остановилась у платформы. Сменные фильтры лежат на сухих стеллажах, насосные узлы — в ремонтных запасах.'},
 {id:'garage',name:'Гараж ремонтной бригады',label:'Гараж',subtitle:'Аккумуляторы · агрегаты · инструменты',x:-15,z:-48,color:'#bba784',radius:9,note:'Смотровая площадка, стенд для двигателей и верстак. В технике ещё сохранились аккумуляторы.'},
 {id:'lane',name:'Тихий жилой переулок',label:'Переулок',subtitle:'Два дома · кладовые · сад',x:10,z:55,color:'#c4b99e',radius:11,note:'В одном доме осталась общая кухня, в другом — швейный стол. Сухие запасы берегли на верхних полках.'},
 {id:'cafe',name:'Кафе у старого сада',label:'Кафе',subtitle:'Урожай · продукты · кухня',x:26,z:36,color:'#c2ad83',radius:8,note:'Столы ещё стоят попарно. За кухней сохранились овощи, травы и запасы воды.'},
 {id:'substation',name:'Районная подстанция',label:'Подстанция',subtitle:'Провод · детали · патрули',x:-52,z:-20,color:'#9fb8ad',radius:8,note:'Распределительные шкафы отделены перегородкой. Дозорные проверяют подходы; между их обзорами есть проходы.'},
 {id:'courtyard',name:'Двор последнего дома',label:'Двор',subtitle:'Ткани · овощи · закрытая кладовая',x:-44,z:56,color:'#c4b7a2',radius:8,note:'Во дворе сушилось бельё и росли овощи. Кладовую закрыли цепью перед отъездом.'},
 {id:'salvage',name:'Склад разобранной техники',label:'Склад',subtitle:'Двигатели · провод · детали',x:51,z:-50,color:'#b2b6bf',radius:8,note:'Тяжёлая дверь заклинила. Крепления можно снять ключами; за дверью остались двигатели и ремонтные запасы.'},
 {id:'backwater',name:'Рыбацкая заводь',label:'Заводь',subtitle:'Рыбалка · продукты',x:28,z:51,color:'#7ebbb3',radius:9,note:'Орешниковая удочка у стены, корзины и стол для чистки рыбы. Здесь ловили карася на овощное тесто.'},
 {id:'home',name:'Ремонтная станция',label:'Убежище',subtitle:'Твоё убежище',x:-17,z:16,color:'#e6b779',radius:9,note:'Оставленные инструменты, печь и верстак. У этого места ещё есть будущее.'},
 {id:'garden',name:'Заброшенный сад',label:'Сад',subtitle:'Семена · травы · старые запасы',x:-34,z:-5,color:'#b5c68b',radius:7,note:'Грядки пережили тех, кто за ними ухаживал. В ящиках у теплицы сохранились семена.'},
 {id:'market',name:'Старый магазин',label:'Магазин',subtitle:'Хозяйственные запасы',x:13,z:4,color:'#a4b6ae',radius:6,note:'На прилавке остались весы, за ним — пустые полки. Не все хозяйственные ящики разобрали.'},
 {id:'housing',name:'Дом у перекрёстка',label:'Дом',subtitle:'Оставленные вещи',x:15,z:19,color:'#c4b7a2',radius:6,note:'Сложенная одежда и разобранный радиоприёмник. Хозяева собирались вернуться.'},
 {id:'tailor',name:'Старое ателье',label:'Ателье',subtitle:'Ткани и инструменты',x:29,z:6,color:'#b5a1c5',radius:6,note:'Рулоны ткани прикрыты от пыли. Рядом с рабочим столом стоит запертый технический контейнер.'},
 {id:'depot',name:'Заброшенное депо',label:'Депо',subtitle:'Металл · детали · опасность',x:-18,z:-25,color:'#b8a186',radius:8,note:'Рельсы заканчиваются в ремонтном зале. Охранные дроны всё ещё обходят старую технику.'},
 {id:'pond',name:'Затопленный причал',label:'Причал',subtitle:'Рыбалка · редкие находки',x:20,z:-20,color:'#7ebbb3',radius:7,note:'Потемневший настил, рыбацкий ящик и тихая вода. Даже здесь жизнь продолжается.'},
 {id:'tower',name:'Водонапорная башня',label:'Башня',subtitle:'Вода · технические запасы',x:31,z:-34,color:'#8bbfc7',radius:7,note:'Насосная станция молчит. Вода в резервуаре ещё есть, но электрическую часть придётся восстановить.'},
 {id:'clinic',name:'Клиника на окраине',label:'Клиника',subtitle:'Перевязочные материалы',x:-49,z:32,color:'#bcaba7',radius:7,note:'Две койки, умывальник и шкаф перевязочной. На доске осталась запись: «Чистую ткань хранить отдельно».'},
 {id:'workshop',name:'Восточная мастерская',label:'Мастерская',subtitle:'Техника и закрытые запасы',x:51,z:12,color:'#b2b6bf',radius:8,note:'Снятые двигатели ждут ремонта. Контейнер у задней стены заперт; за оградой слышно движение дронов.'},
 {id:'greenhouse',name:'Заросшая оранжерея',label:'Оранжерея',subtitle:'Посадки и семенной фонд',x:-42,z:-44,color:'#9fc1a0',radius:7,note:'Вода просачивается через старые рамы. Уцелевшие посадки тянутся к свету, а семенной фонд хранится в закрытом ящике.'},
];
// Paths avoid foundations; the map and vegetation use the same rectangles.
export const ROADS=[
 ...FRONTIER_ROADS,...ORCHARD_PATHS,...OUTLAND_PATHS,...FLOOD_PATHS,
 // Door approaches end outside foundations; service lanes join the main streets.
 {x:49,z:-15.2,w:2.4,d:10},{x:64,z:-27,w:2.4,d:38},{x:57.5,z:-43,w:13,d:2.4},
 {x:58,z:-31.5,w:1.8,d:2.6},{x:61,z:-30,w:6,d:2.4},
 {x:-7.5,z:-40,w:17,d:2.4},{x:-15,z:-41.4,w:1.8,d:1.6},
 {x:14,z:55,w:28,d:1.2,garden:true},{x:19,z:53.5,w:2.4,d:21},{x:10,z:64,w:22,d:2.4},
 {x:10,z:63.2,w:1.6,d:1.2,garden:true},
 {x:13,z:43,w:26,d:2.4},{x:26,z:41.6,w:1.8,d:2.8,garden:true},
 {x:27,z:54.7,w:1.8,d:1.2,garden:true},
 {x:-43.5,z:-12.8,w:21,d:2.4},{x:-52,z:-13.8,w:1.8,d:1.2,garden:true},
 {x:-29,z:13,w:2.4,d:20},{x:-39,z:32,w:4,d:20},{x:-46.4,z:41,w:29.2,d:4},
 {x:-49,z:38.35,w:1.8,d:2.3,garden:true},{x:-58,z:38.65,w:1.6,d:.9,garden:true},
 {x:-33,z:53,w:2.4,d:22},{x:-38.5,z:63,w:11,d:2.4},{x:-44,z:62.2,w:1.8,d:1.2,garden:true},
 {x:51,z:19,w:1.8,d:3,garden:true},
 {x:0,z:0,w:7.8,d:126}, {x:-13.5,z:3,w:35,d:6},
 {x:30,z:-8,w:60,d:6}, {x:41,z:7,w:5,d:30}, {x:50,z:23,w:23,d:5},
 {x:-42,z:23,w:32,d:5},
 {x:-34,z:-28,w:3,d:49},{x:-41,z:-37,w:17,d:3},
];
export const ROAD_SURFACES=roadSurfaces(ROADS);
export function discover(state,nodes=[]) {
 let changed=false;
 for(const l of LOCATIONS) if(!state.visited.includes(l.id)&&Math.hypot(state.x-l.x,state.z-l.z)<=l.radius) {state.visited.push(l.id);changed=true;}
 for(const n of nodes) if(n.id.startsWith('node-')&&!state.foundNodes.includes(n.id)&&Math.hypot(state.x-n.x,state.z-n.z)<4) {state.foundNodes.push(n.id);changed=true;}
 return changed;
}
export function cycleLoot(id,base,cycle) {
 if(!cycle) return {...base};
 let hash=2166136261;for(const char of `${id}:${cycle}`) hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return Object.fromEntries(Object.entries(base).map(([key,n],i)=>[key,Math.max(1,n+((hash>>>(i*4%24))%3)-1)]));
}
export function mapPoint(nx,nz) {
 return {x:WORLD_BOUNDS.minX-2+nx*(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX+4),z:WORLD_BOUNDS.minZ-2+nz*(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ+4)};
}

const EXPEDITION_PROFILES={...Object.fromEntries(QUARTERS.map(q=>[q.id,q.profile])),clinic:['cloth','herbs'],laundry:['cloth','herbs'],tailor:['cloth','wire'],lane:['vegetables','cloth','water'],courtyard:['cloth','vegetables'],cafe:['vegetables','herbs','water'],backwater:['fish','wood'],pond:['fish','wood'],garden:['seeds','herbs'],greenhouse:['seeds','flowers'],garage:['metal','parts','wire'],depot:['metal','parts'],workshop:['parts','wire','metal'],salvage:['parts','metal','wire'],pumpstation:['cloth','wire','parts'],dispatch:['wire','parts'],market:['wood','cloth','water'],housing:['cloth','wood'],substation:['wire','parts']};
export function expeditionLoot(node,cycle){
 const base=node.originalLoot||{},loot=cycleLoot(node.id,base,cycle);if(!cycle||node.type!=='crate'||node.find)return loot;
 const place=LOCATIONS.reduce((a,b)=>Math.hypot(node.x-a.x,node.z-a.z)<Math.hypot(node.x-b.x,node.z-b.z)?a:b),choices=node.regionProfile||EXPEDITION_PROFILES[place.id];
 if(!choices?.length)return loot;let hash=cycle;for(const char of node.id)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;const item=choices[hash%choices.length];loot[item]=(loot[item]||0)+1;
 for(const id of ['battery','filterunit','pumpmodule','medicine'])if(base[id])loot[id]=base[id];return loot;
}
