import { Vec2 } from "./Vec2";
import { UnitMeta } from "./UnitMeta";

export type UnitState = "idle" | "walk" | "attack" | "dead" | "charging";

export type UnitPosture =
  | "wait"
  | "alert" // Suspicious, not yet targeting
  | "pursue" // Actively chasing a target
  | "fight" // In melee range, ready to strike
  | "flee" // Low health/run from threat (Trying to escape from danger)
  | "dying" // Dying animation, can't move
  | "guard" // Guarding a position / hold
  | "bully" // Attempt to occupy the same space as target (pushing them out)
  | "berserk"; // Aggressive state with increased damage

type UnitID = string;

export interface Unit {
  id: UnitID;
  pos: Vec2;
  intendedMove: Vec2;
  team: "friendly" | "hostile" | "neutral";
  sprite: string;
  state: UnitState;
  posture?: UnitPosture;
  intendedTarget?: Vec2 | UnitID; // Target for attacks or abilities
  intendedProtectee?: Vec2 | UnitID; // Protecting/guarding a specific target or position
  hp: number;
  maxHp: number;
  mass: number;
  dmg?: number; // Base damage for the unit
  type?: string; // Unit type identifier
  tags?: string[];
  abilities: Array<string>;
  lastAbilityTick?: { [name: string]: number };
  meta: UnitMeta; // Now strongly typed!
}
