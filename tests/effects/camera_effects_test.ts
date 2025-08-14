import { describe, expect, it } from 'bun:test';
import { CameraEffects } from '../../src/core/camera_effects';

describe('Camera Effects', () => {
  it('should manage camera shake effects', () => {
    console.log('📹 CAMERA SHAKE TEST');
    
    const effects = new CameraEffects();
    
    // Add a shake effect
    const shakeId = effects.addShake(5, 20, 15);
    console.log(`✅ Added shake: ${shakeId}`);
    
    // Test shake offset calculation
    for (let frame = 0; frame < 25; frame++) {
      const offset = effects.getShakeOffset();
      
      if (frame < 20) {
        // Should have shake offset during duration
        const magnitude = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
        if (frame === 0 || frame === 10 || frame === 19) {
          console.log(`Frame ${frame}: offset=(${offset.x.toFixed(2)}, ${offset.y.toFixed(2)}), magnitude=${magnitude.toFixed(2)}`);
        }
        expect(magnitude).toBeGreaterThan(0);
      } else {
        // Should have no shake after duration
        expect(offset.x).toBe(0);
        expect(offset.y).toBe(0);
      }
      
      effects.update();
    }
    
    console.log('✅ Shake decays properly over time');
  });

  it('should manage visual effects', () => {
    console.log('\n✨ VISUAL EFFECTS TEST');
    
    const effects = new CameraEffects();
    
    // Add various effects
    const flashId = effects.addFlash('#FF0000', 0.8, 15);
    const tintId = effects.addScreenTint('#0000FF', 0.5, 30);
    const burstId = effects.addParticleBurst({ x: 10, y: 5 }, '#00FF00', 25, 40);
    const pulseId = effects.addZoomPulse(0.2, 20);
    
    console.log(`Added effects: flash=${flashId}, tint=${tintId}, burst=${burstId}, pulse=${pulseId}`);
    
    // Test effect lifecycle
    let activeEffects = effects.getActiveEffects();
    expect(activeEffects.length).toBe(4);
    console.log(`Initial active effects: ${activeEffects.length}`);
    
    // Advance time
    for (let i = 0; i < 10; i++) {
      effects.update();
    }
    
    activeEffects = effects.getActiveEffects();
    expect(activeEffects.length).toBe(4); // All should still be active
    console.log(`After 10 frames: ${activeEffects.length} effects active`);
    
    // Advance past flash duration
    for (let i = 0; i < 10; i++) {
      effects.update();
    }
    
    activeEffects = effects.getActiveEffects();
    expect(activeEffects.length).toBeLessThan(4); // Some effects should have expired
    console.log(`After 20 frames: ${activeEffects.length} effects active (flash expired)`);
    
    // Check effect details
    activeEffects.forEach(effect => {
      console.log(`  ${effect.type}: intensity=${effect.intensity}, remaining=${effect.remainingTime}`);
    });
  });

  it('should provide hero ability effect presets', () => {
    console.log('\n🦸 HERO ABILITY EFFECTS TEST');
    
    const effects = new CameraEffects();
    
    // Test ground pound effect
    effects.groundPoundEffect({ x: 15, y: 8 });
    let activeEffects = effects.getActiveEffects();
    let shakeOffset = effects.getShakeOffset();
    
    console.log(`Ground Pound Effect:`);
    console.log(`  Active effects: ${activeEffects.length}`);
    console.log(`  Shake magnitude: ${Math.sqrt(shakeOffset.x * shakeOffset.x + shakeOffset.y * shakeOffset.y).toFixed(2)}`);
    
    activeEffects.forEach(effect => {
      console.log(`    ${effect.type}: ${effect.params?.color || 'no-color'}`);
    });
    
    expect(activeEffects.length).toBeGreaterThan(2);
    expect(Math.abs(shakeOffset.x) + Math.abs(shakeOffset.y)).toBeGreaterThan(0);
    
    effects.clear();
    
    // Test explosion effect
    effects.explosionEffect({ x: 20, y: 10 });
    activeEffects = effects.getActiveEffects();
    shakeOffset = effects.getShakeOffset();
    
    console.log(`\nExplosion Effect:`);
    console.log(`  Active effects: ${activeEffects.length}`);
    console.log(`  Shake magnitude: ${Math.sqrt(shakeOffset.x * shakeOffset.x + shakeOffset.y * shakeOffset.y).toFixed(2)}`);
    
    expect(activeEffects.length).toBeGreaterThan(2);
    
    effects.clear();
    
    // Test berserker rage effect
    effects.berserkerRageEffect();
    activeEffects = effects.getActiveEffects();
    
    console.log(`\nBerserker Rage Effect:`);
    console.log(`  Active effects: ${activeEffects.length}`);
    console.log(`  Long-duration effects for sustained rage`);
    
    const tintEffect = activeEffects.find(e => e.type === 'screen-tint');
    expect(tintEffect).toBeDefined();
    expect(tintEffect?.duration).toBeGreaterThan(60);
    
    console.log(`    Screen tint: ${tintEffect?.params?.color}, duration=${tintEffect?.duration}`);
  });

  it('should handle multiple overlapping effects', () => {
    console.log('\n🌪️ OVERLAPPING EFFECTS TEST');
    
    const effects = new CameraEffects();
    
    // Add multiple shakes with different intensities
    effects.addShake(3, 30, 20);
    effects.addShake(7, 20, 25);
    effects.addShake(2, 40, 15);
    
    // Test that shakes combine properly
    const offset1 = effects.getShakeOffset();
    const magnitude1 = Math.sqrt(offset1.x * offset1.x + offset1.y * offset1.y);
    
    console.log(`Multiple shakes combined:`);
    console.log(`  Offset: (${offset1.x.toFixed(2)}, ${offset1.y.toFixed(2)})`);
    console.log(`  Magnitude: ${magnitude1.toFixed(2)}`);
    
    expect(magnitude1).toBeGreaterThan(5); // Should be significant
    expect(magnitude1).toBeLessThan(15); // Should be clamped
    
    // Add multiple visual effects
    effects.addFlash('#FF0000', 0.5, 20);
    effects.addFlash('#00FF00', 0.3, 25);
    effects.addScreenTint('#0000FF', 0.4, 30);
    
    const activeEffects = effects.getActiveEffects();
    console.log(`  Active visual effects: ${activeEffects.length}`);
    
    expect(activeEffects.length).toBe(3);
  });
});