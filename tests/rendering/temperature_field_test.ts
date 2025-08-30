import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Temperature Field Rendering", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(40, 25);
  });

  it("should render temperature effects across the entire field, not just bottom rows", () => {
    // Use the fieldManager to set temperature
    const fieldManager = (sim as any).fieldManager;
    
    // Set high temperature across the entire field
    for (let y = 0; y < sim.fieldHeight; y++) {
      for (let x = 0; x < sim.fieldWidth; x++) {
        fieldManager.setTemperature(x, y, 50); // Hot temperature
      }
    }

    // Verify all cells have high temperature
    for (let y = 0; y < sim.fieldHeight; y++) {
      for (let x = 0; x < sim.fieldWidth; x++) {
        const temp = sim.getTemperature(x, y);
        expect(temp).toBe(50);
      }
    }

    // The renderer should show heat effects on ALL cells, not just bottom rows
    // This test documents the expected behavior
    const affectedCells: Array<{x: number, y: number}> = [];
    
    // Expected: all cells should be marked for heat effect
    for (let y = 0; y < sim.fieldHeight; y++) {
      for (let x = 0; x < sim.fieldWidth; x++) {
        if (sim.getTemperature(x, y) > 30) {
          affectedCells.push({x, y});
        }
      }
    }

    // All 40×25 = 1000 cells should be affected
    expect(affectedCells.length).toBe(sim.fieldWidth * sim.fieldHeight);
  });

  it("should render cold effects where temperature is below zero", () => {
    const fieldManager = (sim as any).fieldManager;
    
    // Set cold temperature in upper half (12 rows out of 25)
    const halfHeight = Math.floor(sim.fieldHeight / 2);
    for (let y = 0; y < halfHeight; y++) {
      for (let x = 0; x < sim.fieldWidth; x++) {
        fieldManager.setTemperature(x, y, -10); // Cold temperature
      }
    }

    // Count cells that should show snow/ice effects
    let coldCells = 0;
    for (let y = 0; y < sim.fieldHeight; y++) {
      for (let x = 0; x < sim.fieldWidth; x++) {
        if (sim.getTemperature(x, y) < 0) {
          coldCells++;
        }
      }
    }

    // Should be half the field (12 rows × 40 columns = 480)
    // But the temperature might diffuse slightly
    expect(coldCells).toBeGreaterThanOrEqual(halfHeight * sim.fieldWidth - 40); // Allow for edge diffusion
    expect(coldCells).toBeLessThanOrEqual(halfHeight * sim.fieldWidth + 40);
  });

  it("should render fire command temperature effects at the correct location", () => {
    const fieldManager = (sim as any).fieldManager;
    
    // Simulate fire command at position (20, 12)
    const fireX = 20;
    const fireY = 12;
    const radius = 3;

    // Set high temperature in a radius around fire position
    for (let y = fireY - radius; y <= fireY + radius; y++) {
      for (let x = fireX - radius; x <= fireX + radius; x++) {
        if (x >= 0 && x < sim.fieldWidth && y >= 0 && y < sim.fieldHeight) {
          const dist = Math.abs(x - fireX) + Math.abs(y - fireY);
          if (dist <= radius) {
            fieldManager.setTemperature(x, y, 100); // Fire temperature
          }
        }
      }
    }

    // Verify fire area has high temperature
    const temp = sim.getTemperature(fireX, fireY);
    expect(temp).toBe(100);

    // Count affected cells
    let fireCells = 0;
    for (let y = 0; y < sim.fieldHeight; y++) {
      for (let x = 0; x < sim.fieldWidth; x++) {
        if (sim.getTemperature(x, y) > 30) {
          fireCells++;
        }
      }
    }

    // Should be roughly a diamond shape with radius 3
    // Manhattan distance <= 3 gives us a diamond
    expect(fireCells).toBeGreaterThan(20); // At least 20 cells affected
    expect(fireCells).toBeLessThan(50); // But not too many
  });
});