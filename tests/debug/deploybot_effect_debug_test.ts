import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('DeployBot Effect Debug', () => {
  it('should debug deployBot ability processing in detail', () => {
    console.log('🔍 DEPLOYBOT EFFECT DEBUG');
    
    const sim = new Simulator(15, 10);
    
    // Create toymaker and enemy
    const toymaker = {
      id: 'toymaker1',
      type: 'toymaker',
      sprite: 'toymaker',
      pos: { x: 5, y: 5 },
      hp: 25,
      maxHp: 25,
      team: 'friendly',
      abilities: ['deployBot'],
      meta: { facing: 'right' },
      lastAbilityTick: {}
    };
    
    const enemy = {
      id: 'worm1',
      type: 'worm',
      sprite: 'worm',
      pos: { x: 10, y: 5 },
      hp: 10,
      maxHp: 10,
      team: 'hostile',
      abilities: ['jumps'],
      mass: 4
    };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    console.log(`Initial setup: ${sim.units.length} units`);
    console.log(`Distance toymaker->enemy: ${Math.hypot(enemy.pos.x - toymaker.pos.x, enemy.pos.y - toymaker.pos.y)}`);
    
    // Check if deployBot ability exists in abilities.json
    const abilitiesRule = sim.rulebook.find(r => r.constructor.name === 'Abilities');
    if (abilitiesRule) {
      console.log('✅ Abilities rule found');
      // Access the abilities data if possible
      console.log(`Abilities rule type: ${typeof abilitiesRule}`);
    }
    
    console.log(`Initial commands: ${sim.queuedCommands.length}`);
    
    // Run step by step and watch for ability activation
    for (let step = 1; step <= 5; step++) {
      const beforeCommands = sim.queuedCommands.length;
      const beforeUses = toymaker.meta.deployBotUses || 0;
      
      sim.step();
      
      const afterCommands = sim.queuedCommands.length;
      const afterUses = toymaker.meta.deployBotUses || 0;
      
      console.log(`\nStep ${step}:`);
      console.log(`  Commands: ${beforeCommands} → ${afterCommands}`);
      console.log(`  DeployBot uses: ${beforeUses} → ${afterUses}`);
      console.log(`  Toymaker lastAbilityTick: ${JSON.stringify(toymaker.lastAbilityTick)}`);
      
      if (afterCommands > beforeCommands) {
        console.log(`  📦 New commands queued:`);
        const newCommands = sim.queuedCommands.slice(beforeCommands);
        newCommands.forEach((cmd, i) => {
          console.log(`    ${beforeCommands + i}: ${cmd.type} from ${cmd.unitId} - ${JSON.stringify(cmd.params)}`);
        });
      }
      
      if (afterUses > beforeUses) {
        console.log(`  🤖 DeployBot ability was used!`);
      }
    }
    
    expect(sim.units.length).toBeGreaterThan(0);
  });
  
  it('should test if deployBot ability definition loads correctly', () => {
    console.log('\n📋 ABILITY DEFINITION TEST');
    
    // Try to load abilities.json directly
    try {
      const fs = require('fs');
      const path = require('path');
      const abilitiesPath = path.join(process.cwd(), 'data', 'abilities.json');
      const abilitiesData = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));
      
      if (abilitiesData.deployBot) {
        console.log('✅ deployBot ability found in abilities.json');
        console.log(`Name: ${abilitiesData.deployBot.name}`);
        console.log(`Cooldown: ${abilitiesData.deployBot.cooldown}`);
        console.log(`Max uses: ${abilitiesData.deployBot.maxUses}`);
        console.log(`Effects: ${abilitiesData.deployBot.effects?.length || 0}`);
        
        if (abilitiesData.deployBot.effects) {
          abilitiesData.deployBot.effects.forEach((effect: any, i: number) => {
            console.log(`  Effect ${i}: type=${effect.type}, constructType=${effect.constructType}`);
          });
        }
      } else {
        console.log('❌ deployBot ability NOT found in abilities.json');
      }
    } catch (e) {
      console.log(`❌ Error loading abilities.json: ${e}`);
    }
    
    expect(true).toBe(true);
  });
});