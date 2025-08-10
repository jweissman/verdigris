/**
 * Loads ability definitions from JSON files
 * Provides a data-oriented alternative to hardcoded abilities
 */
// import abilitiesJson from '../../data/abilities.json';

// Type for values that can be constant or dynamic
export type ValueExpression = 
  | number 
  | string 
  | boolean
  | { $random?: number[] | string[] }
  | { $conditional?: { if: string; then: any; else: any } }
  | { $calculate?: string }
  | { x?: ValueExpression; y?: ValueExpression } // For position-like values
  | ValueExpression[]; // For arrays

export interface AbilityEffect {
  type: string;
  
  // Common targeting/positioning
  target?: ValueExpression;
  origin?: ValueExpression;
  pos?: ValueExpression;
  
  // Effect parameters
  amount?: ValueExpression;
  radius?: ValueExpression;
  damage?: ValueExpression;
  aspect?: string;
  duration?: ValueExpression;
  
  // Projectile-specific
  projectileType?: string;
  vel?: ValueExpression;
  progress?: number;
  z?: number;
  aoeRadius?: number;
  
  // Summon/deploy specific
  unit?: ValueExpression;
  constructType?: ValueExpression;
  intendedProtectee?: string;
  posture?: string;
  
  // Weather/environment
  weatherType?: string;
  intensity?: ValueExpression;
  
  // Combat/movement
  direction?: ValueExpression;
  distance?: ValueExpression;
  height?: ValueExpression;
  range?: ValueExpression;
  width?: ValueExpression;
  force?: ValueExpression;
  
  // Visual/particles
  particleType?: string;
  count?: ValueExpression;
  spread?: ValueExpression;
  color?: string;
  size?: ValueExpression;
  
  // Nested effects and metadata
  effects?: AbilityEffect[];
  condition?: string;
  meta?: Record<string, any>;
  
  // Other common fields
  id?: string;
  team?: string;
  
  // Buff/debuff specific
  buff?: Record<string, any>;
  debuff?: Record<string, any>;
  
  // Line/area effects
  start?: ValueExpression;
  end?: ValueExpression;
}

export interface Ability {
  name: string;
  cooldown: number;
  config?: Record<string, any>;
  target?: string;
  trigger?: string;
  effects: AbilityEffect[];
}

export interface JsonAbilitySet {
  [abilityId: string]: Ability;
}
