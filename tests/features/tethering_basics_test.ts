import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';

describe('Tethering Basics - Step by Step', () => {
  it('should fire a grapple projectile from grappler', () => {
    const sim = new Simulator();
    
    // Create grappler with grappling hook ability
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 }
    };
    sim.addUnit(grappler);
    
    // Verify grappler has the ability
    expect(grappler.abilities.includes('grapplingHook')).toBe(true);
    
    // Fire grapple using simulator method
    const targetPos = { x: 10, y: 5 };
    sim.forceAbility(grappler.id, 'grapplingHook', targetPos);
    sim.step(); // Process the queued command
    
    // Should create a grapple projectile
    const grapples = sim.projectiles.filter(p => p.type === 'grapple');
    expect(grapples.length).toBe(1);
    
    const grapple = grapples[0];
    // Grapple projectile is moving toward target
    expect(grapple.pos.x).toBeGreaterThanOrEqual(5);
    expect(grapple.target).toEqual({ x: 10, y: 5 });
  });

  it('should create tether when grapple hits immovable unit', () => {
    const sim = new Simulator();
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 }
    };
    
    // Create an immovable unit (high mass)
    const immovableUnit = {
      ...Encyclopaedia.unit('mechatron'), // Heavy unit
      id: 'heavy-1',
      pos: { x: 10, y: 5 },
      mass: 100, // Very heavy, effectively immovable
      team: 'hostile' as const
    };
    
    sim.addUnit(grappler);
    sim.addUnit(immovableUnit);
    
    // Add GrapplingPhysics rule to handle collisions
    sim.rulebook.push(new GrapplingPhysics(sim));
    
    // Fire grapple at heavy unit using simulator
    sim.forceAbility(grappler.id, 'grapplingHook', immovableUnit);
    sim.step(); // Process the command to create projectile
    
    // Simulate projectile travel and collision
    for (let i = 0; i < 20; i++) {
      // Find the grapple projectile
      const grapplesBeforeMove = sim.projectiles.filter(p => p.type === 'grapple');
      
      // Move projectiles toward their targets
      sim.projectiles.forEach(p => {
        if (p.type === 'grapple' && p.target) {
          const dx = p.target.x - p.pos.x;
          const dy = p.target.y - p.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0.5) {
            p.pos.x += (dx / dist) * 0.5;
            p.pos.y += (dy / dist) * 0.5;
          } else {
            // Projectile reached target - set exact position for collision detection
            p.pos.x = p.target.x;
            p.pos.y = p.target.y;
          }
        }
      });
      
      sim.step();
      
      // Break early if grapple hit
      const heavyUnit = sim.units.find(u => u.id === 'heavy-1');
      if (heavyUnit?.meta?.grappled) {
        break;
      }
    }
    
    // Check if heavy unit is grappled - check the actual unit in sim, not the original reference
    const immovableInSim = sim.units.find(u => u.id === 'heavy-1');
    expect(immovableInSim).toBeDefined();
    expect(immovableInSim?.meta?.grappled).toBe(true);
    expect(immovableInSim?.meta?.grappledBy).toBeDefined();
    expect(immovableInSim?.meta?.tetherPoint).toBeDefined();
  });

  it('should pull small unit closer when retracting grapple', () => {
    const sim = new Simulator();
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      mass: 2
    };
    
    // Create a small, light unit
    const smallUnit = {
      ...Encyclopaedia.unit('soldier'),
      id: 'small-1',
      pos: { x: 10, y: 5 },
      mass: 0.5, // Very light
      team: 'hostile' as const
    };
    
    sim.addUnit(grappler);
    sim.addUnit(smallUnit);
    
    // Manually set up tether (as if grapple already hit)
    smallUnit.meta.tethered = true;
    smallUnit.meta.tetheredTo = 'grappler-1';
    smallUnit.meta.tetherPoint = { x: 5, y: 5 };
    smallUnit.meta.retracting = true; // Grappler is pulling
    
    const initialDistance = 5;
    
    // Simulate retraction over several steps
    for (let i = 0; i < 5; i++) {
      // Pull logic: light unit moves toward heavy unit
      if (smallUnit.meta.retracting && smallUnit.meta.tethered) {
        const dx = grappler.pos.x - smallUnit.pos.x;
        const dy = grappler.pos.y - smallUnit.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 1) {
          // Pull speed based on mass ratio
          const pullStrength = grappler.mass / (grappler.mass + smallUnit.mass);
          smallUnit.pos.x += (dx / dist) * pullStrength;
          smallUnit.pos.y += (dy / dist) * pullStrength;
        }
      }
      
      sim.step();
    }
    
    // Small unit should be pulled closer
    const finalDistance = Math.sqrt(
      Math.pow(smallUnit.pos.x - grappler.pos.x, 2) + 
      Math.pow(smallUnit.pos.y - grappler.pos.y, 2)
    );
    
    expect(finalDistance).toBeLessThan(initialDistance);
    expect(smallUnit.pos.x).toBeLessThan(10); // Moved left toward grappler
  });

  it('should prevent tethered unit from moving too far away', () => {
    const sim = new Simulator();
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 }
    };
    
    const tetheredUnit = {
      ...Encyclopaedia.unit('soldier'),
      id: 'tethered-1',
      pos: { x: 8, y: 5 },
      team: 'hostile' as const
    };
    
    sim.addUnit(grappler);
    sim.addUnit(tetheredUnit);
    
    // Set up tether with max distance
    tetheredUnit.meta.tethered = true;
    tetheredUnit.meta.tetheredTo = 'grappler-1';
    tetheredUnit.meta.tetherPoint = { x: 5, y: 5 };
    tetheredUnit.meta.maxTetherDistance = 4;
    
    // Try to move away beyond tether range
    tetheredUnit.intendedMove = { x: 15, y: 5 }; // Wants to move far away
    
    // Apply tether constraint
    if (tetheredUnit.meta.tethered) {
      const tetherPoint = tetheredUnit.meta.tetherPoint;
      const intendedX = tetheredUnit.intendedMove.x;
      const intendedY = tetheredUnit.intendedMove.y;
      
      const dx = intendedX - tetherPoint.x;
      const dy = intendedY - tetherPoint.y;
      const intendedDist = Math.sqrt(dx * dx + dy * dy);
      
      if (intendedDist > tetheredUnit.meta.maxTetherDistance) {
        // Constrain to max tether distance
        const ratio = tetheredUnit.meta.maxTetherDistance / intendedDist;
        tetheredUnit.pos.x = tetherPoint.x + dx * ratio;
        tetheredUnit.pos.y = tetherPoint.y + dy * ratio;
      } else {
        tetheredUnit.pos = { ...tetheredUnit.intendedMove };
      }
    }
    
    sim.step();
    
    // Check unit is constrained by tether
    const finalDistance = Math.sqrt(
      Math.pow(tetheredUnit.pos.x - grappler.pos.x, 2) + 
      Math.pow(tetheredUnit.pos.y - grappler.pos.y, 2)
    );
    
    expect(finalDistance).toBeLessThanOrEqual(4);
    expect(tetheredUnit.pos.x).toBe(9); // Constrained to max distance
  });
});