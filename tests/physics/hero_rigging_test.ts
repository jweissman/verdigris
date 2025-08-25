import { describe, test, expect } from 'bun:test';


interface Bone {
  name: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  length: number;
  angle: number; // Relative to parent
  parent?: Bone;
  children: Bone[];
}

interface RiggedHero {
  position: { x: number; y: number };
  facing: 'left' | 'right';
  skeleton: Map<string, Bone>;
  animations: Map<string, AnimationFrame[]>;
  currentAnimation?: string;
  animationFrame: number;
  weapon?: Weapon;
  weaponSocket?: string; // Which bone the weapon attaches to
}

interface AnimationFrame {
  bones: Map<string, { angle: number; scale?: number }>;
  duration: number;
}

interface Weapon {
  type: string;
  length: number;
  offset: { x: number; y: number }; // Offset from socket
  angle: number; // Additional rotation
}

describe.skip('Hero Rigging System', () => {
  
  describe('Basic Skeleton', () => {
    test('should create humanoid skeleton with proper hierarchy', () => {
      const hero = createHeroRig();
      

      expect(hero.skeleton.has('torso')).toBe(true);
      expect(hero.skeleton.has('head')).toBe(true);
      expect(hero.skeleton.has('left_arm')).toBe(true);
      expect(hero.skeleton.has('right_arm')).toBe(true);
      expect(hero.skeleton.has('left_leg')).toBe(true);
      expect(hero.skeleton.has('right_leg')).toBe(true);
      

      const torso = hero.skeleton.get('torso')!;
      expect(torso.children.length).toBeGreaterThan(0);
      
      const head = hero.skeleton.get('head')!;
      expect(head.parent).toBe(torso);
    });
    
    test('should maintain bone lengths during rotation', () => {
      const hero = createHeroRig();
      const rightArm = hero.skeleton.get('right_arm')!;
      const originalLength = rightArm.length;
      

      rotateBone(rightArm, Math.PI / 4);
      updateBonePositions(hero);
      

      const newLength = calculateBoneLength(rightArm);
      expect(Math.abs(newLength - originalLength)).toBeLessThan(0.01);
    });
    
    test('should update child bones when parent moves', () => {
      const hero = createHeroRig();
      const torso = hero.skeleton.get('torso')!;
      const rightArm = hero.skeleton.get('right_arm')!;
      
      const originalArmPos = { ...rightArm.start };
      

      torso.angle += Math.PI / 6;
      updateBonePositions(hero);
      

      expect(rightArm.start.x).not.toBe(originalArmPos.x);
      expect(rightArm.start.y).not.toBe(originalArmPos.y);
    });
  });
  
  describe('Animation Interpolation', () => {
    test('should interpolate between animation frames', () => {
      const hero = createHeroRig();
      

      const swingAnimation: AnimationFrame[] = [
        {
          bones: new Map([
            ['right_arm', { angle: 0 }],
            ['right_forearm', { angle: 0 }]
          ]),
          duration: 10
        },
        {
          bones: new Map([
            ['right_arm', { angle: Math.PI / 2 }],
            ['right_forearm', { angle: Math.PI / 4 }]
          ]),
          duration: 10
        }
      ];
      
      hero.animations.set('swing', swingAnimation);
      

      playAnimation(hero, 'swing');
      

      updateAnimation(hero, 5);
      
      const rightArm = hero.skeleton.get('right_arm')!;

      expect(rightArm.angle).toBeCloseTo(Math.PI / 4, 2);
    });
    
    test('should smoothly transition between animations', () => {
      const hero = createHeroRig();
      

      setupBasicAnimations(hero);
      
      playAnimation(hero, 'idle');
      updateAnimation(hero, 10);
      
      const idleArmAngle = hero.skeleton.get('right_arm')!.angle;
      

      transitionToAnimation(hero, 'walk', 5); // 5 frame blend
      
      updateAnimation(hero, 1);
      
      const blendedAngle = hero.skeleton.get('right_arm')!.angle;
      

      expect(blendedAngle).not.toBe(idleArmAngle);
    });
    
    test('should support easing functions for smooth motion', () => {
      const hero = createHeroRig();
      
      const jumpAnimation: AnimationFrame[] = [
        {
          bones: new Map([['torso', { angle: 0 }]]),
          duration: 10
        },
        {
          bones: new Map([['torso', { angle: -Math.PI / 8 }]]), // Lean back
          duration: 10
        }
      ];
      
      hero.animations.set('jump', jumpAnimation);
      playAnimation(hero, 'jump');
      

      const angles: number[] = [];
      for (let i = 0; i < 10; i++) {
        updateAnimationWithEasing(hero, 1, 'easeOut');
        angles.push(hero.skeleton.get('torso')!.angle);
      }
      

      const earlyDelta = Math.abs(angles[1] - angles[0]);
      const lateDelta = Math.abs(angles[9] - angles[8]);
      expect(lateDelta).toBeLessThan(earlyDelta);
    });
  });
  
  describe('Weapon Attachment', () => {
    test('should attach weapon to specified bone socket', () => {
      const hero = createHeroRig();
      const sword = createWeapon('sword', 3);
      
      attachWeapon(hero, sword, 'right_hand');
      
      expect(hero.weapon).toBe(sword);
      expect(hero.weaponSocket).toBe('right_hand');
      

      const hand = hero.skeleton.get('right_hand')!;
      const weaponPos = getWeaponPosition(hero);
      
      expect(weaponPos.x).toBeCloseTo(hand.end.x + sword.offset.x, 1);
      expect(weaponPos.y).toBeCloseTo(hand.end.y + sword.offset.y, 1);
    });
    
    test('weapon should rotate with bone animation', () => {
      const hero = createHeroRig();
      const sword = createWeapon('sword', 3);
      
      attachWeapon(hero, sword, 'right_hand');
      
      const initialWeaponAngle = getWeaponAngle(hero);
      

      const rightArm = hero.skeleton.get('right_arm')!;
      rightArm.angle += Math.PI / 4;
      updateBonePositions(hero);
      
      const newWeaponAngle = getWeaponAngle(hero);
      

      expect(newWeaponAngle).not.toBe(initialWeaponAngle);
    });
    
    test('should support weapon switching', () => {
      const hero = createHeroRig();
      const sword = createWeapon('sword', 3);
      const spear = createWeapon('spear', 5);
      
      attachWeapon(hero, sword, 'right_hand');
      expect(hero.weapon?.type).toBe('sword');
      

      attachWeapon(hero, spear, 'right_hand');
      expect(hero.weapon?.type).toBe('spear');
      expect(hero.weapon?.length).toBe(5);
    });
  });
  
  describe('IK Integration', () => {
    test('should use IK to reach for target positions', () => {
      const hero = createHeroRig();
      const target = { x: hero.position.x + 5, y: hero.position.y - 2 };
      

      const reached = reachForTarget(hero, 'right_arm', target);
      
      expect(reached).toBe(true);
      

      const hand = hero.skeleton.get('right_hand')!;
      const distance = Math.sqrt(
        Math.pow(hand.end.x - target.x, 2) + 
        Math.pow(hand.end.y - target.y, 2)
      );
      expect(distance).toBeLessThan(0.5);
    });
    
    test('should respect joint limits during IK', () => {
      const hero = createHeroRig();
      

      setJointLimits(hero, 'right_elbow', -Math.PI * 0.9, 0); // Elbow can't bend backwards
      

      const target = { x: hero.position.x - 5, y: hero.position.y };
      reachForTarget(hero, 'right_arm', target);
      

      const elbow = hero.skeleton.get('right_elbow')!;
      expect(elbow.angle).toBeGreaterThanOrEqual(-Math.PI * 0.9);
      expect(elbow.angle).toBeLessThanOrEqual(0);
    });
  });
  
  describe('Procedural Animation', () => {
    test('should generate walking animation based on speed', () => {
      const hero = createHeroRig();
      

      const walkSpeed = 2;
      const walkCycle = generateWalkCycle(hero, walkSpeed);
      
      expect(walkCycle.length).toBeGreaterThan(0);
      

      const frame1 = walkCycle[0];
      const frame2 = walkCycle[Math.floor(walkCycle.length / 2)];
      
      const leftLeg1 = frame1.bones.get('left_leg')?.angle || 0;
      const leftLeg2 = frame2.bones.get('left_leg')?.angle || 0;
      

      expect(Math.sign(leftLeg1)).not.toBe(Math.sign(leftLeg2));
    });
    
    test('should adjust animation for terrain slope', () => {
      const hero = createHeroRig();
      

      const slopeAngle = Math.PI / 6; // 30 degree slope
      adjustForSlope(hero, slopeAngle);
      

      const torso = hero.skeleton.get('torso')!;
      expect(torso.angle).toBeLessThan(0); // Leaning into slope
      

      const leftLeg = hero.skeleton.get('left_leg')!;
      const rightLeg = hero.skeleton.get('right_leg')!;
      expect(leftLeg.angle).not.toBe(rightLeg.angle); // Asymmetric stance
    });
  });
});


