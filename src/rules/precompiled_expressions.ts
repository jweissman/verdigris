import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

/**
 * Precompiled expressions - these are the actual fast-path implementations
 * from DSL.evaluate, but as direct functions without string checking
 */

export const compiledExpressions: Record<string, (unit: Unit, context: TickContext) => any> = {
  // Literals
  "true": () => true,
  "false": () => false,
  
  // HP checks  
  "self.hp < 10": (unit) => unit.hp < 10,
  "self.hp < 5": (unit) => unit.hp < 5,
  "self.hp == self.maxHp": (unit) => unit.hp === unit.maxHp,
  "self.hp < self.maxHp * 0.5": (unit) => unit.hp < unit.maxHp * 0.5,
  "self.hp < self.maxHp * 0.3": (unit) => unit.hp < unit.maxHp * 0.3,
  "self.hp < self.maxHp * 0.7": (unit) => unit.hp < unit.maxHp * 0.7,
  
  // Distance checks - THE MOST COMMON PATTERNS  
  // Work with arrays directly to avoid proxy overhead
  "distance(closest.enemy()?.pos) <= 1": (unit, context) => {
    const arrays = (context as any).getArrays();
    const unitIndex = (context as any).getUnitIndex(unit.id);
    const unitX = arrays.posX[unitIndex];
    const unitY = arrays.posY[unitIndex];
    const unitTeam = arrays.team[unitIndex];
    
    for (const idx of arrays.activeIndices) {
      if (arrays.team[idx] !== unitTeam && arrays.state[idx] !== 3) { // 3 = dead
        const dx = arrays.posX[idx] - unitX;
        const dy = arrays.posY[idx] - unitY;
        if (dx * dx + dy * dy <= 1) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 2": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 4) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 3": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 9) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 5": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 25) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 6": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 36) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 8": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 64) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 10": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 100) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 12": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 144) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 15": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 225) return true;
      }
    }
    return false;
  },
  
  "distance(closest.enemy()?.pos) <= 20": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 400) return true;
      }
    }
    return false;
  },
  
  // Greater than checks
  "distance(closest.enemy()?.pos) > 8": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 64) return false;
      }
    }
    return true;
  },
  
  "distance(closest.enemy()?.pos) > 10": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        if (dx * dx + dy * dy <= 100) return false;
      }
    }
    return true;
  },
  
  // Ally/enemy existence
  "closest.ally() != null": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team === unit.team && u.id !== unit.id && u.state !== "dead") {
        return true;
      }
    }
    return false;
  },
  
  "closest.enemy() != null": (unit, context) => {
    const allUnits = context.getAllUnits();
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        return true;
      }
    }
    return false;
  },
  
  // Target expressions
  "self": (unit) => unit,
  "self.pos": (unit) => unit.pos,
  "target": (unit) => unit,
  
  "closest.enemy()": (unit, context) => {
    const allUnits = context.getAllUnits();
    let closest = null;
    let minDistSq = Infinity;
    for (const u of allUnits) {
      if (u.team !== unit.team && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closest = u;
        }
      }
    }
    return closest;
  },
  
  "closest.ally()": (unit, context) => {
    const allUnits = context.getAllUnits();
    let closest = null;
    let minDistSq = Infinity;
    for (const u of allUnits) {
      if (u.team === unit.team && u.id !== unit.id && u.state !== "dead") {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closest = u;
        }
      }
    }
    return closest;
  },
  
  "closest.enemy()?.pos": (unit, context) => {
    const enemy = compiledExpressions["closest.enemy()"](unit, context);
    return enemy ? enemy.pos : null;
  },
  
  // Special cases
  "distance(closest.enemy()?.pos) <= 12 || true": () => true,
};

/**
 * Get a precompiled function or return null if not precompiled
 */
export function getCompiledExpression(expr: string): ((unit: Unit, context: TickContext) => any) | null {
  return compiledExpressions[expr] || null;
}