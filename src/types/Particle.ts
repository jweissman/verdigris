import { Vec2 } from "./Vec2";

export interface Particle {
  id?: string; // Unique identifier for tracking
  pos: Vec2;
  vel: Vec2;
  radius: number;
  lifetime: number;
  ttl?: number; // Time to live (alias for lifetime)
  color?: string; // CSS color string (optional - 1-bit aesthetic)
  z?: number; // Height above ground for 3D effect
  size?: number; // Particle size/scale
  intensity?: number; // Visual intensity for effects
  type?:
    | "leaf"
    | "rain"
    | "debris"
    | "snow"
    | "lightning"
    | "lightning_branch"
    | "electric_spark"
    | "thunder_ring"
    | "ozone"
    | "storm_cloud"
    | "power_surge"
    | "energy"
    | "heat_shimmer"
    | "heat_stress"
    | "grapple_line"
    | "pin"
    | "sand"
    | "tame"
    | "calm"
    | "entangle"
    | "heal"
    | "magic"
    | "sand_burst"
    | "pain"
    | "freeze_impact"
    | "reinforce"
    | "hack"
    | "fire"
    | "ice"
    | "dust"; // Different particle types
  landed?: boolean; // Has the particle landed on the ground
  targetCell?: Vec2; // Target cell for precise positioning
}
