// Unit Teams
export const TEAMS = {
  FRIENDLY: 'friendly',
  HOSTILE: 'hostile', 
  NEUTRAL: 'neutral'
} as const;
export type Team = typeof TEAMS[keyof typeof TEAMS];

// Unit States
export const UNIT_STATES = {
  IDLE: 'idle',
  WALK: 'walk',
  ATTACK: 'attack',
  DEAD: 'dead'
} as const;
export type UnitStateConstant = typeof UNIT_STATES[keyof typeof UNIT_STATES];

// Projectile Types
export const PROJECTILE_TYPES = {
  BULLET: 'bullet',
  BOMB: 'bomb',
  GRAPPLE: 'grapple',
  LASER_BEAM: 'laser_beam'
} as const;
export type ProjectileType = typeof PROJECTILE_TYPES[keyof typeof PROJECTILE_TYPES];

// Particle Types
export const PARTICLE_TYPES = {
  SMOKE: 'smoke',
  BLOOD: 'blood',
  SPARK: 'spark',
  DEBRIS: 'debris',
  FIRE: 'fire',
  EXPLOSION: 'explosion',
  DUST: 'dust',
  WATER: 'water',
  LEAF: 'leaf',
  RAIN: 'rain',
  SNOW: 'snow',
  LIGHTNING: 'lightning',
  POWER_SURGE: 'power_surge',
  ELECTRIC_SPARK: 'electric_spark'
} as const;
export type ParticleType = typeof PARTICLE_TYPES[keyof typeof PARTICLE_TYPES];

// Ability Effect Types
export const ABILITY_EFFECTS = {
  DAMAGE: 'damage',
  HEAL: 'heal',
  AOE: 'aoe',
  PROJECTILE: 'projectile',
  MULTIPLE_PROJECTILES: 'multiple_projectiles',
  BUFF: 'buff',
  DEBUFF: 'debuff',
  AREA_BUFF: 'area_buff',
  AREA_PARTICLES: 'area_particles',
  JUMP: 'jump',
  GRAPPLE: 'grapple',
  DEPLOY: 'deploy',
  AIRDROP: 'airdrop',
  BURROW: 'burrow',
  ENTANGLE: 'entangle',
  CONE: 'cone',
  LINE_AOE: 'line_aoe',
  LIGHTNING: 'lightning',
  HEAT: 'heat',
  MOISTURE: 'moisture',
  CALM: 'calm',
  CLEANSE: 'cleanse'
} as const;
export type AbilityEffectType = typeof ABILITY_EFFECTS[keyof typeof ABILITY_EFFECTS];

// Common Unit Tags
export const UNIT_TAGS = {
  MECHANICAL: 'mechanical',
  ORGANIC: 'organic',
  HUGE: 'huge',
  TINY: 'tiny',
  FLYING: 'flying',
  BURROWING: 'burrowing',
  ARTILLERY: 'artillery',
  HUNT: 'hunt',
  GUARD: 'guard',
  CONSTRUCT: 'construct',
  RANGED: 'ranged',
  MELEE: 'melee'
} as const;
export type UnitTag = typeof UNIT_TAGS[keyof typeof UNIT_TAGS];

// Unit Postures
export const POSTURES = {
  WAIT: 'wait',
  PURSUE: 'pursue',
  GUARD: 'guard',
  BULLY: 'bully'
} as const;
export type Posture = typeof POSTURES[keyof typeof POSTURES];

// Damage Aspects
export const DAMAGE_ASPECTS = {
  PHYSICAL: 'physical',
  KINETIC: 'kinetic',
  FIRE: 'fire',
  ICE: 'ice',
  LIGHTNING: 'lightning',
  POISON: 'poison',
  LASER: 'laser',
  EMP: 'emp'
} as const;
export type DamageAspect = typeof DAMAGE_ASPECTS[keyof typeof DAMAGE_ASPECTS];

// Factory function for creating test units with proper shape
export function createTestUnit(overrides: Partial<import('./Unit').Unit> = {}): import('./Unit').Unit {
  return {
    id: 'test-unit',
    pos: { x: 0, y: 0 },
    intendedMove: { x: 0, y: 0 },
    hp: 100,
    maxHp: 100,
    dmg: 10,
    team: TEAMS.NEUTRAL,
    state: UNIT_STATES.IDLE,
    mass: 1,
    sprite: 'default',
    abilities: [],
    tags: [],
    meta: {},
    ...overrides
  };
}