export interface Vec2 {
  x: number;
  y: number;
}

export type UnitState = 'idle' | 'walk' | 'attack' | 'dead';

export interface Unit {
  id: string;
  pos: Vec2;
  vel: Vec2;
  team: 'friendly' | 'hostile';
  sprite: string;
  state: UnitState;
  hp: number;
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
