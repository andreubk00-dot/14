import * as THREE from 'three';
// The old district remains in place. New places, supplies and harvest sites append to it.
export const OUTLAND_LIMIT=208;
export const FOREST_LAKE={x:120,z:164,rx:23,rz:17,dock:{x:100,z:164,w:12,d:2.6}};
export function inForestWater(x,z,radius=0){
 const l=FOREST_LAKE,wet=((x-l.x)/(l.rx+radius))**2+((z-l.z)/(l.rz+radius))**2<1;
 const d=l.dock,onDock=x>=d.x-d.w/2+radius&&x<=d.x+d.w/2-radius&&Math.abs(z-d.z)<=d.d/2-radius;
 return wet&&!onDock;
}
export const OUTLAND_PLACES=[
 ['forestry','Старое лесничество',-158,20,'Инструменты · древесина · оставленные вещи'],
 ['quarrywood','Каменный разрез',-160,120,'Камень · металл · ремонтные запасы'],
 ['dachas','Дачи за лесополосой',-48,166,'Дома · обстановка · огороды'],
 ['forestlake','Лесное озеро',104,164,'Причал · рыбалка · дом рыбака'],
 ['woodcamp','Лагерь лесной бригады',35,151,'Древесина · инструменты · сухие запасы'],
 ['northwoods','Северные сторожки',-24,-163,'Сторожки · ткани · тихий лес'],
 ['oldnursery','Забытый питомник',-150,-145,'Семена · травы · садовые запасы'],
 ['eastwoods','Восточная просека',167,70,'Древесина · хозяйственные запасы'],
 ['pinewood','Сухой бор',160,-130,'Смолистые сосны · сторожевой дом'],
].map(([id,name,x,z,subtitle])=>({id,name,label:name,x,z,subtitle,radius:24,color:'#9cb48b',note:subtitle+'. Тропы связывают поляны с жилым районом; отдельные дома прячутся среди деревьев.'}));
export const OUTLAND_BUILDINGS=[
 ['ranger','forestry',-170,8,12,10,3.5,'ЛЕСНИЧЕСТВО','ranger'],
 ['woodshed','forestry',-173,38,7,6,3,'ДРОВЯНОЙ САРАЙ','workshop'],
 ['quarryshop','quarrywood',-174,120,8,6,3.4,'РЕМОНТ ИНСТРУМЕНТА','workshop'],
 ['stonehut','quarrywood',-148,147,9,6,3,'ДОМ СМОТРИТЕЛЯ','cabin'],
 ['bluecottage','dachas',-62,155,10,8,3.2,'ДОМ С СИНИМИ РАМАМИ','cabin'],
 ['gardenhouse','dachas',-35,153,8,9,3.1,'ДОМ САДОВНИКА','garden'],
 ['smallcottage','dachas',-65,180,7,8,3,'ЛЕТНИЙ ДОМ','cabin'],
 ['sharedkitchen','dachas',-35,180,12,8,3.4,'ДАЧНАЯ КУХНЯ','kitchen'],
 ['fishhut','forestlake',86,151,8,6,3,'ДОМ У ОЗЕРА','fish'],
 ['bankhouse','forestlake',155,170,9,7,3.5,'ДОМ НА ДАЛЬНЕМ БЕРЕГУ','cabin'],
 ['northhouse','northwoods',-45,-158,10,8,3.4,'СЕВЕРНАЯ СТОРОЖКА','cabin'],
 ['northshed','northwoods',12,-177,7,7,3,'ЛЕСНОЙ СКЛАД','workshop'],
 ['nursery','oldnursery',-153,-152,10,8,3,'СТАРЫЙ ПИТОМНИК','garden'],
 ['eastshop','eastwoods',153,48,9,8,3.4,'ЛЕСНАЯ МАСТЕРСКАЯ','workshop'],
 ['easthouse','eastwoods',183,105,7,6,3,'ДОМ ОБХОДЧИКА','cabin'],
 ['camp','woodcamp',35,145,8,7,3.2,'БЫТОВКА БРИГАДЫ','kitchen'],
 ['pinehouse','pinewood',174,-137,7,7,3.4,'СТОРОЖКА В БОРУ','ranger'],
].map(([id,place,x,z,w,d,h,sign,role],i)=>({id,place,x,z,w,d,h,sign,role,shade:['#7b8e85','#968970','#8f9a7a','#859997'][i%4],roofStyle:i%3===0?'hip':'gable',pitch:role==='workshop'?.12:.34}));
// Signs stand off the junction, with no lamps or per-frame updates.
export const OUTLAND_WAYMARKS=[
 {x:-150,z:21,lines:['← ЛЕСНИЧЕСТВО','↓ КАМЕННЫЙ РАЗРЕЗ','РАЙОН →']},
 {x:-19,z:137,lines:['↓ ДАЧИ','ЛЕСНОЕ ОЗЕРО →','↑ РАЙОН']},
 {x:-19,z:-128,lines:['← ПИТОМНИК','↑ СТОРОЖКИ','↓ РАЙОН']},
 {x:162,z:-57,lines:['↑ СУХОЙ БОР','← РАЙОН','↓ ПРОСЕКА']},
 {x:162,z:137,lines:['← ЛЕСНОЕ ОЗЕРО','↑ ПРОСЕКА','ДАЛЬНИЙ БЕРЕГ ↓']},
];
const path=(x,z,w,d)=>({x,z,w,d,garden:true});
export const OUTLAND_PATHS=[
 path(-137.5,16,65,3),path(-155,75,3,118),path(-164,44,18,2.4),path(-165,128,20,3),
 path(-89.5,132,131,3),path(-24,120,3,36),path(-45,138,45,3),path(-48,166,3,56),path(-48,165,56,3),path(-48,194,56,3),
 path(34,132,116,3),path(45,144,3,24),path(35,153,20,2.4),path(92,145,3,26),path(89,157,6,2.4),path(94,164,4,2.6),
 path(128,132,72,3),path(167,128,3,100),path(155,178,24,3),path(128,190,78,3),path(92,178,3,32),path(34,194,116,3),
 path(-24,-136,3,64),path(-16.5,-168,61,3),path(-34,-150,20,2.4),path(-84,-133,3,72),path(-118.5,-133,69,3),path(-153,-140,3,12),path(-54,-133,60,3),
 path(137,78,68,3),path(167,75,3,58),path(160,58,14,2.4),path(175,112,18,2.4),
 path(89.5,-168,155,2.4),path(167,-56,3,224),path(176,-129,18,2.4),path(86,-62,3,38),path(127,-62,82,3),
 ...OUTLAND_BUILDINGS.map(b=>path(b.x,b.z+b.d/2+2,1.6,3)),
];
const inside=(p,r,pad=0)=>Math.abs(p.x-r.x)<r.w/2+pad&&Math.abs(p.z-r.z)<r.d/2+pad;
export function outlandReserved(x,z,pad=1){
 const p={x,z};return Math.hypot(x+160,z-120)<12+pad||inside(p,FOREST_LAKE.dock,pad+1)||OUTLAND_PATHS.some(r=>inside(p,r,pad))||OUTLAND_BUILDINGS.some(r=>inside(p,r,pad+1.5))||inForestWater(x,z,pad)||Math.abs(x)<116&&Math.abs(z)<116;
}
const loot={cabin:[{cloth:4,wood:3},{water:3,herbs:2}],workshop:[{metal:4,parts:2},{wood:5,wire:2}],ranger:[{cloth:3,wood:4},{parts:2,wire:2}],garden:[{seeds:4,herbs:3},{vegetables:4,water:2}],fish:[{fish:3,herbs:2},{wood:4,water:3}],kitchen:[{vegetables:4,herbs:2},{water:3,wood:3}]};
// Keep the two established slots per building so old node IDs and claims survive.
function supplies(b){
 const items=loot[b.role].map(stock=>({...stock}));
 if(b.id==='quarryshop')items[0]={metal:4,parts:2,battery:1};
 if(b.id==='eastshop')items[0]={metal:4,parts:2,pumpmodule:1};
 if(b.id==='nursery')return [{seeds:4,flowers:2},{filterunit:2,water:2}];
 return items;
}
const supplyNames={quarryshop:['аккумулятор и ремонтные детали','дерево и провод'],eastshop:['запасной насос и детали','дерево и провод'],nursery:['семена цветов','фильтры поливной системы']};
export const OUTLAND_SUPPLIES=OUTLAND_BUILDINGS.flatMap(b=>supplies(b).map((items,i)=>[
 'crate',`${b.sign.toLocaleLowerCase('ru')} · ${supplyNames[b.id]?.[i]||(i?'сухой запас':'кладовая')}`,
 b.x+(i?1:-1)*b.w/4,b.z,items,null,null,null,
 Object.keys(items).filter(id=>!['battery','pumpmodule','filterunit'].includes(id)),
 b.role==='garden'&&i===0?(b.id==='nursery'?'flowers':'vegetables'):null,
]));
// Frozen v0.20 positions: later expansions append after this complete content block.
export const OUTLAND_RESOURCE_SITES=[
 [-141,20,0,'forestry',0],
 [-136,28,0,'forestry',1],
 [-136,39,0,'forestry',2],
 [-149,35,1,'forestry',3],
 [-163,49,0,'forestry',5],
 [-166,35,0,'forestry',6],
 [-185,30,0,'forestry',8],
 [-175,20,0,'forestry',9],
 [-180,12,0,'forestry',10],
 [-180,1,1,'forestry',11],
 [-162,-3,0,'forestry',13],
 [-153,-9,0,'forestry',14],
 [-149,5,1,'forestry',15],
 [-140,5,0,'forestry',16],
 [-131,10,0,'forestry',17],
 [-143,120,0,'quarrywood',0],
 [-138,128,1,'quarrywood',1],
 [-138,139,1,'quarrywood',2],
 [-156,143,1,'quarrywood',4],
 [-165,149,1,'quarrywood',5],
 [-168,135,0,'quarrywood',6],
 [-178,135,1,'quarrywood',7],
 [-187,130,1,'quarrywood',8],
 [-182,112,1,'quarrywood',10],
 [-182,101,1,'quarrywood',11],
 [-168,105,0,'quarrywood',12],
 [-164,97,1,'quarrywood',13],
 [-151,105,0,'quarrywood',15],
 [-142,105,1,'quarrywood',16],
 [-133,110,1,'quarrywood',17],
 [-44,189,0,'dachas',4],
 [-56,181,0,'dachas',6],
 [-75,176,0,'dachas',8],
 [-70,147,1,'dachas',11],
 [-52,143,0,'dachas',13],
 [-21,156,0,'dachas',17],
 [126,183,0,'forestlake',2],
 [96,179,0,'forestlake',6],
 [86,179,1,'forestlake',7],
 [77,174,0,'forestlake',8],
 [87,164,0,'forestlake',9],
 [96,149,0,'forestlake',12],
 [100,141,0,'forestlake',13],
 [52,151,0,'woodcamp',0],
 [57,159,0,'woodcamp',1],
 [57,170,0,'woodcamp',2],
 [44,166,1,'woodcamp',3],
 [39,174,0,'woodcamp',4],
 [30,180,0,'woodcamp',5],
 [27,166,0,'woodcamp',6],
 [17,166,1,'woodcamp',7],
 [8,161,0,'woodcamp',8],
 [18,151,0,'woodcamp',9],
 [13,143,0,'woodcamp',10],
 [26,136,0,'woodcamp',12],
 [31,128,0,'woodcamp',13],
 [40,122,0,'woodcamp',14],
 [53,136,0,'woodcamp',16],
 [62,141,0,'woodcamp',17],
 [-7,-163,0,'northwoods',0],
 [-2,-155,0,'northwoods',1],
 [-2,-144,0,'northwoods',2],
 [-15,-148,1,'northwoods',3],
 [-20,-140,0,'northwoods',4],
 [-46,-182,1,'northwoods',11],
 [-33,-178,0,'northwoods',12],
 [-28,-186,0,'northwoods',13],
 [-19,-192,0,'northwoods',14],
 [-16,-178,1,'northwoods',15],
 [-6,-178,0,'northwoods',16],
 [3,-173,0,'northwoods',17],
 [-133,-145,0,'oldnursery',0],
 [-128,-137,0,'oldnursery',1],
 [-128,-126,0,'oldnursery',2],
 [-146,-122,0,'oldnursery',4],
 [-155,-116,0,'oldnursery',5],
 [-158,-130,0,'oldnursery',6],
 [-168,-130,1,'oldnursery',7],
 [-177,-135,0,'oldnursery',8],
 [-167,-145,0,'oldnursery',9],
 [-172,-153,0,'oldnursery',10],
 [-172,-164,1,'oldnursery',11],
 [-158,-160,0,'oldnursery',12],
 [-154,-168,0,'oldnursery',13],
 [-145,-174,0,'oldnursery',14],
 [-141,-160,1,'oldnursery',15],
 [-132,-160,0,'oldnursery',16],
 [-123,-155,0,'oldnursery',17],
 [184,70,0,'eastwoods',0],
 [189,78,0,'eastwoods',1],
 [189,89,0,'eastwoods',2],
 [176,85,1,'eastwoods',3],
 [171,93,0,'eastwoods',4],
 [162,99,0,'eastwoods',5],
 [159,85,0,'eastwoods',6],
 [149,85,1,'eastwoods',7],
 [150,70,0,'eastwoods',9],
 [145,62,0,'eastwoods',10],
 [145,51,1,'eastwoods',11],
 [163,47,0,'eastwoods',13],
 [172,41,0,'eastwoods',14],
 [176,55,1,'eastwoods',15],
 [185,55,0,'eastwoods',16],
 [194,60,0,'eastwoods',17],
 [182,-122,0,'pinewood',1],
 [182,-111,0,'pinewood',2],
 [155,-101,0,'pinewood',5],
 [152,-115,0,'pinewood',6],
 [142,-115,1,'pinewood',7],
 [133,-120,0,'pinewood',8],
 [143,-130,0,'pinewood',9],
 [138,-138,0,'pinewood',10],
 [138,-149,1,'pinewood',11],
 [152,-145,0,'pinewood',12],
 [156,-153,0,'pinewood',13],
 [178,-145,0,'pinewood',16],
 [187,-140,0,'pinewood',17],
 [-162,116,1,'quarrywood',18],
 [-166,123,1,'quarrywood',19],
 [-160,113,1,'quarrywood',20],
 [-163,125,1,'quarrywood',21]
].map(([x,z,stone,place,index])=>({x,z,stone:!!stone,place,index}));
export const OUTLAND_RESOURCES=OUTLAND_RESOURCE_SITES.map(p=>[p.stone?'ore':'tree',`${p.stone?'Валун':'Дерево'} · ${OUTLAND_PLACES.find(l=>l.id===p.place).name} ${p.index+1}`,p.x,p.z,p.stone?{stone:7,metal:2}:{wood:9,seeds:1},p.stone?'pick':'axe',null,p.stone?'quarry':'standingtree']);
export const OUTLAND_FINDS=[
 ['find','Кресло с дачной веранды',-60,157.1,{},null,'armchair'],
 ['find','Печь из дома рыбака',88,152.3,{},null,'campstove'],
 ['find','Радио лесничего',-167,10.2,{},null,'homeradio'],
 ['find','Проигрыватель в сторожке',-42,-156.5,{},null,'recordplayer'],
 ['find','Инструментальный шкаф смотрителя',-176,121.5,{},null,'toolcabinet'],
];
export const OUTLAND_MEMORIES=[
 {id:'forest-ranger',name:'Журнал лесничего',x:-165.3,z:4.1,y:.975,text:'«Дрова оставили в сарае, камень берут у старого разреза. Аккумулятор оставили в ремонтном сарае у разреза, запасной насос — в восточной мастерской. На дачах ещё есть печи и целая мебель». Последние страницы пахнут дымом.'},
 {id:'forest-lake',name:'Записка у рыбацких снастей',x:88.7,z:149.1,y:.975,text:'«На траву берёт окунь. Вечером у настила выходит форель. Печь исправна — оставляю тому, кто будет жить здесь после нас». Под запиской лежит высохший лист.'},
 {id:'forest-north',name:'Пластинка без конверта',x:-41.3,z:-160.9,y:.975,text:'На обороте обложки: «Поставь тихо, чтобы было слышно дождь. Домой доберёмся по северной тропе». Игла ещё стоит у начала дорожки.'},
];
export function forestTrees(){
 let seed=202020;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),trees=[];
 for(let gx=-198;gx<=198;gx+=9)for(let gz=-198;gz<=198;gz+=9){const x=gx+(rand()-.5)*5,z=gz+(rand()-.5)*5,priority=rand();if(outlandReserved(x,z,2)||OUTLAND_RESOURCE_SITES.some(p=>Math.hypot(p.x-x,p.z-z)<3))continue;trees.push({x,z,scale:.85+rand()*.55,priority});}
 return trees.sort((a,b)=>a.priority-b.priority).slice(0,1100);
}
export const OUTLAND_PATROLS=[{x:-155,z:124},{x:167,z:-130}];
export function buildOutlandScenery(w){
 const outline=new THREE.Shape();outline.moveTo(-11,-4);for(const [x,z]of [[-8,-10],[1,-12],[10,-7],[12,3],[6,11],[-5,10],[-12,4]])outline.lineTo(x,z);outline.closePath();const clearing=w.cylinder(-160,.005,120,1,.02,'#717a6d',w.scene,8);clearing.geometry.dispose();clearing.geometry=new THREE.ShapeGeometry(outline);clearing.rotation.x=-Math.PI/2;clearing.castShadow=false;
 for(const b of OUTLAND_BUILDINGS){
  w.building(b.x,b.z,b.w,b.d,b.h,b.shade,b.sign,{roofStyle:b.roofStyle,pitch:b.pitch,roofColor:b.role==='workshop'?'#697d74':'#786e59'});
  const room=w.buildings.at(-1),back=b.z-b.d/2+1.1,left=b.x-b.w/2+1.1,right=b.x+b.w/2-1.3,start=room.wallMeshes.length;
  room.ambience=b.role==='workshop'?'metal':'room';
  for(const y of [.35,1.1,1.85])w.box(left,y,back,1.4,.12,.65,'#7e8068');for(const x of [left-.62,left+.62])w.box(x,1.1,back,.08,2.2,.6,'#596d64');w.collider(left,back,1.4,.65);
  w.box(right,.9,back,1.6,.12,.8,'#a0906b');for(const x of [right-.65,right+.65])w.box(x,.45,back,.1,.9,.6,'#596d64');w.collider(right,back,1.6,.8);
  if(b.role==='cabin'){
   const x=b.x-b.w/2+1.2,z=b.z+1.8;w.box(x,.38,z,1.3,.5,1.8,'#596d64');w.box(x,.7,z,1.3,.15,1.8,'#c6c5ad');w.box(x,.8,z+.35,1.32,.08,.9,'#8c9c91');w.collider(x,z,1.3,1.8);
   for(const x of [right-.3,right+.3])w.cylinder(x,1.05,back,.08,.14,'#c7bd91');
  }else if(b.role==='garden'){
   for(const x of [left-.35,left+.25])for(const y of [.55,1.3])w.box(x,y,back,.35,.25,.4,'#c7bd91');
   for(const x of [b.x-b.w/2+1.2,b.x+b.w/2-1.2]){w.box(x,.27,b.z+1.9,.65,.4,1.3,'#a09873');w.bush(x,b.z+1.9,.28).position.y=.6;w.collider(x,b.z+1.9,.65,1.3);}
  }else if(b.role==='workshop'||b.role==='ranger'){
   for(const x of [right-.4,right+.3])w.box(x,1.05,back,.4,.25,.4,'#596d64');
   w.cutawayDetail(w.box(b.x,1.7,b.z-b.d/2+.22,2,1,.06,'#596d64'),room);
   for(const dx of [-.6,0,.6])w.cutawayDetail(w.box(b.x+dx,1.7,b.z-b.d/2+.28,.06,.65,.05,'#c7bd91'),room);
  }else{
   for(const x of [right-.3,right+.3])w.cylinder(x,1.15,back,.12,.35,'#a0906b',w.scene,8);
   for(const x of [left-.3,left+.3])w.box(x,.58,back,.35,.35,.4,'#c7bd91');
  }
  w.mergeBuildingDetails(room,start);
  if(['cabin','ranger','fish'].includes(b.role))w.canopy(b.x,b.z+b.d/2+.65,b.w*.65,1.6,2.6,'#7e8068');
 }
 // Garden beds and washing line make the dacha street readable without quest markers.
 for(const [x,z]of [[-60,170],[-65,167],[-35,166]]){w.box(x,.2,z,2,.3,1,'#7e8068');w.collider(x,z,2,1);for(const dx of [-.6,0,.6])w.bush(x+dx,z,.3).position.y=.45;}
 for(const x of [-70,-65]){w.box(x,1.2,187,.1,2.4,.1,'#7e8068');w.collider(x,187,.1,.1);}w.box(-67.5,2.2,187,5,.025,.025,'#c7bd91');for(const x of [-69,-67])w.box(x,1.8,187,.7,.8,.025,'#c6c5ad');
 // A physical forest shortcut: sawing the existing board obstacle opens the direct path.
 for(const x of [-29,-19])w.wall(x,120,7.2,.25,1.2,'#7e8068');
 const l=FOREST_LAKE,d=l.dock;const water=new THREE.Mesh(new THREE.CircleGeometry(1,64),w.waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(l.x,.055,l.z);water.scale.set(l.rx,l.rz,1);w.scene.add(water);w.mirrors.surface(l.x,l.z,l.rx,l.rz,true);
 for(let x=94;x<106;x+=.6)w.box(x+.28,.115,d.z,.54,.09,d.d,'#8b8264');
 for(const z of [d.z-1.15,d.z+1.15]){w.box(d.x,.65,z,d.w,.08,.1,'#7e8068');w.collider(d.x,z,d.w,.1);for(const x of [94.2,100,105.7]){w.box(x,.3,z,.12,1.4,.12,'#7e8068');w.collider(x,z,.12,.12);}}
 w.box(105.8,.65,d.z,.1,.08,d.d,'#7e8068');w.collider(105.8,d.z,.1,d.d);
 for(const [x,z]of [[-164,21],[-55,163],[87,157],[167,-125]])w.mirrors.surface(x,z,1.6,.65);
 // Shore vegetation uses static batches; it adds no distant animation work.
 for(let i=0;i<32;i++){const a=i*Math.PI*2/32,x=l.x+Math.cos(a)*(l.rx+1),z=l.z+Math.sin(a)*(l.rz+1);if(Math.abs(z-d.z)<3&&x<108||w.blocked(x,z,.2)||w.onRoad(x,z,.6))continue;for(let j=0;j<3;j++){const xx=x+(j-1)*.22,h=.75+(i%4)*.12;w.box(xx,h/2,z,.035,h,.035,'#829771');w.cylinder(xx,h,z,.05,.2,'#a5966c',w.scene,5);}}
 for(const sign of OUTLAND_WAYMARKS){
  w.box(sign.x,1.5,sign.z,.1,3,.1,'#756f55');w.collider(sign.x,sign.z,3.6,.2);
  sign.lines.forEach((text,i)=>{
   const y=2.6-i*.85;
   w.box(sign.x,y,sign.z,3.6,.78,.12,'#526258');
   w.label(text,sign.x,y,sign.z+.065,3,'#e4d4ac','#526258');
   const reverse=text.replace(/[←→]/g,a=>a==='←'?'→':'←');
   const back=w.label(reverse,sign.x,y,sign.z-.065,3,'#e4d4ac','#526258');back.rotation.y=Math.PI;
  });
 }
 for(const p of forestTrees())if(!OUTLAND_WAYMARKS.some(s=>Math.hypot(s.x-p.x,s.z-p.z)<4)&&!w.blocked(p.x,p.z,1.2)&&!w.onRoad(p.x,p.z,2))w.tree(p.x,p.z,p.scale);
}
