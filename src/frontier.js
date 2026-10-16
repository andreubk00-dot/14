// Permanent append-only content: earlier node IDs and save coordinates stay valid.
export const QUARTERS=[
 {id:'railquarter',name:'Железнодорожный квартал',label:'Вокзал',x:-24,z:-84,color:'#b8a08a',profile:['metal','parts','wire'],roles:['ЗАЛ ОЖИДАНИЯ','РЕМОНТНЫЙ ЦЕХ','БАГАЖНОЕ ОТДЕЛЕНИЕ','ДОМ ПУТЕЙЦА'],style:'rail'},
 {id:'campus',name:'Школьный квартал',label:'Школа',x:-84,z:16,color:'#b9b3a0',profile:['cloth','medicine','herbs'],roles:['СТАРАЯ ШКОЛА','БИБЛИОТЕКА','ШКОЛЬНАЯ СТОЛОВАЯ','МЕДПУНКТ'],style:'school'},
 {id:'portquarter',name:'Промышленная набережная',label:'Набережная',x:86,z:-20,color:'#9eb8ba',profile:['wire','parts','metal'],roles:['ГРУЗОВОЙ СКЛАД','ЭЛЕКТРОМАСТЕРСКАЯ','РЕМОНТНАЯ КОНТОРА','СКЛАД НАСОСОВ'],style:'port'},
 {id:'orchardquarter',name:'Сады за оранжереей',label:'Сады',x:-84,z:-75,color:'#a5bc92',profile:['seeds','vegetables','herbs'],roles:['СЕМЕННАЯ СТАНЦИЯ','ОРАНЖЕРЕЯ','ДОМ САДОВНИКА','СУШИЛЬНЫЙ САРАЙ'],style:'orchard'},
 {id:'village',name:'Старый дачный посёлок',label:'Посёлок',x:-24,z:86,color:'#c0b398',profile:['wood','cloth','vegetables'],roles:['ДОМ С ВЕРАНДОЙ','ШВЕЙНАЯ МАСТЕРСКАЯ','ОБЩАЯ КУХНЯ','ХОЗЯЙСТВЕННЫЙ САРАЙ'],style:'village'},
 {id:'retailquarter',name:'Торговые дворы',label:'Торговые дворы',x:82,z:78,color:'#bba38f',profile:['water','vegetables','cloth'],roles:['ПРОДУКТОВЫЙ СКЛАД','ХОЗЯЙСТВЕННЫЙ МАГАЗИН','АПТЕКА','БУЛОЧНАЯ'],style:'retail'},
];
export const FRONTIER_LOCATIONS=QUARTERS.map(q=>({...q,subtitle:{rail:'Техника · ремонт · багаж',school:'Ткань · перевязочная · кухня',port:'Агрегаты · провод · насосы',orchard:'Семена · урожай · травы',village:'Дома · мастерская · кладовые',retail:'Продукты · лекарства · запасы'}[q.style],radius:20,note:{rail:'Багаж так и остался в зале ожидания. Отремонтированный локомотив никто не вывел из депо.',school:'Учебники сложены в библиотеке, кухонные запасы — в столовой. Медпункт закрывали последним.',port:'Насосы остановились, но вода у старого настила по-прежнему отражает окна складов.',orchard:'Водостоки засорились листьями. В оранжерее сохранились семена и уцелевшие растения.',village:'На веранде стоят два стула. Кухня общая, а ткань и инструменты берегли в отдельной мастерской.',retail:'Хлеб перестали печь раньше, чем закрыли аптеку. Служебные двери выходят в тихие дворы.'}[q.style]}));
export const FRONTIER_BUILDINGS=QUARTERS.flatMap(q=>q.roles.map((sign,i)=>({quarter:q.id,style:q.style,sign,x:q.x+(i%2?-11:11),z:q.z+(i<2?-12:12),w:i===0?14:i===1?10:i===2?9:8,d:i===0?10:i===1?12:8,h:q.style==='rail'&&i===0?5.2:q.style==='port'?4.6:3.3,index:i,shade:['#8d8876','#768b85','#92957c','#8e8170'][i],roofStyle:i%2?'hip':'gable',pitch:q.style==='village'?.38:i===0?.12:.24,greenhouse:q.style==='orchard'&&i===1})));
export const FRONTIER_ROADS=[
 {x:0,z:-85,w:7.8,d:44},{x:0,z:85,w:7.8,d:44},
 {x:-12,z:-65,w:28,d:3},{x:-24,z:-85,w:3,d:44},
 {x:-70,z:16,w:30,d:4},{x:-84,z:16,w:3,d:44},
 {x:61.5,z:-14,w:4,d:16},{x:75,z:-20,w:28,d:4},{x:86,z:-20,w:3,d:44},
 {x:-46.5,z:-37,w:14,d:3},{x:-52,z:-56,w:3,d:39},{x:-68,z:-75,w:36,d:3},{x:-84,z:-75,w:3,d:44},
 {x:-11,z:86,w:25,d:3},{x:-24,z:86,w:3,d:44},
 {x:62,z:49,w:44,d:3},{x:82,z:73,w:3,d:50},
 ...QUARTERS.flatMap(q=>[{x:q.x,z:q.z,w:42,d:3},{x:q.x,z:q.z+18,w:42,d:3}]),
];
const profiles={
 rail:[{metal:5,parts:3},{wire:4,parts:2,battery:1},{cloth:4,wood:3}],
 school:[{cloth:5,herbs:2},{medicine:1,cloth:3},{vegetables:4,water:2}],
 port:[{metal:6,parts:3},{wire:5,battery:1},{parts:4,pumpmodule:1}],
 orchard:[{seeds:4,herbs:3},{vegetables:5,water:2},{wood:5,flowers:2}],
 village:[{cloth:5,wood:3},{vegetables:4,herbs:2},{wood:6,wire:2}],
 retail:[{vegetables:5,water:2},{cloth:4,parts:2},{medicine:1,herbs:4}],
};
function supplies(b){
 if(b.style==='orchard')return [
  [{seeds:4,herbs:3},{seeds:3,cloth:2},{wood:4,water:2}],
  [{seeds:4,flowers:2},{vegetables:5,water:2},{herbs:5,wood:2}],
  [{cloth:4,wood:3,seeds:1},{herbs:3,water:2},{vegetables:4,cloth:2}],
  [{wood:5,parts:2,seeds:1},{metal:4,wire:2},{herbs:4,seeds:2}],
 ][b.index];
 if(b.style==='school'&&b.index===1)return [{cloth:4,wood:4},{cloth:3,wood:3},{water:2,cloth:2}];
 if(b.style==='school')return b.index===3?[{cloth:5,herbs:3},{medicine:2,cloth:3},{water:2,herbs:3}]:b.index===2?[{vegetables:5,water:2},{herbs:3,wood:3},{cloth:3,seeds:2}]:[{cloth:5,wood:3},{wire:2,parts:2},{cloth:3,water:2}];
 if(b.style==='retail'&&b.index===2)return [{medicine:2,cloth:4},{herbs:4,cloth:3},{water:3,herbs:2}];
 if(b.style==='rail'&&b.index===2)return [{cloth:6,wood:3},{cloth:4,parts:2},{water:3,cloth:2}];
 if(b.style==='rail'&&b.index===0)return [{cloth:4,water:3},{wood:4,cloth:2},{water:3,herbs:2}];
 if(b.style==='rail'&&b.index===3)return [{cloth:4,wood:4},{wood:3,herbs:2},{water:3,cloth:2}];
 if(b.style==='retail'&&b.index!==2)return b.index===1?[{metal:4,parts:2},{cloth:5,wire:2},{wood:5,water:2}]:[{vegetables:5,water:2},{herbs:3,cloth:2},{wood:4,vegetables:3}];
 if(b.style==='rail'&&b.index!==1)return [{cloth:4,wood:3},{wire:3,parts:2},{water:3,cloth:2}];
 if(b.style==='village'&&b.index===1)return [{cloth:6,wire:2},{cloth:4,parts:2},{wood:4,cloth:3}];
 if(b.style==='port')return [
  [{metal:6,cloth:3},{wire:4,parts:2},{wood:5,cloth:2}],
  [{wire:5,parts:3},{metal:4,battery:1},{wire:3,cloth:2}],
  [{cloth:4,wood:3},{parts:3,wire:2},{water:2,cloth:3}],
  [{parts:4,pumpmodule:1},{metal:4,wire:3},{filterunit:2,cloth:2}],
 ][b.index];
 if(b.style==='village')return b.index===2?[{vegetables:5,herbs:3},{water:3,wood:3},{vegetables:3,cloth:2}]:b.index===3?[{wood:7,metal:3},{wire:3,parts:2},{wood:4,cloth:2}]:[{cloth:5,wood:3},{cloth:3,water:2},{wood:4,herbs:2}];
 return profiles[b.style];
}
export const FRONTIER_NODES=FRONTIER_BUILDINGS.flatMap(b=>supplies(b).map((loot,i)=>[i===1&&(b.style==='port'||b.style==='rail'&&b.index===1)?'scrap':'crate',`${b.sign.toLocaleLowerCase('ru')} · ${['кладовая','рабочие запасы','сухой ящик'][i]}`,b.x+(i===0?-b.w/4:i===1?b.w/4:0),b.z+(i===2?1.8:-1),loot,i===1&&b.style==='port'?'wrench':null,null,i===1&&(b.style==='port'||b.style==='rail'&&b.index===1)?'motor':null,Object.keys(loot).filter(id=>!['medicine','battery','pumpmodule','filterunit'].includes(id)),b.style==='orchard'&&i===0?(b.index===1?'flowers':'vegetables'):null]));
export const FRONTIER_RESOURCES=QUARTERS.flatMap(q=>[['tree',q.x-20,q.z-20],['tree',q.x+(q.style==='port'?18:20),q.z-20],['ore',q.x-20,q.z+10],['ore',q.x+(q.style==='port'?17:20),q.z+(q.style==='port'?24:10)]].map(([type,x,z],i)=>[type,`${type==='tree'?'Дерево':'Валун'} · ${q.label||q.name} ${i+1}`,x,z,type==='tree'?{wood:8,seeds:1}:{stone:6,metal:1},type==='tree'?'axe':'pick',null,type==='tree'?'standingtree':'quarry']));
