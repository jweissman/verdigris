import { ValueExpression } from "./ValueExpression";

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
  stagger?: ValueExpression;

  // Nested effects and metadata
  effects?: AbilityEffect[];
  effectsToRemove?: string[]; // For cleanse effect - list of effect names to remove
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
