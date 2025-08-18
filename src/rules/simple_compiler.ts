import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

/**
 * Simple compiler that turns DSL expressions into real functions
 * NO EVAL, NO new Function() - just real JavaScript functions
 */
export function compileExpression(expr: string): (unit: Unit, context: TickContext) => any {
  // Simple literals
  if (expr === "true") return () => true;
  if (expr === "false") return () => false;
  
  // Self HP comparisons
  if (expr === "self.hp < 10") return (unit) => unit.hp < 10;
  if (expr === "self.hp < 5") return (unit) => unit.hp < 5;
  if (expr === "self.hp == self.maxHp") return (unit) => unit.hp === unit.maxHp;
  
  // HP percentage checks
  if (expr === "self.hp < self.maxHp * 0.5") return (unit) => unit.hp < unit.maxHp * 0.5;
  if (expr === "self.hp < self.maxHp * 0.3") return (unit) => unit.hp < unit.maxHp * 0.3;
  if (expr === "self.hp < self.maxHp * 0.7") return (unit) => unit.hp < unit.maxHp * 0.7;
  
  // Target expressions
  if (expr === "self") return (unit) => unit;
  if (expr === "self.pos") return (unit) => unit.pos;
  if (expr === "target") return (unit) => unit;
  
  // Closest enemy/ally existence
  if (expr === "closest.enemy() != null") {
    return (unit, context) => {
      const units = context.getAllUnits();
      for (const u of units) {
        if (u.team !== unit.team && u.state !== "dead") return true;
      }
      return false;
    };
  }
  
  if (expr === "closest.ally() != null") {
    return (unit, context) => {
      const units = context.getAllUnits();
      for (const u of units) {
        if (u.team === unit.team && u.id !== unit.id && u.state !== "dead") return true;
      }
      return false;
    };
  }
  
  // Find closest enemy
  if (expr === "closest.enemy()") {
    return (unit, context) => {
      const units = context.getAllUnits();
      let closest = null;
      let minDist = Infinity;
      for (const u of units) {
        if (u.team !== unit.team && u.state !== "dead") {
          const dx = u.pos.x - unit.pos.x;
          const dy = u.pos.y - unit.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            closest = u;
          }
        }
      }
      return closest;
    };
  }
  
  // Find closest ally
  if (expr === "closest.ally()") {
    return (unit, context) => {
      const units = context.getAllUnits();
      let closest = null;
      let minDist = Infinity;
      for (const u of units) {
        if (u.team === unit.team && u.id !== unit.id && u.state !== "dead") {
          const dx = u.pos.x - unit.pos.x;
          const dy = u.pos.y - unit.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            closest = u;
          }
        }
      }
      return closest;
    };
  }
  
  // Distance checks
  if (expr === "distance(closest.enemy()?.pos) <= 10") {
    return (unit, context) => {
      const units = context.getAllUnits();
      for (const u of units) {
        if (u.team !== unit.team && u.state !== "dead") {
          const dx = u.pos.x - unit.pos.x;
          const dy = u.pos.y - unit.pos.y;
          if (dx * dx + dy * dy <= 100) return true;
        }
      }
      return false;
    };
  }
  
  // Add more patterns as needed...
  
  // Fallback - use DSL.evaluate at runtime
  return (unit, context) => {
    const DSL = require('./dsl').default;
    return DSL.evaluate(expr, unit, context);
  };
}