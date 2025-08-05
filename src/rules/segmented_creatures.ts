import { Rule } from "./rule";
import { Unit, Vec2 } from "../sim/types";

interface SegmentData {
  position: Vec2;
  facing: 'left' | 'right';
  segmentType: 'head' | 'body' | 'tail';
}

export class SegmentedCreatures extends Rule {
  private pathHistory: Map<string, Vec2[]> = new Map(); // Track movement history for snake-like following

  apply = () => {
    // Find segmented creatures that need segment setup
    const segmentedCreatures = this.sim.units.filter(unit => 
      unit.meta.segmented && !this.hasSegments(unit)
    );

    // Create segments for new segmented creatures
    for (const creature of segmentedCreatures) {
      this.createSegments(creature);
    }

    // Update segment positions with snake-like movement
    this.updateSegmentPositions();

    // Clean up orphaned segments
    this.cleanupOrphanedSegments();
  }

  private hasSegments(creature: Unit): boolean {
    return this.sim.units.some(unit => 
      unit.meta.segment && unit.meta.parentId === creature.id
    );
  }

  private createSegments(creature: Unit) {
    const segmentCount = creature.meta.segmentCount || 4; // Default to 4 segments
    console.log(`Creating ${segmentCount} segments for segmented creature: ${creature.id}`);
    
    // Initialize path history with creature's starting position
    const initialPath = Array(segmentCount + 2).fill(creature.pos);
    this.pathHistory.set(creature.id, initialPath);
    
    // Create segments behind the head
    for (let i = 1; i <= segmentCount; i++) {
      const segmentPos = {
        x: creature.pos.x,
        y: creature.pos.y + i // Start behind head
      };

      // Determine segment type
      let segmentType: 'head' | 'body' | 'tail';
      if (i === segmentCount) {
        segmentType = 'tail';
      } else {
        segmentType = 'body';
      }

      if (this.isValidPosition(segmentPos) && !this.isOccupied(segmentPos)) {
        const segment: Unit = {
          id: `${creature.id}_segment_${i}`,
          pos: segmentPos,
          intendedMove: { x: 0, y: 0 },
          team: creature.team,
          sprite: this.getSegmentSprite(segmentType),
          state: "idle",
          hp: Math.floor(creature.hp * 0.7), // Segments have less HP than head
          maxHp: Math.floor(creature.maxHp * 0.7),
          mass: creature.mass,
          abilities: {},
          tags: ['segment', 'noncombatant'],
          meta: {
            segment: true,
            segmentType,
            segmentIndex: i,
            parentId: creature.id,
            facing: creature.meta.facing || 'right'
          }
        };

        this.sim.addUnit(segment);
      }
    }
  }

  private getSegmentSprite(segmentType: 'head' | 'body' | 'tail'): string {
    switch (segmentType) {
      case 'head': return 'worm'; // Head uses worm sprite
      case 'body': return 'worm'; // Body uses worm sprite (could be different frame)
      case 'tail': return 'worm'; // Tail uses worm sprite (could be different frame)
      default: return 'worm';
    }
  }

  private updateSegmentPositions() {
    const segmentGroups = this.getSegmentGroups();
    
    for (const [parentId, segments] of segmentGroups) {
      const parent = this.sim.units.find(u => u.id === parentId);
      if (!parent || !parent.meta.segmented) continue;

      // Update path history when parent moves
      let pathHistory = this.pathHistory.get(parentId) || [];
      
      // Add current position to front of path history
      pathHistory.unshift({ ...parent.pos });
      
      // Limit path history length (segments + buffer)
      const maxPathLength = (parent.meta.segmentCount || 4) + 5;
      if (pathHistory.length > maxPathLength) {
        pathHistory = pathHistory.slice(0, maxPathLength);
      }
      
      this.pathHistory.set(parentId, pathHistory);

      // Move segments to follow the path
      segments.forEach((segment, index) => {
        const pathIndex = segment.meta.segmentIndex || (index + 1);
        
        if (pathIndex < pathHistory.length) {
          const targetPos = pathHistory[pathIndex];
          
          // Only move if position changed
          if (segment.pos.x !== targetPos.x || segment.pos.y !== targetPos.y) {
            // Calculate facing direction based on movement
            const prevPos = segment.pos;
            segment.pos = { ...targetPos };
            
            if (targetPos.x !== prevPos.x) {
              segment.meta.facing = targetPos.x > prevPos.x ? 'right' : 'left';
            }
          }
        }
      });
    }
  }

  private getSegmentGroups(): Map<string, Unit[]> {
    const groups = new Map<string, Unit[]>();
    
    this.sim.units
      .filter(unit => unit.meta.segment && unit.meta.parentId)
      .forEach(segment => {
        const parentId = segment.meta.parentId!;
        if (!groups.has(parentId)) {
          groups.set(parentId, []);
        }
        groups.get(parentId)!.push(segment);
      });

    // Sort segments by index for consistent ordering
    groups.forEach(segments => {
      segments.sort((a, b) => (a.meta.segmentIndex || 0) - (b.meta.segmentIndex || 0));
    });

    return groups;
  }

  private cleanupOrphanedSegments() {
    const orphanedSegments = this.sim.units.filter(unit => 
      unit.meta.segment && 
      unit.meta.parentId &&
      !this.sim.units.some(parent => parent.id === unit.meta.parentId)
    );

    // Remove orphaned segments and their path history
    for (const segment of orphanedSegments) {
      console.log(`Removing orphaned segment: ${segment.id}`);
      this.sim.units = this.sim.units.filter(u => u.id !== segment.id);
      
      if (segment.meta.parentId) {
        this.pathHistory.delete(segment.meta.parentId);
      }
    }
  }

  private isValidPosition(pos: { x: number, y: number }): boolean {
    return pos.x >= 0 && pos.x < this.sim.fieldWidth &&
           pos.y >= 0 && pos.y < this.sim.fieldHeight;
  }

  private isOccupied(pos: { x: number, y: number }): boolean {
    return this.sim.units.some(unit => 
      unit.pos.x === pos.x && unit.pos.y === pos.y
    );
  }
}