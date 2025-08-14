import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Toymaker Ability Debug', () => {
  it('should debug why toymaker deployBot ability does not create clankers', () => {
    console.log('🔍 TOYMAKER ABILITY DEBUG');
    
    const sim = new Simulator(20, 10);
    const sceneLoader = new SceneLoader(sim);
    
    // Load the actual toymaker challenge scene
    sceneLoader.loadScenario('toymakerChallenge');
    
    const toymaker = sim.units.find(u => u.type === 'toymaker');
    if (!toymaker) {
      console.log('❌ No toymaker found in scene!');
      expect(toymaker).toBeDefined();
      return;
    }
    
    console.log(`✅ Found toymaker: ${toymaker.id}`);
    console.log(`  Position: (${toymaker.pos.x}, ${toymaker.pos.y})`);
    console.log(`  HP: ${toymaker.hp}/${toymaker.maxHp}`);
    console.log(`  Abilities: [${toymaker.abilities}]`);
    console.log(`  Team: ${toymaker.team}`);
    
    // Count initial enemies
    const initialEnemies = sim.units.filter(u => u.team !== toymaker.team);
    console.log(`  Enemies: ${initialEnemies.length}`);
    
    console.log(`\nInitial state:`);
    console.log(`  Total units: ${sim.units.length}`);
    console.log(`  Queued commands: ${sim.queuedCommands.length}`);
    console.log(`  DeployBot uses: ${toymaker.meta.deployBotUses || 0}`);
    
    // Watch what happens over first few steps
    for (let step = 1; step <= 10; step++) {
      const beforeUnits = sim.units.length;
      const beforeCommands = sim.queuedCommands.length;
      
      sim.step();
      
      const afterUnits = sim.units.length;
      const afterCommands = sim.queuedCommands.length;
      const clankers = sim.units.filter(u => u.type === 'clanker');
      
      const currentToymaker = sim.units.find(u => u.id === toymaker.id);
      
      if (step <= 5 || clankers.length > 0 || afterUnits !== beforeUnits || afterCommands !== beforeCommands) {
        console.log(`\nStep ${step}:`);
        console.log(`  Units: ${beforeUnits} → ${afterUnits}`);
        console.log(`  Commands: ${beforeCommands} → ${afterCommands}`);
        console.log(`  Clankers: ${clankers.length}`);
        
        if (currentToymaker) {
          console.log(`  Toymaker HP: ${currentToymaker.hp}/${currentToymaker.maxHp}`);
          console.log(`  DeployBot uses: ${currentToymaker.meta.deployBotUses || 0}`);
          console.log(`  Last ability ticks: ${JSON.stringify(currentToymaker.lastAbilityTick || {})}`);
        } else {
          console.log(`  ❌ Toymaker died!`);
        }
        
        // Show queued commands
        if (sim.queuedCommands.length > 0) {
          console.log(`  Queued commands:`);
          sim.queuedCommands.forEach((cmd, i) => {
            console.log(`    ${i}: ${cmd.type} from ${cmd.unitId} - ${JSON.stringify(cmd.params)}`);
          });
        }
      }
      
      if (!currentToymaker) break;
    }
    
    expect(sim.units.length).toBeGreaterThan(0);
  });
  
  it('should test if abilities rule is being applied', () => {
    console.log('\n🎯 ABILITIES RULE DEBUG');
    
    const sim = new Simulator(10, 10);
    
    // Check if Abilities rule is in the rulebook
    console.log('Rulebook contents:');
    sim.rulebook.forEach((rule, i) => {
      console.log(`  ${i}: ${rule.constructor.name}`);
    });
    
    const abilitiesRule = sim.rulebook.find(r => r.constructor.name === 'Abilities');
    console.log(`\nAbilities rule found: ${abilitiesRule ? 'YES' : 'NO'}`);
    
    if (abilitiesRule) {
      console.log(`Abilities rule class: ${abilitiesRule.constructor.name}`);
    }
    
    expect(sim.rulebook.length).toBeGreaterThan(0);
  });
});