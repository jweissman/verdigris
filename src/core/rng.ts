/**
 * Simple seedable RNG for deterministic simulation
 * Uses a linear congruential generator (LCG)
 */
export class RNG {
  private seed: number;
  
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  
  // LCG parameters from Numerical Recipes
  private next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
    return this.seed / 2147483647;
  }
  
  // Get random float [0, 1)
  random(): number {
    return this.next();
  }
  
  // Get random int [min, max] inclusive
  randomInt(min: number, max: number): number {
    return Math.floor(min + this.random() * (max - min + 1));
  }

  dn(faces: number): number { return this.randomInt(1, faces); }

  d3 = () => this.dn(3)
  
  
  // Pick random element from array
  randomChoice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }
  
  // Reset to original seed
  reset(seed?: number): void {
    this.seed = seed ?? this.seed;
  }
}

// Global instance - can be replaced with seeded version for tests
export let globalRNG = new RNG();

// Helper to set a deterministic seed
export function setSeed(seed: number): void {
  globalRNG = new RNG(seed);
}

// Backward compatibility wrapper
export const random = () => globalRNG.random();
export const randomInt = (min: number, max: number) => globalRNG.randomInt(min, max);
export const randomChoice = <T>(array: T[]) => globalRNG.randomChoice(array);