function createHeroRig(): RiggedHero {
  const skeleton = new Map<string, Bone>();
  

  const torso: Bone = {
    name: 'torso',
    start: { x: 0, y: 0 },
    end: { x: 0, y: -3 },
    length: 3,
    angle: 0,
    children: []
  };
  skeleton.set('torso', torso);
  

  const head: Bone = {
    name: 'head',
    start: torso.end,
    end: { x: 0, y: -4.5 },
    length: 1.5,
    angle: 0,
    parent: torso,
    children: []
  };
  skeleton.set('head', head);
  torso.children.push(head);
  

  const rightArm: Bone = {
    name: 'right_arm',
    start: { x: torso.end.x, y: torso.end.y + 0.5 },
    end: { x: 2, y: -2 },
    length: 2,
    angle: Math.PI / 4,
    parent: torso,
    children: []
  };
  skeleton.set('right_arm', rightArm);
  
  const rightHand: Bone = {
    name: 'right_hand',
    start: rightArm.end,
    end: { x: 2.5, y: -1.5 },
    length: 0.5,
    angle: 0,
    parent: rightArm,
    children: []
  };
  skeleton.set('right_hand', rightHand);
  rightArm.children.push(rightHand);
  

  const leftArm: Bone = {
    name: 'left_arm',
    start: { x: torso.end.x, y: torso.end.y + 0.5 },
    end: { x: -2, y: -2 },
    length: 2,
    angle: -Math.PI / 4,
    parent: torso,
    children: []
  };
  skeleton.set('left_arm', leftArm);
  

  const rightLeg: Bone = {
    name: 'right_leg',
    start: torso.start,
    end: { x: 0.5, y: 2 },
    length: 2,
    angle: Math.PI / 8,
    parent: torso,
    children: []
  };
  skeleton.set('right_leg', rightLeg);
  
  const leftLeg: Bone = {
    name: 'left_leg',
    start: torso.start,
    end: { x: -0.5, y: 2 },
    length: 2,
    angle: -Math.PI / 8,
    parent: torso,
    children: []
  };
  skeleton.set('left_leg', leftLeg);
  
  return {
    position: { x: 50, y: 50 },
    facing: 'right',
    skeleton,
    animations: new Map(),
    animationFrame: 0
  };
}

