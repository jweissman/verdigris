import { ValueExpression } from "./ValueExpression";

export interface AbilityEffect {
  type: string;

  target?: ValueExpression;
  origin?: ValueExpression;
  pos?: ValueExpression;

  amount?: ValueExpression;
  radius?: ValueExpression;
  damage?: ValueExpression;
  aspect?: string;
  duration?: ValueExpression;

  projectileType?: string;
  vel?: ValueExpression;
  progress?: number;
  z?: number;
  aoeRadius?: number;

  unit?: ValueExpression;
  constructType?: ValueExpression;
  intendedProtectee?: string;
  posture?: string;

  weatherType?: string;
  intensity?: ValueExpression;

  direction?: ValueExpression;
  distance?: ValueExpression;
  height?: ValueExpression;
  range?: ValueExpression;
  width?: ValueExpression;
  force?: ValueExpression;
  offsetX?: ValueExpression;
  offsetY?: ValueExpression;

  particleType?: string;
  count?: ValueExpression;
  spread?: ValueExpression;
  color?: string;
  size?: ValueExpression;
  stagger?: ValueExpression;

  speed?: ValueExpression;
  style?: string;
  effect?: string; // Backwards compat for single effect
  weather?: string; // Backwards compat for weatherType
  unitType?: string; // For summon effects
  center?: ValueExpression;
  lifetime?: ValueExpression;

  effects?: AbilityEffect[]; // For nested effects (cone, area effects)
  effectsToRemove?: string[]; // For cleanse effect - list of effect names to remove
  condition?: ValueExpression;
  meta?: Record<string, any>;

  id?: string;
  team?: string;

  buff?: Record<string, any>;
  debuff?: Record<string, any>;

  start?: ValueExpression;
  end?: ValueExpression;
}
