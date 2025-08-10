import { Unit } from "./Unit";
import { Projectile } from "./Projectile";


export interface Battlefield {
  width: number;
  height: number;
  units: Unit[];
  projectiles: Projectile[];
  time: number;
}
