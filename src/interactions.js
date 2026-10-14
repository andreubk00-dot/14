export const interactionKey=c=>c.type+':'+(c.entity?.id||c.entity?.name||c.x+','+c.z);
export function chooseInteraction(candidates,preferred,locked=false){
 if(!candidates.length)return null;
 candidates.sort((a,b)=>a.distance-b.distance||interactionKey(a).localeCompare(interactionKey(b)));
 const previous=candidates.find(c=>interactionKey(c)===preferred),chosen=previous&&(locked||previous.distance<=candidates[0].distance+.35)?previous:candidates[0];
 return {...chosen,options:candidates.length,optionIndex:candidates.indexOf(chosen)+1};
}
