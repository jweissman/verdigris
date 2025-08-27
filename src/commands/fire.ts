import { Command, CommandParams } from "../rules/command";

/**
 * Fire command - starts a fire at a location by setting high temperature
 * Params:
 *   x?: number - X position (defaults to near hero)
 *   y?: number - Y position (defaults to near hero)
 *   temperature?: number - Temperature in Celsius (default 700)
 *   radius?: number - Radius of fire effect (default 2)
 */
export class FireCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    let x = params.x as number | undefined;
    let y = params.y as number | undefined;
    const temperature = (params.temperature as number) || 700;
    const radius = (params.radius as number) || 2;
    
    // If no position specified and called by hero, start fire near hero
    if ((x === undefined || y === undefined) && unitId) {
      const hero = this.sim.units.find(u => u.id === unitId);
      if (hero) {
        // Start fire 2-3 tiles in front of hero based on facing
        const facing = hero.meta?.facing || 'right';
        const distance = 2 + Math.random();
        
        switch (facing) {
          case 'right':
            x = hero.pos.x + distance;
            y = hero.pos.y;
            break;
          case 'left':
            x = hero.pos.x - distance;
            y = hero.pos.y;
            break;
          case 'up':
            x = hero.pos.x;
            y = hero.pos.y - distance;
            break;
          case 'down':
            x = hero.pos.x;
            y = hero.pos.y + distance;
            break;
        }
      }
    }
    
    // Fallback to center if still no position
    if (x === undefined || y === undefined) {
      x = Math.floor(this.sim.fieldWidth / 2);
      y = Math.floor(this.sim.fieldHeight / 2);
    }
    
    // Clamp to field bounds
    x = Math.max(0, Math.min(this.sim.fieldWidth - 1, x));
    y = Math.max(0, Math.min(this.sim.fieldHeight - 1, y));
    
    // Set temperature in area (this routes through temperature command)
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const targetX = Math.floor(x + dx);
          const targetY = Math.floor(y + dy);
          
          if (targetX >= 0 && targetX < this.sim.fieldWidth &&
              targetY >= 0 && targetY < this.sim.fieldHeight) {
            // Temperature falloff from center
            const falloff = 1 - (dist / radius) * 0.5;
            const localTemp = temperature * falloff;
            
            this.sim.queuedCommands.push({
              type: "temperature",
              params: {
                x: targetX,
                y: targetY,
                amount: localTemp
              }
            });
          }
        }
      }
    }
    
    // Add visual fire particles
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const r = Math.random() * radius;
      this.sim.particleArrays.addParticle({
        id: `fire_${this.sim.ticks}_${i}`,
        type: "fire",
        pos: {
          x: x * 8 + Math.cos(angle) * r * 8,
          y: y * 8 + Math.sin(angle) * r * 8,
        },
        vel: { x: 0, y: -0.5 - Math.random() * 0.5 },
        radius: 0.5 + Math.random() * 0.5,
        color: Math.random() > 0.5 ? "#FF6600" : "#FFAA00",
        lifetime: 30 + Math.random() * 30,
      });
    }
  }
}