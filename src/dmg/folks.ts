import { Unit } from '../types/Unit';
import folksData from '../../data/folks.json';

/**
 * Folks module - loads folk units from folks.json
 */
export class Folks {
  private static folksCache: Map<string, Unit> | null = null;

  /**
   * Get all folk units
   */
  static get all(): Map<string, Unit> {
    if (!this.folksCache) {
      this.folksCache = new Map();
      
      for (const [folkName, folkData] of Object.entries(folksData)) {
        this.folksCache.set(folkName, {
          id: folkName,
          pos: { x: 0, y: 0 },
          ...(folkData as any)
        });
      }
    }
    
    return this.folksCache;
  }

  /**
   * Get a specific folk unit by name
   */
  static get(name: string): Unit | undefined {
    return this.all.get(name);
  }

  /**
   * Get list of folk names
   */
  static get names(): string[] {
    return Array.from(this.all.keys());
  }

  /**
   * Reset cache (useful for testing)
   */
  static resetCache(): void {
    this.folksCache = null;
  }

  static include(creatureName: string): boolean {
    return this.all.has(creatureName);
  }
}