function rotateBone(bone: Bone, angle: number) {
  bone.angle = angle;
}

function updateBonePositions(hero: RiggedHero) {

  const torso = hero.skeleton.get('torso')!;
  updateBoneFK(torso, hero.position);
}

function updateBoneFK(bone: Bone, parentEnd: { x: number; y: number }) {
  bone.start = parentEnd;
  bone.end = {
    x: bone.start.x + Math.cos(bone.angle) * bone.length,
    y: bone.start.y + Math.sin(bone.angle) * bone.length
  };
  
  for (const child of bone.children) {
    updateBoneFK(child, bone.end);
  }
}

function calculateBoneLength(bone: Bone): number {
  const dx = bone.end.x - bone.start.x;
  const dy = bone.end.y - bone.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function playAnimation(hero: RiggedHero, name: string) {
  hero.currentAnimation = name;
  hero.animationFrame = 0;
}

function updateAnimation(hero: RiggedHero, deltaFrames: number) {
  if (!hero.currentAnimation) return;
  
  hero.animationFrame += deltaFrames;
  
  const animation = hero.animations.get(hero.currentAnimation);
  if (!animation) return;
  

  const frameIndex = Math.floor(hero.animationFrame / 10);
  const t = (hero.animationFrame % 10) / 10;
  
  if (frameIndex < animation.length - 1) {
    const frame1 = animation[frameIndex];
    const frame2 = animation[frameIndex + 1];
    

    for (const [boneName, target] of frame2.bones) {
      const bone = hero.skeleton.get(boneName);
      if (bone) {
        const startAngle = frame1.bones.get(boneName)?.angle || 0;
        bone.angle = startAngle + (target.angle - startAngle) * t;
      }
    }
  }
}

function updateAnimationWithEasing(hero: RiggedHero, deltaFrames: number, easing: string) {

  updateAnimation(hero, deltaFrames);
}

function setupBasicAnimations(hero: RiggedHero) {
  hero.animations.set('idle', [
    { bones: new Map([['right_arm', { angle: 0 }]]), duration: 10 }
  ]);
  hero.animations.set('walk', [
    { bones: new Map([['right_arm', { angle: Math.PI / 6 }]]), duration: 10 }
  ]);
}

function transitionToAnimation(hero: RiggedHero, name: string, blendFrames: number) {
  hero.currentAnimation = name;
}

function createWeapon(type: string, length: number): Weapon {
  return {
    type,
    length,
    offset: { x: 0, y: 0 },
    angle: 0
  };
}

function attachWeapon(hero: RiggedHero, weapon: Weapon, socket: string) {
  hero.weapon = weapon;
  hero.weaponSocket = socket;
}

function getWeaponPosition(hero: RiggedHero): { x: number; y: number } {
  if (!hero.weapon || !hero.weaponSocket) return { x: 0, y: 0 };
  
  const bone = hero.skeleton.get(hero.weaponSocket)!;
  return {
    x: bone.end.x + hero.weapon.offset.x,
    y: bone.end.y + hero.weapon.offset.y
  };
}

function getWeaponAngle(hero: RiggedHero): number {
  if (!hero.weapon || !hero.weaponSocket) return 0;
  
  const bone = hero.skeleton.get(hero.weaponSocket)!;
  return bone.angle + hero.weapon.angle;
}

function reachForTarget(hero: RiggedHero, limbName: string, target: { x: number; y: number }): boolean {

  const limb = hero.skeleton.get(limbName);
  if (!limb) return false;
  

  const dx = target.x - limb.start.x;
  const dy = target.y - limb.start.y;
  limb.angle = Math.atan2(dy, dx);
  
  return true;
}

function setJointLimits(hero: RiggedHero, jointName: string, minAngle: number, maxAngle: number) {

}

function generateWalkCycle(hero: RiggedHero, speed: number): AnimationFrame[] {
  return [
    {
      bones: new Map([
        ['left_leg', { angle: Math.PI / 6 }],
        ['right_leg', { angle: -Math.PI / 6 }]
      ]),
      duration: 10 / speed
    },
    {
      bones: new Map([
        ['left_leg', { angle: -Math.PI / 6 }],
        ['right_leg', { angle: Math.PI / 6 }]
      ]),
      duration: 10 / speed
    }
  ];
}

function adjustForSlope(hero: RiggedHero, slopeAngle: number) {
  const torso = hero.skeleton.get('torso')!;
  torso.angle = -slopeAngle / 2; // Lean into slope
  
  const leftLeg = hero.skeleton.get('left_leg')!;
  const rightLeg = hero.skeleton.get('right_leg')!;
  leftLeg.angle = slopeAngle / 3;
  rightLeg.angle = -slopeAngle / 3;
}