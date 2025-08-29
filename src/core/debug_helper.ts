import { Unit } from "../types/Unit";

/**
 * Debug utility methods extracted from Simulator
 */
export class DebugHelper {
  private attrEmoji: { [key: string]: string } = {
    hp: "❤️",
    mass: "⚖️",
    pos: "📍",
    intendedMove: "➡️",
    intendedTarget: "🎯",
    state: "🛡️",
  };

  objEq(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object") return false;
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const key of Object.keys(a)) {
      if (!b.hasOwnProperty(key) || a[key] !== b[key]) return false;
    }
    return true;
  }

  delta(before: Unit, after: Unit): Partial<Unit> {
    if (before.id !== after.id) {
      throw new Error(`Unit IDs do not match: ${before.id} !== ${after.id}`);
    }

    const changes: Partial<Unit> = {};
    for (const key of Object.keys(before)) {
      if (!this.objEq(before[key], after[key])) {
        changes[key] = after[key];
      }
    }
    return changes;
  }

  prettyPrint(val: any) {
    return (JSON.stringify(val, null, 2) || "")
      .replace(/\n/g, "")
      .replace(/ /g, "");
  }

  debugUnits(units: Unit[], unitsBefore: Unit[], phase: string) {
    let printedPhase = false;
    for (const u of units) {
      if (unitsBefore) {
        const before = unitsBefore.find((b) => b.id === u.id);
        if (before) {
          let delta = this.delta(before, u);
          if (Object.keys(delta).length === 0) {
            continue; // No changes, skip detailed logging
          }
          if (!printedPhase) {
            console.debug(`## ${phase}`);
            printedPhase = true;
          }
          let str = `  ${u.id}`;
          Object.keys(delta).forEach((key) => {
            let icon = this.attrEmoji[key] || "|";
            str += ` | ${icon} ${key}: ${this.prettyPrint(before[key])} → ${this.prettyPrint(u[key])}`;
          });
          console.debug(str);
        }
      } else {
        console.debug(`  ${u.id}: (${u.pos.x},${u.pos.y})`, JSON.stringify(u));
      }
    }
  }
}