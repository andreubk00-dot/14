// The last contact completes the job; every contact has its own preceding swing.
export function harvestTimeline(duration){
 if(!Number.isFinite(duration)||duration<=0)return [];
 const lead=Math.min(.2,duration/2),contacts=[];
 for(let time=lead;time<duration-.3;time+=.65)contacts.push({time,final:false});
 contacts.push({time:duration,final:true});
 return contacts.flatMap(hit=>[{type:'swing',time:Math.max(0,hit.time-lead)},{type:'strike',...hit}]).sort((a,b)=>a.time-b.time);
}
export function advanceHarvest(job){
 const due=[];job.beatIndex??=0;
 while(job.beatIndex<job.beats.length&&job.beats[job.beatIndex].time<=job.elapsed+1e-9)due.push(job.beats[job.beatIndex++]);
 return due;
}
