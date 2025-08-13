import { Rule } from "./rule";
import { Unit } from "../types/Unit";

// This rule interprets posture/tags and sets intendedMove for each unit
export class UnitBehavior extends Rule {
  apply = () => {
    // Always use bulk AI command for consistent behavior
    this.sim.queuedCommands.push({
      type: 'ai',
      params: {}
    });
    return;
    
    // REMOVED: Traditional per-unit processing - keeping code below for reference but unreachable
    (this.sim.units as Unit[]).forEach(unit => {
      if (unit.state === 'dead' || unit.hp == 0) return;
      
      // Don't change behavior for jumping units - they're in the air!
      if (unit.meta.jumping) return;

      // Use cached target data for O(1) lookups instead of O(N) searches
      const targetData = this.sim.targetCache?.getTargetData(unit.id);
      
      const find_new_target = () => {
        // Use cached closest enemy
        return targetData?.closestEnemy;
      }

      const find_new_protectee = () => {
        // Use cached closest ally
        return targetData?.closestAlly;
      }

      // Find target if we don't have one (stored in meta)
      let targetId = unit.meta.intendedTarget;
      if (!targetId) {
        targetId = find_new_target();
        // Only set target if we found one and it's different
        if (targetId) {
          this.sim.queuedCommands.push({
            type: 'target',
            params: { unitId: unit.id, targetId }
          });
        }
      }
      
      if (!targetId) {
        // No enemies - wait
        if (unit.meta.posture !== 'wait') {
          this.sim.queuedCommands.push({
            type: 'pose',
            params: { unitId: unit.id, posture: 'wait' }
          });
        }
        return;
      }
      let target = this.sim.creatureById(targetId);
      
      if (target && target.state === 'dead') {
        // Clear dead target
        this.sim.queuedCommands.push({
          type: 'target',
          params: { unitId: unit.id, targetId: undefined }
        });
        target = undefined;
      }

      // Handle guard posture protectee selection
      const posture = unit.meta.posture || unit.posture || 'wait';
      if (posture === 'guard') {
        const currentProtectee = unit.meta.intendedProtectee;
        const newProtectee = find_new_protectee();
        
        // Only update if protectee changed
        if (newProtectee && newProtectee !== currentProtectee) {
          this.sim.queuedCommands.push({
            type: 'guard',
            params: { unitId: unit.id, protecteeId: newProtectee }
          });
        }
      }

      // Calculate intended move based on posture
      let intendedMove = { x: 0, y: 0 };
      
      switch (posture) {
        case 'wait': 
          intendedMove = { x: 0, y: 0 };
          if (unit.meta.intendedTarget) {
            this.sim.queuedCommands.push({
              type: 'target',
              params: { unitId: unit.id, targetId: undefined }
            });
          }
          break;

        case 'guard':
          if (unit.meta.intendedProtectee) {
            const protectee = this.sim.creatureById(unit.meta.intendedProtectee);
            if (protectee && protectee.state !== 'dead') {
              // Move towards protectee
              intendedMove = {
                x: protectee.pos.x > unit.pos.x ? 1 : -1,
                y: protectee.pos.y > unit.pos.y ? 1 : -1
              };
            } else {
              // No valid protectee, just wait
              intendedMove = { x: 0, y: 0 };
            }
          } else {
            // No protectee, just wait
            intendedMove = { x: 0, y: 0 };
          }
          break;

        case 'bully': // try to occupy _same space_ as target
          if (target) {
            intendedMove = {
              x: target.pos.x === unit.pos.x ? 0 : (target.pos.x > unit.pos.x ? 1 : -1),
              y: target.pos.y === unit.pos.y ? 0 : (target.pos.y > unit.pos.y ? 1 : -1)
            };
          }
          break;
          
        case 'pursue':
          if (target) {
            intendedMove = {
              x: target.pos.x > unit.pos.x ? 1 : -1,
              y: target.pos.y > unit.pos.y ? 1 : -1
            };
          }
          break;
      }
      
      // Queue move command if intended move is different
      if (intendedMove.x !== 0 || intendedMove.y !== 0) {
        this.sim.queuedCommands.push({
          type: 'move',
          params: {
            unitId: unit.id,
            dx: intendedMove.x,
            dy: intendedMove.y
          }
        });
      }
    });
  }
}
