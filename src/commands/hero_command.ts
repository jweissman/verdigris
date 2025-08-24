import { Command } from "../rules/command";

/**
 * Hero command - applies commands to all units tagged 'hero'
 * Examples: 
 *   hero jump
 *   hero left
 *   hero right
 *   hero attack
 */
export class HeroCommand extends Command {
  execute(unitId: string | null, params: Record<string, any>): void {
    const action = params.action as string;
    
    // Support direct move to coordinates
    if (action === 'move-to') {
      const targetX = params.x as number;
      const targetY = params.y as number;
      const heroes = this.sim.units.filter(u => u.tags?.includes('hero'));
      
      for (const hero of heroes) {
        // Set move target in meta
        if (!hero.meta) hero.meta = {};
        hero.meta.moveTarget = {
          x: targetX,
          y: targetY,
          attackMove: params.attackMove || false,
          setTick: this.sim.ticks
        };
        console.log(`[HeroCommand] Hero ${hero.id} move-to (${targetX}, ${targetY})`);
      }
      return;
    }
    
    // Find all hero-tagged units
    const heroes = this.sim.units.filter(u => u.tags?.includes('hero'));
    
    for (const hero of heroes) {
      switch (action) {
        case 'jump':
          this.sim.queuedCommands.push({
            type: 'jump',
            unitId: hero.id,
            params: {
              distance: params.distance || 3,
              height: params.height || 5  // Back to original height
            }
          });
          break;
          
        case 'move': {
          // Handle hex offset by adjusting movement based on current row
          const dx = params.dx || 0;
          const dy = params.dy || 0;
          
          // For hex grid, adjust horizontal movement on odd rows
          let adjustedDx = dx;
          let adjustedDy = dy;
          
          // If moving horizontally on odd row, also move vertically to stay aligned
          if (dx !== 0 && Math.floor(hero.pos.y) % 2 === 1) {
            // Move diagonally to compensate for hex offset
            adjustedDy = dy || (dx > 0 ? -1 : 1);
          }
          
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: adjustedDx, dy: adjustedDy }
          });
          break;
        }
          
