import {RestorationWorld} from './restoration-world.js';
import {roadSurfaces} from './roads.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {FLOOD_BUILDINGS,FLOOD_DOCKS,FLOOD_ISLANDS,FLOOD_WATER,CAMP,insideRect,islandOutline,FLOOD_RUINS,FLOOD_TREES,FLOOD_CANOPIES,FLOOD_OBSTACLES,FLOOD_POSTS,FLOOD_STREETS} from './floodplain.js';
// Only the new territory streams. Existing scene IDs and saved loot stay stable.
export class FloodWorld{
 constructor(w){
  this.world=w;this.chunks=[];this.loads=0;this.unloads=0;
  // Logical shells stay resident: pathfinding and rain never depend on visual loading.
  for(const b of [...FLOOD_BUILDINGS,...FLOOD_CANOPIES]){const record={...b,roofMeshes:[],wallMeshes:[],inside:false};w.buildings.push(record);w.shelterIndex.add(record,.25);
   if(!FLOOD_CANOPIES.includes(b))for(const [x,z,ww,dd]of [...(b.backDoor?[[b.x-b.w*.3,b.z-b.d/2,b.w*.4,.32],[b.x+b.w*.3,b.z-b.d/2,b.w*.4,.32]]:[[b.x,b.z-b.d/2,b.w,.32]]),[b.x-b.w/2,b.z,.32,b.d],[b.x+b.w/2,b.z,.32,b.d],[b.x-b.w*.3,b.z+b.d/2,b.w*.4,.32],[b.x+b.w*.3,b.z+b.d/2,b.w*.4,.32]])w.collider(x,z,ww,dd).cover=true;
  }
  for(const b of FLOOD_BUILDINGS){w.collider(b.x-b.w/2+1.2,b.z-b.d/2+1,1.6,.65);w.collider(b.x+b.w/2-1.2,b.z-b.d/2+1,1.6,.8);if(!['camp','pumpworks','keeper','glasshouse','servicehall'].includes(b.id))w.collider(b.x-b.w/2+1.2,b.z+1.8,1.3,1.8);}
  w.collider(290,60.5,1.2,1.8);w.collider(286,60,1.5,.7);
  for(const t of FLOOD_TREES)w.collider(t.x,t.z,.65*t.scale,.65*t.scale);
  for(const post of FLOOD_POSTS)w.collider(post.x,post.z,post.w,post.d);
  for(const o of FLOOD_OBSTACLES)w.collider(o.x,o.z,o.w,o.d);
  for(const c of FLOOD_CANOPIES)for(const side of [-1,1])w.collider(c.x+side*(c.w/2-.2),c.z+c.d/2-.2,.14,.14);
  this.records=w.buildings.filter(b=>[...FLOOD_BUILDINGS,...FLOOD_CANOPIES].some(f=>f.id===b.id));
  this.campLight=new THREE.PointLight('#ffc58c',0,9,1.7);this.campLight.position.set(286,1.45,60);w.scene.add(this.campLight);
  const shape=new THREE.Shape(),l=FLOOD_WATER;shape.moveTo(-1,-1);shape.lineTo(1,-1);shape.lineTo(1,1);shape.lineTo(-1,1);shape.closePath();
  for(const island of FLOOD_ISLANDS){const hole=new THREE.Path();islandOutline(island).forEach(([x,z],i)=>{const px=(x-l.x)/(l.w/2),py=-(z-l.z)/(l.d/2);if(i)hole.lineTo(px,py);else hole.moveTo(px,py);});hole.closePath();shape.holes.push(hole);}

  // The pond shader has a circular UV mask. This channel needs the whole
  // holed rectangle, with UVs in its shader's [0,1] domain and metre-scale ripples.
  const waterGeometry=new THREE.ShapeGeometry(shape),uv=waterGeometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+1)/2,(uv.getY(i)+1)/2);
  const waterMaterial=w.waterMaterial.clone();waterMaterial.fragmentShader=waterMaterial.fragmentShader.replace('vec2 p=vUv*22.;','vec2 p=vUv*vec2(180.,220.);').replace('float edge=smoothstep(.5,.44,length(vUv-.5));','float edge=1.;');
  waterMaterial.uniforms.colorA.value.set('#304e4a');waterMaterial.uniforms.colorB.value.set('#537569');waterMaterial.fragmentShader=waterMaterial.fragmentShader.replace('.35+wave*.12','.18+wave*.035').replace('vec3(.025,.023,.018)','vec3(.007,.006,.005)');
  const water=new THREE.Mesh(waterGeometry,waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(l.x,.055,l.z);water.scale.set(l.w/2,l.d/2,1);w.scene.add(water);this.waterSurface=water;
  const mirror=w.mirrors.surface(l.x,l.z,l.w/2,l.d/2,true);mirror.geometry.dispose();mirror.geometry=new THREE.ShapeGeometry(shape);mirror.material.uniforms.rectangular.value=1;
  for(const r of FLOOD_RUINS){w.collider(r.x,r.z,r.w,r.d).cover=true;
   // Flooded shells have no entrance or loot; their footprint blocks the hull.
   const g=new THREE.Group();g.name='submerged-shell';g.userData.streaming=true;w.scene.add(g);
   w.box(r.x,.12,r.z,r.w,.25,r.d,'#687d76',g);for(const side of [-1,1]){w.box(r.x+side*r.w/2,r.h/2,r.z,.32,r.h,r.d,'#6f8077',g);w.box(r.x,r.h/3,r.z+side*r.d/2,r.w,r.h*.65,.3,'#78877a',g);}
   for(const x of [r.x-r.w/2+.5,r.x+r.w/2-.5])w.box(x,r.h+.25,r.z-r.d/2+.5,.5,.5,.5,'#9b9b80',g);
   this.batch(g);
  }
  // The low horizon stands in until the full island lies inside the preload margin.
  for(const place of [{id:'shore',x:216,z:70,w:24,d:36},...FLOOD_ISLANDS]){
   const horizon=new THREE.Group();horizon.name='flood-horizon-'+place.id;w.scene.add(horizon);
   for(const b of FLOOD_BUILDINGS.filter(b=>b.place===place.id)){w.box(b.x,b.h/2,b.z,b.w,b.h,b.d,'#586e66',horizon);w.box(b.x,b.h+.2,b.z,b.w+.5,.4,b.d+.5,'#52675f',horizon);}
   this.chunks.push({place,horizon,group:null});
  }
  for(const x of [278,282])w.collider(x,-68,.32,2).cover=true;
  this.restorations=new RestorationWorld(w);for(const r of this.restorations.routes){this.batch(r.complete);this.batch(r.broken);}
  this.boat=new THREE.Group();this.boat.name='rowing-boat';this.boat.userData.streaming=true;w.scene.add(this.boat);
  this.makeBoat();this.boat.scale.setScalar(.8);this.update(true);
 }
 makeBoat(){
  const w=this.world,g=this.boat;
  // A shallow open hull: no collision shell or visual surface crosses the player.
  const points=[[-.65,-1.35],[.65,-1.35],[.88,.65],[.52,1.45],[0,1.85],[-.52,1.45],[-.88,.65]],verts=[],inds=[];
  for(const [x,z]of points)verts.push(x*.62,.02,z*.9,x,.42,z);
  for(let i=0;i<points.length;i++){const a=i*2,b=((i+1)%points.length)*2;inds.push(a,b,b+1,a,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setIndex(inds);geometry.computeVertexNormals();
  const hull=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#778d83',roughness:.72,side:THREE.DoubleSide}));hull.castShadow=true;hull.receiveShadow=true;g.add(hull);
  w.box(0,.1,0,1.05,.13,2.5,'#8d8064',g);for(const z of [-.8,.3])w.box(0,.37,z,1.38,.12,.26,'#ac9b75',g);
  this.oars=[];for(const side of [-1,1]){const oar=new THREE.Group();oar.position.set(side*.68,.45,.25);oar.rotation.y=side*.2;w.box(side*.72,0,0,1.75,.065,.065,'#b2a480',oar);w.box(side*1.4,-.04,0,.55,.08,.21,'#b2a480',oar);g.add(oar);this.oars.push(oar);}
  const wake=new THREE.Mesh(new THREE.RingGeometry(.8,1,32),new THREE.MeshBasicMaterial({color:'#baccc0',transparent:true,opacity:.1,depthWrite:false}));wake.rotation.x=-Math.PI/2;wake.scale.set(.9,2,1);wake.position.y=-.03;g.add(wake);this.wake=wake;
 }
 *buildSteps(chunk){
  const w=this.world;
   for(const b of FLOOD_BUILDINGS.filter(b=>b.place===chunk.place.id)){
    w.building(b.x,b.z,b.w,b.d,b.h,b.shade,b.sign,{...b,roofColor:b.place==='floodworks'?'#627f78':'#786f59'});
    const built=w.buildings.pop(),record=this.records.find(r=>r.id===b.id);Object.assign(record,{roofMeshes:built.roofMeshes,wallMeshes:built.wallMeshes,inside:built.inside,cutawayStable:false});
    const back=b.z-b.d/2+1,left=b.x-b.w/2+1.2,right=b.x+b.w/2-1.2;
    for(const y of [.5,1.2,1.9])w.box(left,y,back,1.6,.12,.65,'#9a9070');
    w.box(right,.86,back,1.6,.14,.8,'#8f8b6c');for(const x of [right-.6,right+.6])w.box(x,.4,back,.1,.8,.65,'#61756c');
    if(b.id==='camp'){
     w.box(290,.35,60.5,1.2,.6,1.8,'#697e70');w.box(290,.72,60.5,1.2,.16,1.8,'#b7b59a');
     w.box(286,.5,60,1.5,1,.7,'#7f775f');w.box(286,1.03,60,1.55,.1,.75,'#4b605b');
     w.cylinder(285.6,1.14,60,.18,.16,'#b5b29b',w.scene,10);
     const ember=w.box(286,.57,60.36,.6,.3,.035,'#e9b67d');ember.material=new THREE.MeshStandardMaterial({color:'#bd8c54',emissive:'#e9a461',emissiveIntensity:.9});ember.userData.campEmber=true;
    }else if(b.place==='floodworks'){
     for(const x of [b.x-2,b.x+2]){w.cylinder(x,.8,back,.45,1.4,'#6c8580');w.box(x,1.55,back,.8,.16,.8,'#99a88e');}
    }else if(b.greenhouse){for(const x of [b.x-4,b.x,b.x+4]){w.box(x,.33,b.z-2,2,.5,1.2,'#867956');w.bush(x,b.z-2,.5).position.y=.55;}}
    else {w.box(left,.38,b.z+1.8,1.3,.5,1.8,'#61756c');w.box(left,.72,b.z+1.8,1.3,.16,1.8,'#b8baa3');}
    yield;
   }
   if(chunk.place.id==='floodworks'){for(const x of [278,282])w.box(x,1.5,-68,.32,3,2,'#7d8983');w.box(280,.1,-68,4,.2,2,'#92998a');}
   for(const t of FLOOD_TREES.filter(t=>t.place===chunk.place.id))w.tree(t.x,t.z,t.scale);
   for(const c of FLOOD_CANOPIES.filter(c=>c.place===chunk.place.id)){const record=this.records.find(r=>r.id===c.id),roof=w.box(c.x,c.h,c.z,c.w,.12,c.d,'#8b937a');roof.material=roof.material.clone();roof.material.transparent=true;roof.material.userData.baseOpacity=1;roof.userData.cutaway=true;record.roofMeshes=[roof];record.wallMeshes=[];record.cutawayStable=false;for(const side of [-1,1])w.box(c.x+side*(c.w/2-.2),c.h/2,c.z+c.d/2-.2,.14,c.h,.14,'#8c8267');}
   for(const o of FLOOD_OBSTACLES.filter(o=>o.place===chunk.place.id)){
    if(o.kind==='table'||o.kind==='bench'){w.box(o.x,.75,o.z,o.w,.12,o.d,'#a09372');for(const side of [-1,1])w.box(o.x+side*(o.w/2-.2),.35,o.z,.12,.7,o.d*.8,'#718176');if(o.kind==='table'){w.cylinder(o.x-.4,.92,o.z,.1,.2,'#cec19d',w.scene,8);w.cylinder(o.x+.4,.88,o.z,.15,.12,'#7e9588',w.scene,8);}else w.box(o.x,1.05,o.z-o.d/2,o.w,.5,.1,'#a09372');}
    else if(o.kind==='mail'){w.box(o.x,.7,o.z,.1,1.4,.1,'#74877b');w.box(o.x,1.3,o.z,.6,.55,.6,'#a58d66');w.box(o.x,1.38,o.z+.31,.4,.04,.02,'#354f49');}
    else if(o.kind==='logs'||o.kind==='pipes'){for(const z of [-.25,.25])for(const y of [.2,.55]){const log=w.cylinder(o.x,y,o.z+z,.18,o.w,o.kind==='logs'?'#9b8761':'#7f978e',w.scene,8);log.rotation.z=Math.PI/2;}}
    else {for(const x of [-.5,.5]){w.cylinder(o.x+x,.3,o.z,.3,.6,'#9f8f6b',w.scene,8);w.bush(o.x+x,o.z,.28).position.y=.6;}}
   }
   yield;
   const docks=FLOOD_DOCKS.filter(d=>d.id===chunk.place.id);
   for(const d of docks){const horizontal=d.w>d.d,length=horizontal?d.w:d.d;
    for(let n=-length/2+.3;n<length/2;n+=.6)w.box(d.x+(horizontal?n:0),.12,d.z+(horizontal?0:n),horizontal?.55:d.w,.16,horizontal?d.d:.55,'#9a8d6b');
    for(const side of [-1,1])for(const n of [-length/2+.4,length/2-.4])w.box(d.x+(horizontal?n:side*(d.w/2-.12)),.3,d.z+(horizontal?side*(d.d/2-.12):n),.14,1.2,.14,'#738274');
    w.label(d.name,d.x,1.2,d.z+.12,3,'#e2d0a5','#52695e');
   }
   const p=chunk.place;
   if(p.id!=='shore'){
    const outline=new THREE.Shape();islandOutline(p).forEach(([x,z],i)=>{if(i)outline.lineTo(x,-z);else outline.moveTo(x,-z);});outline.closePath();const soilMaterial=new THREE.MeshStandardMaterial({color:'#b2b99a',map:w.wetMaterials[0].map.clone(),roughness:.97});soilMaterial.map.repeat.set(.1,.1);const soil=new THREE.Mesh(new THREE.ShapeGeometry(outline),soilMaterial);soil.rotation.x=-Math.PI/2;soil.position.y=.035;soil.receiveShadow=true;w.scene.add(soil);
    for(let i=0;i<10;i++){const x=p.x-p.w/2+3+i*(p.w-6)/9,z=p.z-p.d/2+2;if(FLOOD_BUILDINGS.some(b=>insideRect(x,z,b,2)))continue;w.bush(x,z,.45);}
    // Reeds, weathered bank stones and driftwood follow the real dry edge.
    const edges=islandOutline(p);for(let e=0;e<edges.length;e++){const a=edges[e],b=edges[(e+1)%edges.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
     for(let n=1;n<length;n+=3.1){const t=n/length,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;if(FLOOD_DOCKS.some(d=>insideRect(x,z,d,2)))continue;
      const rock=w.box(x,.04,z,.65,.32,.45,n%2?'#899384':'#748779');rock.rotation.y=e*.6+n;
      if(Math.floor(n+e)%3===0)for(let j=0;j<3;j++){const h=.65+(j%2)*.3;w.box(x+j*.15,h/2,z+.3,.035,h,.035,'#91a078');w.cylinder(x+j*.15,h,z+.3,.055,.18,'#a49470',w.scene,5);}
     }
    }
    for(const [dx,dz]of [[-7,8],[6,-7],[9,10]]){const x=p.x+dx,z=p.z+dz;if(FLOOD_BUILDINGS.some(b=>insideRect(x,z,b,2)))continue;w.box(x,.06,z,2.8,.1,.35,'#918265').rotation.y=dx*.1;w.bush(x+1,z+1,.4);}
    // Posts and retaining edges make the dry footprint readable from the water.
    for(const side of [-1,1])w.box(p.x,.05,p.z+side*p.d/2,p.w,.25,.25,'#788579');
    if(p.id==='floodhomes'){
     for(const x of [326,378]){w.box(x,2,30,.12,4,.12,'#7c897e');w.box(x+.7,4,30,1.5,.12,.16,'#7c897e');}
    }
    if(p.id==='floodworks')for(const x of [266,302]){w.box(x,3,-72,.22,6,.22,'#718780');w.box(x,6,-72,2,.2,.2,'#899a86');}
   }
   for(const r of roadSurfaces(FLOOD_STREETS.filter(r=>r.place===p.id))){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(r.w,r.d),new THREE.MeshStandardMaterial({color:'#7c8271',roughness:.98}));mesh.rotation.x=-Math.PI/2;mesh.position.set(r.x,.045,r.z);mesh.receiveShadow=true;mesh.userData.ownedStreamMaterial=true;w.scene.add(mesh);}
   yield;
 }
 advance(chunk){
  const w=this.world;if(!chunk.staging){chunk.staging=new THREE.Group();chunk.staging.name='flood-chunk-'+chunk.place.id;chunk.staging.userData.streaming=true;chunk.staging.visible=false;w.scene.add(chunk.staging);chunk.steps=this.buildSteps(chunk);}
  const prior=new Set(w.scene.children),collider=w.collider,indexAdd=w.shelterIndex.add;let done=false;
  w.collider=()=>({});w.shelterIndex.add=()=>{};
  try{done=chunk.steps.next().done;}
  finally{
   w.collider=collider;w.shelterIndex.add=indexAdd;
   const added=[...w.scene.children].filter(o=>!prior.has(o));if(added.length){const stage=new THREE.Group();for(const o of added)stage.add(o);chunk.staging.add(stage);this.batch(stage);}
  }
  if(done){chunk.group=chunk.staging;chunk.staging=null;chunk.steps=null;chunk.group.visible=true;this.addGroundCover(chunk);chunk.horizon.visible=false;this.loads++;w.renderDirty=true;}
 }
 load(chunk){while(!chunk.group)this.advance(chunk);}
 batch(root){
  root.updateMatrixWorld(true);const groups=new Map();root.traverse(m=>{if(!m.isMesh||!m.geometry.attributes.normal||!m.geometry.attributes.uv||m.userData.cutaway||Array.isArray(m.material)||m.material.transparent||m.material.map)return;const key=m.material.uuid+':'+m.castShadow+':'+m.receiveShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);});
  for(const meshes of groups.values()){if(meshes.length<2)continue;const parts=meshes.map(m=>m.geometry.clone().applyMatrix4(m.matrixWorld)),geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)continue;const merged=new THREE.Mesh(geometry,meshes[0].material);merged.castShadow=meshes[0].castShadow;merged.receiveShadow=meshes[0].receiveShadow;for(const m of meshes){m.removeFromParent();m.geometry.dispose();}root.add(merged);}
  root.traverse(m=>{m.updateMatrix();m.matrixAutoUpdate=false;m.matrixWorldAutoUpdate=false;});root.updateMatrixWorld(true);
 }
 addGroundCover(only=null){
  const w=this.world;if(!w.assets?.['grass-small'])return;
  for(const chunk of only?[only]:this.chunks){if(!chunk.group||chunk.coverDone||chunk.place.id==='shore')continue;const p=chunk.place,source=w.assets['grass-small'].scene;source.updateMatrixWorld(true);
   source.traverse(child=>{if(!child.isMesh)return;const geometry=child.geometry.clone().applyMatrix4(child.matrixWorld),matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0),transforms=[];
    let seed=Math.round(p.x*100+p.z);const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    for(let i=0;i<250&&transforms.length<80;i++){const x=p.x+(random()-.5)*(p.w-5),z=p.z+(random()-.5)*(p.d-5);if(FLOOD_BUILDINGS.some(b=>insideRect(x,z,b,2.5))||FLOOD_DOCKS.some(d=>insideRect(x,z,d,2))||w.nodes.some(n=>Math.hypot(x-n.x,z-n.z)<2)||FLOOD_STREETS.some(r=>insideRect(x,z,r,1)))continue;position.set(x,.045,z);quaternion.setFromAxisAngle(axis,random()*6.28);scale.setScalar(.8+random()*.5);matrix.compose(position,quaternion,scale);transforms.push(matrix.clone());}
    const cover=new THREE.InstancedMesh(geometry,child.material,transforms.length);transforms.forEach((m,i)=>cover.setMatrixAt(i,m));cover.computeBoundingSphere();cover.receiveShadow=true;cover.userData.streamSharedMaterial=true;chunk.group.add(cover);
   });chunk.coverDone=true;
  }
 }
 unload(chunk){
  if(!chunk.group&&!chunk.staging)return;const root=chunk.group||chunk.staging;chunk.steps?.return();const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(m=>{if(!m.isMesh)return;geometries.add(m.geometry);if(!m.userData.streamSharedMaterial&&(m.userData.cutaway||m.material.map||m.userData.campEmber||m.userData.ownedStreamMaterial)){materials.add(m.material);if(m.material.map)textures.add(m.material.map);}});
  root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
  for(const r of this.records.filter(r=>r.place===chunk.place.id)){r.roofMeshes=[];r.wallMeshes=[];r.cutawayStable=false;}
  chunk.group=null;chunk.staging=null;chunk.steps=null;chunk.coverDone=false;chunk.horizon.visible=true;this.unloads++;this.world.renderDirty=true;
 }
 update(force=false){
  const w=this.world;if(!force&&!this.pending?.length&&this.lastX!==undefined&&Math.hypot(w.state.x-this.lastX,w.state.z-this.lastZ)<3)return;this.lastX=w.state.x;this.lastZ=w.state.z;
  const pending=[];for(const chunk of this.chunks){const p=chunk.place,dx=Math.max(0,Math.abs(w.state.x-p.x)-p.w/2),dz=Math.max(0,Math.abs(w.state.z-p.z)-p.d/2),distance=Math.hypot(dx,dz);
   if(distance<78&&!chunk.group)pending.push({chunk,distance});else if(distance>116&&(chunk.group||chunk.staging))this.unload(chunk);
  }
  pending.sort((a,b)=>a.distance-b.distance);this.pending=pending.map(p=>p.chunk);for(const chunk of force?this.pending:this.pending.slice(0,1)){if(force)this.load(chunk);else this.advance(chunk);}this.pending=this.pending.filter(c=>!c.group);
 }
 syncBoat(dt,moving){
  const w=this.world,b=w.state.boat;this.restorations.sync();this.waterSurface.material.uniforms.time.value=w.time;this.campLight.intensity=w.state.camp.ready&&this.chunks.some(c=>c.place.id==='reedcamp'&&c.group)?8:0;this.boat.position.set(b.x,.1+Math.sin(w.time*1.7)*.025,b.z);this.boat.rotation.set(Math.sin(w.time*1.3)*.012,b.heading,Math.sin(w.time*1.8)*.018);this.boat.visible=Math.hypot(b.x-w.state.x,b.z-w.state.z)<110;
  this.wake.material.opacity=b.aboard&&moving?.16:.035;for(let i=0;i<this.oars.length;i++){this.oars[i].rotation.z=b.aboard&&moving?Math.sin(w.time*4)*(i?-.2:.2):0;}
  if(b.aboard){w.player.position.set(b.x,.33,b.z);w.facing=b.heading;w.shadow.visible=false;w.weaponRoot.visible=false;}else {w.shadow.visible=true;w.weaponRoot.visible=true;}
  for(const chunk of this.chunks)if(chunk.place.id==='reedcamp'&&chunk.group)chunk.group.traverse(m=>{if(m.userData.campEmber||m.userData.ownedStreamMaterial)m.visible=w.state.camp.ready;});
 }
}
