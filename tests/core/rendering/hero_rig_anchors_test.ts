import { describe, test, expect } from 'bun:test';
import { HeroRig } from '../../../src/rendering/hero_rig';

describe('Hero Rig Anchors', () => {
  test('anchors are created and positioned correctly', () => {
    const rig = new HeroRig();
    

    const anchorNames = ['hand_l', 'hand_r', 'shoulder_l', 'shoulder_r', 
                         'hip_l', 'hip_r', 'foot_l', 'foot_r', 'crown', 'chest'];
    
    for (const name of anchorNames) {
      const anchor = rig.getAnchor(name as any);
      expect(anchor).toBeDefined();
      expect(anchor?.position).toBeDefined();
      expect(anchor?.rotation).toBeDefined();
    }
  });
  
  test('anchors follow body part movements', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    

    const handInitial = rig.getAnchor('hand_r');
    const initialY = handInitial?.position.y || 0;
    

    for (let i = 0; i < 30; i++) {
      rig.update(1);
    }
    

    const handFinal = rig.getAnchor('hand_r');
    const finalY = handFinal?.position.y || 0;
    

    expect(finalY).not.toBe(initialY);
  });
  
  test('weapon follows hand anchor', () => {
    const rig = new HeroRig();
    

    const handAnchor = rig.getAnchor('hand_r');
    expect(handAnchor).toBeDefined();
    

    const sword = rig.getPartByName('sword');
    const hand = rig.getAnchor('hand_r');
    

    expect(sword).toBeDefined();
    expect(hand).toBeDefined();
    

    const armPart = rig.getPartByName('rarm');
    expect(armPart).toBeDefined();
    expect(sword?.offset.x).toBeGreaterThan(0); // On right side
  });
  
  test('all anchors have correct parent parts', () => {
    const rig = new HeroRig();
    const anchors = rig.getAnchors();
    
    const expectedParents = {
      'hand_l': 'larm',
      'hand_r': 'rarm',
      'shoulder_l': 'torso',
      'shoulder_r': 'torso',
      'hip_l': 'torso',
      'hip_r': 'torso',
      'foot_l': 'lleg',
      'foot_r': 'rleg',
      'crown': 'head',
      'chest': 'torso'
    };
    
    for (const anchor of anchors) {
      const expectedParent = expectedParents[anchor.name];
      expect(anchor.partName).toBe(expectedParent);
    }
  });
});