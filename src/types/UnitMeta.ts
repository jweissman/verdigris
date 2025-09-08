import { Vec2 } from "./Vec2";

/**
 * Strongly typed unit metadata
 * This replaces the [key: string]: any pattern with specific properties
 */
export interface UnitMeta {
  // Movement and physics
  jumping?: boolean;
  jumpProgress?: number;
  jumpOrigin?: Vec2;
  jumpTarget?: Vec2;
  jumpHeight?: number;
  jumpDamage?: number;
  jumpRadius?: number;
  jumpCount?: number;
  jumpResetTime?: number | null;
  jumpBuffered?: boolean;
  jumpBufferTick?: number;
  bufferedJumpParams?: unknown;
  
  z?: number; // Vertical position for 3D effects
  falling?: boolean;
  fallSpeed?: number;
  targetZ?: number;
  
  // Combat
  facing?: "left" | "right";
  attackCharge?: number;
  chargingAttack?: boolean;
  attackStartTick?: number;
  attackEndTick?: number;
  attackZones?: Vec2[];
  attackZonesExpiry?: number;
  impactZones?: Vec2[];
  impactZonesExpiry?: number;
  lastAttackTime?: number;
  lastMoveTime?: number;
  lastBlinkTime?: number;
  lastDashTime?: number;
  
  // Status effects
  stunned?: boolean;
  stunDuration?: number;
  frozen?: boolean;
  frozenDuration?: number;
  chilled?: boolean;
  chillIntensity?: number;
  chillDuration?: number;
  chillTrigger?: boolean;
  onFire?: boolean;
  fireDuration?: number;
  electrified?: boolean;
  
  // Abilities
  primaryAbility?: string;
  abilityA?: string;
  abilityB?: string;
  primaryAction?: string;
  fireTrailActive?: boolean;
  fireTrailDuration?: number;
  fireTrailTemperature?: number;
  lastTrailPos?: Vec2;
  
  // Control
  controlled?: boolean;
  moveTarget?: {
    x: number;
    y: number;
    attackMove?: boolean;
    setTick?: number;
  };
  
  // Rendering
  useRig?: boolean;
  rigParts?: unknown[]; // TODO: Type this properly
  weapon?: string;
  sprite?: string;
  rotation?: number;
  isFlipping?: boolean;
  isDoubleFlipping?: boolean;
  flipStartTick?: number;
  onRooftop?: boolean;
  
  // Teleportation
  teleported?: boolean;
  teleportedAtTick?: number;
  
  // Size
  huge?: boolean;
  phantom?: boolean;
  parentId?: string;
  
  // Rock/projectile specific
  lifetime?: number;
  frameCount?: number;
  frameSpeed?: number;
  tall?: boolean;
  height?: number;
  immobile?: boolean;
  damage?: number;
  radius?: number;
  sourceId?: string;
  
  // AI/Behavior
  targetId?: string;
  guardTarget?: Vec2;
  patrolPath?: Vec2[];
  currentPatrolIndex?: number;
  
  // Chain weapon
  chainSegments?: Vec2[];
  chainLength?: number;
  
  // Misc
  smoothX?: number | null;
  smoothY?: number | null;
  targetX?: number;
  targetY?: number;
  
  // Extension point - for properties we haven't typed yet
  [key: string]: unknown;
}