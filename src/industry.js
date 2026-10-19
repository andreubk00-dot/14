// One authored layout drives scenery, roads, interactions, collisions and QA.
export const INDUSTRY_BUILDINGS=[
 {id:'powerhall',x:-66,z:-270,w:24,d:20,h:6.2,sign:'СЕВЕРНАЯ ЭЛЕКТРОСТАНЦИЯ',backDoor:true,roofStyle:'gable',pitch:.12,shade:'#7b8b87',theme:'power'},
 {id:'drainhall',x:-66,z:-304,w:18,d:36,h:4.1,sign:'НАСОСНЫЙ ЗАЛ',backDoor:true,roofStyle:'gable',pitch:.16,shade:'#6f8984',theme:'pump'},
 {id:'shiftshop',x:-30,z:-280,w:20,d:14,h:4.8,sign:'МАСТЕРСКАЯ СМЕНЫ',backDoor:true,roofStyle:'gable',pitch:.08,shade:'#8b8d79',theme:'workshop'},
 {id:'workerhome',x:25,z:-264,w:12,d:10,h:3.4,sign:'ДОМ ЭЛЕКТРИКА',roofStyle:'hip',pitch:.35,shade:'#9a947e',theme:'home'},
 {id:'sewinghome',x:25,z:-300,w:12,d:10,h:3.1,sign:'ШВЕЙНАЯ КОМНАТА',roofStyle:'gable',pitch:.32,shade:'#78958d',theme:'sewing'},
 {id:'supplyhall',x:-66,z:-351,w:24,d:14,h:5.1,sign:'СКЛАД РЕМОНТНОЙ СЛУЖБЫ',backDoor:true,roofStyle:'gable',pitch:.1,shade:'#8b8b7b',theme:'warehouse'},
 {id:'switchhouse',x:-21,z:-349,w:10,d:10,h:3.4,sign:'РАСПРЕДЕЛИТЕЛЬНАЯ',roofStyle:'hip',pitch:.18,shade:'#80928c',theme:'switch'},
 {id:'shiftkitchen',x:25,z:-349,w:16,d:12,h:3.6,sign:'КУХНЯ ПОСЁЛКА',roofStyle:'hip',pitch:.28,shade:'#a29276',theme:'kitchen'},
];
export const INDUSTRY_PLACES=[
 {id:'northpower',name:'Северная электростанция',label:'Электростанция',x:-66,z:-269,radius:22,color:'#a4c5bd',subtitle:'Энергия · насосы · ремонт',note:'Машинный зал соединяется с насосной. На стене осталась схема местной электросети.'},
 {id:'shiftvillage',name:'Посёлок последней смены',label:'Посёлок смены',x:25,z:-299,radius:46,color:'#c2b292',subtitle:'Дома · мастерская · общая кухня',note:'Из окон видна станция. На кухне накрывали стол для тех, кто возвращался с ночной смены.'},
 {id:'northsupply',name:'Северный ремонтный двор',label:'Ремонтный двор',x:-52,z:-346,radius:24,color:'#a7b5ab',subtitle:'Запасы · распределительная · обратный путь',note:'Провод привода ворот шёл из распределительной. Наружная дорога огибает затопленный насосный зал.'},
];
export const INDUSTRY_ROADS=[
 {x:0,z:-189.5,w:4,d:43}, // Joins the existing northern forest road.
 {x:-48,z:-211,w:96,d:3},{x:-96,z:-278,w:3,d:134},
 {x:-24,z:-242,w:148,d:5},{x:0,z:-278,w:5,d:134},
 {x:-66,z:-251,w:3,d:18},{x:-30,z:-257.5,w:3,d:31},
 {x:25,z:-250.5,w:2.4,d:17},{x:12.5,z:-286,w:25,d:2.4},{x:25,z:-290.5,w:2.4,d:9},
 {x:-81,z:-284,w:30,d:2.4},{x:-66,z:-284,w:2.4,d:4},
 {x:-34,z:-330,w:128,d:4},{x:-66,z:-326,w:2.4,d:8},
 {x:-66,z:-337,w:3,d:14},{x:-21,z:-337,w:2.4,d:14},{x:25,z:-336.5,w:2.4,d:13},
 {x:0,z:-353.5,w:3,d:17},{x:-33,z:-362,w:66,d:2.4},{x:-66,z:-360,w:2.4,d:4},
];
export const INDUSTRY_PROJECTS=[
 {id:'grid-feed',name:'Питание Северной станции',x:-69,z:-266,duration:7,cost:{metal:8,wire:6,parts:4,battery:1},desc:'Восстановить распределительный щит. Загорятся окна станции и посёлка; появится питание для насоса и привода въездных ворот.',success:'Северная станция работает. Насос и привод ворот получили питание.'},
 {id:'grid-drain',name:'Насос служебного зала',x:-71,z:-283,duration:7,requiresRoute:'grid-feed',cost:{parts:4,wire:2,pumpmodule:1},desc:'После запуска станции насос осушит служебный зал. Откроются сквозной проход к ремонтному двору и уцелевшее оборудование.',success:'Насосный зал осушен. Проход и оборудование доступны.'},
 {id:'grid-gate',name:'Привод северных ворот',x:3.8,z:-229.5,duration:5,requiresRoute:'grid-feed',cost:{metal:4,parts:2,wire:2},desc:'Починить привод после подачи питания. Ворота останутся открыты: из посёлка можно будет возвращаться прямо по северной дороге, без западного обхода.',success:'Северные ворота открыты. Прямая дорога домой свободна.'},
];
export const INDUSTRY_WET={x:-66,z:-304,w:17.5,d:32};
export const INDUSTRY_GATE={x:0,z:-228,w:6,d:.55};
export const INDUSTRY_OPEN_LEAVES=[-1,1].map(side=>({x:INDUSTRY_GATE.x+side*INDUSTRY_GATE.w/2,z:INDUSTRY_GATE.z-INDUSTRY_GATE.w/4,w:.22,d:INDUSTRY_GATE.w/2}));
export const INDUSTRY_FENCE=[{x:-49,z:-228,w:92,d:.28},{x:28,z:-228,w:50,d:.28}];
export const INDUSTRY_NODES=[
 ['electronics','Резервный щит станции',-72,-274,{wire:6,parts:4,battery:1},'wrench'],
 ['crate','Ремонтный запас щита',-59,-274,{metal:8,wire:4,parts:2}],
 ['scrap','Двигатель на стенде',-36,-283,{metal:4,parts:3,wire:2},'wrench',null,'motor'],
 ['crate','Ящик монтажника',-26,-282,{parts:4,wire:5,metal:4}],
 ['crate','Сухой шкаф электрика',25,-267,{cloth:5,wire:3,water:2}],
 ['crate','Швейная корзина смены',25,-303,{cloth:7,herbs:2}],
 ['crate','Запас общей кухни',18,-347,{fish:3,vegetables:5,water:3}],
 ['crate','Сухие ремонтные модули',-73,-353,{parts:5,pumpmodule:1,filterunit:2}],
 ['scrap','Насос из ремонтного фонда',-59,-353,{metal:4,parts:3,wire:2},'wrench',null,'motor'],
 ['electronics','Запас распределительной',-21,-352,{wire:5,parts:3},'wrench'],
 ['crate','Снятые фильтры зала',-61,-310,{filterunit:2,metal:4}],
 ['find','Контроллер на сухой площадке',-71,-307,{},'wrench','pumpcontroller'],
 ['find','Светильник в защитной клетке',-24,-275,{},null,'cagelamp'],
 ['crate','Семена у окна кухни',30,-351,{seeds:4,herbs:4}],
 ['wood','Доски ремонтного двора',-85,-337,{wood:12}],
];
export const INDUSTRY_MEMORIES=[
 {id:'grid-diagram',name:'Схема местного питания',x:-58,z:-279.8,y:1.7,wall:true,text:'«Вводной щит — в машинном зале. От него запитаны окна посёлка, насос и привод въездных ворот. Резервный аккумулятор и провод оставили у задней стены. Насос включать с наружного пульта: пока в зале вода, внутрь не заходить». На схеме нарисован западный обход.'},
 {id:'grid-controller',name:'Паспорт насосного контроллера',x:-71,z:-301,y:.958,text:'«Контроллер снят исправным. Поставить рядом с домашним оборудованием: очиститель выдаёт четыре ёмкости вместо трёх за тот же цикл. Несколько контроллеров не складываются». Лист оставлен выше старой отметки воды.'},
 {id:'shift-letter',name:'Письмо перед ночной сменой',x:28.55,z:-266,y:.928,text:'«Если света снова не будет, ужин на общей кухне. Навес у мастерской выдержал дождь; рамы с металлическими переплётами привезли со склада. Дом можно починить тем же способом». На обороте сохранились размеры навеса и оконной рамы.'},
];
export function industryBlocked(x,z,r=0,ids=[]){
 const a=INDUSTRY_WET;if(!ids.includes('grid-drain')&&Math.abs(x-a.x)<a.w/2+r&&Math.abs(z-a.z)<a.d/2+r)return true;
 const g=INDUSTRY_GATE;return !ids.includes('grid-gate')&&Math.abs(x-g.x)<g.w/2+r&&Math.abs(z-g.z)<g.d/2+r;
}

export const INDUSTRY_PATROLS=[{x:-45,z:-252,kind:'guardian'},{x:10,z:-310,kind:'runner'},{x:-45,z:-338,kind:'gunner'}];
