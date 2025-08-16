import { describe, expect, it } from 'bun:test';
import { CameraEffects } from '../../src/core/camera_effects';

describe('Camera Effects', () => {
  it('should manage camera shake effects', () => {

    
    const effects = new CameraEffects();
    

    const shakeId = effects.addShake(5, 20, 15);

    

    for (let frame = 0; frame < 25; frame++) {
      const offset = effects.getShakeOffset();
      
      if (frame < 20) {

        const magnitude = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
        if (frame === 0 || frame === 10 || frame === 19) {

        }
        expect(magnitude).toBeGreaterThan(0);
      } else {

        expect(offset.x).toBe(0);
        expect(offset.y).toBe(0);
      }
      
      effects.update();
    }
    

  });

  it('should manage visual effects', () => {

    
    const effects = new CameraEffects();
    

    const flashId = effects.addFlash('#FF0000', 0.8, 15);
    const tintId = effects.addScreenTint('#0000FF', 0.5, 30);
    const burstId = effects.addParticleBurst({ x: 10, y: 5 }, '#00FF00', 25, 40);
    const pulseId = effects.addZoomPulse(0.2, 20);
    

    

    let activeEffects = effects.getActiveEffects();
    expect(activeEffects.length).toBe(4);

    

    for (let i = 0; i < 10; i++) {
      effects.update();
    }
    
    activeEffects = effects.getActiveEffects();
    expect(activeEffects.length).toBe(4); // All should still be active

    

    for (let i = 0; i < 10; i++) {
      effects.update();
    }
    
    activeEffects = effects.getActiveEffects();
    expect(activeEffects.length).toBeLessThan(4); // Some effects should have expired

    

    activeEffects.forEach(effect => {

    });
  });

  it('should provide hero ability effect presets', () => {

    
    const effects = new CameraEffects();
    

    effects.groundPoundEffect({ x: 15, y: 8 });
    let activeEffects = effects.getActiveEffects();
    let shakeOffset = effects.getShakeOffset();
    



    
    activeEffects.forEach(effect => {

    });
    
    expect(activeEffects.length).toBeGreaterThan(2);
    expect(Math.abs(shakeOffset.x) + Math.abs(shakeOffset.y)).toBeGreaterThan(0);
    
    effects.clear();
    

    effects.explosionEffect({ x: 20, y: 10 });
    activeEffects = effects.getActiveEffects();
    shakeOffset = effects.getShakeOffset();
    



    
    expect(activeEffects.length).toBeGreaterThan(2);
    
    effects.clear();
    

    effects.berserkerRageEffect();
    activeEffects = effects.getActiveEffects();
    



    
    const tintEffect = activeEffects.find(e => e.type === 'screen-tint');
    expect(tintEffect).toBeDefined();
    expect(tintEffect?.duration).toBeGreaterThan(60);
    

  });

  it('should handle multiple overlapping effects', () => {

    
    const effects = new CameraEffects();
    

    effects.addShake(3, 30, 20);
    effects.addShake(7, 20, 25);
    effects.addShake(2, 40, 15);
    

    const offset1 = effects.getShakeOffset();
    const magnitude1 = Math.sqrt(offset1.x * offset1.x + offset1.y * offset1.y);
    



    
    expect(magnitude1).toBeGreaterThan(5); // Should be significant
    expect(magnitude1).toBeLessThan(15); // Should be clamped
    

    effects.addFlash('#FF0000', 0.5, 20);
    effects.addFlash('#00FF00', 0.3, 25);
    effects.addScreenTint('#0000FF', 0.4, 30);
    
    const activeEffects = effects.getActiveEffects();

    
    expect(activeEffects.length).toBe(3);
  });
});