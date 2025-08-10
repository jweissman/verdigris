import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import { Rule } from "./rule";

// interface SegmentData {
//   position: Vec2;
//   facing: 'left' | 'right';
//   segmentType: 'head' | 'body' | 'tail';
// }

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

    // Handle segment damage propagation
    this.handleSegmentDamage();

    // Handle grappling interactions with segments
    this.handleSegmentGrappling();

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
    // console.log(`Creating ${segmentCount} segments for segmented creature: ${creature.id}`);
    
    // Initialize path history with creature's starting position
    const initialPath = Array(segmentCount + 2).fill(creature.pos);
    this.pathHistory.set(creature.id, initialPath);
    
    // Create segments behind the head
    for (let i = 1; i <= segmentCount; i++) {
      // Try multiple positions to find a valid spot
      let segmentPos = null;
      const attempts = [
        { x: creature.pos.x, y: creature.pos.y + i }, // Behind
        { x: creature.pos.x - i, y: creature.pos.y }, // Left
        { x: creature.pos.x + i, y: creature.pos.y }, // Right
        { x: creature.pos.x, y: creature.pos.y - i }, // Above
        { x: creature.pos.x + 1, y: creature.pos.y + i }, // Diagonal
        { x: creature.pos.x - 1, y: creature.pos.y + i }  // Other diagonal
      ];
      
      for (const attempt of attempts) {
        if (this.isValidPosition(attempt) && !this.isOccupied(attempt)) {
          segmentPos = attempt;
          break;
        }
      }

      // Determine segment type
      let segmentType: 'head' | 'body' | 'tail';
      if (i === segmentCount) {
        segmentType = 'tail';
      } else {
        segmentType = 'body';
      }

      if (segmentPos) {
        // Determine sprite based on parent's custom sprite settings
        let segmentSprite = creature.sprite;
        if (creature.meta.useCustomSegmentSprites) {
          const baseSprite = creature.sprite.replace('-head', '');
          segmentSprite = `${baseSprite}-${segmentType}`;
        }
        
        const segment: Unit = {
          id: `${creature.id}_segment_${i}`,
          pos: segmentPos,
          intendedMove: { x: 0, y: 0 },
          team: creature.team,
          sprite: segmentSprite,
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
            facing: creature.meta.facing || 'right',
            // Inherit huge status and dimensions from parent
            huge: creature.meta.huge,
            width: creature.meta.width,
            height: creature.meta.height
          }
        };

        this.sim.addUnit(segment);
      }
    }
  }

  private getSegmentSprite(segmentType: 'head' | 'body' | 'tail', parentCreature?: Unit): string {
    // Check if parent uses custom segment sprites
    if (parentCreature?.meta?.useCustomSegmentSprites) {
      const baseSprite = parentCreature.sprite.replace('-head', '');
      switch (segmentType) {
        case 'head': return `${baseSprite}-head`;
        case 'body': return `${baseSprite}-body`;
        case 'tail': return `${baseSprite}-tail`;
        default: return `${baseSprite}-body`;
      }
    }
    
    // Default behavior for other segmented creatures
    switch (segmentType) {
      case 'head': return 'worm';
      case 'body': return 'worm';
      case 'tail': return 'worm';
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
      // console.log(`Removing orphaned segment: ${segment.id}`);
      this.sim.units = this.sim.units.filter(u => u.id !== segment.id);
      
      if (segment.meta.parentId) {
        this.pathHistory.delete(segment.meta.parentId);
      }
    }
  }

  private handleSegmentDamage() {
    // When a segment takes damage, propagate some to the head
    this.sim.units.filter(unit => unit.meta.segment).forEach(segment => {
      if (segment.meta.damageTaken && segment.meta.parentId) {
        const parent = this.sim.units.find(u => u.id === segment.meta.parentId);
        if (parent) {
          // Transfer 50% of segment damage to head
          const transferDamage = Math.floor(segment.meta.damageTaken * 0.5);
          if (transferDamage > 0) {
            // console.log(`Segment ${segment.id} transfers ${transferDamage} damage to head ${parent.id}`);
            parent.hp -= transferDamage;
            
            // Visual feedback - pain particles
            this.sim.particles.push({
              pos: { x: parent.pos.x * 8 + 4, y: parent.pos.y * 8 + 4 },
              vel: { x: 0, y: -0.5 },
              radius: 2,
              color: '#FF0000',
              lifetime: 15,
              type: 'pain'
            });
          }
          delete segment.meta.damageTaken;
        }
      }

      // If segment is destroyed, deal damage to adjacent segments
      if (segment.hp <= 0 && segment.meta.segmentIndex) {
        const adjacentSegments = this.sim.units.filter(u => 
          u.meta.segment && 
          u.meta.parentId === segment.meta.parentId &&
          Math.abs((u.meta.segmentIndex || 0) - segment.meta.segmentIndex) === 1
        );
        
        adjacentSegments.forEach(adj => {
          // console.log(`Segment destruction damages adjacent segment ${adj.id}`);
          adj.hp -= 5;
        });
      }
    });
  }

  private handleSegmentGrappling() {
    // Segments can be individually grappled/pinned
    this.sim.units.filter(unit => unit.meta.segment).forEach(segment => {
      if (segment.meta.grappled || segment.meta.pinned) {
        // Grappled/pinned segments slow down the entire creature
        const parent = this.sim.units.find(u => u.id === segment.meta.parentId);
        if (parent) {
          // Each grappled segment reduces movement speed
          const grappledSegments = this.sim.units.filter(u => 
            u.meta.segment && 
            u.meta.parentId === parent.id &&
            (u.meta.grappled || u.meta.pinned)
          ).length;
          
          const speedPenalty = Math.min(0.8, grappledSegments * 0.2); // Max 80% slow
          parent.meta.segmentSlowdown = speedPenalty;
          
          if (!parent.meta.originalSpeed) {
            parent.meta.originalSpeed = parent.meta.moveSpeed || 1.0;
          }
          parent.meta.moveSpeed = parent.meta.originalSpeed * (1 - speedPenalty);
          
          // If head segment is pinned, entire creature is immobilized
          if (segment.meta.segmentIndex === 1 && segment.meta.pinned) {
            // console.log(`Head segment pinned - entire creature immobilized!`);
            parent.meta.stunned = true;
            parent.intendedMove = { x: 0, y: 0 };
          }
        }
      }
    });

    // Clean up speed penalties when no segments are grappled
    this.sim.units.filter(unit => unit.meta.segmented).forEach(creature => {
      const grappledSegments = this.sim.units.filter(u => 
        u.meta.segment && 
        u.meta.parentId === creature.id &&
        (u.meta.grappled || u.meta.pinned)
      ).length;
      
      if (grappledSegments === 0 && creature.meta.segmentSlowdown) {
        delete creature.meta.segmentSlowdown;
        if (creature.meta.originalSpeed) {
          creature.meta.moveSpeed = creature.meta.originalSpeed;
          delete creature.meta.originalSpeed;
        }
        if (creature.meta.stunned) {
          delete creature.meta.stunned;
        }
      }
    });
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