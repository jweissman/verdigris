import { Vec2 } from "./Vec2";


export interface Projectile {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  team: 'friendly' | 'hostile' | 'neutral';
  type: 'bullet' | 'bomb' | 'grapple' | 'laser_beam';
  sourceId?: string; // ID of unit that created the projectile
  // For bomb projectiles with arc motion
  target?: Vec2;
  progress?: number;
  duration?: number;
  origin?: Vec2;
  z?: number;
  // For AoE on impact
  aoeRadius?: number;
  // Projectile lifetime and decay
  lifetime?: number;
  // Visual/effect aspect
  aspect?: string;
  // Alternative to aoeRadius for explosions
  explosionRadius?: number;
}
