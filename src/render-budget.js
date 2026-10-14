import {ShaderChunk} from 'three';

let installed=false;
// A light outside its finite range contributes exactly zero. Avoid evaluating
// the material BRDF for it, while keeping every contributing light and shader layout.
export function installLightCulling(){
 if(installed)return;installed=true;
 ShaderChunk.lights_pars_begin=ShaderChunk.lights_pars_begin.replace('vec3 lVector = pointLight.position - geometryPosition;',`vec3 lVector = pointLight.position - geometryPosition;
 if ( ( pointLight.distance > 0.0 && dot( lVector, lVector ) >= pointLight.distance * pointLight.distance ) || pointLight.color == vec3( 0.0 ) ) {
  light.color = vec3( 0.0 ); light.direction = vec3( 0.0, 1.0, 0.0 ); light.visible = false; return;
 }`);
 ShaderChunk.lights_fragment_begin=ShaderChunk.lights_fragment_begin.replaceAll('RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );','if ( directLight.visible ) { RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); }');
}
