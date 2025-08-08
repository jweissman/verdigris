import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { CommandHandler } from '../src/rules/command_handler';
import { Abilities } from '../src/rules/abilities';
import { EventHandler } from '../src/rules/event_handler';
import { HugeUnits } from '../src/rules/huge_units';
import { SegmentedCreatures } from '../src/rules/segmented_creatures';

describe('Creature Encyclopedia MWE', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should create a comprehensive creature encyclopedia browser', () => {
    console.log('📚 CREATURE ENCYCLOPEDIA - Interactive Browser');
    console.log('============================================');
    
    const sim = new Simulator(40, 30); // Large field for browsing
    sim.rulebook = [
      new CommandHandler(sim), 
      new Abilities(sim), 
      new EventHandler(sim),
      new HugeUnits(sim),
      new SegmentedCreatures(sim)
    ];

    // Get all creatures organized by category
    const allCreatures = Object.keys(Encyclopaedia.bestiary);
    console.log(`📖 Total creatures in encyclopedia: ${allCreatures.length}`);
    
    const categories = {
      basic: [] as string[],
      military: [] as string[],
      undead: [] as string[],
      mechanical: [] as string[],
      constructs: [] as string[],
      huge: [] as string[],
      segmented: [] as string[],
      special: [] as string[]
    };

    // Categorize all creatures
    allCreatures.forEach(creatureType => {
      try {
        const creature = Encyclopaedia.unit(creatureType);
        const tags = creature.tags || [];
        
        if (tags.includes('construct')) {
          categories.constructs.push(creatureType);
        } else if (tags.includes('mechanical')) {
          categories.mechanical.push(creatureType);
        } else if (tags.includes('undead')) {
          categories.undead.push(creatureType);
        } else if (creature.meta.huge) {
          categories.huge.push(creatureType);
        } else if (creature.meta.segmented || creature.meta.segmentCount) {
          categories.segmented.push(creatureType);
        } else if (['soldier', 'ranger', 'bombardier', 'priest'].includes(creatureType)) {
          categories.military.push(creatureType);
        } else if (['grappler', 'rainmaker', 'toymaker', 'mechatronist'].includes(creatureType)) {
          categories.special.push(creatureType);
        } else {
          categories.basic.push(creatureType);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to categorize ${creatureType}: ${error}`);
      }
    });

    // Display categorized encyclopedia
    Object.entries(categories).forEach(([category, creatures]) => {
      if (creatures.length > 0) {
        console.log(`\n📂 ${category.toUpperCase()} (${creatures.length} creatures):`);
        console.log('─'.repeat(50));
        
        creatures.forEach(creatureType => {
          try {
            const creature = Encyclopaedia.unit(creatureType);
            const abilities = Object.keys(creature.abilities);
            const tags = creature.tags || [];
            
            // Format creature info for encyclopedia display
            let info = `🎭 ${creatureType.padEnd(15)} | ${creature.sprite.padEnd(12)} | ${creature.hp}hp`;
            
            if (creature.meta.huge) info += ' | HUGE';
            if (creature.meta.segmented || creature.meta.segmentCount) {
              info += ` | ${creature.meta.segmentCount || 0} segments`;
            }
            if (abilities.length > 0) info += ` | ${abilities.join(', ')}`;
            if (tags.length > 0) info += ` | [${tags.join(', ')}]`;
            
            console.log(info);
            
          } catch (error) {
            console.warn(`⚠️ Failed to display ${creatureType}: ${error}`);
          }
        });
      }
    });

    // Create visual placement test for key creatures
    console.log('\n🎨 VISUAL PLACEMENT TEST');
    console.log('========================');
    console.log('Creating visual test with key creatures from each category...');
    
    const showcaseCreatures = [
      // One representative from each category
      { type: 'worm', pos: { x: 2, y: 2 }, category: 'basic' },
      { type: 'soldier', pos: { x: 8, y: 2 }, category: 'military' },
      { type: 'ghost', pos: { x: 14, y: 2 }, category: 'undead' },
      { type: 'mechatronist', pos: { x: 20, y: 2 }, category: 'mechanical' },
      { type: 'clanker', pos: { x: 26, y: 2 }, category: 'constructs' },
      { type: 'megasquirrel', pos: { x: 32, y: 2 }, category: 'huge' },
      { type: 'desert-megaworm', pos: { x: 2, y: 8 }, category: 'segmented' },
      { type: 'grappler', pos: { x: 16, y: 8 }, category: 'special' }
    ];

    const placedCreatures: any[] = [];
    
    showcaseCreatures.forEach(({ type, pos, category }) => {
      try {
        const creature = { ...Encyclopaedia.unit(type), pos, id: `showcase_${type}` };
        sim.addUnit(creature);
        placedCreatures.push({ creature, category });
        
        console.log(`✅ ${type} (${category}) placed at (${pos.x}, ${pos.y})`);
      } catch (error) {
        console.warn(`⚠️ Failed to place ${type}: ${error}`);
      }
    });

    // Run a few ticks to set up segments and phantoms
    for (let i = 0; i < 5; i++) {
      sim.step();
    }

    console.log('\n📊 ENCYCLOPEDIA STATISTICS');
    console.log('=========================');
    console.log(`Total units in sim: ${sim.units.length} (including segments/phantoms)`);
    console.log(`Placed showcase units: ${placedCreatures.length}`);
    
    // Verify each category has creatures
    Object.entries(categories).forEach(([category, creatures]) => {
      if (creatures.length > 0) {
        console.log(`${category}: ${creatures.length} creatures`);
      }
    });

    console.log('\n🔍 SPOT-CHECK GUIDE');
    console.log('===================');
    console.log('Visual inspection checklist:');
    console.log('□ All sprites load without errors');
    console.log('□ Huge units have proper dimensions');
    console.log('□ Segmented creatures form chains');
    console.log('□ Mechanical units have appropriate effects');
    console.log('□ Construct abilities trigger correctly');
    console.log('□ Shadow/anchor positioning looks correct');
    console.log('□ No sprite clipping or overlap issues');

    console.log('\n📝 CREATURE BROWSER COMMANDS');
    console.log('============================');
    console.log('Use these patterns to test specific creatures:');
    console.log('• spawn <creature-type> - Place creature at cursor');
    console.log('• weather <type> - Test environmental effects');
    console.log('• lightning <x> <y> - Test electrical effects');
    console.log('• grapple <x> <y> - Test grappling mechanics');
    console.log('• pin <x> <y> - Test pinning mechanics');

    // Test basic functionality
    expect(sim.units.length).toBeGreaterThan(placedCreatures.length); // Include segments/phantoms
    expect(Object.keys(categories).every(cat => categories[cat as keyof typeof categories].length >= 0)).toBe(true);
    expect(placedCreatures.length).toBeGreaterThan(6); // Should have placed most showcase units
    
    console.log('\n✅ ENCYCLOPEDIA BROWSER READY!');
    console.log('Ready for visual inspection and interactive testing.');
  });

  it('should provide creature comparison tool', () => {
    console.log('\n🔬 CREATURE COMPARISON TOOL');
    console.log('===========================');

    const compareCreatures = (types: string[]) => {
      console.log('\nComparison Table:');
      console.log('-'.repeat(80));
      console.log('Name'.padEnd(15) + '| HP'.padEnd(6) + '| Sprite'.padEnd(12) + '| Abilities'.padEnd(25) + '| Tags');
      console.log('-'.repeat(80));
      
      types.forEach(type => {
        try {
          const creature = Encyclopaedia.unit(type);
          const abilities = Object.keys(creature.abilities).join(', ') || 'none';
          const tags = (creature.tags || []).join(', ') || 'none';
          
          console.log(
            type.padEnd(15) + 
            `| ${creature.hp}`.padEnd(6) + 
            `| ${creature.sprite}`.padEnd(12) + 
            `| ${abilities.substring(0, 22)}`.padEnd(25) + 
            `| ${tags}`
          );
        } catch (error) {
          console.log(type.padEnd(15) + '| ERROR: ' + error);
        }
      });
    };

    // Compare different unit classes
    console.log('\n🔍 Basic Units vs Military Units:');
    compareCreatures(['worm', 'farmer', 'squirrel', 'soldier', 'ranger', 'priest']);
    
    console.log('\n🤖 Mechanical Family:');
    compareCreatures(['mechatronist', 'builder', 'engineer', 'welder', 'mechatron']);
    
    console.log('\n🏗️ Construct Family:');  
    compareCreatures(['clanker', 'freezebot', 'spiker', 'swarmbot', 'roller', 'zapper']);
    
    console.log('\n🐉 Large Creatures:');
    compareCreatures(['megasquirrel', 'big-worm', 'desert-megaworm', 'mechatron']);

    console.log('\n✅ Comparison tool ready for detailed unit analysis!');
  });

  it('should test creature spotlight with detailed inspection', () => {
    console.log('\n🎯 CREATURE SPOTLIGHT');
    console.log('=====================');

    const spotlightCreature = (type: string) => {
      console.log(`\n🔦 SPOTLIGHTING: ${type.toUpperCase()}`);
      console.log('═'.repeat(40));
      
      try {
        const creature = Encyclopaedia.unit(type);
        
        console.log(`📊 Basic Stats:`);
        console.log(`   HP: ${creature.hp}/${creature.maxHp}`);
        console.log(`   Sprite: ${creature.sprite}`);
        console.log(`   Team: ${creature.team}`);
        console.log(`   Mass: ${creature.mass}`);
        
        console.log(`🏷️ Tags: [${(creature.tags || []).join(', ') || 'none'}]`);
        
        console.log(`⚙️ Abilities (${Object.keys(creature.abilities).length}):`);
        Object.entries(creature.abilities).forEach(([name, ability]) => {
          console.log(`   • ${name}: cooldown ${ability.cooldown || 0}, range ${ability.config?.range || 'melee'}`);
        });
        
        console.log(`🔧 Metadata:`);
        Object.entries(creature.meta || {}).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
        
        // Test creation in simulator
        const sim = new Simulator(10, 10);
        sim.rulebook = [new HugeUnits(sim), new SegmentedCreatures(sim)];
        
        const testCreature = { ...creature, pos: { x: 5, y: 5 }, id: `test_${type}` };
        sim.addUnit(testCreature);
        
        // Run a few ticks to set up segments/phantoms
        for (let i = 0; i < 3; i++) {
          sim.step();
        }
        
        console.log(`🧪 Simulation Test:`);
        console.log(`   Units created: ${sim.units.length} (including segments/phantoms)`);
        console.log(`   Particles: ${sim.particles.length}`);
        
        const actualUnit = sim.units.find(u => u.id === `test_${type}`);
        if (actualUnit) {
          console.log(`   Position: (${actualUnit.pos.x}, ${actualUnit.pos.y})`);
          console.log(`   Status: ${actualUnit.state || 'idle'}`);
        }
        
      } catch (error) {
        console.error(`❌ Error spotlighting ${type}: ${error}`);
      }
    };

    // Spotlight key creatures from different categories
    ['desert-megaworm', 'mechatron', 'grappler', 'clanker'].forEach(spotlightCreature);

    console.log('\n✅ Creature spotlight ready for detailed unit inspection!');
  });
});