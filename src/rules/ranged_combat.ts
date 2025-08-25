import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

/**
 * Specialized, optimized rule for ranged combat.
 * Handles only the 'ranged' ability with direct array access.
 */
export class RangedCombat extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();

    const arrays = context.getArrays();
    if (!arrays) {
      return this.executeWithProxies(context);
    }

    const { posX, posY, team, state, hp, unitIds, activeIndices } = arrays;

    for (const idx of activeIndices) {
      if (state[idx] === 5 || hp[idx] <= 0) continue;

      const unitId = unitIds[idx];
      const coldData = context.getUnitColdData(unitId);
      if (!coldData) continue;

      const abilities = coldData.abilities;
      if (
        !abilities ||
        !Array.isArray(abilities) ||
        !abilities.includes("ranged")
      )
        continue;

      const lastTick = coldData.lastAbilityTick?.ranged;
      if (lastTick !== undefined && currentTick - lastTick < 6) continue;

      const unitTeam = team[idx];
      const unitX = posX[idx];
      const unitY = posY[idx];

      let closestEnemyIdx = -1;
      let minDistSq = 36; // 6² - original max range

      for (const enemyIdx of activeIndices) {
        if (enemyIdx === idx) continue;
        if (state[enemyIdx] === 5 || hp[enemyIdx] <= 0) continue;
        if (team[enemyIdx] === unitTeam) continue; // Same team

        const absDx = Math.abs(posX[enemyIdx] - unitX);
        const absDy = Math.abs(posY[enemyIdx] - unitY);
        if (absDx > 6 || absDy > 6) continue; // Early reject based on Manhattan distance

        const dx = posX[enemyIdx] - unitX;
        const dy = posY[enemyIdx] - unitY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= 4 || distSq > 36) continue; // 2² to 6² range

        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestEnemyIdx = enemyIdx;

          if (distSq <= 9) break; // 3² - stop searching if enemy is very close
        }
      }

      if (closestEnemyIdx === -1) continue;

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

      commands.push({
        type: "meta",
        params: {
          unitId: unitIds[idx],
          meta: {
            lastAbilityTick: {
              ...(coldData.lastAbilityTick || {}),
              ranged: currentTick,
            },
          },
        },
      });
    }

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
