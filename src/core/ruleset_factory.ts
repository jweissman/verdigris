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
import { ChainWeaponPhysics } from "../rules/chain_weapon_physics";
import { ChainConstraint } from "../rules/chain_constraint";
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
import { FireTrail } from "../rules/fire_trail";
import { FireDamage } from "../rules/fire_damage";
import { FallingObjects } from "../rules/falling_objects";
import { ClearTeleportFlag } from "../rules/clear_teleport_flag";
// import { FreezeAnimation } from "../rules/freeze_animation"; // DISABLED: Performance issue - checking entire field every tick

export class RulesetFactory {
  static createDefaultRulebook(): Rule[] {
    // Core simulation rules - movement, cleanup
    const coreRules = [
      new UnitBehavior(), 
      new UnitMovement(), 
      new ClearTeleportFlag(), // TODO: MOVE TO RENDERER - Only exists for interpolation
      new Cleanup()
    ];

    // Combat and tactics rules
    const combatRules = [
      new MeleeCombat(),
      new Knockback(),
      new RangedCombat(),
      new Abilities(),
      new StatusEffects(),
      new Perdurance(),
      new ChargeAccumulator(),
      new PairwiseBatcherRule(),
    ];

    // Tactical mechanics that affect combat
    const tacticalRules = [
      new HugeUnits(),
      new SegmentedCreatures(),
      new GrapplingPhysics(),
      new AirdropPhysics(),
      new ChainWeaponPhysics(),
      new ChainConstraint(),
      new AreaOfEffect(),
      new ProjectileMotion(),
      new Jumping(),
      new Tossing(),
      new FallingObjects(), // For rock drop and other falling objects
      new BiomeEffects(),
    ];

    // Environmental and ambient rules
    const environmentalRules = [
      new AmbientSpawning(),
      new AmbientBehavior(),
      new LightningStorm(),
      new FireDamage(), // Fire damage from hot tiles
    ];

    // Player control and gameplay effects
    const controlRules = [
      new PlayerControl(),
      new HeroAnimation(), // TODO: REFACTOR - Should be in renderer, but tests depend on it
      new FireTrail(), // Fire trail creates actual fire tiles (gameplay, not just visual)
      // new FreezeAnimation(), // DISABLED: Performance issue
    ];

    return [
      ...coreRules,
      ...combatRules,
      ...tacticalRules,
      ...environmentalRules,
      ...controlRules,
    ];
  }

  // Minimal rulebook for testing or special scenarios
  static createMinimalRulebook(): Rule[] {
    return [new UnitBehavior(), new UnitMovement(), new Cleanup()];
  }
}
