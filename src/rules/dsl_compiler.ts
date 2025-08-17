import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

type CompiledExpression = (
  subject: Unit,
  context: TickContext,
  allUnits: readonly Unit[]
) => any;

/**
 * DSL Compiler - Compiles DSL expressions into optimized functions
 * Eliminates eval() overhead by creating reusable compiled functions
 */
export class DSLCompiler {
  private static cache = new Map<string, CompiledExpression>();
  
  static compile(expression: string): CompiledExpression | null {
    // Check cache first
    if (this.cache.has(expression)) {
      return this.cache.get(expression)!;
    }
    
    // Try to compile the expression
    const compiled = this.tryCompile(expression);
    if (compiled) {
      this.cache.set(expression, compiled);
      return compiled;
    }
    
    return null;
  }
  
  private static tryCompile(expression: string): CompiledExpression | null {
    // === Simple literals ===
    if (expression === "true") {
      return () => true;
    }
    if (expression === "false") {
      return () => false;
    }
    
    // === Self property checks ===
    if (expression === "self.hp < 10") {
      return (subject) => subject.hp < 10;
    }
    if (expression === "self.hp < 5") {
      return (subject) => subject.hp < 5;
    }
    if (expression === "self.hp == self.maxHp") {
      return (subject) => subject.hp === subject.maxHp;
    }
    
    // === Self HP percentage checks ===
    const hpPercentMatch = expression.match(/^self\.hp\s*<\s*self\.maxHp\s*\*\s*([\d.]+)$/);
    if (hpPercentMatch) {
      const factor = parseFloat(hpPercentMatch[1]);
      return (subject) => subject.hp < subject.maxHp * factor;
    }
    
    // === Ally/Enemy existence checks ===
    if (expression === "closest.ally() != null") {
      return (subject, context, allUnits) => {
        for (const u of allUnits) {
          if (u.team === subject.team && u.id !== subject.id && u.state !== "dead") {
            return true;
          }
        }
        return false;
      };
    }
    
    if (expression === "closest.enemy() != null") {
      return (subject, context, allUnits) => {
        for (const u of allUnits) {
          if (u.team !== subject.team && u.state !== "dead") {
            return true;
          }
        }
        return false;
      };
    }
    
    // === Distance checks - compile to optimized functions ===
    const distanceMatch = expression.match(/^distance\(closest\.enemy\(\)\?\.pos\)\s*(<=|>|<|>=|==)\s*(\d+)$/);
    if (distanceMatch) {
      const [, op, distStr] = distanceMatch;
      const maxDist = parseInt(distStr);
      const maxDistSq = maxDist * maxDist;
      
      switch (op) {
        case "<=":
          return (subject, context, allUnits) => {
            for (const u of allUnits) {
              if (u.team !== subject.team && u.state !== "dead") {
                const dx = u.pos.x - subject.pos.x;
                const dy = u.pos.y - subject.pos.y;
                if (dx * dx + dy * dy <= maxDistSq) {
                  return true;
                }
              }
            }
            return false;
          };
          
        case "<":
          return (subject, context, allUnits) => {
            for (const u of allUnits) {
              if (u.team !== subject.team && u.state !== "dead") {
                const dx = u.pos.x - subject.pos.x;
                const dy = u.pos.y - subject.pos.y;
                if (dx * dx + dy * dy < maxDistSq) {
                  return true;
                }
              }
            }
            return false;
          };
          
        case ">":
          return (subject, context, allUnits) => {
            for (const u of allUnits) {
              if (u.team !== subject.team && u.state !== "dead") {
                const dx = u.pos.x - subject.pos.x;
                const dy = u.pos.y - subject.pos.y;
                if (dx * dx + dy * dy <= maxDistSq) {
                  return false; // Found enemy within range
                }
              }
            }
            return true; // No enemies within range
          };
          
        case ">=":
          return (subject, context, allUnits) => {
            for (const u of allUnits) {
              if (u.team !== subject.team && u.state !== "dead") {
                const dx = u.pos.x - subject.pos.x;
                const dy = u.pos.y - subject.pos.y;
                if (dx * dx + dy * dy < maxDistSq) {
                  return false; // Found enemy within range
                }
              }
            }
            return true; // No enemies within range
          };
      }
    }
    
    // === Compound expressions with && ===
    if (expression.includes(" && ")) {
      const parts = expression.split(" && ");
      if (parts.length === 2) {
        const leftCompiled = this.tryCompile(parts[0].trim());
        const rightCompiled = this.tryCompile(parts[1].trim());
        
        if (leftCompiled && rightCompiled) {
          return (subject, context, allUnits) => {
            const leftResult = leftCompiled(subject, context, allUnits);
            if (!leftResult) return false; // Short circuit
            return rightCompiled(subject, context, allUnits);
          };
        }
      }
    }
    
    // === Compound expressions with || ===
    if (expression.includes(" || ")) {
      const parts = expression.split(" || ");
      if (parts.length === 2) {
        const leftCompiled = this.tryCompile(parts[0].trim());
        const rightCompiled = this.tryCompile(parts[1].trim());
        
        if (leftCompiled && rightCompiled) {
          return (subject, context, allUnits) => {
            const leftResult = leftCompiled(subject, context, allUnits);
            if (leftResult) return true; // Short circuit
            return rightCompiled(subject, context, allUnits);
          };
        }
      }
    }
    
    // === Special cases ===
    if (expression === "distance(closest.enemy()?.pos) <= 12 || true") {
      return () => true; // Always true
    }
    
    // === Range checks (e.g., "distance(closest.enemy()?.pos) <= 10 && distance(closest.enemy()?.pos) > 2") ===
    const rangeMatch = expression.match(/^distance\(closest\.enemy\(\)\?\.pos\)\s*<=\s*(\d+)\s*&&\s*distance\(closest\.enemy\(\)\?\.pos\)\s*>\s*(\d+)$/);
    if (rangeMatch) {
      const [, maxStr, minStr] = rangeMatch;
      const maxDistSq = parseInt(maxStr) ** 2;
      const minDistSq = parseInt(minStr) ** 2;
      
      return (subject, context, allUnits) => {
        for (const u of allUnits) {
          if (u.team !== subject.team && u.state !== "dead") {
            const dx = u.pos.x - subject.pos.x;
            const dy = u.pos.y - subject.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= maxDistSq && distSq > minDistSq) {
              return true;
            }
          }
        }
        return false;
      };
    }
    
    // === Enemy count check ===
    if (expression === "enemies().length > 0") {
      return (subject, context, allUnits) => {
        for (const u of allUnits) {
          if (u.team !== subject.team && u.state !== "dead") {
            return true;
          }
        }
        return false;
      };
    }
    
    // Couldn't compile
    return null;
  }
  
  static clearCache(): void {
    this.cache.clear();
  }
}