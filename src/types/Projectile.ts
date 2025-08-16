import { Vec2 } from "./Vec2";

export interface Projectile {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  team: "friendly" | "hostile" | "neutral";
  type: "bullet" | "bomb" | "grapple" | "laser_beam";
  sourceId?: string; // ID of unit that created the projectile

  target?: Vec2;
  progress?: number;
  duration?: number;
  origin?: Vec2;
  z?: number;

  aoeRadius?: number;

  lifetime?: number;

  aspect?: string;

  explosionRadius?: number;
}
