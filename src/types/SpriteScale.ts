/**
 * Sprite scale system for different unit sizes
 * Each scale represents a different sprite dimension category
 */
export enum SpriteScale {
  PIXIE = "pixie", // 8x8 - tiny creatures
  FOLK = "folk", // 16x16 - standard humanoids and creatures
  CREATURE = "creature", // 24x24 - larger creatures and mounts
  HERO = "hero", // 48x48 - hero units
  TITAN = "titan", // 64x64 - huge creatures
  DEITY = "deity", // 128x128 - godlike beings
}

/**
 * Get sprite dimensions for a given scale
 */
export function getSpriteDimensions(scale: SpriteScale): {
  width: number;
  height: number;
} {
  switch (scale) {
    case SpriteScale.PIXIE:
      return { width: 8, height: 8 };
    case SpriteScale.FOLK:
      return { width: 16, height: 16 };
    case SpriteScale.CREATURE:
      return { width: 24, height: 24 };
    case SpriteScale.HERO:
      return { width: 48, height: 48 }; // Each frame is 48x48
    case SpriteScale.TITAN:
      return { width: 64, height: 64 };
    case SpriteScale.DEITY:
      return { width: 128, height: 128 };
    default:
      return { width: 16, height: 16 }; // Default to folk size
  }
}

/**
 * Determine appropriate scale based on unit type/tags
 */
export function getUnitScale(unit: any): SpriteScale {
  if (unit.meta?.scale) {
    return unit.meta.scale;
  }

  if (unit.tags?.includes("pixie") || unit.tags?.includes("tiny")) {
    return SpriteScale.PIXIE;
  }

  if (unit.tags?.includes("hero") || unit.tags?.includes("champion")) {
    return SpriteScale.HERO;
  }

  if (unit.tags?.includes("titan") || unit.tags?.includes("colossal")) {
    return SpriteScale.TITAN;
  }

  if (unit.tags?.includes("deity") || unit.tags?.includes("god")) {
    return SpriteScale.DEITY;
  }

  if (unit.meta?.huge) {
    return SpriteScale.TITAN;
  }

  return SpriteScale.FOLK;
}
