import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
// All horizontal water shares one render, rather than rendering the world per puddle.
export class DistrictReflections {
 constructor(world){
  this.world=world;this.surfaces=[];this.last=-Infinity;this.projection=new THREE.Matrix4();this.inverse=new THREE.Matrix4();
  this.capture=new Reflector(new THREE.PlaneGeometry(140,140),{clipBias:.003,textureWidth:512,textureHeight:512,color:'#6b827d'});this.capture.rotation.x=-Math.PI/2;this.capture.position.y=.055;this.capture.visible=false;world.scene.add(this.capture);
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
  if(!this.surfaces.some(m=>Math.hypot(m.position.x-this.world.state.x,m.position.z-this.world.state.z)<28))return;
  this.last=time;this.world.scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);this.capture.updateMatrixWorld(true);
  const visible=this.surfaces.map(m=>m.visible);this.surfaces.forEach(m=>m.visible=false);
  try{this.capture.onBeforeRender(this.world.renderer,this.world.scene,camera);this.inverse.copy(this.capture.matrixWorld).invert();this.projection.copy(this.capture.material.uniforms.textureMatrix.value).multiply(this.inverse);}
  finally{this.capture.visible=false;this.surfaces.forEach((m,i)=>m.visible=visible[i]);}
 }
}
