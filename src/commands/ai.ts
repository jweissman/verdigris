import { Command } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * Higher-order 'ai' command - bulk AI processing and intent setting
 * Replaces individual target/pose commands with vectorized AI updates
 */
export class AICommand extends Command {
  private transform: any;
  
  constructor(sim: any, transform: any) {
    super(sim);
    this.transform = transform;
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    // Always process AI for determinism
    this.processAllAI();
  }
  
  private processAllAI(): void {
    // USE TYPED ARRAYS DIRECTLY FOR MASSIVE PERFORMANCE GAINS!
    const arrays = this.sim.unitArrays;
    if (!arrays) {
      this.processAllAILegacy();
      return;
    }
    
    // Vectorized AI on typed arrays - this is the fast path!
    this.processAIVectorized(arrays);
  }
  
  private processAIVectorized(arrays: any): void {
    const capacity = arrays.capacity;
    const searchRadius = this.sim.performanceMode ? 5 : 15;
    const MAX_SEARCH_RADIUS_SQ = searchRadius * searchRadius;
    
    // Pre-allocate arrays for targets (avoids allocation in hot loop)
    const closestEnemy = new Int16Array(capacity);
    const closestAlly = new Int16Array(capacity);
    const enemyDistSq = new Float32Array(capacity);
    const allyDistSq = new Float32Array(capacity);
    
    // Initialize distances to infinity
    enemyDistSq.fill(Infinity);
    allyDistSq.fill(Infinity);
    closestEnemy.fill(-1);
    closestAlly.fill(-1);
    
    // BUILD SPATIAL GRID for O(1) neighbor lookups!
    const gridSize = 5; // 5x5 cells for search radius
    const gridWidth = Math.ceil(this.sim.fieldWidth / gridSize);
    const gridHeight = Math.ceil(this.sim.fieldHeight / gridSize); 
    const grid = new Array(gridWidth * gridHeight);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = [];
    }
    
