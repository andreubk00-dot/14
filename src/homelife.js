import {ORCHARD_MEMORIES} from './orchard.js';
import {QUARTERS,FRONTIER_BUILDINGS} from './frontier.js';
export const FINDS={
 campstove:{name:'Уцелевшая кухонная печь',weight:4,desc:'Готовь еду и чай дома рядом с печью. Оружие создаётся на ремонтной станции.'},
 toolcabinet:{name:'Инструментальный шкаф',weight:4,desc:'Хранит два комплекта экипировки, как стеллаж комплектов. Можно найти и привезти домой.'},
 desklamp:{name:'Настольная лампа с тумбой',weight:2.5,desc:'Уцелевшая лампа с собственной батареей. Тёплый свет включается рядом с ней.'},
 homeradio:{name:'Домашний радиоприёмник',weight:2,desc:'Старый приёмник на деревянной подставке. Тихий сигнал слышен рядом; можно выключить.'},
 wallshelf:{name:'Настенная полка',weight:2,desc:'Полка с уцелевшими банками и книгами. Крепится на стену внутри убежища.'},
 foundlamp:{name:'Рабочий светильник',weight:3},
 armchair:{name:'Кресло из старого дома',weight:5},
 wallclock:{name:'Настенные часы',weight:2},
 recordplayer:{name:'Старый проигрыватель',weight:4},
};
export const CROPS={
 herbs:{name:'Душистые травы',interval:120,cost:{seeds:1},loot:{herbs:4,seeds:1},color:'#95b26e'},
 vegetables:{name:'Корнеплоды',interval:180,cost:{seeds:2,water:1},loot:{vegetables:4,seeds:2},discovery:'Семена корнеплодов встречаются в огородах и садах',color:'#dd9e65'},
 flowers:{name:'Полевые цветы',interval:150,cost:{seeds:1,water:1},loot:{flowers:4,seeds:1},discovery:'Семена цветов встречаются в оранжереях',color:'#d69eb6'},
};
export const RESOURCE_SITES=[['tree',-29,14],['tree',-32,19],['tree',-35,13],['tree',-29,26],['tree',-7,30],['tree',7,29],['stone',-31,9],['stone',-30,28.5],['stone',-8,33],['stone',6,27]];
export const SCENES=[{x:-58,z:35,w:7,d:10},{x:58,z:-36,w:8,d:10},{x:-56,z:40,w:4,d:4},...RESOURCE_SITES.map(([,x,z])=>({x,z,w:4,d:4})),{x:-17,z:-11,w:22,d:3},{x:9,z:36,w:6,d:6},{x:-29,z:33,w:8,d:7},{x:54,z:21,w:7,d:6}];
export const MEMORIES=[
 ...ORCHARD_MEMORIES,
 ...QUARTERS.map(q=>{const b=FRONTIER_BUILDINGS.find(b=>b.quarter===q.id&&b.index===0);return {id:'frontier-'+q.id,name:{rail:'Невостребованный багаж',school:'Тетрадь школьного завхоза',port:'Журнал разгрузки',orchard:'Список весенних посадок',village:'Письмо на кухонном столе',retail:'Последняя накладная'}[q.style],x:b.x+b.w/2-1.3,z:b.z-b.d/2+1.1,y:.975,text:{rail:'«Багаж хранить до прихода следующего состава. Сначала заберут детские вещи, потом инструменты». На полях нарисована маленькая станция; время отправления стёрто.',school:'«Книги — в сухую комнату. Перевязочное оставила в медпункте, крупу — в столовой». Под записью кто-то аккуратно дорисовал солнце.',port:'«Насосы сложить отдельно от двигателей. Провода не выбрасывать. У настила снова ловится рыба». Последнюю страницу оставили чистой.',orchard:'«Семена беречь от сырости. Травы сушить в сарае; рассаду держать под стеклом». На листе остались отпечатки земли.',village:'«На веранде вечером тепло. Ткань найдёшь в мастерской, продукты — на общей кухне». Письмо сложено, но конверта рядом нет.',retail:'«Лекарства переданы в аптеку. Сухой запас остаётся в продуктовом складе». Внизу стоит подпись кладовщика и след от чашки.'}[q.style]};}),
 {id:'laundry',name:'Записка на бельевом шкафу',x:-59.7,z:36.6,text:'«Чистое бельё в левую корзину. Запас перевязочной не смешивать с ветошью для машин». Две строки отмечены карандашом; третья осталась пустой.'},
 {id:'dispatch',name:'План последней смены',x:59.8,z:-36.9,text:'«Резервное питание снять перед разбором пульта. Комплект ключей оставили в мастерской. Ночной обход отменён — охранники не получили команду». Рядом стоит остывшая кружка.'},
 {id:'pumpstation',name:'Бирка на фильтровом шкафу',x:46,z:-19.3,text:'«Фильтры хранить сухими. Два картриджа и малый насос подойдут для дворового накопителя. Подачу отключить перед заменой». Нижнюю строку размыло водой.'},
 {id:'garage',name:'Лист ремонта агрегатов',x:-10,z:-39,text:'«Аккумулятор для вентилятора отложен. Сортировщик тоже работает на малом насосе: меньше лома уходит в отходы. Калитку открыть болторезом — длинная дорога с грузом надоела». Последняя подпись осталась без даты.'},
 {id:'lane',name:'Записка на кухонной полке',x:7,z:55.5,text:'«Фильтр в хозяйственном ящике, ткань у швейного стола. На улице тише — оставим окно приоткрытым». Рядом две кружки и связка высохших трав.'},
 {id:'cafe',name:'Меню последней смены',x:25,z:42,text:'«Улов сушить с травами, запас воды держать под фильтром. Курьер просил лёгкую куртку — охранные дозорные редко замечают его за спиной». На обороте записано: два стола оставить для соседей.'},
 {id:'substation',name:'Памятка дежурного',x:-48.8,z:-13.4,text:'«За шкафами обзор перекрыт. Перед ударом индикатор охранника загорается ярче — успеть отойти или спрятаться. Быстрый дозорный смотрит дальше, но бьёт слабее». Внизу отметка о смене патрульного маршрута.'},
 {id:'courtyard',name:'Листок у бельевой верёвки',x:-46,z:48.5,text:'«Не забирай всё бельё: отложи чистое для перевязок. Овощи у веранды можно запечь с рыбой. Кладовую закрыла цепью — болторез оставила соседям». На полях нарисованы два дома и длинная бельевая верёвка.'},
 {id:'salvage',name:'Журнал склада',x:40.5,z:-51,text:'«Ворота опять заклинило. Ключами снять прижимную планку, потом потянуть створку. Электрощиты хранятся справа, двигатели — слева. В коробках не лом: детали прошли проверку». Дата последней смены выцвела.'},
 {id:'backwater',name:'Записка рыбака',x:28.8,z:54.6,text:'«В заводи карась берёт овощное тесто. На траву быстрее клюёт окунь. Форель выходит в темноте; блесну не выбрасывай после заброса. Раковины ищи у затопленного причала». Ниже — пятно от мокрой чашки.'},
 {id:'bus',name:'Запись на остановке',x:9.5,z:36.7,text:'«Если автобус всё-таки придёт, я оставлю часы у скамейки. Заводить их нужно редко. Не выбрасывайте: папа починил их сам». Последняя строка перечёркнута: «Лучше я подожду ещё немного».'},
 {id:'picnic',name:'Открытка у пледа',x:-27,z:33,text:'«В следующий раз возьмём настоящий стол и не забудем музыку». На обороте — рисунок трёх чашек. Дождь смыл адрес, но бумага уцелела под жестяной коробкой.'},
 {id:'yard',name:'Тетрадь механика',x:52,z:22,text:'«Двигатели разбирать ключами, не бить по креплениям. Исправный проигрыватель отложил отдельно: заберу домой после смены». На следующей странице только масляный след.'},
];
export function machineKind(node) {
 if(node.machine) return node.machine;
 if(node.type==='electronics') return /радио/i.test(node.name)?'radio':'switchboard';
 if(node.type==='scrap') return /мотор|двигател|генератор/i.test(node.name)?'motor':/техника|стиральная|бытовая|холодильник/i.test(node.name)?'appliance':null;
 return null;
}
export function dismantleInfo(owned,node) {
 const kind=machineKind(node),data={standingtree:{duration:4.5,tool:'axe'},quarry:{duration:4,tool:'pick'},radio:{duration:2.8,tool:'wrench'},appliance:{duration:3.5,tool:'wrench'},switchboard:{duration:3.8,tool:'cutter'},motor:{duration:5,tool:'wrench'}}[kind];
 if(!data) return {duration:['tree','ore'].includes(node.type)?1.8:1.1,kind:null,fast:false};
 const fast=owned.includes(data.tool);return {...data,kind,fast,duration:fast?data.duration*.5:data.duration};
}
export function cropInfo(state,item) {
 const crop=CROPS[item.crop];if(item.id!=='cropbed'||!crop||!Number.isFinite(item.plantedAt)) return null;
 const interval=crop.interval*(state.owned.includes('pump')?.75:1)*(state.owned.includes('solar')?.75:1);
 const age=Math.max(0,state.elapsed-item.plantedAt+(item.rainGrowth||0));
 const {cost:plantingCost,...data}=crop;
 return {...data,plantingCost,interval,remaining:Math.max(0,interval-age),progress:Math.min(1,age/interval),name:`Собрать: ${crop.name.toLowerCase()}`};
}

// Discover only after seeds actually enter the bag; a full bag cannot unlock a variety.
export function discoverCultivar(state,node,received) {
 const id=node.seedCrop;if(!(received.seeds>0)||!Object.hasOwn(CROPS,id)||state.cultivars.includes(id))return null;
 state.cultivars.push(id);return CROPS[id];
}
