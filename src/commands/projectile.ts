import { Command, CommandParams } from "../rules/command";

/**
 * Projectile command - creates a projectile
 * Params:
 *   x: number - Starting X position
 *   y: number - Starting Y position
 *   projectileType: string - Type of projectile (bullet, bomb, etc.)
 *   damage?: number - Damage amount
 *   targetX?: number - Target X position
 *   targetY?: number - Target Y position
 *   radius?: number - Projectile radius
 *   team?: string - Team affiliation
 */
export class Projectile extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    
    const x = params.x as number;
    const y = params.y as number;
    const projectileType = params.projectileType as string || 'bullet';
    const damage = params.damage as number || 0;
    const targetX = params.targetX as number | undefined;
    const targetY = params.targetY as number | undefined;
    const radius = params.radius as number || 1;
    const team = params.team as string | undefined;
    const initialZ = params.z as number | undefined;
    
    const startPos = { x, y };
    const caster = unitId ? this.sim.units.find(u => u.id === unitId) : null;
    const projectileTeam = team || caster?.team || 'neutral';

    const projectile: any = {
      id: `projectile_${unitId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pos: startPos,
      vel: { x: 0, y: 0 },
      radius: radius,
      damage: damage,
      team: projectileTeam,
      type: projectileType
    };

    // If target is specified
    if (targetX !== undefined && targetY !== undefined) {
      const targetPos = { x: targetX, y: targetY };
      
      if (projectileType === 'bomb') {
        // Bomb-style projectile with arc motion
        projectile.target = targetPos;
        projectile.origin = startPos;
        projectile.progress = 0;
        projectile.duration = 6; // Shorter duration for bombs
        projectile.z = initialZ !== undefined ? initialZ : 0; // Use provided z or default to 0
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
  }
}