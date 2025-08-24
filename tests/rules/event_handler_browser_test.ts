import { describe, it, expect } from "bun:test";
import { EventHandler } from "../../src/rules/event_handler";
import { TickContextImpl } from "../../src/core/tick_context";
import { Simulator } from "../../src/core/simulator";

describe("EventHandler browser compatibility", () => {
  it("should not crash when process is undefined", () => {
    // Simulate browser environment where process is undefined
    const originalProcess = global.process;
    // @ts-ignore
    delete global.process;
    
    try {
      const sim = new Simulator(10, 10);
      const handler = new EventHandler();
      const context = new TickContextImpl(sim, []);
      
      // Add a test event
      sim.processedEvents.push({
        kind: "damage",
        target: "test-unit",
        amount: 10,
        meta: { tick: 1 }
      });
      
      // This should not throw even without process defined
      expect(() => {
        handler.execute(context);
      }).not.toThrow();
      
    } finally {
      // Restore process
      global.process = originalProcess;
    }
  });
});