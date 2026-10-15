import {WORLD_LIMIT} from './district.js';
import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
// Only pixels sampled by visible water need a reflected image. Project the
// actual circle vertices: world-axis boxes greatly overestimate distant lakes.
export function reflectionScissor(surfaces,camera,target,point=new THREE.Vector3()){
 let left=Infinity,bottom=Infinity,right=-Infinity,top=-Infinity;
 const marginX=8/target.width,marginY=8/target.height;
 for(const mesh of surfaces){
  if(!mesh.visible)continue;
  let l=Infinity,b=Infinity,r=-Infinity,t=-Infinity;
  const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);
   l=Math.min(l,point.x);b=Math.min(b,point.y);r=Math.max(r,point.x);t=Math.max(t,point.y);
  }
  if(r<-1-marginX||l>1+marginX||t<-1-marginY||b>1+marginY)continue;
  left=Math.min(left,l);bottom=Math.min(bottom,b);right=Math.max(right,r);top=Math.max(top,t);
 }
 if(right<left)return false;
 // Four texels cover ripple distortion, filtering and the surface/plane offset.
 const x=Math.max(0,Math.floor((left+1)*target.width/2)-4),y=Math.max(0,Math.floor((bottom+1)*target.height/2)-4);
 const width=Math.min(target.width,Math.ceil((right+1)*target.width/2)+4)-x,height=Math.min(target.height,Math.ceil((top+1)*target.height/2)+4)-y;
 target.scissor.set(x,y,width,height);return width>0&&height>0;
}
// All horizontal water shares one render, rather than rendering the world per puddle.
export class DistrictReflections {
 constructor(world){
  this.world=world;this.surfaces=[];this.last=-Infinity;this.projection=new THREE.Matrix4();this.inverse=new THREE.Matrix4();this.point=new THREE.Vector3();
  this.capture=new Reflector(new THREE.PlaneGeometry((WORLD_LIMIT+6)*2,(WORLD_LIMIT+6)*2),{clipBias:.003,textureWidth:512,textureHeight:512,color:'#6b827d'});this.capture.rotation.x=-Math.PI/2;this.capture.position.y=.055;this.capture.visible=false;world.scene.add(this.capture);
 }
 surface(x,z,w,d,water=false){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{reflection:{value:this.capture.getRenderTarget().texture},projection:{value:this.projection},time:{value:0},strength:{value:0},tint:{value:new THREE.Color(water?'#436962':'#35494a')},opacity:{value:water?.6:.78}},
   vertexShader:'uniform mat4 projection;varying vec4 mirrorUV;varying vec2 local;void main(){local=position.xy;vec4 world=modelMatrix*vec4(position,1.);mirrorUV=projection*world;gl_Position=projectionMatrix*viewMatrix*world;}',
   fragmentShader:'uniform sampler2D reflection;uniform float time,strength,opacity;uniform vec3 tint;varying vec4 mirrorUV;varying vec2 local;void main(){vec2 uv=mirrorUV.xy/mirrorUV.w;uv+=vec2(sin(local.y*20.+time*.7),cos(local.x*17.-time*.5))*.0009;float valid=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);vec3 reflected=texture2D(reflection,clamp(uv,0.,1.)).rgb;float edge=1.-smoothstep(.68,1.,length(local));float ripple=sin(local.x*18.+local.y*12.-time*.7)*.0015;vec3 col=mix(tint,reflected,strength*valid)+ripple;gl_FragColor=vec4(col,edge*opacity);}' });
  const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,48),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,water?.058:.057,z);mesh.scale.set(w,d,1);this.world.scene.add(mesh);this.surfaces.push(mesh);return mesh;
 }
 update(time,camera,enabled,force=false){
  for(const mesh of this.surfaces){mesh.material.uniforms.time.value=time;mesh.material.uniforms.strength.value=enabled?.65:0;}
  if(!enabled||!force&&time-this.last<.1)return;
  this.world.scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);this.capture.updateMatrixWorld(true);
  const target=this.capture.getRenderTarget();
  if(!reflectionScissor(this.surfaces,camera,target,this.point)){this.last=time;return;}
  target.scissorTest=true;this.last=time;
  const visible=this.surfaces.map(m=>m.visible);this.surfaces.forEach(m=>m.visible=false);
  try{this.capture.onBeforeRender(this.world.renderer,this.world.scene,camera);this.inverse.copy(this.capture.matrixWorld).invert();this.projection.copy(this.capture.material.uniforms.textureMatrix.value).multiply(this.inverse);}
  finally{target.scissorTest=false;this.capture.visible=false;this.surfaces.forEach((m,i)=>m.visible=visible[i]);}
 }
}
