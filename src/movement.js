// Frame-rate independent velocity response. Distances are world metres.
export class Locomotion {
  constructor() { this.reset(); }
  reset() { this.x = 0; this.z = 0; this.exhausted ??= false; this.running = false; }
  update(dt, dx, dz, stamina, sprint, boots = false, food = null) {
    const length = Math.hypot(dx, dz), intensity = Math.min(1, length);
    if (stamina <= 1) this.exhausted = true;
    if (stamina >= 22) this.exhausted = false;
    this.running = length > 0.08 && sprint && !this.exhausted;
    const speed = 4.1 * (boots ? 1.18 : 1) * (this.running ? 1.65 : 1);
    const response = 1 - Math.exp(-dt * (length > 0.08 ? 22 : 32));
    const targetX = length > 0.08 ? dx / length * speed * intensity : 0;
    const targetZ = length > 0.08 ? dz / length * speed * intensity : 0;
    this.x += (targetX - this.x) * response; this.z += (targetZ - this.z) * response;
    if (Math.hypot(this.x, this.z) < 0.015) this.x = this.z = 0;
    return { x: this.x * dt, z: this.z * dt, running: this.running,
      stamina: Math.min(100, Math.max(0, stamina + dt * (this.running ? -16*(food?.sprintCost??1) : (length > 0.08 ? 8 : 13)*(food?.recovery??1)))) };
  }
}
