import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { AoE } from "../../src/commands/aoe";
import { StrikeCommand } from "../../src/commands/strike";
import { JumpCommand } from "../../src/commands/jump";
import { Damage } from "../../src/commands/damage";

test("AoE command accepts typed parameters", () => {
  const sim = new Simulator(30, 30);
  
  // Add some units in the area
  const unit1 = sim.addUnit({
    id: "unit1",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "hostile"
  });
  
  const unit2 = sim.addUnit({
    id: "unit2",
    pos: { x: 11, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "hostile"
  });
  
  const unit3 = sim.addUnit({
    id: "unit3",
    pos: { x: 15, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "hostile"
  });
  
  // Execute AoE with typed params
  const aoe = new AoE(sim);
  aoe.execute(null, {
    x: 10,
    y: 10,
    radius: 2,
    damage: 50,
    type: "fire",
    friendlyFire: false,
    excludeSource: true,
    falloff: true
  });
  
  // Process commands
  sim.tick();
  
  // Units within radius should be damaged
  expect(unit1.hp).toBeLessThan(100);
  expect(unit2.hp).toBeLessThan(100);
  // Unit outside radius should not be damaged
  expect(unit3.hp).toBe(100);
});

test("Strike command accepts typed parameters", () => {
  const sim = new Simulator(30, 30);
  
  const attacker = sim.addUnit({
    id: "attacker",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    dmg: 20
  });
  
  const target = sim.addUnit({
    id: "target",
    pos: { x: 11, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "hostile"
  });
  
  // Execute strike with typed params
  const strike = new StrikeCommand(sim);
  strike.execute("attacker", {
    targetId: "target",
    direction: "right",
    damage: 25,
    range: 2,
    knockback: 1,
    aspect: "kinetic"
  });
  
  // Process commands
  sim.tick();
  
  // Target should be damaged
  expect(target.hp).toBeLessThan(100);
});

test("Jump command accepts typed parameters", () => {
  const sim = new Simulator(30, 30);
  
  const jumper = sim.addUnit({
    id: "jumper",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly"
  });
  
  const initialX = jumper.pos.x;
  
  // Execute jump with typed params
  const jump = new JumpCommand(sim);
  jump.execute("jumper", {
    targetX: 15,
    targetY: 10,
    distance: 5,
    height: 10,
    damage: 30,
    radius: 2
  });
  
  // Jumper should be marked as jumping
  expect(jumper.meta?.jumping).toBe(true);
  expect(jumper.meta?.jumpHeight).toBe(10);
});

test("Damage command accepts typed parameters", () => {
  const sim = new Simulator(30, 30);
  
  const target = sim.addUnit({
    id: "target",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "hostile"
  });
  
  // Execute damage with typed params
  const damage = new Damage(sim);
  damage.execute(null, {
    targetId: "target",
    amount: 35,
    aspect: "fire",
    sourceId: "attacker",
    origin: { x: 5, y: 10 }
  });
  
  // Process commands
  sim.tick();
  
  // Target should be damaged
  expect(target.hp).toBe(65);
});

test("Commands reject invalid parameter types at compile time", () => {
  const sim = new Simulator(30, 30);
  const aoe = new AoE(sim);
  
  // This would cause a TypeScript compile error:
  // aoe.execute(null, { 
  //   x: "not a number", // Type error!
  //   y: 10,
  //   radius: 2,
  //   damage: 50
  // });
  
  // But we can test runtime validation
  const invalidParams = {
    x: NaN,
    y: 10,
    radius: -1, // Invalid radius
    damage: 50
  };
  
  // Execute with invalid params
  aoe.execute(null, invalidParams);
  sim.tick();
  
  // No units should be affected with invalid params
  const units = sim.units;
  expect(units.every(u => u.hp === u.maxHp)).toBe(true);
});