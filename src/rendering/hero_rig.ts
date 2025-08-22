import { Vec2 } from "../types/Vec2";

export interface BodyPart {
  name: 'head' | 'torso' | 'larm' | 'rarm' | 'lleg' | 'rleg' | 'sword';
  sprite: string;
  offset: Vec2;      // Offset from hero center
  rotation: number;  // Rotation in radians
  scale: number;     // Scale factor
  frame: number;     // Which of the 3 frames (0-2)
  zIndex: number;    // Draw order
}

export interface RigAnimation {
  name: string;
  frames: BodyPartFrame[];
  loop: boolean;
  duration: number; // Total duration in ticks
}

export interface BodyPartFrame {
  tick: number; // When this frame starts
  parts: Partial<Record<BodyPart['name'], Partial<BodyPart>>>;
}

export class HeroRig {
  private parts: Map<BodyPart['name'], BodyPart>;
  private animations: Map<string, RigAnimation>;
  private currentAnimation?: string;
  private animationTime: number = 0;
  
  constructor() {
    this.parts = new Map();
    this.animations = new Map();
    this.setupDefaultPose();
    this.setupAnimations();
  }
  
  private setupDefaultPose() {
    // Default T-pose setup with proper draw order
    this.parts.set('lleg', {
      name: 'lleg',
      sprite: 'hero-lleg',
      offset: { x: -2, y: 8 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 1
    });
    
    this.parts.set('rleg', {
      name: 'rleg',
      sprite: 'hero-rleg',
      offset: { x: 2, y: 8 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 1
    });
    
    this.parts.set('larm', {
      name: 'larm',
      sprite: 'hero-larm',
      offset: { x: -8, y: 0 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 2
    });
    
    this.parts.set('torso', {
      name: 'torso',
      sprite: 'hero-torso',
      offset: { x: 0, y: 0 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 3
    });
    
    this.parts.set('rarm', {
      name: 'rarm',
      sprite: 'hero-rarm',
      offset: { x: 8, y: 0 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 4
    });
    
    this.parts.set('head', {
      name: 'head',
      sprite: 'hero-head',
      offset: { x: 0, y: -8 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 5
    });
    
    this.parts.set('sword', {
      name: 'sword',
      sprite: 'hero-sword',
      offset: { x: 12, y: 0 },
      rotation: Math.PI / 4, // Diagonal
      scale: 1,
      frame: 0,
      zIndex: 6
    });
  }
  
  private setupAnimations() {
    // Breathing idle animation - 3 frames cycling
    this.animations.set('breathing', {
      name: 'breathing',
      loop: true,
      duration: 60,
      frames: [
        {
          tick: 0,
          parts: {
            head: { offset: { x: 0, y: -8 }, frame: 0 },
            torso: { offset: { x: 0, y: 0 }, frame: 0 },
            larm: { rotation: 0.05, frame: 0 },
            rarm: { rotation: -0.05, frame: 0 }
          }
        },
        {
          tick: 20,
          parts: {
            head: { offset: { x: 0, y: -8.5 }, rotation: 0.02, frame: 1 },
            torso: { offset: { x: 0, y: -0.5 }, frame: 1 },
            larm: { rotation: 0.08, frame: 1 },
            rarm: { rotation: -0.08, frame: 1 }
          }
        },
        {
          tick: 40,
          parts: {
            head: { offset: { x: 0, y: -9 }, rotation: -0.02, frame: 2 },
            torso: { offset: { x: 0, y: -1 }, frame: 2 },
            larm: { rotation: 0.05, frame: 2 },
            rarm: { rotation: -0.05, frame: 2 }
          }
        }
      ]
    });
    
    // Wind in hair animation - subtle head movement
    this.animations.set('wind', {
      name: 'wind',
      loop: true,
      duration: 90,
      frames: [
        {
          tick: 0,
          parts: {
            head: { rotation: 0, frame: 0 }
          }
        },
        {
          tick: 30,
          parts: {
            head: { rotation: -0.05, offset: { x: -0.5, y: -8 }, frame: 1 }
          }
        },
        {
          tick: 60,
          parts: {
            head: { rotation: 0.05, offset: { x: 0.5, y: -8 }, frame: 2 }
          }
        }
      ]
    });
  }
  
  play(animationName: string) {
    if (this.animations.has(animationName)) {
      this.currentAnimation = animationName;
      this.animationTime = 0;
    }
  }
  
  update(deltaTime: number = 1) {
    if (!this.currentAnimation) return;
    
    const anim = this.animations.get(this.currentAnimation);
    if (!anim) return;
    
    this.animationTime += deltaTime;
    
    if (anim.loop && this.animationTime >= anim.duration) {
      this.animationTime = this.animationTime % anim.duration;
    }
    
    // Find current frame
    let currentFrame: BodyPartFrame | undefined;
    let nextFrame: BodyPartFrame | undefined;
    
    for (let i = 0; i < anim.frames.length; i++) {
      if (anim.frames[i].tick <= this.animationTime) {
        currentFrame = anim.frames[i];
        nextFrame = anim.frames[i + 1] || (anim.loop ? anim.frames[0] : undefined);
      }
    }
    
    if (currentFrame) {
      this.applyFrame(currentFrame);
    }
  }
  
  private applyFrame(frame: BodyPartFrame) {
    for (const [partName, updates] of Object.entries(frame.parts)) {
      const part = this.parts.get(partName as BodyPart['name']);
      if (part) {
        Object.assign(part, updates);
      }
    }
  }
  
  getParts(): BodyPart[] {
    return Array.from(this.parts.values()).sort((a, b) => a.zIndex - b.zIndex);
  }
  
  getPartByName(name: BodyPart['name']): BodyPart | undefined {
    return this.parts.get(name);
  }
}