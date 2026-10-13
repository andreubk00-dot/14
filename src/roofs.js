export function isInsideBuilding(building, x, z) {
  return Math.abs(x-building.x) <= building.w/2 + 0.25 && Math.abs(z-building.z) <= building.d/2 + 0.25;
}
export function fadeOpacity(current, target, dt) {
  return current + (target-current)*(1-Math.exp(-Math.max(0,dt)*8));
}
