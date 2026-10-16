import {restoredDecks,inDeck,joinedRegion,onRestoredDeck} from './restoration.js';
// Shared layout: navigation, map, save validation and streamed scenery agree.
export const WORLD_BOUNDS={minX:-208,maxX:392,minZ:-208,maxZ:208};
export const FLOOD_WATER={x:309,z:10,w:166,d:204};
export const FLOOD_ISLANDS=[
 {id:'reedcamp',name:'Камышовая стоянка',x:286,z:64,w:42,d:40,subtitle:'Стоянка · сухие запасы · рыбалка'},
 {id:'floodhomes',name:'Улица под водой',x:351,z:14,w:62,d:60,subtitle:'Островки домов · ткани · оставленные вещи'},
 {id:'floodworks',name:'Остров насосной',x:284,z:-55,w:46,d:48,subtitle:'Мастерская · насосы · электротехника'},
 {id:'floodgardens',name:'Сады за каналом',x:351,z:87,w:48,d:30,subtitle:'Теплицы · семена · травы'},
];
export const FLOOD_DOCKS=[
 {id:'shore',name:'Береговой причал',x:230,z:78,w:12,d:3,foot:{x:234.8,z:78},boat:{x:237.6,z:78},heading:Math.PI/2},
 {id:'reedcamp',name:'Причал стоянки',x:262,z:70,w:12,d:3,foot:{x:257.2,z:70},boat:{x:254.4,z:70},heading:-Math.PI/2},
 {id:'floodhomes',name:'Причал жилой улицы',x:317,z:24,w:12,d:3,foot:{x:312.2,z:24},boat:{x:309.4,z:24},heading:-Math.PI/2},
 {id:'floodworks',name:'Причал насосной',x:284,z:-29,w:3,d:12,foot:{x:284,z:-24.2},boat:{x:284,z:-21.4},heading:0},
 {id:'floodgardens',name:'Садовый причал',x:343,z:69,w:3,d:12,foot:{x:343,z:64.2},boat:{x:343,z:61.4},heading:Math.PI},
];
export const FLOOD_BUILDINGS=[
 {id:'camp',place:'reedcamp',x:288,z:58,w:12,d:9,h:3.1,shade:'#8b8d76',sign:'КАМЫШОВАЯ СТОЯНКА',roofStyle:'gable',pitch:.3},
 {id:'boathouse',place:'shore',x:215,z:65,w:10,d:8,h:3.4,shade:'#70867e',sign:'ЛОДОЧНАЯ',roofStyle:'gable',pitch:.18},
 {id:'posthouse',place:'floodhomes',x:337,z:5,w:12,d:10,h:4.3,shade:'#9c9180',sign:'ПОЧТА',roofStyle:'hip',pitch:.36},
 {id:'riverhome',place:'floodhomes',x:365,z:12,w:10,d:9,h:3.6,shade:'#819b98',sign:'ДОМ С ЗЕЛЁНЫМИ РАМАМИ',roofStyle:'gable',pitch:.4},
 {id:'floodgarage',place:'floodhomes',x:361,z:-8,w:16,d:8,h:3,shade:'#8b8d7c',sign:'ЛОДОЧНЫЙ САРАЙ',roofStyle:'gable',pitch:.1},
 {id:'pumpworks',backDoor:true,place:'floodworks',x:280,z:-61,w:20,d:12,h:4.7,shade:'#7b908b',sign:'ВОДОУЗЕЛ · МАСТЕРСКАЯ',roofStyle:'gable',pitch:.1},
 {id:'servicehall',place:'floodworks',x:280,z:-73,w:14,d:8,h:3.5,shade:'#7d8983',sign:'РЕМОНТНЫЙ ЗАЛ',backDoor:true,roofStyle:'gable',pitch:.12},
 {id:'keeper',place:'floodworks',x:296,z:-43,w:9,d:8,h:3.2,shade:'#a09277',sign:'ДЕЖУРНЫЙ',roofStyle:'hip',pitch:.32},
 {id:'glasshouse',place:'floodgardens',x:358,z:86,w:16,d:9,h:3.1,shade:'#7c9588',sign:'СЕМЕННОЙ ФОНД',roofStyle:'gable',pitch:.35,greenhouse:true},
];
export const FLOOD_STREETS=[
 {place:'floodhomes',x:348.5,z:24,w:55,d:2.4},{place:'floodhomes',x:350,z:5,w:2.4,d:38},{place:'floodhomes',x:337,z:17.3,w:1.8,d:13.4},{place:'floodhomes',x:365,z:20.55,w:1.8,d:6.9},{place:'floodhomes',x:355.5,z:-2,w:11,d:2.4},{place:'floodhomes',x:361,z:-3,w:1.8,d:.8},
 {place:'reedcamp',x:276.5,z:70,w:25,d:2.4},{place:'reedcamp',x:288,z:66.8,w:1.8,d:7.4},
 {place:'floodworks',x:284,z:-40.5,w:2.4,d:19},{place:'floodworks',x:290,z:-36,w:12,d:2.4},{place:'floodworks',x:296,z:-37.7,w:1.8,d:1.4},{place:'floodworks',x:280,z:-52.7,w:1.8,d:3.4},{place:'floodworks',x:282,z:-50.5,w:4,d:2.4},
 {place:'floodgardens',x:343,z:84.5,w:2.4,d:21},{place:'floodgardens',x:350.5,z:94,w:15,d:2.4},{place:'floodgardens',x:358,z:92.7,w:1.8,d:3.2},
];
export const FLOOD_PATHS=[{x:195,z:78,w:56,d:3,garden:true},{x:222,z:78,w:3,d:24,garden:true}];
export const FLOOD_PLACES=[{id:'floodshore',name:'Затопленная окраина',label:'Берег',x:220,z:78,radius:20,color:'#91b9b6',subtitle:'Лодочная · водные маршруты',note:'Вода заняла старые улицы. У причала осталась гребная лодка; вдали виднеются крыши и сухие островки.'},...FLOOD_ISLANDS.map(l=>({...l,label:l.name,radius:Math.max(l.w,l.d)/2,color:'#95b9aa',note:l.subtitle+'. К каждому острову можно подойти по воде. Между домами остались сухие проходы.'}))];
export const FLOOD_SUPPLIES=[
 ['crate','Доски и обшивка лодочной',212,65,{wood:6,cloth:2,metal:2}],
 ['crate','Сухие запасы стоянки',284,57,{wood:8,cloth:4,metal:2}],
 ['crate','Провизия под навесом',292,57,{water:3,fish:2,herbs:2,wood:3}],
 ['crate','Посылки на почте',334,5,{cloth:6,wood:3}],
 ['crate','Хозяйственный запас почты',340,5,{water:3,medicine:2}],
 ['crate','Шкаф в доме у канала',363,12,{cloth:5,herbs:3}],
 ['crate','Полка лодочного сарая',357,-8,{wood:7,wire:3,parts:2}],
 ['crate','Ремонтный запас водоузла',276,-61,{pumpmodule:1,parts:4,metal:4}],
 ['crate','Электрошкаф водоузла',284,-61,{battery:1,wire:5,parts:3}],
 ['crate','Запасы дежурного',296,-43,{filterunit:2,water:3,cloth:3}],
 ['crate','Семена из теплицы',354,86,{seeds:5,flowers:3,herbs:3},null,null,null,['seeds','herbs'],'flowers'],
 ['crate','Овощи в сухом ящике',362,86,{vegetables:5,water:2,herbs:2}],
].map(([type,name,x,z,loot,...rest])=>[type,name,x,z,loot,...(rest.length?rest:[null,null,null,Object.keys(loot).filter(id=>!['battery','pumpmodule','filterunit'].includes(id))])]);
export const CAMP={x:288,z:59,capacity:60,cost:{wood:8,cloth:4,metal:2}};
export const BOAT_REPAIR={wood:6,cloth:2,metal:2};
export const insideRect=(x,z,r,pad=0)=>Math.abs(x-r.x)<=r.w/2+pad&&Math.abs(z-r.z)<=r.d/2+pad;
export function inWorld(x,z){return x>=WORLD_BOUNDS.minX&&x<=WORLD_BOUNDS.maxX&&z>=WORLD_BOUNDS.minZ&&z<=WORLD_BOUNDS.maxZ&&(x<=208||x<=392&&z>=-94&&z<=114);}
export function islandOutline(i){const x=i.x,z=i.z,w=i.w/2,d=i.d/2,c=5;return [[x-w+c,z-d],[x+w-c,z-d],[x+w,z-d+c],[x+w,z+d-c],[x+w-c,z+d],[x-w+c,z+d],[x-w,z+d-c],[x-w,z-d+c]];}
export function onIsland(x,z,i,pad=0){const dx=Math.abs(x-i.x),dz=Math.abs(z-i.z);return dx<=i.w/2+pad&&dz<=i.d/2+pad&&dx+dz<=i.w/2+i.d/2-5+pad*Math.SQRT2;}
export const FLOOD_RUINS=[{x:244,z:-25,w:9,d:12,h:2.4},{x:311,z:-72,w:11,d:10,h:3.8},{x:318,z:51,w:9,d:8,h:1.7},{x:372,z:58,w:8,d:11,h:2.6}];
export function floodLand(x,z,r=0,restored=[]){return x<=226-r||FLOOD_ISLANDS.some(i=>onIsland(x,z,i,-r))||FLOOD_DOCKS.some(d=>insideRect(x,z,d,-r))||onRestoredDeck(x,z,restored,-r);}
export function inFloodWater(x,z,r=0,restored=[]){return x>208&&insideRect(x,z,FLOOD_WATER,r)&&!floodLand(x,z,r,restored);}
// Radius reserves the hull clear of banks and solid piers.
export function boatWater(x,z,r=1.5,restored=[]){return x>226+r&&x<392-r&&z>-92+r&&z<112-r&&!FLOOD_ISLANDS.some(i=>onIsland(x,z,i,r))&&!FLOOD_RUINS.some(i=>insideRect(x,z,i,r))&&!FLOOD_DOCKS.some(d=>insideRect(x,z,d,r))&&!onRestoredDeck(x,z,restored,r);}
export function freshBoat(){return {repaired:false,aboard:false,...FLOOD_DOCKS[0].boat,heading:Math.PI/2,lastDock:'shore'};}
export function cleanBoat(input,restored=[]){
 const b=freshBoat();if(!input||input.repaired!==true)return b;b.repaired=true;
 if(FLOOD_DOCKS.some(d=>d.id===input.lastDock))b.lastDock=input.lastDock;
 if(Number.isFinite(input.x)&&Number.isFinite(input.z)&&boatWater(input.x,input.z,1.5,restored)){b.x=input.x;b.z=input.z;}
 if(Number.isFinite(input.heading))b.heading=Math.atan2(Math.sin(input.heading),Math.cos(input.heading));
 b.aboard=input.aboard===true;return b;
}
export function dockNearBoat(boat,range=3.2){return FLOOD_DOCKS.filter(d=>Math.hypot(boat.x-d.boat.x,boat.z-d.boat.z)<=range).sort((a,b)=>Math.hypot(boat.x-a.boat.x,boat.z-a.boat.z)-Math.hypot(boat.x-b.boat.x,boat.z-b.boat.z))[0];}
export function rowBoat(boat,dt,dx,dz,blocked=()=>false,restored=[]){
 const length=Math.hypot(dx,dz),input=Math.min(1,length),response=1-Math.exp(-dt*5);
 const tx=length>.08?dx/length*6.6*input:0,tz=length>.08?dz/length*6.6*input:0;
 boat.vx=(boat.vx||0)+(tx-(boat.vx||0))*response;boat.vz=(boat.vz||0)+(tz-(boat.vz||0))*response;
 const n=Math.max(1,Math.ceil(Math.hypot(boat.vx,boat.vz)*dt/.25)),step=dt/n;let moved=0;
 for(let i=0;i<n;i++){const x=boat.x+boat.vx*step,z=boat.z+boat.vz*step;if(boatWater(x,boat.z,1.5,restored)&&!blocked(x,boat.z)){moved+=Math.abs(x-boat.x);boat.x=x;}else boat.vx=0;if(boatWater(boat.x,z,1.5,restored)&&!blocked(boat.x,z)){moved+=Math.abs(z-boat.z);boat.z=z;}else boat.vz=0;}
 if(moved>1e-5){const target=Math.atan2(boat.vx,boat.vz);boat.heading+=Math.atan2(Math.sin(target-boat.heading),Math.cos(target-boat.heading))*(1-Math.exp(-dt*9));}
 return moved>1e-5;
}

