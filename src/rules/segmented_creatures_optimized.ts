import { Rule } from "./rule";
import type { QueuedCommand } from "../core/command_handler";
import type { TickContext } from "../core/tick_context";
import { Vec2 } from "../types/Vec2";

/**
 * Optimized SegmentedCreatures rule that uses arrays directly for hot path
 * Per architecture critique: "Abilities and SegmentedCreatures are the slowest rules"
 * This implementation bypasses proxy creation entirely
 */
export class SegmentedCreaturesOptimized extends Rule {
  private pathHistory: Map<string, Vec2[]> = new Map();
  
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    
    // CRITICAL: Use arrays directly - NO PROXY CREATION!
    const arrays = context.getArrays();
    if (!arrays) {
      return []; // No arrays available, skip
    }
    
    const { posX, posY, state, hp, unitIds, activeIndices } = arrays;
    
    // First pass: find segmented creatures without segments
    const segmentedHeadIds: string[] = [];
    const segmentsByParent = new Map<string, number[]>();
    
    for (const idx of activeIndices) {
      // Skip dead units
      if (state[idx] === 5 || hp[idx] <= 0) continue;
      
      const unitId = unitIds[idx];
      const coldData = context.getUnitColdData(unitId);
      if (!coldData || !coldData.meta) continue;
      
      // Track segments by parent
      if (coldData.meta.segment && coldData.meta.parentId) {
        if (!segmentsByParent.has(coldData.meta.parentId)) {
          segmentsByParent.set(coldData.meta.parentId, []);
        }
        segmentsByParent.get(coldData.meta.parentId)!.push(idx);
      }
      
      // Find heads that need segments
      if (coldData.meta.segmented && !segmentsByParent.has(unitId)) {
        segmentedHeadIds.push(unitId);
      }
    }
    
    // Create segments for heads without them
    for (const headId of segmentedHeadIds) {
      const headIdx = this.findUnitIndex(headId, unitIds, activeIndices);
      if (headIdx === -1) continue;
      
      const coldData = context.getUnitColdData(headId);
      if (!coldData) continue;
      
      this.createSegmentsForHead(
        context,
        headIdx,
        headId,
        coldData,
        arrays,
        commands
      );
    }
    
    // Update segment positions
    this.updateSegmentPositions(
      context,
      segmentsByParent,
      arrays,
      commands
    );
    
    // Handle segment damage propagation
    this.handleSegmentDamage(
      context,
      segmentsByParent,
      arrays,
      commands
    );
    
    // Handle grappling for segments
    this.handleSegmentGrappling(
      context,
      segmentsByParent,
      arrays,
      commands
    );
    
    // Cleanup orphaned segments
    this.cleanupOrphanedSegments(
      context,
      segmentsByParent,
      arrays,
      commands
    );
    
