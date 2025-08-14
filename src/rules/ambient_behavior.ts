import { Rule } from './rule';

export class AmbientBehavior extends Rule {
  apply(): void {
    // Find all ambient creatures
    const ambientCreatures = this.sim.units.filter(u => 
      u.meta?.isAmbient && u.hp > 0 && u.team === 'neutral'
    );
    
    for (const creature of ambientCreatures) {
      this.updateAmbientBehavior(creature);
    }
  }
  
  private updateAmbientBehavior(creature: any): void {
    // Gentle wandering behavior
    if (!creature.meta.wanderTarget || this.isNearTarget(creature)) {
      // Pick new wander target
      creature.meta.wanderTarget = this.getNewWanderTarget(creature);
      creature.meta.lastWanderUpdate = this.sim.ticks;
    }
    
    // Move slowly toward wander target
    const target = creature.meta.wanderTarget;
    const dx = target.x - creature.pos.x;
    const dy = target.y - creature.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0.5) {
      const speed = 0.3; // very gentle movement
      const moveX = (dx / distance) * speed;
      const moveY = (dy / distance) * speed;
      
      this.sim.queuedCommands.push({
        type: 'move',
        params: {
          unitId: creature.id,
          x: creature.pos.x + moveX,
          y: creature.pos.y + moveY
        }
      });
    }
    
    // Occasionally change direction (adds naturalism)
    if (Math.random() < 0.02) { // 2% chance each tick
      creature.meta.wanderTarget = this.getNewWanderTarget(creature);
    }
    
    // Face movement direction (for sprites)
    if (Math.abs(dx) > 0.1) {
      creature.meta.facing = dx > 0 ? 'right' : 'left';
    }
    
    // Cute animal interactions
    this.handleCuteInteractions(creature);
  }
  
  private isNearTarget(creature: any): boolean {
    if (!creature.meta.wanderTarget) return true;
    
    const target = creature.meta.wanderTarget;
    const dx = target.x - creature.pos.x;
    const dy = target.y - creature.pos.y;
    return Math.sqrt(dx * dx + dy * dy) < 1.0;
  }
  
  private getNewWanderTarget(creature: any): { x: number; y: number } {
    // Stay within reasonable bounds
    const margin = 3;
    const maxX = this.sim.width - margin;
    const maxY = this.sim.height - margin;
    
    // Prefer staying in central area (avoid edges)
    const centerBias = 0.7;
    const centerX = this.sim.width / 2;
    const centerY = this.sim.height / 2;
    
    let targetX, targetY;
    
    if (Math.random() < centerBias) {
      // Bias toward center
      const radius = Math.min(this.sim.width, this.sim.height) * 0.3;
      const angle = Math.random() * 2 * Math.PI;
      targetX = centerX + Math.cos(angle) * radius * Math.random();
      targetY = centerY + Math.sin(angle) * radius * Math.random();
    } else {
      // Random within bounds
      targetX = margin + Math.random() * (maxX - margin);
      targetY = margin + Math.random() * (maxY - margin);
    }
    
    return {
      x: Math.max(margin, Math.min(maxX, targetX)),
      y: Math.max(margin, Math.min(maxY, targetY))
    };
  }
  
  private handleCuteInteractions(creature: any): void {
    // Find nearby cute animals
    const nearbyAnimals = this.sim.units.filter(other => 
      other.id !== creature.id &&
      other.meta?.isAmbient &&
      other.hp > 0 &&
      this.getDistance(creature.pos, other.pos) < 3
    );
    
    // Social flocking behavior
    if (nearbyAnimals.length > 0 && Math.random() < 0.05) {
      const friend = nearbyAnimals[0];
      
      // Sometimes follow friends
      if (creature.type === friend.type) {
        creature.meta.wanderTarget = {
          x: friend.pos.x + (Math.random() - 0.5) * 2,
          y: friend.pos.y + (Math.random() - 0.5) * 2
        };
      }
    }
    
    // Special squirrel behavior - occasionally "gather" near trees
    if (creature.type.includes('squirrel') && Math.random() < 0.01) {
      // Look for tree-like positions (could be enhanced with actual tree data)
      const treeSpot = this.findNearestTreeSpot(creature.pos);
      if (treeSpot) {
        creature.meta.wanderTarget = treeSpot;
      }
    }
    
    // Birds occasionally "perch" by staying still
    if (creature.type === 'bird' && Math.random() < 0.005) {
      creature.meta.perchTime = this.sim.ticks + 50; // perch for 50 ticks
      creature.meta.wanderTarget = creature.pos; // stop moving
    }
    
    // End perching
    if (creature.meta.perchTime && this.sim.ticks > creature.meta.perchTime) {
      delete creature.meta.perchTime;
      creature.meta.wanderTarget = this.getNewWanderTarget(creature);
    }
  }
  
  private findNearestTreeSpot(pos: { x: number; y: number }): { x: number; y: number } | null {
    // Simple heuristic: areas away from edges might have "trees"
    const centerX = this.sim.width / 2;
    const centerY = this.sim.height / 2;
    
    // Bias toward center-ish areas
    return {
      x: centerX + (Math.random() - 0.5) * this.sim.width * 0.5,
      y: centerY + (Math.random() - 0.5) * this.sim.height * 0.5
    };
  }
  
  private getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}