// Explicit starting gear; every repair material and both rewards are earned here.
export async function industryJourney(g,phase){
 const {INDUSTRY_PROJECTS}=await import('/src/industry.js'),{interactionKey}=await import('/src/interactions.js');
 const w=g.world,s=g.state;g.visibilityPaused=false;g.ui.close();g.keys.clear();const report={phase,steps:0,legs:0,minHealth:s.health,clipped:false,stock:[]};
 const step=()=>{g.tick(1/60);report.steps++;report.minHealth=Math.min(report.minHealth,s.health);report.clipped||=w.blocked(s.x,s.z,.29);if(s.grave)throw Error('Northern journey died');};
 const go=(x,z)=>{g.target=null;g.navigate(x,z,false);let n=0;if(!g.path.length&&Math.hypot(s.x-x,s.z-z)>1.2)throw Error('No northern route '+x+','+z);while(g.path.length&&n++<24000)step();if(g.path.length||Math.hypot(s.x-x,s.z-z)>1.2)throw Error('Northern route stuck '+x+','+z);g.motion.reset();report.legs++;};
 const select=(type,id)=>{g.nearestInteraction();const c=g.interactionCandidates.find(c=>c.type===type&&c.entity?.id===id);if(!c)throw Error('Missing northern interaction '+type+':'+id+' at '+s.x+','+s.z);g.preferredInteraction=interactionKey(c);g.interactionLocked=true;g.interact();};
 const approach=n=>{for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=Math.round(n.x+Math.sin(a)*1.8),z=Math.round(n.z+Math.cos(a)*1.8);if(!w.blocked(x,z)&&Math.hypot(x-n.x,z-n.z)<2.3&&w.canSee(x,z,n.x,n.z,n.collider,true)&&(w.pathTo(x,z).length||Math.hypot(s.x-x,s.z-z)<1))return {x,z};}throw Error('No northern stock approach '+n.id);};
 const gather=id=>{const n=w.nodes.find(n=>n.id===id);const p=approach(n);go(p.x,p.z);select('node',id);if(!g.job)throw Error('No northern gathering job '+id);let ticks=0;while(g.job&&ticks++<2000)step();if(g.job)throw Error('Northern job stuck');report.stock.push(id);};
 if(phase==='feed'){
  for(const [x,z]of [[-96,-211],[-96,-242],[-66,-242],[-66,-258],[-66,-266]])go(x,z);
  gather('node-388');gather('node-389');go(-67,-265);select('restoration','grid-feed');
 }else if(phase==='supplies'){
  // Stay on the outside lane; the wet hall is still genuinely blocked.
  for(const [x,z]of [[-66,-258],[-66,-242],[-30,-242],[-30,-271]])go(x,z);gather('node-391');gather('node-400');
  for(const [x,z]of [[-30,-271],[-30,-242],[-96,-242],[-96,-330],[-66,-330],[-66,-342]])go(x,z);gather('node-395');
  for(const [x,z]of [[-66,-342],[-66,-330],[-96,-330],[-96,-284],[-71,-284]])go(x,z);select('restoration','grid-drain');
 }else if(phase==='gate'){
  go(-66,-287);go(-66,-307);gather('node-399');
  for(const [x,z]of [[-66,-321],[-66,-330],[-96,-330],[-96,-242],[0,-242],[3,-232]])go(x,z);select('restoration','grid-gate');
 }else if(phase==='home'){
  for(const [x,z]of [[0,-231],[0,-224],[0,-168],[-24,-168],[-24,-133],[-24,-108],[-34,-108],[-34,-73],[-34,-30],[-34,3],[-19.5,14]])go(x,z);g.action('deposit');
 }
 g.visibilityPaused=true;g.save(false);return {...report,health:s.health,bag:{...s.bag},finds:{...s.finds},stored:{...s.storedFinds},restored:[...s.restoredRoutes],kills:s.kills};
}
