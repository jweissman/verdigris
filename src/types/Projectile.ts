import { Vec2 } from "./Vec2";


export interface Projectile {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  team: 'friendly' | 'hostile';
  type: 'bullet' | 'bomb' | 'grapple';
  sourceId?: string; // ID of unit that created the projectile
  // For bomb projectiles with arc motion
  target?: Vec2;
  progress?: number;
  duration?: number;
  origin?: Vec2;
  z?: number;
  // For AoE on impact
  aoeRadius?: number;
}
