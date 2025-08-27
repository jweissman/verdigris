import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";
import type { Unit } from "../types/Unit";

/**
 * Specialized, optimized rule for ranged combat.
 * Handles only the 'ranged' ability with direct array access.
 */
export class RangedCombat extends Rule {
  private lastFireTick: Float32Array | null = null;
  private commands: QueuedCommand[] = [];
  
  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const currentTick = context.getCurrentTick();
    
    // Try to use pairwise batcher if available
    const batcher = context.getPairwiseBatcher();
    if (batcher) {
      // Register ranged combat intent
      batcher.register(
        "RangedCombat",
        (unitA: Unit, unitB: Unit) => {
          return this.processRangedPair(unitA, unitB, context);
        },
        6, // Max range for ranged attacks
        (a: Unit, b: Unit) => {
          // Filter: different teams, alive, attacker has ranged ability
          if (a.team === b.team) return false;
          if (a.hp <= 0 || b.hp <= 0) return false;
          if (!a.abilities?.includes("ranged")) return false;
          // Check cooldown
          const lastTick = a.lastAbilityTick?.ranged;
          if (lastTick !== undefined && currentTick - lastTick < 6) return false;
          // Check min range
          const dx = b.pos.x - a.pos.x;
          const dy = b.pos.y - a.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq <= 4) return false; // Too close
          return true;
        }
      );
      return this.commands;
    }

    // Fallback to direct implementation
    const arrays = context.getArrays();
    if (!arrays) {
      return this.executeWithProxies(context);
    }

    const { posX, posY, team, state, hp, unitIds, activeIndices } = arrays;
    const activeCount = activeIndices.length;
    
    // Initialize firing cooldown array if needed
    if (!this.lastFireTick || this.lastFireTick.length < unitIds.length) {
      this.lastFireTick = new Float32Array(unitIds.length);
    }

    // Pre-filter units that can fire
    const firingUnits: number[] = [];
    for (const idx of activeIndices) {
      if (state[idx] === 5 || hp[idx] <= 0) continue;
      
      // Check cooldown early
      if (currentTick - this.lastFireTick[idx] < 6) continue;
      
      const coldData = context.getUnitColdData(unitIds[idx]);
      if (!coldData?.abilities?.includes("ranged")) continue;
      
      firingUnits.push(idx);
    }
    
    if (firingUnits.length === 0) return commands;

    // Build target cache once
    const validTargets: number[] = [];
    for (const idx of activeIndices) {
      if (state[idx] !== 5 && hp[idx] > 0) {
        validTargets.push(idx);
      }
    }

    // Process each firing unit
    for (const idx of firingUnits) {
      const unitTeam = team[idx];
      const unitX = posX[idx];
      const unitY = posY[idx];

      let closestEnemyIdx = -1;
      let minDistSq = 36; // 6² - max range

      // Find closest enemy
      for (const enemyIdx of validTargets) {
        if (enemyIdx === idx) continue;
        if (team[enemyIdx] === unitTeam) continue;

        // Manhattan distance early reject
        const absDx = Math.abs(posX[enemyIdx] - unitX);
        if (absDx > 6) continue;
        const absDy = Math.abs(posY[enemyIdx] - unitY); 
        if (absDy > 6) continue;

        const dx = posX[enemyIdx] - unitX;
        const dy = posY[enemyIdx] - unitY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= 4 || distSq > 36) continue; // 2² to 6² range

        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestEnemyIdx = enemyIdx;
          if (distSq <= 9) break; // 3² - found close enemy
        }
      }

      if (closestEnemyIdx === -1) continue;
      
      // Update cooldown
      this.lastFireTick[idx] = currentTick;

      const enemyX = posX[closestEnemyIdx];
      const enemyY = posY[closestEnemyIdx];
      const dx = enemyX - unitX;
      const dy = enemyY - unitY;
      const norm = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / norm) * 2; // Speed = 2
      const vy = (dy / norm) * 2;

      commands.push({
        type: "projectile",
        params: {
          x: unitX,
          y: unitY,
          vx: vx,
          vy: vy,
          projectileType: "bullet",
          damage: 4,
          radius: 1.5,

          team:
            unitTeam === 1
              ? "friendly"
              : unitTeam === 2
                ? "hostile"
                : "neutral",
        },
        unitId: unitIds[idx],
      });

      const coldData = context.getUnitColdData(unitIds[idx]);
      commands.push({
        type: "meta",
        params: {
          unitId: unitIds[idx],
          meta: {
            lastAbilityTick: {
              ...(coldData?.lastAbilityTick || {}),
              ranged: currentTick,
            },
          },
        },
      });
    }

    return commands;
  }

  private processRangedPair(unitA: Unit, unitB: Unit, context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    
    // unitA is the attacker with ranged ability, unitB is the target
    const dx = unitB.pos.x - unitA.pos.x;
    const dy = unitB.pos.y - unitA.pos.y;
    const norm = Math.sqrt(dx * dx + dy * dy);
    
    commands.push({
      type: "projectile",
      params: {
        x: unitA.pos.x,
        y: unitA.pos.y,
        vx: (dx / norm) * 2,
        vy: (dy / norm) * 2,
        projectileType: "bullet",
        damage: 4,
        radius: 1.5,
        team: unitA.team,
      },
      unitId: unitA.id,
    });

    const currentTick = context.getCurrentTick();
    commands.push({
      type: "meta",
      params: {
        unitId: unitA.id,
        meta: {
          lastAbilityTick: {
            ...(unitA.lastAbilityTick || {}),
            ranged: currentTick,
          },
        },
      },
    });
    
    return commands;
  }

  private executeWithProxies(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();
    const allUnits = context.getAllUnits();

    for (const unit of allUnits) {
      if (unit.state === "dead" || unit.hp <= 0) continue;
      if (!unit.abilities?.includes("ranged")) continue;

      const lastTick = unit.lastAbilityTick?.ranged;
      if (lastTick !== undefined && currentTick - lastTick < 6) continue;

      let closestEnemy = null;
      let minDist = Infinity;

      for (const other of allUnits) {
        if (other.state === "dead" || other.hp <= 0) continue;
        if (other.team === unit.team) continue;

        const absDx = Math.abs(other.pos.x - unit.pos.x);
        const absDy = Math.abs(other.pos.y - unit.pos.y);
        if (absDx > 6 || absDy > 6) continue; // Early reject

        const dx = other.pos.x - unit.pos.x;
        const dy = other.pos.y - unit.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          closestEnemy = other;

          if (dist <= 3) break;
        }
      }

      if (!closestEnemy || minDist <= 2 || minDist > 6) continue; // Allow up to distance 6

      const dx = closestEnemy.pos.x - unit.pos.x;
      const dy = closestEnemy.pos.y - unit.pos.y;
      const norm = Math.sqrt(dx * dx + dy * dy);

      commands.push({
        type: "projectile",
        params: {
          x: unit.pos.x,
          y: unit.pos.y,
          vx: (dx / norm) * 2,
          vy: (dy / norm) * 2,
          projectileType: "bullet",
          damage: 4,
          radius: 1.5,
          team: unit.team,
        },
        unitId: unit.id,
      });

      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            lastAbilityTick: {
              ...(unit.lastAbilityTick || {}),
              ranged: currentTick,
            },
          },
        },
      });
    }

    return commands;
  }
}
