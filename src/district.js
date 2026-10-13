export const WORLD_LIMIT=64;
export const LOCATIONS=[
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
 {x:0,z:0,w:7.8,d:126}, {x:-13.5,z:3,w:35,d:6},
 {x:30,z:-8,w:60,d:6}, {x:41,z:7,w:5,d:30}, {x:50,z:23,w:23,d:5},
 {x:-42,z:23,w:32,d:5},{x:-39,z:32,w:4,d:20},{x:-48,z:41,w:26,d:4},
 {x:-34,z:-28,w:3,d:49},{x:-41,z:-37,w:17,d:3},
];
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
 const span=(WORLD_LIMIT+2)*2;
 return {x:nx*span-WORLD_LIMIT-2,z:nz*span-WORLD_LIMIT-2};
}
