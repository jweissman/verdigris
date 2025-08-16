export interface CameraShake {
  id: string;
  intensity: number;
  duration: number;
  remainingTime: number;
  frequency: number;
}

export interface VisualEffect {
  id: string;
  type:
    | "flash"
    | "screen-tint"
    | "particle-burst"
    | "screen-shake"
    | "zoom-pulse";
  pos?: { x: number; y: number };
  color?: string;
  intensity: number;
  duration: number;
  remainingTime: number;
  params?: any;
}

export class CameraEffects {
  private shakes: Map<string, CameraShake> = new Map();
  private effects: Map<string, VisualEffect> = new Map();
  private nextId = 0;

  addShake(
    intensity: number,
    duration: number,
    frequency: number = 20,
  ): string {
    const id = `shake_${this.nextId++}`;

    this.shakes.set(id, {
      id,
      intensity,
      duration,
      remainingTime: duration,
      frequency,
    });

    return id;
  }

  addEffect(
    type: VisualEffect["type"],
    intensity: number,
    duration: number,
    params?: any,
  ): string {
    const id = `effect_${this.nextId++}`;

    this.effects.set(id, {
      id,
      type,
      intensity,
      duration,
      remainingTime: duration,
      params: params || {},
    });

    return id;
  }

  addFlash(
    color: string,
    intensity: number = 1.0,
    duration: number = 10,
  ): string {
    return this.addEffect("flash", intensity, duration, { color });
  }

  addScreenTint(
    color: string,
    intensity: number = 0.5,
    duration: number = 30,
  ): string {
    return this.addEffect("screen-tint", intensity, duration, { color });
  }

  addParticleBurst(
    pos: { x: number; y: number },
    color: string,
    count: number = 20,
    duration: number = 60,
  ): string {
    return this.addEffect("particle-burst", 1.0, duration, {
      pos,
      color,
      count,
    });
  }

  addZoomPulse(intensity: number = 0.1, duration: number = 20): string {
    return this.addEffect("zoom-pulse", intensity, duration);
  }

  getShakeOffset(): { x: number; y: number } {
    let totalX = 0;
    let totalY = 0;
    let maxIntensity = 0;

    for (const shake of this.shakes.values()) {
      if (shake.remainingTime > 0) {
        const progress = shake.remainingTime / shake.duration;
        const currentIntensity = shake.intensity * progress;

        const angle = (shake.duration - shake.remainingTime) * shake.frequency;
        const x = Math.sin(angle) * currentIntensity;
        const y = Math.cos(angle * 1.3) * currentIntensity; // Different frequency for variety

        totalX += x;
        totalY += y;
        maxIntensity = Math.max(maxIntensity, currentIntensity);
      }
    }

    const maxOffset = 10;
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, totalX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, totalY)),
    };
  }

  getActiveEffects(): VisualEffect[] {
    return Array.from(this.effects.values()).filter(
      (effect) => effect.remainingTime > 0,
    );
  }

  update(): void {
    for (const [id, shake] of this.shakes.entries()) {
      shake.remainingTime--;
      if (shake.remainingTime <= 0) {
        this.shakes.delete(id);
      }
    }

    for (const [id, effect] of this.effects.entries()) {
      effect.remainingTime--;
      if (effect.remainingTime <= 0) {
        this.effects.delete(id);
      }
    }
  }

  clear(): void {
    this.shakes.clear();
    this.effects.clear();
  }

  groundPoundEffect(pos: { x: number; y: number }): void {
    this.addShake(8, 30, 25);
    this.addFlash("#8B4513", 0.6, 15); // Brown flash
    this.addParticleBurst(pos, "#8B4513", 25, 80);
    this.addZoomPulse(0.15, 25);
  }

  explosionEffect(pos: { x: number; y: number }): void {
    this.addShake(12, 25, 30);
    this.addFlash("#FF4500", 0.8, 12); // Orange flash
    this.addParticleBurst(pos, "#FF4500", 30, 60);
    this.addZoomPulse(0.2, 20);
  }

  heroicLeapEffect(
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
  ): void {
    this.addShake(6, 20, 15);
    this.addFlash("#FFD700", 0.4, 20); // Gold flash
    this.addParticleBurst(startPos, "#FFD700", 15, 40);
    this.addParticleBurst(endPos, "#FFD700", 20, 50);
  }

  berserkerRageEffect(): void {
    this.addScreenTint("#FF0000", 0.3, 120); // Red tint for rage duration
    this.addShake(3, 120, 8); // Persistent light shake during rage
  }

  stealthEffect(): void {
    this.addScreenTint("#4B0082", 0.2, 60); // Purple tint for stealth
    this.addFlash("#4B0082", 0.3, 10);
  }
}

export const cameraEffects = new CameraEffects();