        case 'left':
          // Normal horizontal movement
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: -1, dy: 0 }
          });
          break;
          
        case 'right':
          // Normal horizontal movement
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 1, dy: 0 }
          });
          break;
          
        case 'up':
          // Move 2 cells vertically to compensate for hex offset
          console.log(`[HeroCommand] Moving hero up by 2: unit=${hero.id}, pos=${JSON.stringify(hero.pos)}`);
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 0, dy: -2 }
          });
          break;
          
        case 'down':
          // Move 2 cells vertically to compensate for hex offset
          console.log(`[HeroCommand] Moving hero down by 2: unit=${hero.id}, pos=${JSON.stringify(hero.pos)}`);
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 0, dy: 2 }
          });
          break;
          
        case 'up-left':
          // Diagonal movement
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: -1, dy: -2 }
          });
          break;
          
        case 'up-right':
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 1, dy: -2 }
          });
          break;
          
        case 'down-left':
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: -1, dy: 2 }
          });
          break;
          
        case 'down-right':
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 1, dy: 2 }
          });
          break;
          
        case 'knight-left':
          // Knight move: 2 vertical, 1 horizontal for hex grid
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: -1, dy: -2 }
          });
          break;
          
        case 'knight-right':
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 1, dy: -2 }
          });
          break;
          
        case 'attack':
        case 'strike': {
          const direction = params.direction || hero.meta?.facing || 'right';
          const range = params.range || 2;
          const damage = params.damage || hero.dmg || 15;
          
          // Calculate attack zones (3 lanes wide sweep)
          const attackZones: Array<{x: number, y: number}> = [];
          const attackDx = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
          const attackDy = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
          
          // Create 3-lane attack arc  
          for (let dist = 1; dist <= range; dist++) {
            const baseX = hero.pos.x + attackDx * dist;
            const baseY = hero.pos.y + attackDy * dist;
            
            if (attackDx !== 0) {
              // Horizontal attack - hit 3 vertical lanes
              for (let lane = -1; lane <= 1; lane++) {
                attackZones.push({ x: baseX, y: baseY + lane });
                
                // Add visual effect for attack visor
                this.sim.queuedCommands.push({
                  type: 'particle',
                  params: {
                    pos: { x: baseX * 8 + 4, y: baseY * 8 + 4 }, // Convert to pixel coords
                    vel: { x: 0, y: 0 },
                    lifetime: 8, // Very brief flash
                    type: 'spark',
                    color: direction === 'right' ? '#FFD700' : '#FF6B00', // Golden/orange glow
                    radius: 1.5,
                    z: 2
                  }
                });
              }
            } else {
              // Vertical attack - hit 3 horizontal lanes
              for (let lane = -1; lane <= 1; lane++) {
                attackZones.push({ x: baseX + lane, y: baseY });
                
                // Add visual effect for attack visor
                this.sim.queuedCommands.push({
                  type: 'particle',
                  params: {
                    pos: { x: (baseX + lane) * 8 + 4, y: baseY * 8 + 4 },
                    vel: { x: 0, y: 0 },
                    lifetime: 8,
                    type: 'spark',
                    color: '#FFD700',
                    radius: 1.5,
                    z: 2
                  }
                });
              }
            }
          }
          
          // Store attack zones for visualization
          hero.meta.attackZones = attackZones;
          hero.meta.attackZonesExpiry = this.sim.ticks + 8; // Show for 8 ticks
          
          // Find all enemies in attack zones  
          const enemiesSet = new Set<string>();
          const enemies = this.sim.units.filter(u => {
            if (u.team === hero.team || u.hp <= 0) return false;
            const inZone = attackZones.some(zone => 
              u.pos.x === zone.x && u.pos.y === zone.y
            );
            if (inZone) {
              enemiesSet.add(u.id);
            }
            return inZone;
          });
          
          // Damage all enemies in the arc
          for (const enemy of enemies) {
            const strikeCommand = {
              type: 'strike',
              unitId: hero.id,
              params: {
                targetId: enemy.id,
                direction: direction,
                range: range,
                damage: damage
              }
            };
            this.sim.queuedCommands.push(strikeCommand);
          }
          
          // Visual swipe effect ONLY if no targets
          if (enemies.length === 0) {
            this.sim.queuedCommands.push({
              type: 'strike',
              unitId: hero.id,
              params: {
                direction: direction,
                range: range,
                damage: damage
              }
            });
          }
          
          // Set attack state immediately since we're initiating the attack sequence
          const transform = this.sim.getTransform();
          transform.updateUnit(hero.id, {
            state: 'attack',
            meta: {
              ...hero.meta,
              attackStartTick: this.sim.ticks,
              attackEndTick: this.sim.ticks + 16 // 16 tick attack animation to match rig duration
            }
          });
          break;
        }

        case 'charge_attack': {
          // Start charging attack - increase damage over time
          const currentCharge = hero.meta?.attackCharge || 0;
          const newCharge = Math.min(currentCharge + 1, 5); // Max 5x charge
          
          // Update charge directly via transform
          const transform = this.sim.getTransform();
          transform.updateUnit(hero.id, {
            state: 'charging',
            meta: {
              ...hero.meta,
              attackCharge: newCharge,
              chargingAttack: true
            }
          });
          
          // Visual feedback for charging
          this.sim.queuedCommands.push({
            type: 'particle',
            params: {
              pos: { x: hero.pos.x * 8 + 4, y: hero.pos.y * 8 + 4 },
              vel: { x: 0, y: -0.5 },
              lifetime: 15,
              type: 'energy',
              color: `hsl(${60 + newCharge * 30}, 100%, ${50 + newCharge * 10}%)`,
              radius: 0.8 + currentCharge * 0.2,
              z: 3
            }
          });
          break;
        }
          
        case 'release_attack': {
          // Release charged attack
          const chargeLevel = hero.meta?.attackCharge || 1;
          const baseDamage = hero.dmg || 15;
          const chargedDamage = baseDamage * chargeLevel;
          const direction = params.direction || hero.meta?.facing || 'right';
          
          // Clear charging state
          const transform = this.sim.getTransform();
          transform.updateUnit(hero.id, {
            state: 'attack',
            meta: {
              ...hero.meta,
              attackCharge: 0,
              chargingAttack: false
            }
          });
          
          // Queue a strike with charged damage
          this.sim.queuedCommands.push({
            type: 'strike',
            unitId: hero.id,
            params: {
              direction: direction,
              damage: chargedDamage,
              range: 3, // Longer range for charged attack
              knockback: chargeLevel * 2, // More knockback with charge
              aspect: 'charged'
            }
          });
          break;
        }
          
        default:
          console.warn(`Unknown hero action: ${action}`);
      }
    }
  }
}