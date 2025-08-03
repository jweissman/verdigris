export interface Vec2 {
  x: number;
  y: number;
}

export type UnitState = 'idle' | 'walk' | 'attack' | 'dead';

export type UnitPosture = 'idle' // wander or wait
  | 'alert' // Suspicious, not yet targeting
  | 'pursue' // Actively chasing a target
  | 'fight' // In melee range, ready to strike
  | 'flee' // Low health/run from threat (Trying to escape from danger)
  | 'dying' // Dying animation, can't move
  | 'guard' // Guarding a position / hold
  | 'bully' // Attempt to occupy the same space as target (pushing them out)

type UnitID = string;

export interface Ability {
  name: string;
  cooldown: number; // in ticks
  trigger?: string; // condition for the ability to fire, e.g., 'true', 'hp < 0.5'
  range?: number; // optional range for abilities
  target?: string; // e.g. 'enemies.nearest()' or 'self'
  config?: {
    [key: string]: any; // Additional configuration options for the ability
  }
  effect: (unit: Unit, target?: Unit) => void; // Effect function
}

export interface Unit {
  id: UnitID;
  pos: Vec2;
  intendedMove: Vec2;
  team: 'friendly' | 'hostile';
  sprite: string;
  state: UnitState;
  posture?: UnitPosture;
  intendedTarget?: Vec2 | UnitID; // Target for attacks or abilities
  hp: number;
  maxHp: number;
  mass: number;
  tags?: string[];
  abilities: { [name: string]: Ability };
  lastAbilityTick?: { [name: string]: number };
  meta: {
    jumping?: boolean; // Whether the unit is currently jumping
    jumpProgress?: number; // Progress of the jump animation
    z?: number; // For 3D positioning, e.g., jumping
    [key: string]: any; // Additional metadata
  }
}

// export const unit = (id: UnitID, pos: Vec2 = { x: 0, y: 0 }, team: 'friendly' | 'hostile', sprite: string, state: UnitState = 'idle', hp: number = 10, maxHp: number = 10, mass: number = 1): Unit => ({
//   id, pos, intendedMove: { x: 0, y: 0 }, team, sprite, state,
//   hp, maxHp, mass,
//   abilities: {},
//   meta: {
//     jumping: false,
//     jumpProgress: 0,
//     z: 0,
//   }
// });

export interface Projectile {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  team: 'friendly' | 'hostile';
}

export interface Battlefield {
  width: number;
  height: number;
  units: Unit[];
  projectiles: Projectile[];
  time: number;
}

export type Input = {
  commands: {
    [unitId: string]: {
      action: 'move' | 'attack' | 'stop' | 'cast';
      spell?: string;
      target?: Vec2 | string;
    }[]
  }
};

export type Step = (state: Battlefield, input?: Input) => Battlefield;


// for queued actions for engine to process at end of tick
export type Action = {
  kind: 'aoe' | 'damage' | 'heal' | 'knockback';
  // source: string | Unit | Projectile | Vec2;
  source: string | Vec2;
  target: string | Vec2;
  tick?: number; // When this event was processed
  meta: {
    aspect?: 'force' | 'life' | 'heat' | 'shock' | 'impact';
    amount?: number; // Amount of damage or healing
    radius?: number; // Radius for AoE effects
    distance?: number; // Distance for knockback
    force?: number; // Force for knockback/aoe (if > mass then send flying)
    origin?: Vec2; // Origin point for distance calculations
  }
}