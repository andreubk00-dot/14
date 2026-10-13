// A* with an octile heuristic and binary heap: bounded work across a full district.
export function gridPath(start,goal,blocked,maxNodes=20000) {
 const key=(x,z)=>`${x},${z}`,h=(x,z)=>{const a=Math.abs(goal.x-x),b=Math.abs(goal.z-z);return Math.max(a,b)+(Math.SQRT2-1)*Math.min(a,b);};
 const heap=[],costs=new Map([[key(start.x,start.z),0]]),came=new Map(),closed=new Set();
 const less=(a,b)=>a.f<b.f||a.f===b.f&&a.g>b.g;
 const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(!less(heap[i],heap[p]))break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
 const pop=()=>{const root=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){let best=i,l=i*2+1,r=l+1;if(l<heap.length&&less(heap[l],heap[best]))best=l;if(r<heap.length&&less(heap[r],heap[best]))best=r;if(best===i)break;[heap[i],heap[best]]=[heap[best],heap[i]];i=best;}}return root;};
 push({...start,g:0,f:h(start.x,start.z)});let target=null,iterations=0;
 while(heap.length&&iterations<maxNodes){const n=pop(),k=key(n.x,n.z);if(closed.has(k))continue;closed.add(k);iterations++;if(n.x===goal.x&&n.z===goal.z){target=k;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,k2=key(x,z);if(closed.has(k2)||blocked(x,z)||dx&&dz&&(blocked(n.x+dx,n.z)||blocked(n.x,n.z+dz)))continue;const g=n.g+(dx&&dz?Math.SQRT2:1);if(g>=(costs.get(k2)??Infinity))continue;costs.set(k2,g);came.set(k2,k);push({x,z,g,f:g+h(x,z)});}
 }
 if(!target)return [];const path=[];while(target!==key(start.x,start.z)){const [x,z]=target.split(',').map(Number);path.push({x,z});target=came.get(target);}return path.reverse();
}
