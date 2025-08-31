import { describe, it, expect, beforeEach, mock } from "bun:test";
import { UnitRenderer } from "../../src/rendering/unit_renderer";
import { Unit } from "../../src/types/Unit";
import { Simulator } from "../../src/core/simulator";

describe("Freeze Overlay Rendering", () => {
  let renderer: UnitRenderer;
  let sim: Simulator;
  let mockCtx: any;
  let mockSprites: Map<string, HTMLImageElement>;
  let drawImageCalls: any[];

  beforeEach(() => {
    sim = new Simulator(40, 25);
    renderer = new UnitRenderer(sim);
    drawImageCalls = [];
    
    // Mock canvas context
    mockCtx = {
      save: () => {},
      restore: () => {},
      drawImage: (...args: any[]) => { drawImageCalls.push(args); },
      fillRect: () => {},
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      globalAlpha: 1,
      fillStyle: "",
    };

    // Mock sprites
    mockSprites = new Map();
    const iceCubeSprite = {
      complete: true,
      width: 16,
      height: 16,
    } as HTMLImageElement;
    mockSprites.set('ice-cube', iceCubeSprite);
  });

  it("should render ice cube overlay for frozen units", () => {
    const frozenUnit: Unit = {
      id: "frozen-test",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "neutral" as const,
      sprite: "squirrel",
      meta: {
        frozen: true
      },
      intendedMove: { x: 0, y: 0 },
      state: "idle" as const,
      mass: 1,
      abilities: []
    };

    // Render the unit
    renderer.renderUnit(mockCtx, frozenUnit, mockSprites, 100, 100, {});

    // Verify ice cube overlay was drawn
    expect(drawImageCalls.length).toBeGreaterThan(0);
    
    // Should have drawn the ice cube sprite
    const iceCubeCall = drawImageCalls.find(call => call[0] === mockSprites.get('ice-cube'));
    expect(iceCubeCall).toBeDefined();
  });

  it("should render ice cube overlay for stunned units", () => {
    const stunnedUnit: Unit = {
      id: "stunned-test",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "neutral" as const,
      sprite: "squirrel",
      state: "idle" as const,
      meta: { stunned: true },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      abilities: []
    };

    // Render the unit
    renderer.renderUnit(mockCtx, stunnedUnit, mockSprites, 100, 100, {});

    // Verify ice cube overlay was drawn
    const iceCubeCall = drawImageCalls.find(call => call[0] === mockSprites.get('ice-cube'));
    expect(iceCubeCall).toBeDefined();
  });

  it("should not render ice cube overlay for normal units", () => {
    const normalUnit: Unit = {
      id: "normal-test",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "neutral" as const,
      sprite: "squirrel",
      state: "idle" as const,
      meta: {},
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      abilities: []
    };

    // Mock sprite for the unit
    const squirrelSprite = {
      complete: true,
      width: 16,
      height: 16,
    } as HTMLImageElement;
    mockSprites.set('squirrel', squirrelSprite);

    // Clear previous calls
    drawImageCalls = [];

    // Render the unit
    renderer.renderUnit(mockCtx, normalUnit, mockSprites, 100, 100, {});

    // Should not have drawn the ice cube
    const iceCubeCall = drawImageCalls.find(call => call[0] === mockSprites.get('ice-cube'));
    expect(iceCubeCall).toBeUndefined();
  });

  it("should apply pulsing effect to ice cube overlay", () => {
    const frozenUnit: Unit = {
      id: "pulse-test",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "neutral" as const,
      sprite: "squirrel",
      meta: {
        frozen: true
      },
      intendedMove: { x: 0, y: 0 },
      state: "idle" as const,
      mass: 1,
      abilities: []
    };

    // Mock Date.now to control pulse calculation
    const originalDateNow = Date.now;
    Date.now = () => 1000;

    renderer.renderUnit(mockCtx, frozenUnit, mockSprites, 100, 100, {});

    // The pulsing effect should modify the size
    // Size = 16 * (Math.sin(1000 * 0.003) * 0.1 + 0.9)
    // Size = 16 * (Math.sin(3) * 0.1 + 0.9)
    // Size = 16 * (0.141 * 0.1 + 0.9) = 16 * 0.914 = ~14.6

    const iceCall = drawImageCalls.find(call => call[0] === mockSprites.get('ice-cube'));
    expect(iceCall).toBeDefined();
    
    if (iceCall) {
      const width = iceCall[7]; // Destination width
      const height = iceCall[8]; // Destination height
      expect(width).toBeCloseTo(14.6, 0); // Pulsing size
      expect(height).toBeCloseTo(14.6, 0);
    }

    // Restore Date.now
    Date.now = originalDateNow;
  });
});