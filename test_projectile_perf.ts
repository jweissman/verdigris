import { Simulator } from "./src/core/simulator";
import { ProjectileMotion } from "./src/rules/projectile_motion";

const sim = new Simulator();
sim.initialize();

// Create many units
for (let i = 0; i < 100; i++) {
  sim.createUnit({
    id: `unit${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: 0,
    team: i % 2,
    isHero: false,
  });
}

// Create many projectiles
for (let i = 0; i < 50; i++) {
  sim.createProjectile({
    id: `proj${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    velX: Math.random() * 2 - 1,
    velY: Math.random() * 2 - 1,
    type: 0, // bullet
    team: i % 2,
    damage: 10,
    radius: 1,
  });
}

const rule = new ProjectileMotion();
const context = sim.getTickContext();

// Warm up
for (let i = 0; i < 10; i++) {
  rule.execute(context);
}

// Measure
const iterations = 1000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  rule.execute(context);
}
const end = performance.now();
const avgMs = (end - start) / iterations;

console.log(`Average time: ${avgMs.toFixed(4)}ms`);
console.log(`Units: ${sim.getArrays().activeIndices?.length || 0}`);
console.log(`Projectiles: ${sim.projectileArrays?.activeCount || 0}`);

// Now let's profile the hot path
const projectileArrays = sim.projectileArrays;
const unitArrays = sim.getArrays();

if (projectileArrays && unitArrays.activeIndices) {
  const activeUnits = unitArrays.activeIndices;
  const unitCount = activeUnits.length;
  
  let collisionChecks = 0;
  
  // Count actual collision checks
  for (let pIdx = 0; pIdx < projectileArrays.capacity; pIdx++) {
    if (projectileArrays.active[pIdx] === 0) continue;
    collisionChecks += unitCount;
  }
  
  console.log(`Collision checks per frame: ${collisionChecks}`);
  console.log(`Theoretical O(n*m): ${projectileArrays.activeCount * unitCount}`);
}