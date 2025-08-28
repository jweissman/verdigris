import { Rule } from "../rules/rule";
import { UnitBehavior } from "../rules/unit_behavior";
import { UnitMovement } from "../rules/unit_movement";
import Cleanup from "../rules/cleanup";
import { MeleeCombat } from "../rules/melee_combat";
import { Knockback } from "../rules/knockback";
import { RangedCombat } from "../rules/ranged_combat";
import { Abilities } from "../rules/abilities";
import { StatusEffects } from "../rules/status_effects";
import { Perdurance } from "../rules/perdurance";
import { ChargeAccumulator } from "../rules/charge_accumulator";
import { PairwiseBatcherRule } from "../rules/pairwise_batcher_rule";
import { HugeUnits } from "../rules/huge_units";
import { SegmentedCreatures } from "../rules/segmented_creatures";
import { GrapplingPhysics } from "../rules/grappling_physics";
import { AirdropPhysics } from "../rules/airdrop_physics";
import { BiomeEffects } from "../rules/biome_effects";
import { AmbientSpawning } from "../rules/ambient_spawning";
import { AmbientBehavior } from "../rules/ambient_behavior";
import { LightningStorm } from "../rules/lightning_storm";
import { AreaOfEffect } from "../rules/area_of_effect";
import { ProjectileMotion } from "../rules/projectile_motion";
import { Jumping } from "../rules/jumping";
import { Tossing } from "../rules/tossing";
import { PlayerControl } from "../rules/player_control";
import { HeroAnimation } from "../rules/hero_animation";

export class RulesetFactory {
  static createDefaultRulebook(): Rule[] {
    const coreRules = [
      new UnitBehavior(),
      new UnitMovement(), 
      new Cleanup()
    ];

    const combatRules = [
      new MeleeCombat(), // Registers intents with batcher
      new Knockback(), // Registers intents with batcher  
      new RangedCombat(), // Registers intents with batcher
      new Abilities(), // Handles all other abilities
      new StatusEffects(),
      new Perdurance(),
      new ChargeAccumulator(), // Handles charge accumulation for charging attacks
      new PairwiseBatcherRule(), // Processes all pairwise intents at the end
    ];

    const specialRules = [
      new HugeUnits(),
      new SegmentedCreatures(),
      new GrapplingPhysics(),
      new AirdropPhysics(),
      new BiomeEffects(),
      new AmbientSpawning(),
      new AmbientBehavior(),
      new LightningStorm(),
      new AreaOfEffect(),
      new ProjectileMotion(),
      new Jumping(),
      new Tossing(),
    ];

    const heroRules = [
      new PlayerControl(),
      new HeroAnimation() // Visual metadata for hero rig
    ];

    return [
      ...coreRules,
      ...combatRules,
      ...specialRules,
      ...heroRules,
    ];
  }

  static createMinimalRulebook(): Rule[] {
    return [
      new UnitBehavior(),
      new UnitMovement(),
      new Cleanup()
    ];
  }

  static createCombatRulebook(): Rule[] {
    return [
      ...RulesetFactory.createMinimalRulebook(),
      new MeleeCombat(),
      new Knockback(),
      new RangedCombat(),
      new Abilities(),
      new StatusEffects(),
      new Perdurance(),
      new ChargeAccumulator(),
      new PairwiseBatcherRule(),
    ];
  }
}