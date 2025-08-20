#!/usr/bin/env bun

/**
 * Hero MWE - 3x5 battlefield with player movement and jump commands
 */

import { Simulator } from '../src/core/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';

// Create 3x5 battlefield
const sim = new Simulator(5, 3);

// Get hero unit
const hero = Encyclopaedia.unit('hero');
if (!hero) {
  console.error('Hero unit not found!');
  process.exit(1);
}

// Place hero at center
const heroUnit = {
  ...hero,
  id: 'player',
  team: 'friendly' as const,
  pos: { x: 2, y: 1 }
};

sim.addUnit(heroUnit);

// Place some enemies
const soldier = Encyclopaedia.unit('soldier');
sim.addUnit({
  ...soldier,
  id: 'enemy1',
  team: 'hostile' as const,
  pos: { x: 0, y: 0 }
});

sim.addUnit({
  ...soldier,
  id: 'enemy2',
  team: 'hostile' as const,
  pos: { x: 4, y: 2 }
});

// Display battlefield
function displayBattlefield() {
  console.clear();
  console.log('=== Hero Jump MWE ===');
  console.log('Commands: w/a/s/d = move, j = jump, q = quit\n');
  
  // Create grid
  const grid: string[][] = [];
  for (let y = 0; y < sim.height; y++) {
    grid[y] = [];
    for (let x = 0; x < sim.width; x++) {
      grid[y][x] = '.';
    }
  }
  
  // Place units
  for (const unit of sim.units) {
    if (unit.hp <= 0) continue;
    const x = Math.floor(unit.pos.x);
    const y = Math.floor(unit.pos.y);
    if (x >= 0 && x < sim.width && y >= 0 && y < sim.height) {
      if (unit.id === 'player') {
        grid[y][x] = '@';
      } else if (unit.team === 'hostile') {
        grid[y][x] = 'E';
      } else {
        grid[y][x] = 'U';
      }
    }
  }
  
  // Display grid
  for (let y = 0; y < sim.height; y++) {
    console.log(grid[y].join(' '));
  }
  
  // Show hero status
  const playerUnit = sim.units.find(u => u.id === 'player');
  if (playerUnit) {
    console.log(`\nHero HP: ${playerUnit.hp}/${playerUnit.maxHp}`);
    console.log(`Position: (${Math.floor(playerUnit.pos.x)}, ${Math.floor(playerUnit.pos.y)})`);
  }
}

// Handle input
async function handleInput() {
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  
  return new Promise<void>((resolve) => {
    stdin.on('data', (key: string) => {
      const playerUnit = sim.units.find(u => u.id === 'player');
      if (!playerUnit || playerUnit.hp <= 0) {
        console.log('Game Over!');
        stdin.setRawMode(false);
        resolve();
        return;
      }
      
      // Handle movement
      let dx = 0, dy = 0;
      let jump = false;
      
      switch(key) {
        case 'w': dy = -1; break;
        case 's': dy = 1; break;
        case 'a': dx = -1; break;
        case 'd': dx = 1; break;
        case 'j': jump = true; break;
        case 'q':
        case '\u0003': // Ctrl+C
          stdin.setRawMode(false);
          resolve();
          return;
      }
      
      if (dx !== 0 || dy !== 0) {
        // Move hero
        const newX = Math.max(0, Math.min(sim.width - 1, playerUnit.pos.x + dx));
        const newY = Math.max(0, Math.min(sim.height - 1, playerUnit.pos.y + dy));
        playerUnit.pos = { x: newX, y: newY };
      }
      
      if (jump) {
        // Execute jump ability if available
        const jumpAbility = playerUnit.abilities?.find(a => a === 'jump' || a === 'heroJump');
        if (jumpAbility) {
          console.log('\nJumping!');
          // Jump to a random nearby position
          const jumpX = Math.max(0, Math.min(sim.width - 1, playerUnit.pos.x + (Math.random() - 0.5) * 3));
          const jumpY = Math.max(0, Math.min(sim.height - 1, playerUnit.pos.y + (Math.random() - 0.5) * 3));
          playerUnit.pos = { x: jumpX, y: jumpY };
        } else {
          console.log('\nNo jump ability!');
        }
      }
      
      // Simulate one step
      sim.step();
      
      // Redraw
      displayBattlefield();
      
      // Check win condition
      const hostileAlive = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
      if (hostileAlive === 0) {
        console.log('\nVictory!');
        stdin.setRawMode(false);
        resolve();
      }
    });
  });
}

// Main game loop
async function main() {
  displayBattlefield();
  await handleInput();
  console.log('\nThanks for playing!');
  process.exit(0);
}

main().catch(console.error);