import {Box3,Vector3} from 'three';
// Cloned armatures must update matrices before skin bounds are measured.
export function fitEnemyModel(model,height){
 model.updateMatrixWorld(true);
 model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
 const bounds=new Box3().setFromObject(model,true),size=bounds.getSize(new Vector3());
 const scale=height/size.y;model.scale.multiplyScalar(scale);model.position.y-=bounds.min.y*scale;
 model.updateMatrixWorld(true);
 model.traverse(m=>{if(m.isSkinnedMesh){m.skeleton.update();m.computeBoundingBox();m.computeBoundingSphere();}});
 return model;
}