export const FLOOD_PATROLS=[{x:349,z:3,kind:'gunner'},{x:284,z:-48,kind:'runner'}];

export function walkRegion(x,z,restored=[]){if(x<=226)return 'mainland';const d=FLOOD_DOCKS.find(d=>insideRect(x,z,d)),bridge=RESTORED_BRIDGE(x,z,restored),id=d?(d.id==='shore'?'mainland':d.id):bridge||FLOOD_ISLANDS.find(i=>onIsland(x,z,i))?.id||'mainland';return joinedRegion(id,restored);}
function RESTORED_BRIDGE(x,z,ids){return onRestoredDeck(x,z,ids)?'floodhomes':null;}
export const FLOOD_TREES=[
 ['reedcamp',274,51,1],['reedcamp',277,78,1.1],['reedcamp',300,76,1.2],['reedcamp',301,51,.9],
 ['floodhomes',326,-7,1.1],['floodhomes',375,35,1.2],['floodhomes',330,35,.8],
 ['floodworks',266,-73,.9],['floodworks',302,-34,1.1],
 ['floodgardens',332,91,1],['floodgardens',369,95,.85],['floodgardens',371,77,1],
].map(([place,x,z,scale])=>({place,x,z,scale}));
export const FLOOD_CANOPIES=[{id:'works-passage',roofOnly:true,place:'floodworks',x:280,z:-68,w:4,d:2,h:3.2},{id:'camp-shade',roofOnly:true,place:'reedcamp',x:281,z:76,w:7,d:4,h:2.5},{id:'post-porch',roofOnly:true,place:'floodhomes',x:337,z:12,w:7,d:3,h:3}];
export const FLOOD_OBSTACLES=[{place:'reedcamp',x:281,z:76,w:2.2,d:1,kind:'table'},{place:'reedcamp',x:299,z:63,w:2,d:1,kind:'logs'},{place:'floodhomes',x:332,z:13,w:.6,d:.6,kind:'mail'},{place:'floodhomes',x:377,z:28,w:2.2,d:.6,kind:'bench'},{place:'floodworks',x:273,z:-39,w:3,d:1,kind:'pipes'},{place:'floodgardens',x:332,z:82,w:2,d:1,kind:'pots'}];
export function waterDestination(x,z){const pier=FLOOD_DOCKS.find(d=>insideRect(x,z,d)),island=FLOOD_ISLANDS.find(i=>onIsland(x,z,i)),dock=pier||FLOOD_DOCKS.find(d=>d.id===island?.id);return dock?{...dock.boat}:{x,z};}
export const FLOOD_POSTS=[{x:326,z:30,w:.18,d:.18},{x:378,z:30,w:.18,d:.18},{x:266,z:-72,w:.3,d:.3},{x:302,z:-72,w:.3,d:.3}];

export const RESTORED_SUPPLIES=[['crate','Электрика ремонтного зала',277,-73,{battery:1,wire:4,parts:3}],['crate','Запасные насосы',283,-73,{pumpmodule:1,filterunit:2,metal:5}],['electronics','Станок в ремонтном зале',280,-74.6,{metal:4,parts:3,wire:3},'wrench',null,'motor']];