    return commands;
  }
  
  private findUnitIndex(
    unitId: string,
    unitIds: string[],
    activeIndices: number[]
  ): number {
    for (const idx of activeIndices) {
      if (unitIds[idx] === unitId) {
        return idx;
      }
    }
    return -1;
  }
  
  private createSegmentsForHead(
    context: TickContext,
    headIdx: number,
    headId: string,
    coldData: any,
    arrays: any,
    commands: QueuedCommand[]
  ): void {
    const { posX, posY } = arrays;
    const segmentCount = coldData.meta.segmentCount || 3;
    const segmentLength = coldData.meta.segmentLength || 1;
    
    for (let i = 0; i < segmentCount; i++) {
      const segmentId = `${headId}_segment_${i}`;
      const offsetX = -(i + 1) * segmentLength;
      
      commands.push({
        type: 'spawn',
        params: {
          unitId: segmentId,
          unit: {
            id: segmentId,
            type: coldData.type + '_segment',
            sprite: coldData.meta.segmentSprite || coldData.sprite,
            pos: { x: posX[headIdx] + offsetX, y: posY[headIdx] },
            hp: coldData.meta.segmentHp || 10,
            maxHp: coldData.meta.segmentHp || 10,
            team: coldData.team,
            meta: {
              segment: true,
              segmentIndex: i,
              parentId: headId,
              canGrapple: coldData.meta.segmentCanGrapple || false,
            },
            tags: ['segment', ...(coldData.tags || [])],
            abilities: [],
          }
        }
      });
    }
  }
  
  private updateSegmentPositions(
    context: TickContext,
    segmentsByParent: Map<string, number[]>,
    arrays: any,
    commands: QueuedCommand[]
  ): void {
    const { posX, posY, unitIds, state } = arrays;
    
    for (const [parentId, segmentIndices] of segmentsByParent) {
      const parentIdx = this.findUnitIndex(parentId, unitIds, segmentIndices);
      if (parentIdx === -1) continue;
      
      // Track parent movement
      const parentPos = { x: posX[parentIdx], y: posY[parentIdx] };
      
      if (!this.pathHistory.has(parentId)) {
        this.pathHistory.set(parentId, []);
      }
      
      const history = this.pathHistory.get(parentId)!;
      history.unshift(parentPos);
      
      // Keep history limited
      const maxHistory = (segmentIndices.length + 1) * 2;
      if (history.length > maxHistory) {
        history.pop();
      }
      
      // Update each segment to follow the path
      const sortedSegments = [...segmentIndices].sort((a, b) => {
        const aData = context.getUnitColdData(unitIds[a]);
        const bData = context.getUnitColdData(unitIds[b]);
        return (aData?.meta?.segmentIndex || 0) - (bData?.meta?.segmentIndex || 0);
      });
      
      for (let i = 0; i < sortedSegments.length; i++) {
        const segIdx = sortedSegments[i];
        const historyIndex = (i + 1) * 2;
        
        if (historyIndex < history.length) {
          const targetPos = history[historyIndex];
          
          // Only move if segment is alive
          if (state[segIdx] !== 5) {
            commands.push({
              type: 'move',
              params: {
                unitId: unitIds[segIdx],
                x: targetPos.x,
                y: targetPos.y
              }
            });
          }
        }
      }
    }
  }
  
  private handleSegmentDamage(
    context: TickContext,
    segmentsByParent: Map<string, number[]>,
    arrays: any,
    commands: QueuedCommand[]
  ): void {
    const { hp, unitIds } = arrays;
    
    for (const [parentId, segmentIndices] of segmentsByParent) {
      const parentIdx = this.findUnitIndex(parentId, unitIds, segmentIndices);
      if (parentIdx === -1) continue;
      
      const parentColdData = context.getUnitColdData(parentId);
      if (!parentColdData?.meta?.segmentShareDamage) continue;
      
      // Check if any segment is damaged
      for (const segIdx of segmentIndices) {
        const segColdData = context.getUnitColdData(unitIds[segIdx]);
        if (!segColdData) continue;
        
        const maxHp = segColdData.maxHp || 10;
        if (hp[segIdx] < maxHp) {
          // Propagate damage to parent
          const damage = maxHp - hp[segIdx];
          commands.push({
            type: 'damage',
            params: {
              targetId: parentId,
              amount: damage * 0.5, // Half damage to parent
              sourceId: 'segment_damage'
            }
          });
          
          // Heal segment back
          commands.push({
            type: 'heal',
            params: {
              targetId: unitIds[segIdx],
              amount: damage
            }
          });
        }
      }
    }
  }
  
  private handleSegmentGrappling(
    context: TickContext,
    segmentsByParent: Map<string, number[]>,
    arrays: any,
    commands: QueuedCommand[]
  ): void {
    const { unitIds } = arrays;
    
    for (const segmentIndices of segmentsByParent.values()) {
      for (const segIdx of segmentIndices) {
        const segColdData = context.getUnitColdData(unitIds[segIdx]);
        if (!segColdData?.meta?.canGrapple || !segColdData.meta.grappling) {
          continue;
        }
        
        // Handle grappling logic for segments
        if (segColdData.meta.grappleTarget) {
          commands.push({
            type: 'pull',
            params: {
              sourceId: unitIds[segIdx],
              targetId: segColdData.meta.grappleTarget,
              force: 2
            }
          });
        }
      }
    }
  }
  
  private cleanupOrphanedSegments(
    context: TickContext,
    segmentsByParent: Map<string, number[]>,
    arrays: any,
    commands: QueuedCommand[]
  ): void {
    const { state, hp, unitIds, activeIndices } = arrays;
    
    // Find all segments whose parents are dead
    const deadParentIds = new Set<string>();
    
    for (const [parentId, _] of segmentsByParent) {
      const parentIdx = this.findUnitIndex(parentId, unitIds, activeIndices);
      if (parentIdx === -1 || state[parentIdx] === 5 || hp[parentIdx] <= 0) {
        deadParentIds.add(parentId);
      }
    }
    
    // Kill orphaned segments
    for (const parentId of deadParentIds) {
      const segmentIndices = segmentsByParent.get(parentId);
      if (!segmentIndices) continue;
      
      for (const segIdx of segmentIndices) {
        if (state[segIdx] !== 5) {
          commands.push({
            type: 'markDead',
            params: {
              unitId: unitIds[segIdx]
            }
          });
        }
      }
      
      // Clear path history for dead parent
      this.pathHistory.delete(parentId);
    }
  }
}