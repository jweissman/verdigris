import { AbilityEffect } from "./AbilityEffect";

export interface Ability {
  name: string;
  cooldown: number;
  config?: Record<string, any>;
  target?: string;
  trigger?: string;
  effects: AbilityEffect[];
  maxUses?: number;
}
