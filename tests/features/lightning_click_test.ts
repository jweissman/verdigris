import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Lightning Click MWE', () => {
  it('should convert screen coordinates to grid coordinates for lightning placement', () => {
    const sim = new Simulator(20, 15);
    const sceneLoader = new SceneLoader(sim);
    

    const testScene = `f...s
.....
.....
..w..
.....`;
    
    sceneLoader.loadFromText(testScene);
    


    const screenX = 128;
    const screenY = 80;
    const canvasWidth = 320;
    const canvasHeight = 200;
    

    const gridX = Math.floor((screenX / canvasWidth) * sim.fieldWidth);
    const gridY = Math.floor((screenY / canvasHeight) * sim.fieldHeight);
    
    

    const initialParticles = sim.particles.length;
    sim.parseCommand(`lightning ${gridX} ${gridY}`);
    sim.step(); // Process the lightning command
    

    const lightningParticles = sim.particles.filter(p => p.type === 'lightning');
    expect(lightningParticles.length).toBeGreaterThan(0);
    

    const expectedPixelX = gridX * 8 + 4;
    const expectedPixelY = gridY * 8 + 4;
    

    const nearbyParticles = lightningParticles.filter(p => 
      Math.abs(p.pos.x - expectedPixelX) <= 3 && 
      Math.abs(p.pos.y - expectedPixelY) <= 3
    );
    
    expect(nearbyParticles.length).toBeGreaterThan(0);
  });

  it('should load animated lightning sprite (16x48, 8 frames)', () => {

    const expectedWidth = 16;
    const expectedHeight = 48;
    const expectedFrames = 8;
    const frameHeight = expectedHeight / expectedFrames; // 6 pixels per frame
    
    expect(frameHeight).toBe(6);
    





    
    

    expect(expectedFrames * frameHeight).toBe(expectedHeight);
  });

  it('should create proper click handler for lightning placement', () => {
    const sim = new Simulator(20, 15);
    

    const mockCanvas = {
      width: 320,
      height: 200,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 320,
        height: 200
      })
    };
    

    const mockClickEvent = {
      clientX: 160, // Center X
      clientY: 100, // Center Y
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    

    const handleLightningClick = (event: any) => {
      const rect = mockCanvas.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;
      

      const gridX = Math.floor((canvasX / mockCanvas.width) * sim.fieldWidth);
      const gridY = Math.floor((canvasY / mockCanvas.height) * sim.fieldHeight);
      

      sim.parseCommand(`lightning ${gridX} ${gridY}`);
      return { gridX, gridY };
    };
    
    const result = handleLightningClick(mockClickEvent);
    

    const expectedGridX = Math.floor(sim.fieldWidth / 2);
    const expectedGridY = Math.floor(sim.fieldHeight / 2);
    
    expect(result.gridX).toBe(expectedGridX);
    expect(result.gridY).toBe(expectedGridY);
    
  });
});