import { Vec2 } from "./Vec2";

export type UnitState = 'idle' | 'walk' | 'attack' | 'dead';

export type UnitPosture = 'wait'
                        | 'alert'  // Suspicious, not yet targeting
                        | 'pursue' // Actively chasing a target
                        | 'fight'  // In melee range, ready to strike
                        | 'flee'   // Low health/run from threat (Trying to escape from danger)
                        | 'dying'  // Dying animation, can't move
                        | 'guard'  // Guarding a position / hold
                        | 'bully'  // Attempt to occupy the same space as target (pushing them out)

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
  intendedProtectee?: Vec2 | UnitID; // Protecting/guarding a specific target or position
  hp: number;
  maxHp: number;
  mass: number;
  tags?: string[];
  abilities: Array<string>;
  lastAbilityTick?: { [name: string]: number };
  meta: {
    jumping?: boolean; // Whether the unit is currently jumping
    jumpProgress?: number; // Progress of the jump animation
    z?: number; // For 3D positioning, e.g., jumping
    huge?: boolean; // Large multi-cell unit (32x64 sprite)
    phantom?: boolean; // Invisible blocking unit for huge creatures
    parentId?: string; // ID of parent unit for phantoms
    facing?: 'left' | 'right'; // Direction the unit is facing for sprite flipping
    [key: string]: any; // Additional metadata
  }
}