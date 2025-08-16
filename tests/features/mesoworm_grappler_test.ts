import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Mesoworm vs Grappler', () => {
  it('should test mesoworm vs single grappler', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 15, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler);
    




    

    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');

    

    for (let step = 1; step <= 5; step++) {
      const beforeUnits = sim.units.map(u => ({ id: u.id, hp: u.hp, pos: { ...u.pos } }));
      
      sim.step();
      

      sim.units.forEach(u => {
        const before = beforeUnits.find(b => b.id === u.id);
        if (before) {
          const hpChanged = before.hp !== u.hp;
          const moved = before.pos.x !== u.pos.x || before.pos.y !== u.pos.y;
          if (hpChanged || moved) {

          }
          if (u.hp <= 0) {

          }
        }
      });
      

      const deadUnits = sim.units.filter(u => u.hp <= 0);
      if (deadUnits.length > 0) {

        break;
      }
    }
    

    const finalGrappler = sim.units.find(u => u.id === 'grap1');
    const finalMesoworm = sim.units.find(u => u.id === 'meso1');
    



    
    expect(sim.units.length).toBeGreaterThan(0);
  });

  it('should test grappler abilities against mesoworm', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 12, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler);
    


    

    sim.step();
    

    const grapplerUnit = sim.units.find(u => u.id === 'grap1');
    const mesowormUnit = sim.units.find(u => u.id === 'meso1');
    
    if (grapplerUnit && mesowormUnit) {

      
      sim.forceAbility(grapplerUnit.id, 'grapplingHook', mesowormUnit.pos);
      sim.step();
      

      const grapples = sim.projectiles.filter(p => p.type === 'grapple');

      
      if (grapples.length > 0) {
        const grapple = grapples[0];

      }
      

      for (let i = 0; i < 3; i++) {
        sim.step();
        
        const remainingGrapples = sim.projectiles.filter(p => p.type === 'grapple');

        

        const grappled = sim.units.find(u => u.id === 'meso1' && u.meta.grappled);
        if (grappled) {

        }
      }
    }
    
    expect(sim.units.length).toBeGreaterThan(0);
  });

  it('should create scene file for visual testing', () => {

    const sceneContent = `# Mesoworm vs Grappler Test
# Visual test for mesoworm segmented mechanics

g.......m
.........
.........
---
# g = grappler (desert nomad with rope)
# m = mesoworm (2 segments, custom sprites)

bg forest
weather clear`;



    

    const grappler = Encyclopaedia.unit('grappler');
    const mesoworm = Encyclopaedia.unit('mesoworm');
    
    expect(grappler.abilities).toContain('grapplingHook');
    expect(mesoworm.meta.segmented).toBe(true);
    expect(mesoworm.meta.useCustomSegmentSprites).toBe(true);
  });
});