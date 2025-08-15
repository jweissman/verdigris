import { Command } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * AI Command - Clean implementation using ProxyManager batch operations
 * This replaces the old AI command that had direct array access
 */
export class AI extends Command {
  constructor(sim: Simulator) {
    super(sim);
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    // Always process AI for determinism
    this.processAllAI();
    
    // Woodland creatures occasionally summon friends
    this.handleWoodlandSummoning();
  }
  
  private processAllAI(): void {
    // Use ProxyManager's batch operations for vectorized performance
    // This is the PROPER way to get performance without breaking encapsulation
    if (this.sim.proxyManager) {
      this.processAIBatched();
    } else {
      this.processAllAILegacy();
    }
  }

  private processAIBatched(): void {
    // Collect postures for all units
    const postures = new Map<string, string>();
    for (const unit of this.sim.units) {
      if (unit.state !== 'dead') {
        postures.set(unit.id, unit.posture || unit.meta?.posture || 'pursue');
      }
    }
    
    // Use ProxyManager's batch AI processing - properly encapsulated!
    const moves = this.sim.proxyManager.batchProcessAI(postures);
    
    // Queue move commands for all units
    for (const [unitId, move] of moves) {
      if (move.dx !== 0 || move.dy !== 0) {
        this.sim.queuedCommands.push({
          type: 'move',
          unitId: unitId, // Move command expects unitId at top level
          params: { unitId, dx: move.dx, dy: move.dy }
        });
      }
    }
  }
  
  private processAllAILegacy(): void {
    // Process all AI decisions in a single pass without generating individual commands
    const units = this.sim.units;
    
    // First pass: find all targets
    const targetMap = new Map<string, string | null>();
    const searchRadius = this.sim.performanceMode ? 5 : 15;
    const MAX_SEARCH_RADIUS = searchRadius * searchRadius;
    
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (unit.state === 'dead' || unit.hp <= 0) continue;
      if (unit.meta.phantom) continue; // Skip phantom units
      
      let closestEnemy: any = null;
      let closestDist = MAX_SEARCH_RADIUS;
      
      for (let j = 0; j < units.length; j++) {
        if (i === j) continue;
        const other = units[j];
        if (other.state === 'dead' || other.hp <= 0) continue;
        if (unit.team === other.team) continue;
        if (unit.team === 'neutral' || other.team === 'neutral') continue;
        
        const dx = other.pos.x - unit.pos.x;
        const dy = other.pos.y - unit.pos.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < closestDist) {
          closestDist = distSq;
          closestEnemy = other;
        }
      }
      
      targetMap.set(unit.id, closestEnemy ? closestEnemy.id : null);
    }
    
    // Second pass: set intended moves based on posture
    for (const unit of units) {
      if (unit.state === 'dead' || unit.hp <= 0) continue;
      if (unit.meta.phantom) continue;
      
      const targetId = targetMap.get(unit.id);
      const posture = unit.posture || unit.meta?.posture || 'pursue';
      
      if (posture === 'wait' || !targetId) {
        continue; // No movement
      }
      
      const target = units.find(u => u.id === targetId);
      if (!target) continue;
      
      let dx = 0, dy = 0;
      if (posture === 'pursue' || posture === 'bully') {
        dx = target.pos.x > unit.pos.x ? 1 : target.pos.x < unit.pos.x ? -1 : 0;
        dy = target.pos.y > unit.pos.y ? 1 : target.pos.y < unit.pos.y ? -1 : 0;
      }
      
      if (dx !== 0 || dy !== 0) {
        this.sim.queuedCommands.push({
          type: 'move',
          unitId: unit.id,
          params: { unitId: unit.id, dx, dy }
        });
      }
    }
  }
  
  private handleWoodlandSummoning(): void {
    // Woodland creatures occasionally summon friends
    if (Simulator.rng.random() > 0.01) return; // 1% chance per tick
    
    const woodlandCreatures = this.sim.units.filter(u => 
      u.state !== 'dead' && 
      (u.sprite === 'bear' || u.sprite === 'owl' || u.sprite === 'eagle' || u.sprite === 'wolf')
    );
    
    if (woodlandCreatures.length === 0) return;
    if (this.sim.units.length > 50) return; // Don't spawn if too many units
    
    const summoner = woodlandCreatures[Math.floor(Simulator.rng.random() * woodlandCreatures.length)];
    this.summonWoodlandFriend(summoner);
  }
  
  private summonWoodlandFriend(summoner: any): void {
    const friendTypes = ['squirrel', 'rabbit', 'owl', 'wolf'];
    const friendType = friendTypes[Math.floor(Simulator.rng.random() * friendTypes.length)];
    
    const spawnPos = this.getNearbySpawnPosition(summoner.pos);
    
    this.sim.queuedCommands.push({
      type: 'spawn',
      params: {
        unitType: friendType,
        x: spawnPos.x,
        y: spawnPos.y,
        team: summoner.team
      }
    });
  }
  
  private getNearbySpawnPosition(center: { x: number; y: number }): { x: number; y: number } {
    const angle = Simulator.rng.random() * Math.PI * 2;
    const distance = 3 + Simulator.rng.random() * 3;
    
    const x = Math.round(center.x + Math.cos(angle) * distance);
    const y = Math.round(center.y + Math.sin(angle) * distance);
    
    return {
      x: Math.max(0, Math.min(this.sim.fieldWidth - 1, x)),
      y: Math.max(0, Math.min(this.sim.fieldHeight - 1, y))
    };
  }
}