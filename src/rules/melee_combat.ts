import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";
import type { QueuedCommand } from "./command_handler";

export class MeleeCombat extends Rule {
  private engagements: Map<string, string> = new Map();
  private lastAttacks: Map<string, number> = new Map();

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();

    // Work directly with arrays to avoid proxy creation
    const arrays = context.getArrays();
    for (const i of arrays.activeIndices) {
      if (arrays.state[i] === 2) {
        // attack state
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

    const arrays = (context as any).sim?.unitArrays;
    const coldData = (context as any).sim?.unitColdData;

    if (arrays && coldData) {
      const activeIndices = arrays.activeIndices;
      const count = activeIndices.length;
      
      // Process each pair only once (i,j where j > i)
      for (let i = 0; i < count; i++) {
        const idxA = activeIndices[i];
        
        // Skip dead or already engaged units
        if (arrays.state[idxA] === 3 || arrays.hp[idxA] <= 0) continue;
        const attackerId = arrays.unitIds[idxA];
        if (this.engagements.has(attackerId)) continue;
        
        // Skip noncombatants and jumping units
        const coldA = coldData.get(attackerId);
        if (coldA?.meta?.jumping || coldA?.tags?.includes("noncombatant")) continue;
        
        const x1 = arrays.posX[idxA];
        const y1 = arrays.posY[idxA];
        const team1 = arrays.team[idxA];
        
        // Check against subsequent units to avoid duplicate pairs
        for (let j = i + 1; j < count; j++) {
          const idxB = activeIndices[j];
          
          // Skip dead or same team
          if (arrays.state[idxB] === 3 || arrays.hp[idxB] <= 0) continue;
          if (team1 === arrays.team[idxB]) continue;
          
          const targetId = arrays.unitIds[idxB];
          if (this.engagements.has(targetId)) continue;
          
          // Quick distance check first
          const dx = arrays.posX[idxB] - x1;
          const dy = arrays.posY[idxB] - y1;
          const distSq = dx * dx + dy * dy;
          
          if (distSq > meleeRangeSq) continue;
          
          // Skip noncombatants and jumping units
          const coldB = coldData.get(targetId);
          if (coldB?.meta?.jumping || coldB?.tags?.includes("noncombatant")) continue;
          
          // Both units can attack each other
          this.engagements.set(attackerId, targetId);
          this.engagements.set(targetId, attackerId);
          
          // Attacker hits target
          this.registerHit(attackerId, targetId, arrays.dmg[idxA] || 1, context, commands);
          
          // Target hits attacker back
          this.registerHit(targetId, attackerId, arrays.dmg[idxB] || 1, context, commands);
          
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
    this.registerHit(attacker.id, target.id, attacker.dmg || 1, context, commands);
  }
}
