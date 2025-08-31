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
  direction: "left" | "right" | "up" | "down";
  range: number;
  pattern: "cone" | "line" | "wave" | "burst" | "visor";
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

  const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;

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
  const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;

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
export function generateBurstPattern(
  config: AttackPatternConfig,
): AttackZone[] {
  const zones: AttackZone[] = [];
  const { origin, range } = config;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= range) {
        zones.push({
          x: Math.round(origin.x + dx),
          y: Math.round(origin.y + dy),
        });
      }
    }
  }

  return zones;
}

/**
 * Generate a visor pattern - wide horizontal arc in front
 * Like a knight's visor or a wide sweep attack
 */
export function generateVisorPattern(
  config: AttackPatternConfig,
): AttackZone[] {
  const zones: AttackZone[] = [];
  const { origin, direction, range } = config;

  // Visor is very wide (width) but short-medium range
  const visorWidth = config.width || 11; // Even wider for better coverage
  const visorRange = Math.min(range, 4); // Slightly deeper reach

  const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;

  // For horizontal attacks (left/right)
  if (dx !== 0) {
    for (let dist = 1; dist <= visorRange; dist++) {
      const x = origin.x + dx * dist;
      // Wide vertical sweep
      for (
        let yOffset = -Math.floor(visorWidth / 2);
        yOffset <= Math.floor(visorWidth / 2);
        yOffset++
      ) {
        zones.push({ x, y: origin.y + yOffset });
      }
    }
  } else {
    // For vertical attacks (up/down)
    for (let dist = 1; dist <= visorRange; dist++) {
      const y = origin.y + dy * dist;
      // Wide horizontal sweep
      for (
        let xOffset = -Math.floor(visorWidth / 2);
        xOffset <= Math.floor(visorWidth / 2);
        xOffset++
      ) {
        zones.push({ x: origin.x + xOffset, y });
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
  const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;

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
export function generateAttackPattern(
  config: AttackPatternConfig,
): AttackZone[] {
  switch (config.pattern) {
    case "cone":
      return generateConePattern(config);
    case "wave":
      return generateWavePattern(config);
    case "burst":
      return generateBurstPattern(config);
    case "line":
      return generateLinePattern(config);
    case "visor":
      return generateVisorPattern(config);
    default:
      return generateConePattern(config);
  }
}
