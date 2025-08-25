/**
 * Attack pattern generation utilities
 * Provides functions to create various attack zone patterns
 */

export interface AttackZone {
  x: number;
  y: number;
}

export interface AttackPatternConfig {
  origin: { x: number; y: number };
  direction: 'left' | 'right' | 'up' | 'down';
  range: number;
  pattern: 'cone' | 'line' | 'wave' | 'burst';
  width?: number;
  taper?: number; // How much to reduce width per distance
}

/**
 * Generate a cone/tapered attack pattern
 * Wider at the base, narrower at the tip
 */
export function generateConePattern(config: AttackPatternConfig): AttackZone[] {
  const zones: AttackZone[] = [];
  const { origin, direction, range } = config;
  
  // Base width and taper amount
  const baseWidth = config.width || 11; // Very wide base
  const taperRate = config.taper || 1.5; // Reduce by 1.5 per distance
  
  const dx = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
  const dy = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
  
  for (let dist = 1; dist <= range; dist++) {
    const centerX = origin.x + dx * dist;
    const centerY = origin.y + dy * dist;
    
    // Calculate width at this distance
    const width = Math.max(1, baseWidth - Math.floor(dist * taperRate));
    const halfWidth = Math.floor(width / 2);
    
    // Add zones perpendicular to attack direction
    if (dx !== 0) {
      // Horizontal attack - spread vertically
      for (let offset = -halfWidth; offset <= halfWidth; offset++) {
        zones.push({ x: centerX, y: centerY + offset });
      }
    } else {
      // Vertical attack - spread horizontally
      for (let offset = -halfWidth; offset <= halfWidth; offset++) {
        zones.push({ x: centerX + offset, y: centerY });
      }
    }
  }
  
  return zones;
}

/**
 * Generate a wave pattern - oscillating width
 */
export function generateWavePattern(config: AttackPatternConfig): AttackZone[] {
  const zones: AttackZone[] = [];
  const { origin, direction, range } = config;
  
  const baseWidth = config.width || 7;
  const dx = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
  const dy = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
  
  for (let dist = 1; dist <= range; dist++) {
    const centerX = origin.x + dx * dist;
    const centerY = origin.y + dy * dist;
    
    // Oscillate width using sine wave
    const width = Math.floor(baseWidth + Math.sin(dist * 0.5) * 3);
    const halfWidth = Math.floor(width / 2);
    
    if (dx !== 0) {
      for (let offset = -halfWidth; offset <= halfWidth; offset++) {
        zones.push({ x: centerX, y: centerY + offset });
      }
    } else {
      for (let offset = -halfWidth; offset <= halfWidth; offset++) {
        zones.push({ x: centerX + offset, y: centerY });
      }
    }
  }
  
  return zones;
}

/**
 * Generate a burst pattern - circular explosion
 */
export function generateBurstPattern(config: AttackPatternConfig): AttackZone[] {
  const zones: AttackZone[] = [];
  const { origin, range } = config;
  
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= range) {
        zones.push({ 
          x: Math.round(origin.x + dx), 
          y: Math.round(origin.y + dy) 
        });
      }
    }
  }
  
  return zones;
}

/**
 * Generate a line pattern - straight line attack
 */
export function generateLinePattern(config: AttackPatternConfig): AttackZone[] {
  const zones: AttackZone[] = [];
  const { origin, direction, range } = config;
  
  const width = config.width || 1;
  const dx = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
  const dy = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
  
  for (let dist = 1; dist <= range; dist++) {
    const centerX = origin.x + dx * dist;
    const centerY = origin.y + dy * dist;
    
    if (width === 1) {
      zones.push({ x: centerX, y: centerY });
    } else {
      const halfWidth = Math.floor(width / 2);
      if (dx !== 0) {
        for (let offset = -halfWidth; offset <= halfWidth; offset++) {
          zones.push({ x: centerX, y: centerY + offset });
        }
      } else {
        for (let offset = -halfWidth; offset <= halfWidth; offset++) {
          zones.push({ x: centerX + offset, y: centerY });
        }
      }
    }
  }
  
  return zones;
}

/**
 * Main function to generate attack patterns
 */
export function generateAttackPattern(config: AttackPatternConfig): AttackZone[] {
  switch (config.pattern) {
    case 'cone':
      return generateConePattern(config);
    case 'wave':
      return generateWavePattern(config);
    case 'burst':
      return generateBurstPattern(config);
    case 'line':
      return generateLinePattern(config);
    default:
      return generateConePattern(config);
  }
}