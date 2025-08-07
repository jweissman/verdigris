import { describe, expect, it } from 'bun:test';
import Encyclopaedia from '../src/dmg/encyclopaedia';

describe('Sprite Integration', () => {
  it('should assign correct sprites to all construct types', () => {
    // Test all construct types have proper sprite assignments matching actual PNG files
    const freezebot = Encyclopaedia.unit('freezebot');
    expect(freezebot.sprite).toBe('freezebot');
    
    const clanker = Encyclopaedia.unit('clanker');
    expect(clanker.sprite).toBe('clanker');
    
    const spiker = Encyclopaedia.unit('spiker');
    expect(spiker.sprite).toBe('spikebot');
    
    const swarmbot = Encyclopaedia.unit('swarmbot');
    expect(swarmbot.sprite).toBe('swarmbot');
    
    const roller = Encyclopaedia.unit('roller');
    expect(roller.sprite).toBe('jumpbot'); // Using jumpbot sprite for roller
    
    const zapper = Encyclopaedia.unit('zapper');
    expect(zapper.sprite).toBe('zapper'); // Now has dedicated zapper sprite
    
    console.log('✅ All construct sprites properly assigned to match PNG files:');
    console.log(`  Freezebot: ${freezebot.sprite}.png`);
    console.log(`  Clanker: ${clanker.sprite}.png`);
    console.log(`  Spiker: ${spiker.sprite}.png`);
    console.log(`  Swarmbot: ${swarmbot.sprite}.png`);
    console.log(`  Roller: ${roller.sprite}.png`);
    console.log(`  Zapper: ${zapper.sprite}.png`);
  });

  it('should verify toymaker uses appropriate sprite', () => {
    const toymaker = Encyclopaedia.unit('toymaker');
    expect(toymaker.sprite).toBe('toymaker'); // Now using dedicated toymaker.png
    expect(toymaker.tags).toContain('mechanical');
    expect(toymaker.tags).toContain('craftor');
    
    console.log('✅ Toymaker sprite assignment verified: toymaker.png');
  });
});