    // Populate grid
    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;
      const gx = Math.floor(arrays.posX[i] / gridSize);
      const gy = Math.floor(arrays.posY[i] / gridSize);
      const gridIdx = gy * gridWidth + gx;
      if (grid[gridIdx]) grid[gridIdx].push(i);
    }
    
    // SPATIAL HASHED DISTANCE CALCULATIONS - O(n) average case!
    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;
      
      const x1 = arrays.posX[i];
      const y1 = arrays.posY[i];
      const team1 = arrays.team[i];
      
      // Only check nearby grid cells
      const gx = Math.floor(x1 / gridSize);
      const gy = Math.floor(y1 / gridSize);
      const searchCells = Math.ceil(searchRadius / gridSize);
      
      for (let dy = -searchCells; dy <= searchCells; dy++) {
        for (let dx = -searchCells; dx <= searchCells; dx++) {
          const checkGx = gx + dx;
          const checkGy = gy + dy;
          
          if (checkGx < 0 || checkGx >= gridWidth || checkGy < 0 || checkGy >= gridHeight) continue;
          
          const gridIdx = checkGy * gridWidth + checkGx;
          const cellUnits = grid[gridIdx];
          if (!cellUnits) continue;
          
          // Check units in this cell
          for (const j of cellUnits) {
            if (i === j) continue;
            
            // Vectorized distance calculation
            const dx = arrays.posX[j] - x1;
            const dy = arrays.posY[j] - y1;
            const distSq = dx * dx + dy * dy;
            
            if (distSq > MAX_SEARCH_RADIUS_SQ) continue;
            
            if (arrays.team[j] !== team1) {
              // Enemy
              if (distSq < enemyDistSq[i]) {
                enemyDistSq[i] = distSq;
                closestEnemy[i] = j;
              }
            } else {
              // Ally
              if (distSq < allyDistSq[i]) {
                allyDistSq[i] = distSq;
                closestAlly[i] = j;
              }
            }
          }
        }
      }
    }
    
    // VECTORIZED MOVEMENT CALCULATION
    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;
      
      // Get unit metadata for posture
      const unitId = arrays.unitIds[i];
      const meta = this.sim.unitColdData.get(unitId);
      const tags = meta?.tags;
      const posture = meta?.posture || meta?.meta?.posture;
      
      // Skip units with no AI behavior
      if (!tags && !posture) {
        if (arrays.intendedMoveX[i] !== 0 || arrays.intendedMoveY[i] !== 0) {
          continue; // Keep existing movement
        }
      }
      
      // Calculate movement based on AI
      let dx = 0, dy = 0;
      
      if ((posture === 'hunt' || tags?.includes('hunt')) && closestEnemy[i] >= 0) {
        const targetIdx = closestEnemy[i];
        const targetX = arrays.posX[targetIdx];
        const targetY = arrays.posY[targetIdx];
        
        const diffX = targetX - arrays.posX[i];
        const diffY = targetY - arrays.posY[i];
        
        // Move towards enemy (manhattan distance for grid movement)
        if (Math.abs(diffX) > Math.abs(diffY)) {
          dx = diffX > 0 ? 1 : -1;
        } else if (Math.abs(diffY) > 0) {
          dy = diffY > 0 ? 1 : -1;
        }
      } else if (tags?.includes('wander')) {
        // Use wanderRate from UnitMovement for consistency
        const UnitMovement = this.sim.rulebook.find(r => r.constructor.name === 'UnitMovement')?.constructor as any;
        const wanderRate = UnitMovement?.wanderRate || 0.15;
        
        if (Simulator.rng.random() < wanderRate) {
          const dir = Math.floor(Simulator.rng.random() * 4);
          switch(dir) {
            case 0: dx = 1; break;
            case 1: dx = -1; break;
            case 2: dy = 1; break;
            case 3: dy = -1; break;
          }
        }
      }
      
      // Write directly to intended move arrays
      arrays.intendedMoveX[i] = dx;
      arrays.intendedMoveY[i] = dy;
    }
  }
  
  private processAllAILegacy(): void {
    // Process all AI decisions in a single pass without generating individual commands
    const units = this.sim.units;
    
    // First pass: find all targets - optimize by limiting search radius
    const targetMap = new Map<string, string | null>();
    const allyMap = new Map<string, string | null>();
    // In performance mode, use much smaller search radius
    const searchRadius = this.sim.performanceMode ? 5 : 15;
    const MAX_SEARCH_RADIUS = searchRadius * searchRadius;
    
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (unit.state === 'dead' || unit.hp <= 0) continue;
      // Skip phantom units - they don't need AI
      if (unit.meta.phantom) continue;
      
      // Even when AI runs, skip some units to reduce load
      if (this.sim.performanceMode && units.length > 50) {
        if (i % 2 !== 0) continue;
      }
      
      let closestEnemy: any = null;
      let closestAlly: any = null;
      let closestEnemyDist = Infinity;
      let closestAllyDist = Infinity;
      
      for (const other of units) {
        if (other.state === 'dead' || other.hp <= 0) continue;
        if (other.id === unit.id) continue;
        // Skip phantom units as targets
        if (other.meta.phantom) continue;
        
        const dx = other.pos.x - unit.pos.x;
        const dy = other.pos.y - unit.pos.y;
        const dist = dx * dx + dy * dy;
        
        // Skip units that are too far away
        if (dist > MAX_SEARCH_RADIUS) continue;
        
        if (other.team !== unit.team) {
          if (dist < closestEnemyDist) {
            closestEnemyDist = dist;
            closestEnemy = other;
          }
        } else {
          if (dist < closestAllyDist) {
            closestAllyDist = dist;
            closestAlly = other;
          }
        }
      }
      
      targetMap.set(unit.id, closestEnemy?.id || null);
      allyMap.set(unit.id, closestAlly?.id || null);
    }
    
    // Second pass: update all units based on cached targets
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (unit.state === 'dead' || unit.hp <= 0) continue;
      if (unit.meta.jumping) continue;
      // Skip phantom units - they don't need movement
      if (unit.meta.phantom) continue;
      
      
      // Skip units that already have intendedMove and no AI tags/posture
      // This preserves behavior for simple test units
      const hasAIBehavior = unit.tags?.length || unit.posture || unit.meta.posture;
      if (!hasAIBehavior && unit.intendedMove && (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0)) {
        continue; // Let them keep their existing intendedMove
      }
      
      const targetId = targetMap.get(unit.id);
      const allyId = allyMap.get(unit.id);
      
      // Set target directly without command
      if (targetId !== unit.meta.intendedTarget) {
        if (!unit.meta) unit.meta = {};
        unit.meta.intendedTarget = targetId;
      }
      
      // Calculate movement based on posture
      // Check tags first for behavior
      let posture = unit.meta.posture || unit.posture;
      if (!posture && unit.tags) {
        if (unit.tags.includes('wander')) posture = 'wander';
        else if (unit.tags.includes('hunt')) posture = 'hunt';
        else if (unit.tags.includes('guard')) posture = 'guard';
        else if (unit.tags.includes('swarm')) posture = 'swarm';
      }
      if (!posture) posture = hasAIBehavior ? 'hunt' : 'wait';
      
      let intendedMove = { x: 0, y: 0 };
      
      if (posture === 'hunt' && targetId) {
        const target = units.find(u => u.id === targetId);
        if (target) {
          const dx = target.pos.x - unit.pos.x;
          const dy = target.pos.y - unit.pos.y;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            intendedMove.x = dx > 0 ? 1 : -1;
          } else if (Math.abs(dy) > 0) {
            intendedMove.y = dy > 0 ? 1 : -1;
          }
        }
      } else if (posture === 'guard' && allyId) {
        const ally = units.find(u => u.id === allyId);
        if (ally) {
          const dx = ally.pos.x - unit.pos.x;
          const dy = ally.pos.y - unit.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 2) {
            intendedMove.x = dx > 0 ? 1 : -1;
            intendedMove.y = dy > 0 ? 1 : -1;
          }
        }
      } else if (posture === 'wander') {
        // Use wanderRate from UnitMovement for consistency
        const UnitMovement = this.sim.rulebook.find(r => r.constructor.name === 'UnitMovement')?.constructor as any;
        const wanderRate = UnitMovement?.wanderRate || 0.15;
        
        if (Simulator.rng.random() < wanderRate) {
          const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
          const [dx, dy] = dirs[Math.floor(Simulator.rng.random() * dirs.length)];
          intendedMove.x = dx;
          intendedMove.y = dy;
        }
      } else if (posture === 'swarm') {
        // Swarm behavior - move towards center of mass of nearby allies
        let avgX = unit.pos.x;
        let avgY = unit.pos.y;
        let count = 1;
        
        for (const other of units) {
          if (other.id === unit.id || other.team !== unit.team) continue;
          if (other.state === 'dead' || other.hp <= 0) continue;
          if (other.meta.phantom) continue;
          
          const dx = other.pos.x - unit.pos.x;
          const dy = other.pos.y - unit.pos.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < 25) { // Within 5 units
            avgX += other.pos.x;
            avgY += other.pos.y;
            count++;
          }
        }
        
        if (count > 1) {
          avgX /= count;
          avgY /= count;
          
          const dx = avgX - unit.pos.x;
          const dy = avgY - unit.pos.y;
          
          if (Math.abs(dx) >= 1) {
            intendedMove.x = dx > 0 ? 1 : -1;
          }
          if (Math.abs(dy) >= 1) {
            intendedMove.y = dy > 0 ? 1 : -1;
          }
        } else {
          // No allies nearby, wander
          if (Simulator.rng.random() < 0.15) {
            const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
            const [dx, dy] = dirs[Math.floor(Simulator.rng.random() * dirs.length)];
            intendedMove.x = dx;
            intendedMove.y = dy;
          }
        }
      }
      
      // Set movement directly without command
      unit.intendedMove = intendedMove;
    }
  }
}