// Test script to verify interpolation is working
console.log("Testing interpolation at 10Hz sim rate...");

// At 10Hz, sim ticks every 100ms
// At 60fps, we render every 16.67ms
// So we should see interpolation factors: 0, 0.167, 0.333, 0.5, 0.667, 0.833, then reset to 0

let lastSimTime = Date.now();
const simTickInterval = 1000 / 10; // 100ms

for (let frame = 0; frame < 10; frame++) {
  const now = Date.now() + (frame * 16.67); // Simulate 60fps
  const timeSinceLastSim = now - lastSimTime;
  const interpolationFactor = Math.min(1, timeSinceLastSim / simTickInterval);
  
  console.log(`Frame ${frame}: timeSince=${timeSinceLastSim.toFixed(1)}ms, factor=${interpolationFactor.toFixed(3)}`);
  
  if (timeSinceLastSim >= simTickInterval) {
    console.log("  -> SIM TICK!");
    lastSimTime = now;
  }
}