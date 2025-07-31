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
}

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
