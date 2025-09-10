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
  coyoteTimeLeft?: number;
  wasGrounded?: boolean;
  lastJumpTime?: number;
  movementPenalty?: number;
  
  z?: number; // Vertical position for 3D effects
  falling?: boolean;
  fallSpeed?: number;
  targetZ?: number;
  flying?: boolean;
  
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
  lastAIAttack?: number;
  lastAction?: number;
  
  // Status effects
  stunned?: boolean;
  stunDuration?: number;
  frozen?: boolean;
  frozenDuration?: number;
  frozenTint?: {
    color?: string;
    alpha?: number;
  };
  chilled?: boolean;
  chillIntensity?: number;
  chillDuration?: number;
  chillTrigger?: {
    position?: Vec2;
    radius?: number;
  } | boolean;
  onFire?: boolean;
  fireDuration?: number;
  electrified?: boolean;
  statusEffects?: any[]; // Array of status effect objects
  perdurance?: string; // Type of damage resistance
  
  // Environmental effects
  temperature?: number;
  humidity?: number;
  winterActive?: boolean;
  desertActive?: boolean;
  
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
  
  // Tossing
  tossing?: boolean;
  tossProgress?: number;
  tossOrigin?: Vec2;
  tossTarget?: Vec2;
  tossForce?: number;
  
  // Grappling and Tethering
  grappled?: boolean;
  grappledBy?: string;
  grappledDuration?: number;
  grappleSource?: Vec2;
  grappleHit?: boolean;
  grapplerID?: string;
  grappleOrigin?: Vec2;
  grappleRange?: number;
  pinDuration?: number;
  grapplingRange?: number;
  harpoonRange?: number;
  armorPiercing?: number;
  tethered?: boolean;
  tetherPoint?: Vec2;
  maxTetherDistance?: number;
  
  // Lightning
  lightningPath?: Vec2[];
  lightningBoostDuration?: number;
  
  // Shield
  frostShield?: any;
  
  // Airdrop
  airborne?: boolean;
  airdropVelocity?: Vec2;
  dropping?: boolean;
  dropSpeed?: number;
  
  // Size
  huge?: boolean;
  phantom?: boolean;
  parentId?: string;
  width?: number;
  height?: number;
  
  // Rock/projectile specific
  lifetime?: number;
  frameCount?: number;
  frameSpeed?: number;
  tall?: boolean;
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
  
  // Segmented creatures
  segmentCount?: number;
  segmentPositions?: Vec2[];
  segments?: any[];
  segmentIndex?: number;
  segment?: boolean;
  segmentSlowdown?: number;
  originalSpeed?: number;
  moveSpeed?: number;
  pinned?: boolean;
  
  // Damage system
  pendingDamage?: {
    amount?: number;
    aspect?: string;
    source?: string;
  };
  brittle?: boolean;
  damageTaken?: number;
  
  // Additional properties from error analysis
  show?: boolean; // For renderer
  chargeAttack?: unknown;
  zapHighest?: unknown;
  rig?: unknown;
  meta?: unknown;
  pos?: Vec2;
  color?: unknown;
  alpha?: unknown;
  
  // Rope climbing
  climbProgress?: number;
  climbDirection?: number;
  lineStart?: Vec2;
  lineEnd?: Vec2;
  
  // Health tracking
  hpHistory?: number[];
  
  // Mining
  currentOre?: number;
  oreCarryCapacity?: number;
  psychicRange?: number;
  
  // Misc
  smoothX?: number | null;
  smoothY?: number | null;
  targetX?: number;
  targetY?: number;
  
  // Extension point - for properties we haven't typed yet
  [key: string]: unknown;
}