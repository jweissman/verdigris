import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

/**
 * Precompiled expressions for maximum performance
 * These handle the most common DSL expressions without any parsing overhead
 * Uses the existing spatial indexing for efficiency
 */

// Pattern: distance(closest.enemy()?.pos) <= N
export function createDistanceCheck(maxDistance: number) {
  const maxDistSq = maxDistance * maxDistance;
  
  return function(subject: Unit, context: TickContext): boolean {
    // Use spatial index to only check nearby units
    const nearbyUnits = context.findUnitsInRadius(subject.pos, maxDistance);
    const subTeam = subject.team;
    
    for (const u of nearbyUnits) {
      if (u.team !== subTeam && u.state !== "dead") {
        const dx = u.pos.x - subject.pos.x;
        const dy = u.pos.y - subject.pos.y;
        if (dx * dx + dy * dy <= maxDistSq) {
          return true;
        }
      }
    }
    return false;
  };
}

// Generic distance check for any range
export function distanceToClosestEnemyLte(rangeSq: number) {
  return function(subject: Unit, allUnits: readonly Unit[]): boolean {
    const subX = subject.pos.x;
    const subY = subject.pos.y;
    const subTeam = subject.team;
    
    for (let i = 0; i < allUnits.length; i++) {
      const u = allUnits[i];
      if (u.team !== subTeam && u.state !== "dead") {
        const dx = u.pos.x - subX;
        const dy = u.pos.y - subY;
        if (dx * dx + dy * dy <= rangeSq) {
          return true;
        }
      }
    }
    return false;
  };
}

// closest.enemy()
export function closestEnemy(subject: Unit, allUnits: readonly Unit[]): Unit | null {
  let closest: Unit | null = null;
  let minDistSq = Infinity;
  const subX = subject.pos.x;
  const subY = subject.pos.y;
  const subTeam = subject.team;
  
  for (let i = 0; i < allUnits.length; i++) {
    const u = allUnits[i];
    if (u.team !== subTeam && u.state !== "dead") {
      const dx = u.pos.x - subX;
      const dy = u.pos.y - subY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = u;
      }
    }
  }
  return closest;
}

// self.hp < self.maxHp * factor
export function selfHpLessThanFactor(factor: number) {
  return function(subject: Unit): boolean {
    return subject.hp < subject.maxHp * factor;
  };
}

// closest.ally() != null
export function hasAlly(subject: Unit, allUnits: readonly Unit[]): boolean {
  const subTeam = subject.team;
  const subId = subject.id;
  for (let i = 0; i < allUnits.length; i++) {
    const u = allUnits[i];
    if (u.team === subTeam && u.id !== subId && u.state !== "dead") {
      return true;
    }
  }
  return false;
}

/**
 * Create precompiled functions for common patterns
 * This is now pattern-based rather than hardcoded
 */
export function compileExpression(expression: string): ((subject: Unit, allUnits: readonly Unit[]) => any) | null {
  // Boolean literals
  if (expression === "true") return () => true;
  if (expression === "false") return () => false;
  
  // Distance checks: distance(closest.enemy()?.pos) <= N
  const distanceMatch = expression.match(/^distance\(closest\.enemy\(\)\?\.pos\)\s*<=\s*(\d+(?:\.\d+)?)$/);
  if (distanceMatch) {
    const range = parseFloat(distanceMatch[1]);
    const rangeSq = range * range;
    return distanceToClosestEnemyLte(rangeSq);
  }
  
  // Self HP factor checks: self.hp < self.maxHp * N
  const hpFactorMatch = expression.match(/^self\.hp\s*<\s*self\.maxHp\s*\*\s*([\d.]+)$/);
  if (hpFactorMatch) {
    const factor = parseFloat(hpFactorMatch[1]);
    return selfHpLessThanFactor(factor);
  }
  
  // Closest enemy
  if (expression === "closest.enemy()") {
    return closestEnemy;
  }
  
  // Has ally check
  if (expression === "closest.ally() != null") {
    return hasAlly;
  }
  
  return null;
}