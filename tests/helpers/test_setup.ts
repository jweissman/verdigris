import { beforeEach } from 'bun:test';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Simulator } from '../../src/core/simulator';

/**
 * Reset global state for test isolation
 */
export function resetTestState() {
  // Reset Encyclopaedia unit ID counters
  Encyclopaedia.counts = {};
  
  // Reset Simulator RNG seed for deterministic tests
  Simulator.seed(12345);
}

/**
 * Use this in describe blocks to ensure clean test state
 */
export function setupTestEnvironment() {
  beforeEach(() => {
    resetTestState();
  });
}