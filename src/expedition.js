// Shared physical places, access tools and fishing conditions.
export const GATES=[
 {id:'yard',name:'Цепь на двери кладовой',x:-44,z:61,w:2.7,d:.32,tool:'cutter',duration:3,bounds:{x:-44,z:56,w:10,d:10}},
 {id:'salvage',name:'Заклинившая дверь склада',x:51,z:-45,w:2.7,d:.32,tool:'wrench',duration:4,bounds:{x:51,z:-50,w:14,d:10}},
 {id:'garage-path',name:'Калитка ремонтного двора',x:-15,z:-37,w:2.8,d:.22,tool:'cutter',duration:2.5},
 {id:'housing-debris',name:'Доски в проходе',x:15,z:25.5,w:2.8,d:.8,tool:'axe',duration:3,kind:'boards',loot:{wood:5}},
 {id:'workshop-debris',name:'Металлический завал',x:41,z:18,w:3.2,d:.8,tool:'wrench',duration:4,kind:'metal',loot:{metal:3,parts:1}},
 {id:'forest-cut',name:'Упавшие доски на лесной дороге',x:-24,z:120,w:2.8,d:.8,tool:'axe',duration:3,kind:'boards',loot:{wood:5}},
 {id:'pump-path',name:'Сервисная калитка',x:49,z:-16,w:2.8,d:.22,tool:'wrench',duration:2.5},
];
export const FISHING_SPOTS=[
 {id:'forestlake',name:'Лесное озеро',x:104,z:164,desc:'Старый настил среди леса. Окунь у берега, форель подходит к вечеру.'},
 {id:'harbor',name:'Промышленная набережная',x:104,z:-20,desc:'Тихая вода у деревянного настила. Вечером здесь ловится форель.'},
 {id:'pond',name:'Затопленный причал',x:19.7,z:-17,desc:'Окунь в камышах. В темноте к настилу подходит форель.'},
 {id:'backwater',name:'Тихая заводь',x:28,z:55.2,desc:'Карась у берега. Блесна привлекает редкую рыбу, раковины чаще встречаются у старого причала.'},
];
export const BAITS={
 none:{name:'Без наживки',desc:'Медленная поклёвка; расходников не нужно.'},
 herbs:{name:'Травяная приманка',desc:'1 трава из рюкзака на заброс. Поклёвка быстрее, чаще окунь.',resource:'herbs'},
 vegetables:{name:'Овощное тесто',desc:'1 овощ из рюкзака на заброс. Карась берёт охотнее.',resource:'vegetables'},
 lure:{name:'Многоразовая блесна',desc:'Изготавливается на станции. Повышает шанс форели; не расходуется.',tool:'lure'},
};
export function gameHour(elapsed) {return ((17*60+42+Math.max(0,elapsed)/2)/60)%24;}
export function weatherAt(elapsed) {
 const t=((elapsed%420)+420)%420;
 const rain=Math.max(0,Math.min(1,(t-160)/15,(280-t)/20));
 return {rain,daylight:Math.max(0,Math.sin((gameHour(elapsed)-6)/24*Math.PI*2))};
}
export function fishingProbabilities(upgraded,conditions={}) {
 let p=upgraded?[.3,.3,.22,.18]:[.46,.29,.15,.1];p=[...p];
 if(conditions.spot==='backwater') {p[1]*=1.6;p[3]*=.3;}
 if(conditions.hour>=20||conditions.hour<6) p[2]*=1.7;
 if(conditions.bait==='herbs')p[0]*=1.6;
 if(conditions.bait==='vegetables')p[1]*=2;
 if(conditions.bait==='lure')p[2]*=2;
 const sum=p.reduce((a,b)=>a+b,0);return p.map(v=>v/sum);
}

export function gateForPoint(x,z,margin=0) {return GATES.find(g=>g.bounds&&Math.abs(x-g.bounds.x)<g.bounds.w/2+margin&&Math.abs(z-g.bounds.z)<g.bounds.d/2+margin)?.id;}
