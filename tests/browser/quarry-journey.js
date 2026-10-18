// Deterministic QA knows the paths, but moves, gathers and reads through gameplay.
export async function quarryJourney(g,route='quiet'){
 const {QUARRY_ROUTES,QUARRY_MEMORIES}=await import('/src/quarry.js'),{interactionKey}=await import('/src/interactions.js');
 const w=g.world,s=g.state,report={route,legs:0,steps:0,minHealth:s.health,alerts:0,clipped:false,killsBefore:s.kills,stock:[]};
 g.visibilityPaused=false;g.ui.close();g.keys.clear();
 const step=()=>{g.tick(1/60);report.steps++;report.minHealth=Math.min(report.minHealth,s.health);report.clipped||=w.blocked(s.x,s.z,.299);if(w.enemies.some(e=>e.alert>0))report.alerts++;if(s.grave)throw Error('Quarry expedition died');};
 const go=(x,z)=>{g.target=null;g.navigate(x,z,false);if(!g.path.length&&Math.hypot(s.x-x,s.z-z)>1.2)throw Error('No quarry route '+x+','+z);let n=0;while(g.path.length&&n++<12000)step();if(g.path.length||Math.hypot(s.x-x,s.z-z)>1.2)throw Error('Quarry route stuck '+x+','+z);g.motion.reset();report.legs++;};
 const select=(type,id)=>{g.nearestInteraction();const c=g.interactionCandidates.find(c=>c.type===type&&c.entity?.id===id);if(!c)throw Error('Missing interaction '+type+':'+id);g.preferredInteraction=interactionKey(c);g.interactionLocked=true;g.interact();};
 for(const [x,z]of QUARRY_ROUTES[route])go(x,z);
 go(-174.7,118.4);select('note','quarry-discharge');if(!s.notes.includes('quarry-discharge'))throw Error('Diagram not learned');g.ui.close();
 const stocks=w.nodes.filter(n=>n.type==='crate'&&Math.abs(n.x+174)<3&&n.z===120);
 for(const n of stocks){
  let point;for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=Math.round(n.x+Math.sin(a)*1.7),z=Math.round(n.z+Math.cos(a)*1.7);if(!w.blocked(x,z)&&Math.hypot(x-n.x,z-n.z)<2.3&&w.canSee(x,z,n.x,n.z,n.collider,true)&&w.pathTo(x,z).length){point={x,z};break;}}
  if(!point)throw Error('No stock approach '+n.id);go(point.x,point.z);select('node',n.id);if(!g.job)throw Error('Harvest not started');while(g.job)step();report.stock.push(n.id);
 }
 go(-173,118.5);report.learned=s.notes.includes('quarry-discharge');report.bag={...s.bag};report.kills=s.kills-report.killsBefore;g.visibilityPaused=true;g.save(false);return report;
}
export async function quarryReturnHome(g){
 const {QUARRY_ROUTES}=await import('/src/quarry.js');g.visibilityPaused=false;g.ui.close();g.keys.clear();let steps=0,minHealth=g.state.health;
 for(const [x,z]of [...QUARRY_ROUTES.return,[-19.5,14]]){g.target=null;g.navigate(x,z,false);let n=0;while(g.path.length&&n++<20000){g.tick(1/60);steps++;minHealth=Math.min(minHealth,g.state.health);if(g.state.grave)throw Error('Return home died');}if(g.path.length||Math.hypot(g.state.x-x,g.state.z-z)>1.2)throw Error('Return route stuck');g.motion.reset();}
 g.action('deposit');g.visibilityPaused=true;return {steps,minHealth,home:Math.hypot(g.state.x+19.5,g.state.z-14)<1.2};
}
