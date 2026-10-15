// Walkable routes and solid cover share the same coordinates as the rendered garden.
export const ORCHARD_COVER={x:-77,z:-72,w:22,d:.9};
export const ORCHARD_PATHS=[
 {x:-63,z:-72.25,w:1.8,d:5.5},
 {x:-76.25,z:-69.5,w:26.5,d:1.8},
 {x:-89.5,z:-73.5,w:1.8,d:8},
 {x:-92.25,z:-77.5,w:5.5,d:1.8},
 {x:-95,z:-79,w:1.8,d:3},
].map(path=>({...path,garden:true}));
export const ORCHARD_ROUTES={
 direct:[{x:-63,z:-75},{x:-95,z:-75},{x:-95,z:-79}],
 quiet:[{x:-63,z:-75},{x:-63,z:-69.5},{x:-89.5,z:-69.5},{x:-89.5,z:-77.5},{x:-95,z:-77.5},{x:-95,z:-79}],
};
export const ORCHARD_PATROL={x:-80,z:-75};
// Appended after all existing supplies and resources: saves retain every earlier node ID.
export const ORCHARD_FINDS=[
 ['crate','Лампа с кухонной тумбой',-70.5,-60.7,{},null,'desklamp'],
 ['crate','Полка для банок и рассады',-96.7,-83,{},null,'wallshelf'],
 ['scrap','Двигатель садового насоса',-96.8,-61.2,{metal:3,parts:2,wire:1},'wrench',null,'motor'],
];
export const ORCHARD_MEMORIES=[
 {id:'orchard-home',name:'Письмо у двух чашек',x:-69.8,z:-65.9,y:.975,text:'«Лампу забери с тумбой, провод я починил. На полке в оранжерее ещё целые банки. Если вернёмся весной, начнём с маленькой грядки». У второй чашки лежит пакетик семян, так и не вскрытый.'},
 {id:'orchard-repair',name:'Бирка садового насоса',x:-92.3,z:-65.9,y:.975,text:'«Двигатель снят, обмотка целая. Ключи брать свои — крепления закисли. Сухие травы оставил под балкой». На обороте нарисованы грядки и две дорожки; одна спрятана за живой изгородью.'},
];
export function furnishOrchard(w,b,room){
 const box=(x,y,z,a,h,d,c)=>w.box(b.x+x,y,b.z+z,a,h,d,c);
 const solid=(x,z,a,d)=>w.collider(b.x+x,b.z+z,a,d);
 const detail=(mesh,roof=false)=>w.cutawayDetail(mesh,room,roof);
 const start=room.wallMeshes.length;
 if(b.index===0){
  // Sorting counter: trays and paper envelopes, with supplies reachable from the aisle.
  box(0,.85,-3.2,4.8,.14,.8,'#a0906b');for(const x of [-2,2])box(x,.4,-3.2,.12,.8,.65,'#596d64');solid(0,-3.2,4.8,.8);
  for(const x of [-1.5,0,1.5]){box(x,.96,-3.2,1.05,.1,.55,'#7e8068');for(const dx of [-.25,.15])box(x+dx,1.07,-3.2,.24,.16,.3,'#c7bd91');}
  detail(w.label('СЕМЕНА · СУХОЙ ЗАПАС',b.x,1.7,b.z-b.d/2+.22,3.6));
  w.canopy(b.x,b.z+b.d/2+.7,5.2,1.8,2.7,'#7e8068');
 }else if(b.index===1){
  // Living greenhouse: raised beds, irrigation pipe, seedlings and empty pots.
  for(const x of [-3.6,3.6])for(const z of [-.5,3.5]){
   box(x,.33,z,.85,.5,1.8,'#a09873');box(x,.6,z,.72,.07,1.65,'#665d47');solid(x,z,.85,1.8);
   for(const dz of [-.5,.4])w.bush(b.x+x,b.z+z+dz,.3).position.y=.74;
  }
  box(0,.33,-3.3,3,.5,1,'#a09873');box(0,.6,-3.3,2.8,.07,.8,'#665d47');solid(0,-3.3,3,1);
  for(const x of [-.9,0,.9]){const leaf=w.bush(b.x+x,b.z-3.3,.28);leaf.position.y=.73;}
  for(const x of [-3,3])w.cylinder(b.x+x,.35,b.z+4.9,.19,.4,'#a0906b');
  detail(box(-4.72,1.4,0,.055,.07,9,'#7e8068'));
 }else if(b.index===2){
  // A home, rather than another store: bed, patched blanket, stove and two cups.
  box(-2.6,.35,1.2,1.35,.5,2.1,'#596d64');box(-2.6,.65,1.2,1.35,.18,2.1,'#c6c5ad');box(-2.6,.77,1.65,1.38,.08,1.2,'#8c9c91');box(-2.6,.8,.5,1.1,.15,.45,'#e0d8c0');solid(-2.6,1.2,1.35,2.1);
  box(3,.65,-.2,.85,1.1,1,'#596d64');box(3,1.24,-.2,.95,.08,1.1,'#7e8068');solid(3,-.2,.95,1.1);
  detail(box(3,2.8,-.2,.15,3.1,.15,'#596d64'));detail(box(3,4.39,-.2,.35,.08,.35,'#596d64'),true);
  for(const x of [2.8,3.4])w.cylinder(b.x+x,1.05,b.z-2.9,.09,.14,'#c7bd91');
  box(-.2,.025,1.6,1.4,.04,2,'#a0906b');
  for(const x of [-3.1,2.5]){detail(box(x,2.85,-3.7,1.6,.06,.07,'#596d64'));detail(box(x-.55,2.1,-3.7,.3,1.4,.04,'#c6c5ad'));}
 }else{
  // Drying bundles hang from their beam; the service bench holds disassembled fittings.
  box(2.6,.85,2.1,1.6,.14,1.1,'#a0906b');for(const x of [2,3.2])box(x,.4,2.1,.1,.8,.9,'#596d64');solid(2.6,2.1,1.6,1.1);
  for(const x of [2.2,2.7,3.1])w.cylinder(b.x+x,1,b.z+2.1,.12,.2,'#7e8068',w.scene,6);
  // Low drying trays remain visible when the roof lifts.
  for(const y of [.75,1.25]){box(-3.1,y,.2,.7,.09,1.6,'#a09873');for(const z of [-.2,.5])box(-3.1,y+.1,z,.45,.12,.35,'#536d4b');}
  for(const z of [-.5,.9])box(-3.1,.7,z,.08,1.4,.08,'#596d64');solid(-3.1,.2,.7,1.7);
  detail(box(0,1.7,-3.78,2.8,1.1,.06,'#596d64'));
  for(const x of [-.8,0,.8]){detail(box(x,1.7,-3.7,.07,.7,.06,'#c7bd91'));detail(box(x+.12,1.95,-3.7,.3,.12,.07,'#7e8068'));}
  detail(box(0,2.75,1.3,5.7,.12,.12,'#7e8068'),true);
  for(const x of [-2,-1,0,1,2]){detail(box(x,2.4,1.3,.025,.6,.025,'#c7bd91'),true);const bundle=w.bush(b.x+x,b.z+1.3,.24);bundle.position.y=2.12;detail(bundle,true);}
 }
 w.mergeBuildingDetails(room,start);
}
export function buildOrchardGarden(w){
 const c=ORCHARD_COVER;
 w.box(c.x,.3,c.z,c.w,.55,c.d,'#7e8068');
 w.box(c.x,1,c.z,c.w,1.1,.65,'#536d4b');
 const cover=w.collider(c.x,c.z,c.w,c.d);cover.cover=true;
 for(let x=c.x-c.w/2+.6;x<c.x+c.w/2;x+=1.1){const leaf=w.bush(x,c.z,.55);leaf.position.y=1.45;}
 for(const x of [-88.8,-65.2]){w.box(x,.65,-72,.12,1.3,.12,'#a0906b');w.collider(x,-72,.12,.12);}
 // An abandoned wheelbarrow stays scenery; carrying loot still uses the normal backpack.
 w.box(-86,.43,-64,1.25,.5,.7,'#7e8068');w.collider(-86,-64,1.25,.7);w.cylinder(-86,.22,-64.5,.2,.4,'#596d64',w.scene,8).rotation.x=Math.PI/2;
 for(const x of [-86.4,-85.6])w.box(x,.5,-63.2,.06,.06,1.1,'#a0906b');
 w.mirrors.surface(-96.7,-79.5,1.5,.65);
 w.mirrors.surface(-71,-73.7,1.25,.5);
}
