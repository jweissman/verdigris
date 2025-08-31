import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../src/core/simulator";
import IsometricView from "../src/views/isometric";

describe("Hero Rendering Wobble Issue", () => {
  let sim: Simulator;
  let view: IsometricView;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  
  beforeEach(() => {
    sim = new Simulator(40, 40);
    
    // Create mock canvas context
    canvas = {
      width: 800,
      height: 600,
      getContext: () => ctx,
    } as any;
    
    ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      fillRect: () => {},
      drawImage: () => {},
      clearRect: () => {},
      fillStyle: "",
      globalAlpha: 1,
    } as any;
    
    view = new IsometricView(ctx, sim, 800, 600, new Map(), new Map());
  });

  it("hero RENDERED X position should NOT change when moving down in Y axis", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      meta: { controlled: true, useRig: true },
      intendedMove: { x: 0, y: 0 },
    });

    // Track rendered positions
    const renderedPositions = [];
    
    // Override drawImage to capture actual render positions
    let lastDrawnX = null;
    let lastDrawnY = null;
    ctx.drawImage = (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
      // Capture the destination x,y where hero is actually drawn
      if (dx !== undefined && dy !== undefined) {
        lastDrawnX = dx;
        lastDrawnY = dy;
      }
    };
    
    // Initial render
    view.show();
    const initialX = lastDrawnX;
    console.log(`Initial rendered X: ${initialX}`);
    
    // Move down multiple times and check rendered position
    for (let i = 0; i < 5; i++) {
      // Queue move down command
      sim.queuedCommands.push({
        type: "hero",
        params: { action: "down" },
      });
      
      // Step simulation
      sim.step();
      
      // Update view interpolations
      view.updateMovementInterpolations();
      
      // Render
      view.show();
      
      console.log(`Step ${i}: hero.pos=(${hero.pos.x}, ${hero.pos.y}), rendered X=${lastDrawnX}, intendedMove=(${hero.intendedMove.x}, ${hero.intendedMove.y})`);
      
      renderedPositions.push({
        simX: hero.pos.x,
        simY: hero.pos.y,
        renderedX: lastDrawnX,
        renderedY: lastDrawnY,
      });
    }
    
    // Check that rendered X position never changes (no zigzag)
    for (let i = 0; i < renderedPositions.length; i++) {
      const pos = renderedPositions[i];
      expect(pos.simX).toBe(20); // Sim X should stay at 20
      
      // The key test: rendered X should be consistent!
      // In isometric with row offset, Y movement shouldn't cause X wobble
      if (initialX !== null) {
        expect(pos.renderedX).toBe(initialX); // Rendered X should NOT change!
      }
    }
  });

  it("hero animation should cycle smoothly when moving down, not jitter", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      meta: { controlled: true, useRig: true },
      intendedMove: { x: 0, y: 0 },
    });

    const animationStates = [];
    
    // Move down and track animation state
    for (let i = 0; i < 10; i++) {
      // Move down
      sim.queuedCommands.push({
        type: "hero",
        params: { action: "down" },
      });
      
      sim.step();
      
      // Capture animation state
      animationStates.push({
        tick: i,
        intendedMove: { ...hero.intendedMove },
        pos: { ...hero.pos },
        rig: hero.meta?.rig ? [...hero.meta.rig] : null,
      });
      
      console.log(`Tick ${i}: intendedMove=(${hero.intendedMove.x}, ${hero.intendedMove.y}), pos=(${hero.pos.x}, ${hero.pos.y})`);
    }
    
    // Check for jitter pattern: intendedMove flickering between (0,2) and (0,0)
    let flickerCount = 0;
    for (let i = 1; i < animationStates.length; i++) {
      const prev = animationStates[i-1];
      const curr = animationStates[i];
      
      // Detect flicker: intendedMove changes from non-zero to zero or vice versa
      const prevMoving = prev.intendedMove.y !== 0;
      const currMoving = curr.intendedMove.y !== 0;
      
      if (prevMoving !== currMoving) {
        flickerCount++;
        console.log(`Flicker at tick ${i}: ${prev.intendedMove.y} -> ${curr.intendedMove.y}`);
      }
    }
    
    // Should have minimal flickering (not every frame)
    expect(flickerCount).toBeLessThan(animationStates.length / 2);
  });

  it("hero moving up should animate, not freeze in first frame", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      meta: { controlled: true, useRig: true },
      intendedMove: { x: 0, y: 0 },
    });

    const rigStates = [];
    
    // Move up multiple times - need more steps for animation to progress
    for (let i = 0; i < 15; i++) {
      if (i % 3 === 0) {
        // Queue movement every 3rd step to keep hero moving
        sim.queuedCommands.push({
          type: "hero",
          params: { action: "up" },
        });
      }
      
      sim.step();
      
      // Capture rig state
      const rigParts = hero.meta?.rig;
      if (rigParts && rigParts.length > 0) {
        rigStates.push({
          tick: i,
          rig: [...rigParts],
          pos: { ...hero.pos },
        });
        
        // Log first part for debugging
        if (i === 0 || i === 14) {
          console.log(`Tick ${i} rig sample:`, rigParts[0]);
        }
      }
    }
    
    // Check that rig actually changes (animation progresses)
    let changesDetected = 0;
    let significantChanges = 0;
    for (let i = 1; i < rigStates.length; i++) {
      const prev = rigStates[i-1];
      const curr = rigStates[i];
      
      // Compare rig parts to see if animation changed
      const prevStr = JSON.stringify(prev.rig);
      const currStr = JSON.stringify(curr.rig);
      const changed = prevStr !== currStr;
      if (changed) {
        changesDetected++;
        // Check if it's a significant change (not just tiny floating point differences)
        if (prev.rig && curr.rig && prev.rig.length > 0 && curr.rig.length > 0) {
          const prevFirstPart = prev.rig[0];
          const currFirstPart = curr.rig[0];
          if (prevFirstPart && currFirstPart) {
            const xDiff = Math.abs((prevFirstPart.offset?.x || 0) - (currFirstPart.offset?.x || 0));
            const yDiff = Math.abs((prevFirstPart.offset?.y || 0) - (currFirstPart.offset?.y || 0));
            if (xDiff > 0.1 || yDiff > 0.1) {
              significantChanges++;
            }
          }
        }
      }
    }
    
    console.log(`Animation changes detected: ${changesDetected} out of ${rigStates.length - 1} steps`);
    console.log(`Significant changes: ${significantChanges}`);
    
    // Animation should change at least sometimes (not frozen)
    // Accept either any changes or significant changes
    expect(changesDetected > 0 || significantChanges > 0).toBe(true);
  });
});