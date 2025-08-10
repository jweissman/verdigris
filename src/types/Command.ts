import { Unit } from "./Unit";
import { Vec2 } from "./Vec2";

// for queued actions for engine to process at end of tick


export type Command = {
  kind: 'aoe' | 'damage' | 'heal' | 'knockback' | 'spawn';
  // source: string | Unit | Projectile | Vec2;
  source: string | Vec2;
  target: string | Vec2;
  tick?: number; // When this event was processed
  meta: {
    aspect?: 'force' | 'life' | 'heat' | 'shock' | 'impact' | 'radiant' | 'heal';
    amount?: number; // Amount of damage or healing
    radius?: number; // Radius for AoE effects
    distance?: number; // Distance for knockback
    force?: number; // Force for knockback/aoe (if > mass then send flying)
    origin?: Vec2; // Origin point for distance calculations
    unit?: Partial<Unit>; // Unit involved in the action
  };
};
