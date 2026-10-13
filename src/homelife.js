export const FINDS={
 foundlamp:{name:'Рабочий светильник',weight:3},
 armchair:{name:'Кресло из старого дома',weight:5},
 wallclock:{name:'Настенные часы',weight:2},
 recordplayer:{name:'Старый проигрыватель',weight:4},
};
export const CROPS={
 herbs:{name:'Душистые травы',interval:120,cost:{seeds:1},loot:{herbs:4},color:'#95b26e'},
 vegetables:{name:'Корнеплоды',interval:180,cost:{seeds:2,water:1},loot:{vegetables:4},color:'#dd9e65'},
 flowers:{name:'Полевые цветы',interval:150,cost:{seeds:1,water:1},loot:{flowers:4},color:'#d69eb6'},
};
export const SCENES=[{x:9,z:36,w:6,d:6},{x:-29,z:33,w:8,d:7},{x:54,z:21,w:7,d:6}];
export const MEMORIES=[
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
 const kind=machineKind(node),data={radio:{duration:2.8,tool:'wrench'},appliance:{duration:3.5,tool:'wrench'},switchboard:{duration:3.8,tool:'cutter'},motor:{duration:5,tool:'wrench'}}[kind];
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
