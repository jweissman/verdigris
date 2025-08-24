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
      offset: { x: -2, y: 6 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 4  // Left leg renders above torso
    });
    
    this.parts.set('rleg', {
      name: 'rleg',
      sprite: 'hero-rleg',
      offset: { x: 2, y: 6 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 1
    });
    
    this.parts.set('larm', {
      name: 'larm',
      sprite: 'hero-larm',
      offset: { x: -6, y: -4 }, // Match torso height
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 2
    });
    
    this.parts.set('torso', {
      name: 'torso',
      sprite: 'hero-torso',
      offset: { x: 0, y: 0 }, // Base position for animations
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 3
    });
    
    this.parts.set('rarm', {
      name: 'rarm',
      sprite: 'hero-rarm',
      offset: { x: 6, y: -4 }, // Match torso height
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 5  // Adjusted for new ordering
    });
    
    this.parts.set('head', {
      name: 'head',
      sprite: 'hero-head',
      offset: { x: 0, y: -12 }, // Adjust for raised torso
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 6
    });
    
    this.parts.set('sword', {
      name: 'sword',
      sprite: 'hero-sword',
      offset: { x: 14, y: -2 }, // More visible position
      rotation: -Math.PI / 6, // Less diagonal, more forward
      scale: 1.4, // Bigger and more visible
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
      duration: 12, // Faster cycle for snappy walking
      frames: [
        {
          tick: 0,
          parts: {
            // Left step - right leg forward
            torso: { offset: { x: 0, y: -5 }, rotation: 0.05, frame: 1 },
            head: { offset: { x: 0, y: -13 }, rotation: 0.02, frame: 1 },
            lleg: { offset: { x: -2, y: 9 }, rotation: -0.2, frame: 0 }, // Left leg back
            rleg: { offset: { x: 2, y: 7 }, rotation: 0.3, frame: 1 }, // Right leg forward
            larm: { offset: { x: -7, y: -3 }, rotation: 0.2, frame: 1 }, // Left arm forward
            rarm: { offset: { x: 9, y: -1 }, rotation: -0.2, frame: 0 } // Right arm back
          }
        },
        {
          tick: 6,
          parts: {
            // Right step - left leg forward
            torso: { offset: { x: 0, y: -5 }, rotation: -0.05, frame: 2 },
            head: { offset: { x: 0, y: -13 }, rotation: -0.02, frame: 2 },
            lleg: { offset: { x: -2, y: 7 }, rotation: 0.3, frame: 1 }, // Left leg forward
            rleg: { offset: { x: 2, y: 9 }, rotation: -0.2, frame: 0 }, // Right leg back
            larm: { offset: { x: -9, y: -1 }, rotation: -0.2, frame: 0 }, // Left arm back
            rarm: { offset: { x: 7, y: -3 }, rotation: 0.2, frame: 1 } // Right arm forward
          }
        }
      ]
    });
    
    // Jump animation - EXPLOSIVE leap with maximum extension
    this.animations.set('jump', {
      name: 'jump',
      loop: false,
      duration: 8, // Match jump duration
      frames: [
        {
          tick: 0,
          parts: {
            // Deep crouch - coiled spring
            torso: { offset: { x: 0, y: -1 }, rotation: 0.2, frame: 1 },
            head: { offset: { x: 0, y: -9 }, rotation: 0.15, frame: 1 },
            larm: { offset: { x: -6, y: 1 }, rotation: -0.5, frame: 1 }, // Arms way back
            rarm: { offset: { x: 6, y: 1 }, rotation: -0.5, frame: 1 },
            lleg: { offset: { x: -2, y: 11 }, rotation: 0.6, frame: 1 }, // Legs deeply bent
            rleg: { offset: { x: 2, y: 11 }, rotation: 0.6, frame: 1 },
            sword: { rotation: -0.3, scale: 1.1 } // Sword ready
          }
        },
        {
          tick: 1,
          parts: {
            // LAUNCH - explosive extension
            torso: { offset: { x: 0, y: -8 }, rotation: -0.2, frame: 2 },
            head: { offset: { x: 0, y: -16 }, rotation: -0.2, frame: 2 },
            larm: { offset: { x: -12, y: -6 }, rotation: 0.6, frame: 2 }, // Arms WIDE
            rarm: { offset: { x: 12, y: -6 }, rotation: -0.6, frame: 2 },
            lleg: { offset: { x: -4, y: 12 }, rotation: -0.7, frame: 2 }, // Legs EXTENDED
            rleg: { offset: { x: 4, y: 12 }, rotation: 0.7, frame: 2 },
            sword: { rotation: 0.4, scale: 1.3 } // Sword trails
          }
        },
        {
          tick: 4,
          parts: {
            // Peak - floating
            torso: { offset: { x: 0, y: -5 }, rotation: 0, frame: 2 },
            head: { offset: { x: 0, y: -13 }, rotation: 0, frame: 2 },
            larm: { offset: { x: -8, y: -3 }, rotation: 0.2, frame: 2 },
            rarm: { offset: { x: 8, y: -3 }, rotation: -0.2, frame: 2 },
            lleg: { offset: { x: -2, y: 9 }, rotation: -0.2, frame: 2 },
            rleg: { offset: { x: 2, y: 9 }, rotation: 0.2, frame: 2 }
          }
        },
        {
          tick: 6,
          parts: {
            // Landing prep
            torso: { offset: { x: 0, y: -3 }, rotation: 0.05, frame: 1 },
            head: { offset: { x: 0, y: -11 }, rotation: 0.05, frame: 1 },
            larm: { offset: { x: -8, y: -2 }, rotation: 0.1, frame: 1 },
            rarm: { offset: { x: 8, y: -2 }, rotation: -0.1, frame: 1 },
            lleg: { offset: { x: -2, y: 8 }, rotation: 0.2, frame: 1 }, // Legs ready to absorb
            rleg: { offset: { x: 2, y: 8 }, rotation: -0.2, frame: 1 }
          }
        },
        {
          tick: 7,
          parts: {
            // Impact - crouch to absorb
            torso: { offset: { x: 0, y: -2 }, rotation: 0.1, frame: 0 },
            head: { offset: { x: 0, y: -10 }, rotation: 0.1, frame: 0 },
            larm: { offset: { x: -7, y: 0 }, rotation: 0, frame: 0 },
            rarm: { offset: { x: 7, y: 0 }, rotation: 0, frame: 0 },
            lleg: { offset: { x: -2, y: 9 }, rotation: 0.3, frame: 0 },
            rleg: { offset: { x: 2, y: 9 }, rotation: 0.3, frame: 0 }
          }
        }
      ]
    });
    
    // Attack animation - SHARP SNAP with incredible whiplash
    this.animations.set('attack', {
      name: 'attack',
      loop: false,
      duration: 10, // Faster, sharper
      frames: [
        {
          tick: 0,
          parts: {
            // EXTREME wind up - body coiled tight
            torso: { offset: { x: -5, y: -2 }, rotation: -0.6, frame: 1 }, // Body twisted WAY back
            rarm: { offset: { x: -15, y: -8 }, rotation: -2.8, frame: 1 }, // Arm WOUND up behind
            larm: { offset: { x: -2, y: -6 }, rotation: 0.8, frame: 1 }, // Counterbalance forward
            head: { offset: { x: -4, y: -10 }, rotation: -0.4, frame: 1 }, // Head turned to target
            lleg: { offset: { x: -3, y: 6 }, rotation: -0.3, frame: 1 }, // Back leg loaded
            rleg: { offset: { x: 5, y: 7 }, rotation: 0.3, frame: 1 }, // Front leg braced
            sword: { offset: { x: -18, y: -12 }, rotation: -3.0, scale: 1.8 } // Sword WAY back
          }
        },
        {
          tick: 2,
          parts: {
            // INSTANT SNAP - like a whip crack
            torso: { offset: { x: 6, y: -3 }, rotation: 0.5, frame: 2 }, // Body WHIPS forward
            rarm: { offset: { x: 22, y: 2 }, rotation: 1.2, frame: 2 }, // Arm SNAPS out
            larm: { offset: { x: -12, y: 2 }, rotation: -0.5, frame: 2 }, // Pull back hard
            head: { offset: { x: 7, y: -10 }, rotation: 0.3, frame: 2 }, // Head follows
            lleg: { offset: { x: -5, y: 8 }, rotation: 0.4, frame: 2 }, // Planted hard
            rleg: { offset: { x: 10, y: 5 }, rotation: -0.3, frame: 2 }, // Pushing forward
            sword: { offset: { x: 26, y: 6 }, rotation: 1.8, scale: 2.5 } // HUGE sweep arc
          }
        },
        {
          tick: 3,
          parts: {
            // Overshoot - like elastic snap
            torso: { offset: { x: 7, y: -3 }, rotation: 0.6, frame: 2 },
            rarm: { offset: { x: 24, y: 4 }, rotation: 1.5, frame: 2 }, // Overextended
            larm: { offset: { x: -14, y: 3 }, rotation: -0.6, frame: 2 },
            head: { offset: { x: 8, y: -9 }, rotation: 0.35, frame: 2 },
            sword: { offset: { x: 28, y: 8 }, rotation: 2.2, scale: 2.3 } // Maximum reach
          }
        },
        {
          tick: 4,
          parts: {
            // Sharp pullback begins - elastic recoil
            torso: { offset: { x: 3, y: -3 }, rotation: 0.2, frame: 1 },
            rarm: { offset: { x: 16, y: 0 }, rotation: 0.6, frame: 1 }, // Snapping back
            larm: { offset: { x: -10, y: -1 }, rotation: -0.2, frame: 1 },
            head: { offset: { x: 4, y: -11 }, rotation: 0.1, frame: 1 },
            sword: { offset: { x: 18, y: 2 }, rotation: 0.8, scale: 1.6 }
          }
        },
        {
          tick: 6,
          parts: {
            // Quick reset - bouncing back
            torso: { offset: { x: 0, y: -3 }, rotation: 0, frame: 0 },
            rarm: { offset: { x: 10, y: -3 }, rotation: 0.1, frame: 0 },
            larm: { offset: { x: -8, y: -3 }, rotation: 0.05, frame: 0 },
            head: { offset: { x: 0, y: -11 }, rotation: 0, frame: 0 },
            lleg: { offset: { x: -2, y: 6 }, rotation: 0, frame: 0 },
            rleg: { offset: { x: 2, y: 6 }, rotation: 0, frame: 0 },
            sword: { offset: { x: 12, y: -2 }, rotation: 0.2, scale: 1.2 }
          }
        },
        {
          tick: 8,
          parts: {
            // Final settle - ready stance
            torso: { offset: { x: 0, y: 0 }, rotation: 0, frame: 0 },
            rarm: { offset: { x: 6, y: -4 }, rotation: 0, frame: 0 },
            larm: { offset: { x: -6, y: -4 }, rotation: 0, frame: 0 },
            head: { offset: { x: 0, y: -12 }, rotation: 0, frame: 0 },
            lleg: { offset: { x: -2, y: 6 }, rotation: 0, frame: 0 },
            rleg: { offset: { x: 2, y: 6 }, rotation: 0, frame: 0 },
            sword: { offset: { x: 14, y: -2 }, rotation: -Math.PI / 6, scale: 1.4 }
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
    // Debug: console.log(`HeroRig.update: currentAnimation='${this.currentAnimation}', animTime=${this.animationTime}`);
    if (!this.currentAnimation) return;
    
    const anim = this.animations.get(this.currentAnimation);
    if (!anim) return;
    
    this.animationTime += deltaTime;
    
    if (anim.loop && this.animationTime >= anim.duration) {
      this.animationTime = this.animationTime % anim.duration;
    }
    
    // Advance frame counter for all parts (for individual animations)
    for (const part of this.parts.values()) {
      part.frame = (part.frame + 0.1) % 3; // Cycle through 3 frames
    }
    
    // For breathing and wind, use smooth sine interpolation
    if (this.currentAnimation === 'breathing' || this.currentAnimation === 'wind') {
      this.applyBreathingInterpolation();
    } else if (this.currentAnimation === 'attack') {
      // Use interpolation for attack for smoother motion
      this.applyAttackInterpolation();
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
      } else {
        // No frame found for current time
      }
    }
    
    // Update anchor positions based on body parts
    this.updateAnchors();
    
    // Update weapon position to follow hand anchor
    this.updateWeaponPart();
  }
  
  private applyBreathingInterpolation() {
    // Get animation-specific duration
    const anim = this.animations.get(this.currentAnimation);
    const isWind = this.currentAnimation === 'wind';
    const duration = isWind ? 16 : (anim?.duration || 8); // Wind uses faster cycle
    const phase = (this.animationTime % duration) / duration;
    const breathAmount = (1 - Math.cos(phase * Math.PI * 2)) / 2; // 0 to 1
    
    // Much more visible movement
    const torso = this.parts.get('torso');
    if (torso) {
      const oldY = torso.offset.y;
      if (isWind) {
        // Wind animation - subtle torso movement
        torso.offset.y = -breathAmount * 1.5; // Subtle vertical movement
        torso.offset.x = Math.sin(phase * Math.PI * 2) * 0.5; // Very gentle sway
      } else {
        // Normal breathing - subtle torso
        torso.offset.y = -breathAmount * 1; // Very subtle rise and fall
        torso.offset.x = Math.sin(phase * Math.PI * 4) * 0.25; // Minimal sway
      }
      torso.frame = Math.floor(phase * 3) % 3; // Cycle frames
      // Debug logging removed
    }
    
    // Head follows torso with delay
    const head = this.parts.get('head');
    if (head) {
      if (isWind) {
        // Wind - hair blowing effect, more movement than torso
        head.offset.y = -8 - breathAmount * 3; // Head moves moderately
        head.offset.x = Math.sin(phase * Math.PI * 2 + 0.3) * 1.5; // Reduced wind-blown hair
        head.rotation = Math.sin(phase * Math.PI * 2) * 0.06; // Much less tilt
      } else {
        // Normal breathing
        head.offset.y = -12 - breathAmount * 1.5; // Subtle movement from base -12
        head.offset.x = Math.sin(phase * Math.PI * 4 + 0.5) * 0.5; // Very slight delayed sway
        head.rotation = Math.sin(phase * Math.PI * 2) * 0.03; // Minimal tilt
      }
      head.frame = Math.floor(phase * 3) % 3;
    }
    
    // Arms swing with breathing
    const larm = this.parts.get('larm');
    const rarm = this.parts.get('rarm');
    if (larm) {
      if (isWind) {
        // Wind - arms sway gently
        larm.offset.y = -breathAmount * 2;
        larm.offset.x = -6 + Math.sin(phase * Math.PI * 2 - 0.5) * 1;
        larm.rotation = Math.sin(phase * Math.PI * 2) * 0.08;
      } else {
        larm.offset.y = -breathAmount * 1.5; // Subtle rise
        larm.offset.x = -6; // Keep stable position
        larm.rotation = breathAmount * 0.08; // Gentle rotation
      }
      larm.frame = Math.floor(phase * 3) % 3;
    }
    if (rarm) {
      if (isWind) {
        // Wind - opposite arm sway gently
        rarm.offset.y = -breathAmount * 2;
        rarm.offset.x = 6 + Math.sin(phase * Math.PI * 2 + 0.5) * 1;
        rarm.rotation = -Math.sin(phase * Math.PI * 2) * 0.08;
      } else {
        rarm.offset.y = -breathAmount * 1.5; // Subtle rise
        rarm.offset.x = 6; // Keep stable position
        rarm.rotation = -breathAmount * 0.08; // Gentle rotation
      }
      rarm.frame = Math.floor(phase * 3) % 3;
    }
    
    // Legs shift weight slightly
    const lleg = this.parts.get('lleg');
    const rleg = this.parts.get('rleg');
    if (lleg) {
      lleg.offset.x = -6 + (isWind ? Math.sin(phase * Math.PI * 2) * 0.4 : Math.sin(phase * Math.PI * 2) * 0.2);
      lleg.offset.y = 6 - breathAmount * 0.5; // Base at y:6, very subtle vertical
      lleg.frame = Math.floor(phase * 3) % 3;
    }
    if (rleg) {
      rleg.offset.x = 6 - (isWind ? Math.sin(phase * Math.PI * 2) * 0.4 : Math.sin(phase * Math.PI * 2) * 0.2);
      rleg.offset.y = 6 - breathAmount * 0.5; // Base at y:6, very subtle vertical
      rleg.frame = Math.floor(phase * 3) % 3;
    }
  }
  
  private applyFrame(frame: BodyPartFrame) {
    for (const [partName, updates] of Object.entries(frame.parts)) {
      const part = this.parts.get(partName as BodyPart['name']);
      if (part) {
        // Apply updates to the part
        if (updates.offset) {
          part.offset = { ...part.offset, ...updates.offset };
        }
        if (updates.rotation !== undefined) {
          part.rotation = updates.rotation;
        }
        if (updates.frame !== undefined) {
          part.frame = updates.frame;
        }
      }
    }
  }
  
  getParts(facing: 'left' | 'right' = 'right'): BodyPart[] {
    const partsArray = Array.from(this.parts.values());
    
    // Adjust z-indices based on facing for proper layering
    partsArray.forEach(part => {
      if (facing === 'left') {
        // When facing left, right arm should be behind torso
        if (part.name === 'rarm') part.zIndex = 2;
        else if (part.name === 'larm') part.zIndex = 4;
      } else {
        // When facing right, left arm should be behind torso
        if (part.name === 'larm') part.zIndex = 2;
        else if (part.name === 'rarm') part.zIndex = 4;
      }
    });
    
    return partsArray.sort((a, b) => a.zIndex - b.zIndex);
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
        // Position weapon at hand anchor with better attachment
        swordPart.sprite = config.sprite;
        
        // During attack animation, follow the hand more closely
        const isAttacking = this.currentAnimation === 'attack';
        const attachmentScale = isAttacking ? 1.2 : 1.0;
        
        swordPart.offset = {
          x: handAnchor.position.x + config.offset.x * attachmentScale,
          y: handAnchor.position.y + config.offset.y * attachmentScale
        };
        
        // Add hand rotation to weapon rotation for proper tracking
        const armPart = this.parts.get('rarm');
        const baseRotation = armPart ? armPart.rotation : 0;
        swordPart.rotation = baseRotation + config.rotation;
        
        // Keep existing scale from animation or use config
        if (!isAttacking) {
          swordPart.scale = config.scale;
        }
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
  
  private applyAttackInterpolation() {
    const anim = this.animations.get('attack');
    if (!anim) return;
    
    // Find which frames we're between
    let frame1: BodyPartFrame | undefined;
    let frame2: BodyPartFrame | undefined;
    let t = 0;
    
    for (let i = 0; i < anim.frames.length - 1; i++) {
      const f1 = anim.frames[i];
      const f2 = anim.frames[i + 1];
      
      if (this.animationTime >= f1.tick && this.animationTime < f2.tick) {
        frame1 = f1;
        frame2 = f2;
        t = (this.animationTime - f1.tick) / (f2.tick - f1.tick);
        break;
      }
    }
    
    // Handle last frame
    if (!frame1 && anim.frames.length > 0) {
      const lastFrame = anim.frames[anim.frames.length - 1];
      if (this.animationTime >= lastFrame.tick) {
        this.applyFrame(lastFrame);
        return;
      }
    }
    
    if (frame1 && frame2) {
      // Apply easing for sharper motion
      // Use exponential easing for the snap
      if (this.animationTime < 3) {
        // Wind-up to snap: ease out exponential
        t = 1 - Math.pow(1 - t, 3);
      } else if (this.animationTime < 5) {
        // Snap back: ease in exponential  
        t = Math.pow(t, 2);
      }
      
      // Interpolate between frames
      for (const [partName, targetProps] of Object.entries(frame2.parts)) {
        const part = this.parts.get(partName as BodyPart['name']);
        const sourceProps = frame1.parts[partName as BodyPart['name']];
        
        if (part && sourceProps && targetProps) {
          // Interpolate offset
          if (sourceProps.offset && targetProps.offset) {
            part.offset.x = sourceProps.offset.x + (targetProps.offset.x - sourceProps.offset.x) * t;
            part.offset.y = sourceProps.offset.y + (targetProps.offset.y - sourceProps.offset.y) * t;
          }
          
          // Interpolate rotation
          if (sourceProps.rotation !== undefined && targetProps.rotation !== undefined) {
            part.rotation = sourceProps.rotation + (targetProps.rotation - sourceProps.rotation) * t;
          }
          
          // Interpolate scale
          if (sourceProps.scale !== undefined && targetProps.scale !== undefined) {
            part.scale = sourceProps.scale + (targetProps.scale - sourceProps.scale) * t;
          }
        }
      }
    }
  }
}