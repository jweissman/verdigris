import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';
import { HeroAnimation } from '../../src/rules/hero_animation';

describe('Complete Hero Test', () => {
  test('test all hero functionality like in MWE', () => {
    const sim = new Simulator(40, 40);
    
    // Set up exactly like the MWE
    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    sim.rulebook.push(new HeroAnimation());
    
    // Add hero exactly like MWE
    const hero = sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      tags: ["hero"],
      meta: {
        controlled: true,
        useRig: true,
        onRooftop: true
      }
    });
    
    console.log('=== COMPLETE HERO TEST ===');
    console.log('Initial:', {
      pos: hero.pos,
      rig: !!hero.meta?.rig,
      metaKeys: Object.keys(hero.meta || {})
    });
    
    // Test 1: Check rig is set up
    sim.step();
    let h = sim.units.find(u => u.id === 'hero');
    console.log('\nAfter 1 step (rig setup):', {
      hasRig: !!h?.meta?.rig,
      rigParts: h?.meta?.rig ? h.meta.rig.length : 0
    });
    
    // Test 2: Y-movement  
    console.log('\n--- Testing Y Movement ---');
    playerControl.setKeyState('w', true);
    
    for (let step = 0; step < 8; step++) {
      sim.step();
      h = sim.units.find(u => u.id === 'hero');
      if (step === 0 || step === 4 || step === 7) {
        console.log(`Y-move Step ${step}: pos=(${h?.pos.x}, ${h?.pos.y}), intendedMove=(${h?.intendedMove.x}, ${h?.intendedMove.y})`);
      }
    }
    
    playerControl.setKeyState('w', false);
    
    // Test 3: Jump
    console.log('\n--- Testing Jump ---');
    const beforeJump = sim.units.find(u => u.id === 'hero');
    console.log('Before jump:', { pos: beforeJump?.pos, z: beforeJump?.meta?.z });
    
    playerControl.setKeyState(' ', true);
    
    let maxZ = 0;
    let jumpSteps = 0;
    for (let step = 0; step < 20; step++) {
      sim.step();
      h = sim.units.find(u => u.id === 'hero');
      
      if (h?.meta?.z > maxZ) maxZ = h.meta.z;
      
      if (h?.meta?.jumping) {
        jumpSteps++;
        if (step % 5 === 0) {
          console.log(`Jump Step ${step}: pos=(${h.pos.x.toFixed(1)}, ${h.pos.y}), z=${h.meta.z?.toFixed(2)}`);
        }
      } else if (jumpSteps > 0) {
        console.log(`Jump ended at step ${step}: pos=(${h?.pos.x.toFixed(1)}, ${h?.pos.y}), z=${h?.meta?.z || 0}`);
        break;
      }
    }
    
    playerControl.setKeyState(' ', false);
    
    console.log(`\nJump summary: maxZ=${maxZ.toFixed(2)}, totalSteps=${jumpSteps}`);
    
    const final = sim.units.find(u => u.id === 'hero');
    console.log('Final state:', {
      pos: final?.pos,
      hasRig: !!final?.meta?.rig,
      jumping: final?.meta?.jumping
    });
    
    // Verify everything worked
    expect(final?.meta?.rig).toBeDefined();
    expect(maxZ).toBeGreaterThan(3);
    expect(final?.meta?.jumping).toBe(false);
  });
});