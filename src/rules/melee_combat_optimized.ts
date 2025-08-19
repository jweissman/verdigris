import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";
import type { QueuedCommand } from "./command_handler";

export class MeleeCombatOptimized extends Rule {
  private engagements: Map<string, string> = new Map();
  private lastAttacks: Map<string, number> = new Map();
  private meleeRange = 1.5;
  private meleeRangeSq = this.meleeRange * this.meleeRange;

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();
    
    // Clean up attack states
    const arrays = context.getArrays();
    for (const i of arrays.activeIndices) {
      if (arrays.state[i] === 2) { // attack state
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
    
    // Use optimized pairwise checking
    this.performMeleeCombatOptimized(context, commands);
    
    return commands;
  }

  private performMeleeCombatOptimized(
    context: TickContext,
    commands: QueuedCommand[],
  ): void {
    const arrays = (context as any).sim?.unitArrays;
    const coldData = (context as any).sim?.unitColdData;
    
    if (!arrays || !coldData) {
      // Fallback to proxy-based approach
      this.performMeleeCombatFallback(context, commands);
      return;
    }
    
    const activeIndices = arrays.activeIndices;
    const count = activeIndices.length;
    
    // Process each pair only once
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
      
      // Check against subsequent units (avoid duplicate pairs)
      for (let j = i + 1; j < count; j++) {
        const idxB = activeIndices[j];
        
        // Skip dead, same team, or already engaged
        if (arrays.state[idxB] === 3 || arrays.hp[idxB] <= 0) continue;
        if (team1 === arrays.team[idxB]) continue;
        
        const targetId = arrays.unitIds[idxB];
        if (this.engagements.has(targetId)) continue;
        
        // Quick distance check
        const dx = arrays.posX[idxB] - x1;
        const dy = arrays.posY[idxB] - y1;
        const distSq = dx * dx + dy * dy;
        
        if (distSq > this.meleeRangeSq) continue;
        
        // Skip noncombatants and jumping units
        const coldB = coldData.get(targetId);
        if (coldB?.meta?.jumping || coldB?.tags?.includes("noncombatant")) continue;
        
        // Both units can attack each other
        this.registerAttack(attackerId, targetId, idxA, arrays, context, commands);
        this.registerAttack(targetId, attackerId, idxB, arrays, context, commands);
        
        // Mark both as engaged
        this.engagements.set(attackerId, targetId);
        this.engagements.set(targetId, attackerId);
        
        break; // Each unit only engages one target
      }
    }
  }
  
  private registerAttack(
    attackerId: string,
    targetId: string,
    attackerIdx: number,
    arrays: any,
    context: TickContext,
    commands: QueuedCommand[]
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
        amount: arrays.dmg[attackerIdx] || 1,
        aspect: "physical",
        sourceId: attackerId,
      },
    });
  }

  private performMeleeCombatFallback(
    context: TickContext,
    commands: QueuedCommand[],
  ): void {
    const allUnits = context.getAllUnits();
    const unitCount = allUnits.length;
    
    // Process each pair only once
    for (let i = 0; i < unitCount; i++) {
      const attacker = allUnits[i];
      
      if (this.engagements.has(attacker.id)) continue;
      if (attacker.hp <= 0) continue;
      if (attacker.meta?.jumping) continue;
      if (attacker.tags?.includes("noncombatant")) continue;
      
      for (let j = i + 1; j < unitCount; j++) {
        const target = allUnits[j];
        
        if (target.hp <= 0) continue;
        if (this.engagements.has(target.id)) continue;
        if (target.meta?.jumping) continue;
        if (target.tags?.includes("noncombatant")) continue;
        if (attacker.team === target.team) continue;
        
        const dx = target.pos.x - attacker.pos.x;
        const dy = target.pos.y - attacker.pos.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq <= this.meleeRangeSq) {
          this.processHit(context, attacker, target, commands);
          this.processHit(context, target, attacker, commands);
          
          this.engagements.set(attacker.id, target.id);
          this.engagements.set(target.id, attacker.id);
          break;
        }
      }
    }
  }

  private processHit(
    context: TickContext,
    attacker: Unit,
    target: Unit,
    commands: QueuedCommand[],
  ): void {
    if (attacker.hp <= 0 || target.hp <= 0) return;

    this.lastAttacks.set(attacker.id, context.getCurrentTick());

    commands.push({
      type: "halt",
      params: { unitId: attacker.id },
    });

    commands.push({
      type: "meta",
      params: {
        unitId: attacker.id,
        meta: { lastAttacked: context.getCurrentTick() },
        state: "attack",
      },
    });

    commands.push({
      type: "damage",
      params: {
        targetId: target.id,
        amount: attacker.dmg || 1,
        aspect: "physical",
        sourceId: attacker.id,
      },
    });
  }
}