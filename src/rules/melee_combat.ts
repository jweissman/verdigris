import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";
import type { QueuedCommand } from "../core/command_handler";

export class MeleeCombat extends Rule {
  private engagements: Map<string, string> = new Map();
  private lastAttacks: Map<string, number> = new Map();

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();

    const arrays = context.getArrays();
    for (const i of arrays.activeIndices) {
      if (arrays.state[i] === 2) {
        const unitId = arrays.unitIds[i];
        const coldData = context.getUnitColdData(unitId);
        if (coldData?.meta?.lastAttacked) {
          const ticksSinceAttack = currentTick - coldData.meta.lastAttacked;
          if (ticksSinceAttack > 2) {
            commands.push({
              type: "meta",
              params: {
                unitId: unitId,
                state: "idle",
              },
            });
          }
        }
      }
    }

    this.engagements.clear();
    this.performMeleeCombat(context, commands);

    return commands;
  }

  private performMeleeCombat(
    context: TickContext,
    commands: QueuedCommand[],
  ): void {
    const meleeRange = 1.5;
    const meleeRangeSq = meleeRange * meleeRange;
    const heroRange = 3.5; // Much wider range for hero
    const heroRangeSq = heroRange * heroRange;

    const arrays = (context as any).sim?.unitArrays;
    const coldData = (context as any).sim?.unitColdData;

    if (arrays && coldData) {
      const activeIndices = arrays.activeIndices;
      const count = activeIndices.length;

      for (let i = 0; i < count; i++) {
        const idxA = activeIndices[i];

        if (arrays.state[idxA] === 3 || arrays.hp[idxA] <= 0) continue;
        const attackerId = arrays.unitIds[idxA];
        if (this.engagements.has(attackerId)) continue;

        const coldA = coldData.get(attackerId);
        if (coldA?.meta?.jumping || coldA?.tags?.includes("noncombatant"))
          continue;

        const x1 = arrays.posX[idxA];
        const y1 = arrays.posY[idxA];
        const team1 = arrays.team[idxA];
        const isHero = coldA?.tags?.includes("hero");

        // Hero special attack - wide visor AOE (only if not controlled)
        if (isHero && !coldA?.meta?.controlled) {
          const facing = coldA?.meta?.facing || "right";
          const currentTick = context.getCurrentTick();
          const attackerLastAttack = this.lastAttacks.get(attackerId) || -100;
          const attackCooldown = 5; // Faster attacks for hero
          
          // Check cooldown once for the hero
          if (currentTick - attackerLastAttack >= attackCooldown) {
            this.lastAttacks.set(attackerId, currentTick);
            
            // Find all enemies in hero's range and attack them ALL
            for (let j = 0; j < count; j++) {
              const idxB = activeIndices[j];
              if (idxB === idxA) continue;
              if (arrays.state[idxB] === 3 || arrays.hp[idxB] <= 0) continue;
              if (team1 === arrays.team[idxB]) continue;

              const targetId = arrays.unitIds[idxB];
              const dx = arrays.posX[idxB] - x1;
              const dy = arrays.posY[idxB] - y1;
              const distSq = dx * dx + dy * dy;

              if (distSq > heroRangeSq) continue;

              // Check if target is in the visor cone based on facing
              // Make the cone VERY wide - basically a half-circle
              let inCone = false;
              if (facing === "right" && dx >= -1) inCone = true; // Everything not directly behind
              else if (facing === "left" && dx <= 1) inCone = true;
              else if (facing === "up" && dy <= 1) inCone = true;
              else if (facing === "down" && dy >= -1) inCone = true;

              if (!inCone) continue;

              const coldB = coldData.get(targetId);
              if (coldB?.meta?.jumping || coldB?.tags?.includes("noncombatant"))
                continue;

              // Heavy damage with knockback - attack THIS enemy
              commands.push({
                type: "strike",
                unitId: attackerId,
                params: {
                  targetId: targetId,
                  damage: arrays.dmg[idxA] * 2, // Double damage for hero
                  knockback: 3, // Strong knockback
                  aspect: "heroic"
                },
              });
            }
            
            // Visual feedback - attack state
            commands.push({
              type: "meta",
              params: {
                unitId: attackerId,
                state: "attacking",
                meta: {
                  lastAttacked: currentTick,
                  attacking: true,
                },
              },
            });
          }
          continue; // Skip normal melee for hero
        }

        // Normal melee combat for non-heroes
        for (let j = i + 1; j < count; j++) {
          const idxB = activeIndices[j];

          if (arrays.state[idxB] === 3 || arrays.hp[idxB] <= 0) continue;
          if (team1 === arrays.team[idxB]) continue;

          const targetId = arrays.unitIds[idxB];
          if (this.engagements.has(targetId)) continue;

          const dx = arrays.posX[idxB] - x1;
          const dy = arrays.posY[idxB] - y1;
          const distSq = dx * dx + dy * dy;

          if (distSq > meleeRangeSq) continue;

          const coldB = coldData.get(targetId);
          if (coldB?.meta?.jumping || coldB?.tags?.includes("noncombatant"))
            continue;

          this.engagements.set(attackerId, targetId);
          this.engagements.set(targetId, attackerId);

          // Add attack cooldown to prevent simultaneous deaths
          const currentTick = context.getCurrentTick();
          const attackerLastAttack = this.lastAttacks.get(attackerId) || -100;
          const targetLastAttack = this.lastAttacks.get(targetId) || -100;
          const attackCooldown = 5; // Reduced cooldown for faster combat
          
          const attackerCanAttack = currentTick - attackerLastAttack >= attackCooldown;
          const targetCanAttack = currentTick - targetLastAttack >= attackCooldown;

          if (attackerCanAttack) {
            this.registerHit(
              attackerId,
              targetId,
              arrays.dmg[idxA] || 1,
              context,
              commands,
            );
          }

          if (targetCanAttack && attackerCanAttack) {
            // Only counter-attack if both can attack - use unit index for deterministic asymmetry
            // Lower index attacks first (since they were deployed first)
            if (idxA < idxB) {
              // Attacker has priority, target doesn't counter this tick
            } else {
              // Target has priority, they counter-attack
              this.registerHit(
                targetId,
                attackerId,
                arrays.dmg[idxB] || 1,
                context,
                commands,
              );
            }
          } else if (targetCanAttack && !attackerCanAttack) {
            this.registerHit(
              targetId,
              attackerId,
              arrays.dmg[idxB] || 1,
              context,
              commands,
            );
          }

          break; // Each unit only engages one target
        }
      }
    } else {
      const allUnits = context.getAllUnits();
      for (const attacker of allUnits) {
        if (this.engagements.has(attacker.id)) continue;

        if (attacker.hp <= 0) continue;
        if (attacker.meta?.jumping) continue;
        if (attacker.tags?.includes("noncombatant")) continue;

        const nearbyUnits = context.findUnitsInRadius(attacker.pos, meleeRange);

        for (const target of nearbyUnits) {
          if (target.id === attacker.id) continue;

          if (target.hp <= 0) continue;
          if (target.meta?.jumping) continue;
          if (target.tags?.includes("noncombatant")) continue;

          if (attacker.team === target.team) continue;

          this.processHit(context, attacker, target, commands);
          break;
        }
      }
    }
  }

  private registerHit(
    attackerId: string,
    targetId: string,
    damage: number,
    context: TickContext,
    commands: QueuedCommand[],
  ): void {
    this.lastAttacks.set(attackerId, context.getCurrentTick());

    commands.push({
      type: "halt",
      params: { unitId: attackerId },
    });

    commands.push({
      type: "meta",
      params: {
        unitId: attackerId,
        meta: { lastAttacked: context.getCurrentTick() },
        state: "attack",
      },
    });

    commands.push({
      type: "damage",
      params: {
        targetId: targetId,
        amount: damage,
        aspect: "physical",
        sourceId: attackerId,
      },
    });
  }

  private processHit(
    context: TickContext,
    attacker: Unit,
    target: Unit,
    commands: QueuedCommand[],
  ): void {
    if (attacker.hp <= 0 || target.hp <= 0) return;
    this.registerHit(
      attacker.id,
      target.id,
      attacker.dmg || 1,
      context,
      commands,
    );
  }
}
