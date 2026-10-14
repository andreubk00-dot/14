// Broad phase only: exact rotated-rectangle tests still decide collisions and cover.
export class SpatialIndex {
 constructor(size=8){this.size=size;this.cells=new Map();}
 add(rect,margin=0){const c=Math.abs(Math.cos(rect.rotation||0)),s=Math.abs(Math.sin(rect.rotation||0)),x=(rect.w*c+rect.d*s)/2+margin,z=(rect.w*s+rect.d*c)/2+margin;for(let i=Math.floor((rect.x-x)/this.size);i<=Math.floor((rect.x+x)/this.size);i++)for(let j=Math.floor((rect.z-z)/this.size);j<=Math.floor((rect.z+z)/this.size);j++){const key=i+','+j;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(rect);}return rect;}
 query(minX,minZ,maxX=minX,maxZ=minZ){const found=new Set();for(let i=Math.floor(minX/this.size);i<=Math.floor(maxX/this.size);i++)for(let j=Math.floor(minZ/this.size);j<=Math.floor(maxZ/this.size);j++)for(const r of this.cells.get(i+','+j)||[])found.add(r);return found;}
}
