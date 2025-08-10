/**
 * Loads ability definitions from JSON files
 * Provides a data-oriented alternative to hardcoded abilities
 */
import abilitiesJson from '../../data/abilities.json';

export interface JsonAbilityEffect {
  type: string;
  target?: string;
  aspect?: string;
  amount?: number | { $conditional?: any; $random?: number[]; $calculate?: string };
  radius?: number;
  condition?: string;
  meta?: Record<string, any>;
  origin?: string;
  id?: string;
  pos?: string;
  vel?: any;
  damage?: number;
  team?: string;
  projectileType?: string;
  duration?: number;
  progress?: number;
  z?: number;
  aoeRadius?: number;
  weatherType?: string;
  intensity?: number;
  direction?: string;
  range?: number;
  width?: number;
  effects?: JsonAbilityEffect[];
  particleType?: string;
  count?: number;
  spread?: number;
}

export interface JsonAbility {
  name: string;
  cooldown: number;
  config?: Record<string, any>;
  target?: string;
  trigger?: string;
  effects: JsonAbilityEffect[];
}

export interface JsonAbilitySet {
  [abilityId: string]: JsonAbility;
}

export class JsonAbilitiesLoader {
  static load(): JsonAbilitySet {
    return abilitiesJson as JsonAbilitySet;
  }

  static get(abilityId: string): JsonAbility | null {
    const abilities = this.load();
    return abilities[abilityId] || null;
  }
}