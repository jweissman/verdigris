import { Vec2 } from "./Vec2";

// Base interface for all command parameters
export interface BaseCommandParams {
  [key: string]: unknown;
}

// Movement commands
export interface MoveParams extends BaseCommandParams {
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
}

// Combat commands
export interface StrikeParams extends BaseCommandParams {
  targetId?: string;
  direction?: "left" | "right" | "up" | "down";
  damage?: number;
  range?: number;
  knockback?: number;
  aspect?: string;
}

export interface DamageParams extends BaseCommandParams {
  targetId: string;
  amount: number;
  aspect?: string;
  sourceId?: string;
  origin?: Vec2;
}

export interface AoeParams extends BaseCommandParams {
  x: number;
  y: number;
  radius: number;
  damage: number;
  type?: string;
  friendlyFire?: boolean;
  excludeSource?: boolean;
  falloff?: boolean;
  stunDuration?: number;
  force?: number;
  duration?: number;
}

// Ability commands
export interface JumpParams extends BaseCommandParams {
  targetX?: number;
  targetY?: number;
  distance?: number;
  height?: number;
  damage?: number;
  radius?: number;
}

export interface DashParams extends BaseCommandParams {
  direction?: "left" | "right" | "up" | "down";
  distance?: number;
  speed?: number;
}

export interface BlinkParams extends BaseCommandParams {
  targetX?: number;
  targetY?: number;
  distance?: number;
}

export interface BoltParams extends BaseCommandParams {
  x?: number;
  y?: number;
  targetId?: string;
  damage?: number;
}

export interface RockDropParams extends BaseCommandParams {
  targetX?: number;
  targetY?: number;
  damage?: number;
  radius?: number;
}

export interface GroundPoundParams extends BaseCommandParams {
  damage?: number;
  radius?: number;
  knockback?: number;
  screenShake?: boolean;
}

// Status effect commands
export interface HealParams extends BaseCommandParams {
  targetId: string;
  amount: number;
}

export interface KnockbackParams extends BaseCommandParams {
  targetId: string;
  force: number;
  direction: Vec2;
}

export interface MetaParams extends BaseCommandParams {
  unitId: string;
  meta: Record<string, unknown>;
}

// Unit management
export interface SpawnParams extends BaseCommandParams {
  unit: {
    id: string;
    type: string;
    pos: Vec2;
    hp: number;
    maxHp?: number;
    team: "friendly" | "hostile" | "neutral";
    [key: string]: unknown;
  };
}

export interface RemoveParams extends BaseCommandParams {
  unitId: string;
}

// Hero command params
export interface HeroCommandParams extends BaseCommandParams {
  action: string;
  targetX?: number;
  targetY?: number;
  direction?: "left" | "right" | "up" | "down";
  distance?: number;
  damage?: number;
  radius?: number;
  [key: string]: unknown;
}

// Particle params
export interface ParticleParams extends BaseCommandParams {
  pos?: Vec2;
  vel?: Vec2;
  lifetime?: number;
  type?: string;
  color?: string;
  radius?: number;
  z?: number;
  particle?: {
    pos: Vec2;
    vel: Vec2;
    lifetime: number;
    type: string;
    color: string;
    radius: number;
    z?: number;
  };
}

// Type guard functions
export function isMoveParams(params: BaseCommandParams): params is MoveParams {
  return 'x' in params || 'y' in params || 'dx' in params || 'dy' in params;
}

export function isStrikeParams(params: BaseCommandParams): params is StrikeParams {
  return 'targetId' in params || 'direction' in params;
}

export function isAoeParams(params: BaseCommandParams): params is AoeParams {
  return 'x' in params && 'y' in params && 'radius' in params && 'damage' in params;
}

export function isDamageParams(params: BaseCommandParams): params is DamageParams {
  return 'targetId' in params && 'amount' in params;
}