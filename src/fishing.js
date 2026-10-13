// Keep reel movement inside the visible input window on slow devices.
// Waiting and the bite use real time; only reeling slows when frames are rare.
export function fishingFrameDelta(dt, phase) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  return phase === 'reel' ? Math.min(elapsed, 0.05) : elapsed;
}
