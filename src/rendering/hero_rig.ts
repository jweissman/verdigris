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

export interface AnchorPoint {
  name: 'hand_l' | 'hand_r' | 'shoulder_l' | 'shoulder_r' | 'hip_l' | 'hip_r' | 'foot_l' | 'foot_r' | 'crown' | 'chest';
  position: Vec2;    // World position of anchor
  rotation: number;  // World rotation of anchor
  partName: BodyPart['name']; // Which body part this anchor follows
  localOffset: Vec2; // Offset from the body part's position
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

export type WeaponType = 'sword' | 'spear' | 'axe' | 'bow' | 'shield' | 'staff' | 'none';

export interface WeaponConfig {
  type: WeaponType;
  sprite: string;
  offset: Vec2;      // Offset from hand anchor
  rotation: number;  // Additional rotation
  scale: number;
  twoHanded?: boolean;
}

export class HeroRig {
  private parts: Map<BodyPart['name'], BodyPart>;
  private anchors: Map<AnchorPoint['name'], AnchorPoint>;
  private animations: Map<string, RigAnimation>;
  private currentAnimation?: string;
  private animationTime: number = 0;
  private currentWeapon: WeaponType = 'sword';
  private weaponConfigs: Map<WeaponType, WeaponConfig>;
  
  constructor() {
    this.parts = new Map();
    this.anchors = new Map();
    this.animations = new Map();
    this.weaponConfigs = new Map();
    this.setupDefaultPose();
    this.setupAnchors();
    this.setupWeapons();
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
  
  private setupAnchors() {
    // Define anchor points relative to body parts
    this.anchors.set('hand_l', {
      name: 'hand_l',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'larm',
      localOffset: { x: -4, y: 4 } // End of left arm
    });
    
    this.anchors.set('hand_r', {
      name: 'hand_r',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'rarm',
      localOffset: { x: 4, y: 4 } // End of right arm
    });
    
    this.anchors.set('shoulder_l', {
      name: 'shoulder_l',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'torso',
      localOffset: { x: -6, y: -2 }
    });
    
    this.anchors.set('shoulder_r', {
      name: 'shoulder_r',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'torso',
      localOffset: { x: 6, y: -2 }
    });
    
    this.anchors.set('hip_l', {
      name: 'hip_l',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'torso',
      localOffset: { x: -3, y: 6 }
    });
    
    this.anchors.set('hip_r', {
      name: 'hip_r',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'torso',
      localOffset: { x: 3, y: 6 }
    });
    
    this.anchors.set('foot_l', {
      name: 'foot_l',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'lleg',
      localOffset: { x: 0, y: 6 }
    });
    
    this.anchors.set('foot_r', {
      name: 'foot_r',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'rleg',
      localOffset: { x: 0, y: 6 }
    });
    
    this.anchors.set('crown', {
      name: 'crown',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'head',
      localOffset: { x: 0, y: -6 } // Top of head
    });
    
    this.anchors.set('chest', {
      name: 'chest',
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: 'torso',
      localOffset: { x: 0, y: 0 } // Center of torso
    });
  }
  
  private setupWeapons() {
    // Define weapon configurations
    this.weaponConfigs.set('sword', {
      type: 'sword',
      sprite: 'hero-sword',
      offset: { x: 4, y: 0 },
      rotation: Math.PI / 4,
      scale: 1
    });
    
    this.weaponConfigs.set('spear', {
      type: 'spear',
      sprite: 'hero-spear',
      offset: { x: 6, y: -2 },
      rotation: Math.PI / 6,
      scale: 1.2
    });
    
    this.weaponConfigs.set('axe', {
      type: 'axe',
      sprite: 'hero-axe',
      offset: { x: 3, y: 1 },
      rotation: Math.PI / 3,
      scale: 1
    });
    
    this.weaponConfigs.set('bow', {
      type: 'bow',
      sprite: 'hero-bow',
      offset: { x: 0, y: 0 },
      rotation: 0,
      scale: 1,
      twoHanded: true
    });
    
    this.weaponConfigs.set('shield', {
      type: 'shield',
      sprite: 'hero-shield',
      offset: { x: -2, y: 0 },
      rotation: 0,
      scale: 1
    });
    
    this.weaponConfigs.set('staff', {
      type: 'staff',
      sprite: 'hero-staff',
      offset: { x: 2, y: -4 },
      rotation: Math.PI / 8,
      scale: 1.3,
      twoHanded: true
    });
    
    this.weaponConfigs.set('none', {
      type: 'none',
      sprite: '',
      offset: { x: 0, y: 0 },
      rotation: 0,
      scale: 0
    });
    
    // Apply default weapon
    this.updateWeaponPart();
  }
  
  private setupAnimations() {
    // Breathing idle animation - actual breathing motion with torso movement
    this.animations.set('breathing', {
      name: 'breathing',
      loop: true,
      duration: 8, // Quick breathing cycle
      frames: [
        {
          tick: 0,
          parts: {
            // Inhale start - torso rises
            torso: { offset: { x: 0, y: 0 }, frame: 0 },
            head: { offset: { x: 0, y: -8 }, frame: 0 },
            larm: { offset: { x: -8, y: 0 }, rotation: 0.05, frame: 0 },
            rarm: { offset: { x: 8, y: 0 }, rotation: -0.05, frame: 0 },
            lleg: { offset: { x: -2, y: 8 }, frame: 0 },
            rleg: { offset: { x: 2, y: 8 }, frame: 0 }
          }
        },
        {
          tick: 2,
          parts: {
            // Peak inhale - torso up and slightly back
            torso: { offset: { x: -0.5, y: -2 }, frame: 1 }, // Up and back
            head: { offset: { x: -0.5, y: -10 }, rotation: -0.05, frame: 1 }, // Follow torso
            larm: { offset: { x: -8.5, y: -2 }, rotation: 0.1, frame: 1 }, // Arms rise
            rarm: { offset: { x: 8.5, y: -2 }, rotation: -0.1, frame: 1 },
            lleg: { offset: { x: -2, y: 8 }, frame: 1 },
            rleg: { offset: { x: 2, y: 8 }, frame: 1 }
          }
        },
        {
          tick: 4,
          parts: {
            // Hold - slight sway
            torso: { offset: { x: 0.5, y: -1.5 }, frame: 2 }, // Sway right
            head: { offset: { x: 0.5, y: -9.5 }, rotation: 0.02, frame: 2 },
            larm: { offset: { x: -7.5, y: -1.5 }, rotation: 0.08, frame: 2 },
            rarm: { offset: { x: 8.5, y: -1.5 }, rotation: -0.08, frame: 2 },
            lleg: { offset: { x: -2, y: 8 }, frame: 2 },
            rleg: { offset: { x: 2, y: 8 }, frame: 2 }
          }
        },
        {
          tick: 6,
          parts: {
            // Exhale - torso drops and forward
            torso: { offset: { x: 0, y: 0.5 }, frame: 0 }, // Down slightly
            head: { offset: { x: 0, y: -7.5 }, rotation: 0.03, frame: 0 }, // Drop with torso
            larm: { offset: { x: -8, y: 0.5 }, rotation: 0.02, frame: 0 }, // Arms relax
            rarm: { offset: { x: 8, y: 0.5 }, rotation: -0.02, frame: 0 },
            lleg: { offset: { x: -2, y: 8 }, frame: 0 },
            rleg: { offset: { x: 2, y: 8 }, frame: 0 }
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
    
    // Walk animation - legs alternate, arms swing
    this.animations.set('walk', {
      name: 'walk',
      loop: true,
      duration: 16, // Faster cycle for walking
      frames: [
        {
          tick: 0,
          parts: {
            lleg: { offset: { x: -2, y: 8 }, rotation: -0.1, frame: 0 },
            rleg: { offset: { x: 2, y: 8 }, rotation: 0.1, frame: 0 },
            larm: { rotation: 0.1, frame: 0 },
            rarm: { rotation: -0.1, frame: 0 },
            head: { frame: 0 },
            torso: { frame: 0 }
          }
        },
        {
          tick: 8,
          parts: {
            lleg: { offset: { x: -2, y: 8 }, rotation: 0.1, frame: 1 },
            rleg: { offset: { x: 2, y: 8 }, rotation: -0.1, frame: 1 },
            larm: { rotation: -0.1, frame: 1 },
            rarm: { rotation: 0.1, frame: 1 },
            head: { frame: 1 },
            torso: { frame: 1 }
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
    
    // For breathing, use smooth sine interpolation
    if (this.currentAnimation === 'breathing') {
      this.applyBreathingInterpolation();
    } else {
      // Find current frame for other animations
      let currentFrame: BodyPartFrame | undefined;
      
      for (let i = 0; i < anim.frames.length; i++) {
        if (anim.frames[i].tick <= this.animationTime) {
          currentFrame = anim.frames[i];
        }
      }
      
      if (currentFrame) {
        this.applyFrame(currentFrame);
      }
    }
    
    // Update anchor positions based on body parts
    this.updateAnchors();
    
    // Update weapon position to follow hand anchor
    this.updateWeaponPart();
  }
  
  private applyBreathingInterpolation() {
    // Fast breathing cycle - 8 ticks total
    const anim = this.animations.get('breathing');
    const duration = anim?.duration || 8;
    const phase = (this.animationTime % duration) / duration;
    const breathAmount = (1 - Math.cos(phase * Math.PI * 2)) / 2; // 0 to 1
    
    // Much more visible movement
    const torso = this.parts.get('torso');
    if (torso) {
      torso.offset.y = -breathAmount * 8; // MUCH bigger movement - up to 8 pixels
      torso.offset.x = Math.sin(phase * Math.PI * 4) * 2; // Side sway
      torso.frame = Math.floor(phase * 3) % 3; // Cycle frames
    }
    
    // Head follows torso with delay
    const head = this.parts.get('head');
    if (head) {
      head.offset.y = -8 - breathAmount * 6; // Big movement
      head.offset.x = Math.sin(phase * Math.PI * 4 + 0.5) * 1.5; // Delayed sway
      head.rotation = Math.sin(phase * Math.PI * 2) * 0.1; // More tilt
      head.frame = Math.floor(phase * 3) % 3;
    }
    
    // Arms swing with breathing
    const larm = this.parts.get('larm');
    const rarm = this.parts.get('rarm');
    if (larm) {
      larm.offset.y = -breathAmount * 4; // Arms rise
      larm.rotation = breathAmount * 0.2; // More rotation
      larm.frame = Math.floor(phase * 3) % 3;
    }
    if (rarm) {
      rarm.offset.y = -breathAmount * 4; // Arms rise  
      rarm.rotation = -breathAmount * 0.2; // More rotation
      rarm.frame = Math.floor(phase * 3) % 3;
    }
    
    // Legs shift weight slightly
    const lleg = this.parts.get('lleg');
    const rleg = this.parts.get('rleg');
    if (lleg) {
      lleg.offset.x = -2 + Math.sin(phase * Math.PI * 2) * 0.5;
      lleg.frame = Math.floor(phase * 3) % 3;
    }
    if (rleg) {
      rleg.offset.x = 2 - Math.sin(phase * Math.PI * 2) * 0.5;
      rleg.frame = Math.floor(phase * 3) % 3;
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
  
  getAnimationTime(): number {
    return this.animationTime;
  }
  
  private updateAnchors() {
    // Update each anchor's world position based on its parent part
    for (const [name, anchor] of this.anchors) {
      const part = this.parts.get(anchor.partName);
      if (part) {
        // Calculate world position: part offset + local anchor offset
        anchor.position = {
          x: part.offset.x + anchor.localOffset.x,
          y: part.offset.y + anchor.localOffset.y
        };
        anchor.rotation = part.rotation;
      }
    }
  }
  
  getAnchor(name: AnchorPoint['name']): AnchorPoint | undefined {
    return this.anchors.get(name);
  }
  
  getAnchors(): AnchorPoint[] {
    return Array.from(this.anchors.values());
  }
  
  private updateWeaponPart() {
    const config = this.weaponConfigs.get(this.currentWeapon);
    if (!config) return;
    
    // Get hand anchor position
    const handAnchor = this.anchors.get('hand_r');
    if (!handAnchor) return;
    
    // Update sword part to match current weapon
    const swordPart = this.parts.get('sword');
    if (swordPart) {
      if (config.type === 'none') {
        // Hide weapon
        swordPart.sprite = '';
        swordPart.scale = 0;
      } else {
        // Position weapon at hand anchor
        swordPart.sprite = config.sprite;
        swordPart.offset = {
          x: handAnchor.position.x + config.offset.x,
          y: handAnchor.position.y + config.offset.y
        };
        swordPart.rotation = handAnchor.rotation + config.rotation;
        swordPart.scale = config.scale;
      }
    }
  }
  
  switchWeapon(weapon: WeaponType) {
    if (this.weaponConfigs.has(weapon)) {
      this.currentWeapon = weapon;
      this.updateWeaponPart();
    }
  }
  
  getCurrentWeapon(): WeaponType {
    return this.currentWeapon;
  }
  
  getAvailableWeapons(): WeaponType[] {
    return Array.from(this.weaponConfigs.keys());
  }
}