import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {colourGeometry} from './static-colours.js';
export function roomTheme(b){return ({school:['school','library','kitchen','clinic'],village:['cabin','tailor','kitchen','workshop'],rail:['luggage','workshop','luggage','cabin'],retail:['kitchen','workshop','clinic','kitchen'],port:['luggage','workshop','office','workshop'],orchard:['garden','garden','cabin','workshop']})[b.style]?.[b.index]||b.role||'cabin';}
// Wall-mounted clues to a room's use: no new floor obstacles, lights or animations.
export function dressRoom(w,room,theme,variant=0){
 const pieces=[],x=room.x-room.w*.22,z=room.z-room.d/2+.23,y=Math.min(2.15,room.h-.65),colors=['#bdab87','#91a89d','#a4a0b2'],accent=colors[variant%3];
 const box=(xx,yy,ww,hh,color,depth=.055)=>pieces.push(w.box(xx,yy,z,ww,hh,depth,color));
 if(['workshop','rail','port','ranger'].includes(theme)){
  box(x,y,2.2,1.05,'#61756b');for(let i=0;i<5;i++){box(x-.8+i*.4,y,.055,.55,i%2?'#b2ae93':'#879c95',.085);box(x-.8+i*.4,y-.28,.18,.08,'#879c95',.095);}
 }else if(['garden','orchard'].includes(theme)){
  box(x,y,2.2,.9,'#81795f');for(let i=0;i<6;i++){box(x-.85+i*.34,y,.25,.5,i%2?'#c3bc92':'#93a78a',.075);box(x-.85+i*.34,y,.08,.16,'#647e63',.09);}
 }else if(['kitchen','retail'].includes(theme)){
  box(x,y,1.9,.1,'#8b8064');for(let i=0;i<4;i++){box(x-.65+i*.43,y-.3,.045,.55,'#a8aa97',.075);box(x-.65+i*.43,y-.58,.25,.18,i%2?'#81998c':'#b9b59b',.09);}
 }else if(theme==='fish'){
  for(let i=0;i<7;i++)box(x-.9+i*.3,y,.025,1.1,'#9b9d7e');for(let i=0;i<5;i++)box(x,y-.5+i*.25,1.9,.025,'#9b9d7e');
 }else if(theme==='library'){
  for(const row of [-.3,.3]){box(x,y+row-.3,2.2,.09,'#8b8064');for(let i=0;i<8;i++)box(x-.95+i*.27,y+row,.18,.45,colors[(i+variant)%3],.11);}
 }else if(theme==='tailor'){
  box(x,y+.4,2.3,.08,'#8b8064');for(let i=0;i<4;i++)box(x-.8+i*.53,y,.4,.65,colors[(i+variant)%3],.075);
 }else if(theme==='luggage'){
  box(x,y-.45,2.2,.12,'#8b8064');for(let i=0;i<3;i++){box(x-.7+i*.7,y-.1,.55,.5,colors[(i+variant)%3],.12);box(x-.7+i*.7,y+.2,.2,.05,'#8b8064',.14);}
 }else if(['school','clinic'].includes(theme)){
  box(x,y,1.8,.85,'#bfb99a');if(theme==='clinic'){box(x,y,.16,.6,'#829a86',.075);box(x,y,.6,.16,'#829a86',.08);}else for(let i=0;i<4;i++)box(x,y-.27+i*.18,1.3,.035,'#7e9281',.07);
 }else{
  box(x,y,1.5,.9,'#7c715c');box(x,y,1.3,.7,accent,.07);for(let i=0;i<3;i++)box(x-.4+i*.4,y-.1,.2,.28,'#677e70',.08);
 }
 // Curtain colour and length distinguish homes while staying inside the wall plane.
 if(['cabin','village','ranger'].includes(theme))for(const side of [-1,1])box(room.x+side*(room.w/2-1),y,.45,1.2,accent,.08);
 w.scene.updateMatrixWorld(true);const parts=pieces.map(m=>colourGeometry(m.geometry.clone().applyMatrix4(m.matrixWorld),m.material.color)),geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 if(!geometry)throw Error('Room detail batch could not be built');for(const mesh of pieces){mesh.removeFromParent();mesh.geometry.dispose();}
 const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88}),mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.renderOrder=2;w.scene.add(mesh);w.cutawayDetail(mesh,room);material.dispose();mesh.userData.roomDressing=true;room.dressingTheme=theme;
}
