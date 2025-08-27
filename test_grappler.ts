import { Simulator } from "./src/core/simulator";
import Encyclopaedia from "./src/dmg/encyclopaedia";

const sim = new Simulator();

const grappler = {
  ...Encyclopaedia.unit('grappler'),
  id: 'grappler-1',
  pos: { x: 5, y: 5 },
  abilities: {
    grapplingHook: {
      ...Encyclopaedia.abilities.grapplingHook,
      config: { range: 10, maxGrapples: 2 },
      cooldown: 1
    }
  },
  lastAbilityTick: {}
};

sim.addUnit(grappler as any);

for (let i = 0; i < 5; i++) {
  sim.addUnit({
    id: `target-${i}`,
    pos: { x: 8 + i, y: 5 },
    team: 'hostile' as const,
    hp: 50,
    sprite: 'soldier'
  });
}

console.log("Before stepping:");
console.log("Units:", sim.units.map(u => `${u.id} at ${u.pos.x},${u.pos.y}`));

for (let i = 0; i < 10; i++) {
  (grappler.lastAbilityTick as any).grapplingHook = -100;
  sim.step();
  const grapples = sim.projectiles.filter(p => 
    p.type === 'grapple' && 
    (p.sourceId === 'grappler-1' || (p as any).grapplerID === 'grappler-1')
  );
  console.log(`After step ${i+1}: ${grapples.length} grapples`);
}

const grapples = sim.projectiles.filter(p => 
  p.type === 'grapple' && 
  (p.sourceId === 'grappler-1' || (p as any).grapplerID === 'grappler-1')
);

console.log("Final grapples:", grapples.length);
console.log("Test expects <= 2, got", grapples.length);
