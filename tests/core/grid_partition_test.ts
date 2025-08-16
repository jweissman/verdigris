import { describe, expect, it } from "bun:test";
import { GridPartition } from "../../src/core/grid_partition";

describe("GridPartition", () => {
  it("should find nearby units", () => {
    const grid = new GridPartition(100, 100, 4);
    

    const unit1 = {
      id: "unit1",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100
    };
    
    const unit2 = {
      id: "unit2", 
      pos: { x: 11, y: 10 }, // Distance 1 from unit1
      team: "hostile",
      hp: 100
    };
    
    const unit3 = {
      id: "unit3",
      pos: { x: 20, y: 20 }, // Distance ~14 from unit1
      team: "hostile",
      hp: 100
    };
    

    grid.insert(unit1 as any);
    grid.insert(unit2 as any);
    grid.insert(unit3 as any);
    

    const nearby = grid.getNearby(10, 10, 2);
    
    expect(nearby.length).toBe(2); // Should find unit1 and unit2
    expect(nearby.map(u => u.id)).toContain("unit1");
    expect(nearby.map(u => u.id)).toContain("unit2");
    expect(nearby.map(u => u.id)).not.toContain("unit3");
  });
  
  it("should find units across cell boundaries", () => {
    const grid = new GridPartition(100, 100, 4); // Cell size 4
    

    const unit1 = {
      id: "unit1",
      pos: { x: 3.9, y: 3.9 },
      team: "friendly",
      hp: 100
    };
    

    const unit2 = {
      id: "unit2",
      pos: { x: 4.1, y: 4.1 }, // Distance ~0.28 from unit1
      team: "hostile", 
      hp: 100
    };
    
    grid.insert(unit1 as any);
    grid.insert(unit2 as any);
    

    const nearby = grid.getNearby(4, 4, 1);
    expect(nearby.length).toBeGreaterThan(0); // Should find at least unit2
    
    const nearbyFromUnit1 = grid.getNearby(3.9, 3.9, 1);
    expect(nearbyFromUnit1.length).toBe(2); // Should find both
  });
  
  it("should handle empty grid", () => {
    const grid = new GridPartition(100, 100, 4);
    
    const nearby = grid.getNearby(50, 50, 10);
    expect(nearby.length).toBe(0);
  });
  
  it("should find units at exact combat positions", () => {

    const grid = new GridPartition(10, 10, 4);
    
    const soldier1 = {
      id: "soldier",
      pos: { x: 5, y: 5 },
      team: "friendly",
      hp: 30
    };
    
    const soldier2 = {
      id: "soldier1", 
      pos: { x: 6, y: 5 }, // Adjacent, distance = 1
      team: "hostile",
      hp: 30
    };
    
    grid.insert(soldier1 as any);
    grid.insert(soldier2 as any);
    

    const nearbyFromS1 = grid.getNearby(5, 5, 1.5);
    console.log(`From (5,5) with radius 1.5: found ${nearbyFromS1.length} units:`, nearbyFromS1.map(u => `${u.id} at (${u.pos.x},${u.pos.y})`));
    expect(nearbyFromS1.length).toBe(2); // Should find both
    

    const nearbyFromS2 = grid.getNearby(6, 5, 1.5);
    console.log(`From (6,5) with radius 1.5: found ${nearbyFromS2.length} units:`, nearbyFromS2.map(u => `${u.id} at (${u.pos.x},${u.pos.y})`));
    expect(nearbyFromS2.length).toBe(2); // Should find both
  });
  
  it("should handle units at same position", () => {
    const grid = new GridPartition(100, 100, 4);
    
    const unit1 = { id: "u1", pos: { x: 10, y: 10 }, team: "a", hp: 100 };
    const unit2 = { id: "u2", pos: { x: 10, y: 10 }, team: "b", hp: 100 };
    
    grid.insert(unit1 as any);
    grid.insert(unit2 as any);
    
    const nearby = grid.getNearby(10, 10, 0.1);
    expect(nearby.length).toBe(2); // Should find both
  });
  
  it("should handle negative coordinates", () => {
    const grid = new GridPartition(100, 100, 4);
    

    const unit = { id: "u1", pos: { x: -5, y: -5 }, team: "a", hp: 100 };
    grid.insert(unit as any);
    
    const nearby = grid.getNearby(-5, -5, 1);

    expect(nearby.length).toBe(0);
  });
  
  it("should find nothing outside radius", () => {
    const grid = new GridPartition(100, 100, 4);
    
    const unit1 = { id: "u1", pos: { x: 0, y: 0 }, team: "a", hp: 100 };
    const unit2 = { id: "u2", pos: { x: 10, y: 0 }, team: "b", hp: 100 };
    
    grid.insert(unit1 as any);
    grid.insert(unit2 as any);
    

    const nearby = grid.getNearby(0, 0, 5);
    expect(nearby.length).toBe(1);
    expect(nearby[0].id).toBe("u1");
  });
  
  it("should verify units are being inserted correctly", () => {
    const grid = new GridPartition(20, 20, 4);
    

    const unit = {
      id: "test1",
      pos: { x: 5, y: 5 },
      team: "friendly",
      hp: 100
    };
    
    grid.insert(unit as any);
    

    const cellUnits = grid.getCell(5, 5);
    expect(cellUnits.length).toBe(1);
    expect(cellUnits[0].id).toBe("test1");
    

    const nearby = grid.getNearby(5, 5, 0.1);
    expect(nearby.length).toBe(1);
    expect(nearby[0].id).toBe("test1");
  });
  
  it("should handle rebuild after clear", () => {
    const grid = new GridPartition(20, 20, 4);
    
    const unit1 = { id: "u1", pos: { x: 5, y: 5 }, team: "a", hp: 100 };
    const unit2 = { id: "u2", pos: { x: 6, y: 5 }, team: "b", hp: 100 };
    

    grid.insert(unit1 as any);
    grid.insert(unit2 as any);
    

    let nearby = grid.getNearby(5, 5, 2);
    expect(nearby.length).toBe(2);
    

    grid.clear();
    grid.insert(unit1 as any);
    grid.insert(unit2 as any);
    

    nearby = grid.getNearby(5, 5, 2);
    expect(nearby.length).toBe(2);
  });
  
  it("should test actual combat scenario step by step", () => {
    const grid = new GridPartition(10, 10, 4);
    

    const soldier1 = {
      id: "soldier",
      pos: { x: 5, y: 5 },
      team: "friendly",
      hp: 30,
      dmg: 3
    };
    
    const soldier2 = {
      id: "soldier1",
      pos: { x: 6, y: 5 },
      team: "hostile",
      hp: 30,
      dmg: 3
    };
    
    console.log("Inserting soldier1 at (5,5)");
    grid.insert(soldier1 as any);
    
    console.log("Inserting soldier2 at (6,5)");
    grid.insert(soldier2 as any);
    

    const cell1 = grid.getCell(5, 5);
    const cell2 = grid.getCell(6, 5);
    console.log(`Cell at (5,5) has ${cell1.length} units`);
    console.log(`Cell at (6,5) has ${cell2.length} units`);
    

    const meleeRange = 1.5;
    const nearbyFromS1 = grid.getNearby(5, 5, meleeRange);
    console.log(`From soldier1 at (5,5), found ${nearbyFromS1.length} units within range ${meleeRange}`);
    for (const unit of nearbyFromS1) {
      const dx = unit.pos.x - 5;
      const dy = unit.pos.y - 5;
      const dist = Math.sqrt(dx*dx + dy*dy);
      console.log(`  - ${unit.id} at (${unit.pos.x},${unit.pos.y}), distance=${dist.toFixed(2)}`);
    }
    
    expect(nearbyFromS1.length).toBe(2);
    expect(nearbyFromS1.find(u => u.id === "soldier1")).toBeDefined();
  });
});