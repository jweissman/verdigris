#!/usr/bin/env bun

import Encyclopaedia from '../src/dmg/encyclopaedia';

console.log("=== CHECKING FOR TRUE ISOTYPES (Single-Ability Units) ===\n");

const units = Encyclopaedia.bestiary;
const isotypes: string[] = [];
const multiAbility: string[] = [];
const noAbility: string[] = [];

Object.entries(units).forEach(([name, unit]) => {
  if (!unit.abilities || unit.abilities.length === 0) {
    noAbility.push(name);
  } else if (unit.abilities.length === 1) {
    isotypes.push(`${name} (${unit.abilities[0]})`);
  } else {
    multiAbility.push(`${name} (${unit.abilities.join(', ')})`);
  }
});

console.log(`Found ${isotypes.length} isotypes, ${multiAbility.length} multi-ability units, ${noAbility.length} units with no abilities\n`);

console.log("=== TRUE ISOTYPES ===");
isotypes.sort().forEach(unit => console.log(`  ${unit}`));

console.log("\n=== MULTI-ABILITY UNITS ===");
multiAbility.sort().forEach(unit => console.log(`  ${unit}`));

console.log("\n=== NO ABILITIES ===");
noAbility.sort().forEach(unit => console.log(`  ${unit}`));

// Check ability distribution
const abilityCount = new Map<string, number>();
Object.values(units).forEach(unit => {
  if (unit.abilities) {
    unit.abilities.forEach(ability => {
      abilityCount.set(ability, (abilityCount.get(ability) || 0) + 1);
    });
  }
});

console.log("\n=== ABILITY FREQUENCY ===");
const sortedAbilities = Array.from(abilityCount.entries()).sort((a, b) => b[1] - a[1]);
sortedAbilities.forEach(([ability, count]) => {
  console.log(`  ${ability}: ${count} units`);
});