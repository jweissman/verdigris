import { Command } from "../rules/command";

/**
 * Projectile command - creates a projectile
 * Usage: projectile <type> <startX> <startY> [targetX] [targetY] [damage] [radius] [team]
 */
export class Projectile extends Command {
  execute(unitId: string, type: string, startX: string, startY: string, 
          targetX?: string, targetY?: string, damage?: string, radius?: string, team?: string) {
    
    const startPos = { x: parseFloat(startX), y: parseFloat(startY) };
    const projectileDamage = damage ? parseInt(damage) : 0;
    const projectileRadius = radius ? parseFloat(radius) : 1;
    
    const caster = this.sim.units.find(u => u.id === unitId);
    const projectileTeam = team || caster?.team || 'neutral';

    const projectile: any = {
      id: `projectile_${unitId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pos: startPos,
      vel: { x: 0, y: 0 },
      radius: projectileRadius,
      damage: projectileDamage,
      team: projectileTeam,
      type: type
    };

    // If target is specified
    if (targetX && targetY) {
      const targetPos = { x: parseFloat(targetX), y: parseFloat(targetY) };
      
      if (type === 'bomb') {
        // Bomb-style projectile with arc motion
        projectile.target = targetPos;
        projectile.origin = startPos;
        projectile.progress = 0;
        projectile.duration = 6; // Shorter duration for bombs
        projectile.z = 0; // Bombs use z-axis for arc
        projectile.aoeRadius = 3; // Default AoE radius for bombs
      } else {
        // Bullet-style projectile with velocity
        const dx = targetPos.x - startPos.x;
        const dy = targetPos.y - startPos.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 2; // Default bullet speed
        projectile.vel = { x: (dx / mag) * speed, y: (dy / mag) * speed };
      }
    } else {
      // Default bullet behavior eastward
      projectile.vel = { x: 1, y: 0 };
    }

    this.sim.projectiles.push(projectile);
    console.log(`🏹 ${unitId} fires ${type} projectile from (${startX}, ${startY})`);
  }
}