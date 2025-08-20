#!/usr/bin/env bun

// Parse and analyze 2v2 tournament results
const results = `big-worm+big-worm: 98.3% win rate (295W/5L/0D) avg 500 steps
  big-worm+desert-megaworm: 98.0% win rate (294W/6L/0D) avg 500 steps
  big-worm+toymaker: 98.0% win rate (294W/3L/3D) avg 38 steps
  big-worm+spiker: 98.0% win rate (294W/4L/2D) avg 500 steps
  big-worm+zapper: 97.7% win rate (293W/3L/4D) avg 500 steps
  megasquirrel+big-worm: 97.0% win rate (291W/7L/2D) avg 500 steps
  demon+big-worm: 96.3% win rate (289W/7L/4D) avg 500 steps
  big-worm+roller: 95.3% win rate (286W/11L/3D) avg 500 steps
  big-worm+miner: 94.3% win rate (283W/6L/11D) avg 500 steps
  big-worm+fueler: 94.0% win rate (282W/7L/11D) avg 500 steps
  big-worm+freezebot: 94.0% win rate (282W/12L/6D) avg 500 steps
  big-worm+naturist: 94.0% win rate (282W/7L/11D) avg 500 steps
  big-worm+skirmisher: 93.7% win rate (281W/7L/12D) avg 500 steps
  big-worm+builder: 93.7% win rate (281W/8L/11D) avg 500 steps
  big-worm+clanker: 93.7% win rate (281W/15L/4D) avg 500 steps
  big-worm+wildmage: 93.7% win rate (281W/8L/11D) avg 500 steps
  big-worm+mindmender: 93.7% win rate (281W/8L/11D) avg 500 steps
  big-worm+mechanic: 93.3% win rate (280W/9L/11D) avg 500 steps
  ranger+big-worm: 91.7% win rate (275W/10L/15D) avg 500 steps
  mimic-worm+big-worm: 91.7% win rate (275W/22L/3D) avg 500 steps
  bombardier+big-worm: 91.3% win rate (274W/17L/9D) avg 500 steps
  demon+desert-megaworm: 91.0% win rate (273W/27L/0D) avg 500 steps
  worm+big-worm: 90.7% win rate (272W/23L/5D) avg 500 steps
  squirrel+big-worm: 90.7% win rate (272W/21L/7D) avg 500 steps
  rainmaker+big-worm: 90.0% win rate (270W/14L/16D) avg 500 steps
  toymaker+toymaker: 88.3% win rate (265W/33L/2D) avg 31 steps
  demon+toymaker: 88.0% win rate (264W/29L/7D) avg 500 steps
  desert-megaworm+toymaker: 87.7% win rate (263W/32L/5D) avg 249 steps
  rainmaker+desert-megaworm: 83.3% win rate (250W/36L/14D) avg 500 steps
  desert-megaworm+desert-megaworm: 83.0% win rate (249W/49L/2D) avg 500 steps
  ranger+desert-megaworm: 82.3% win rate (247W/39L/14D) avg 500 steps
  desert-megaworm+naturist: 82.0% win rate (246W/45L/9D) avg 500 steps
  desert-megaworm+mechanic: 81.7% win rate (245W/44L/11D) avg 500 steps
  skirmisher+toymaker: 81.7% win rate (245W/44L/11D) avg 500 steps
  toymaker+miner: 81.7% win rate (245W/46L/9D) avg 500 steps
  desert-megaworm+zapper: 81.3% win rate (244W/45L/11D) avg 500 steps
  desert-megaworm+miner: 81.3% win rate (244W/47L/9D) avg 500 steps
  desert-megaworm+mindmender: 81.3% win rate (244W/46L/10D) avg 500 steps
  mechanic+toymaker: 81.3% win rate (244W/44L/12D) avg 30 steps
  megasquirrel+demon: 81.0% win rate (243W/48L/9D) avg 500 steps
  desert-megaworm+spiker: 81.0% win rate (243W/44L/13D) avg 500 steps
  desert-megaworm+wildmage: 81.0% win rate (243W/44L/13D) avg 500 steps
  mimic-worm+toymaker: 80.7% win rate (242W/54L/4D) avg 500 steps
  desert-megaworm+builder: 80.3% win rate (241W/51L/8D) avg 500 steps
  desert-megaworm+fueler: 80.3% win rate (241W/49L/10D) avg 500 steps
  bombardier+desert-megaworm: 80.0% win rate (240W/48L/12D) avg 500 steps
  megasquirrel+toymaker: 80.0% win rate (240W/57L/3D) avg 500 steps
  demon+mimic-worm: 80.0% win rate (240W/56L/4D) avg 500 steps
  megasquirrel+desert-megaworm: 79.7% win rate (239W/55L/6D) avg 500 steps
  desert-megaworm+skirmisher: 79.7% win rate (239W/51L/10D) avg 500 steps
  toymaker+spiker: 79.3% win rate (238W/50L/12D) avg 500 steps
  toymaker+zapper: 79.3% win rate (238W/51L/11D) avg 16 steps
  toymaker+naturist: 79.3% win rate (238W/49L/13D) avg 500 steps
  toymaker+wildmage: 78.7% win rate (236W/49L/15D) avg 500 steps
  mimic-worm+desert-megaworm: 78.3% win rate (235W/55L/10D) avg 500 steps
  toymaker+roller: 78.3% win rate (235W/52L/13D) avg 29 steps
  desert-megaworm+roller: 78.0% win rate (234W/53L/13D) avg 500 steps
  fueler+toymaker: 78.0% win rate (234W/60L/6D) avg 49 steps
  squirrel+toymaker: 77.3% win rate (232W/55L/13D) avg 500 steps
  toymaker+freezebot: 77.3% win rate (232W/54L/14D) avg 500 steps
  toymaker+clanker: 77.3% win rate (232W/57L/11D) avg 500 steps
  toymaker+mindmender: 77.3% win rate (232W/53L/15D) avg 500 steps
  ranger+toymaker: 77.0% win rate (231W/59L/10D) avg 14 steps
  worm+toymaker: 76.7% win rate (230W/66L/4D) avg 500 steps
  desert-megaworm+freezebot: 76.7% win rate (230W/59L/11D) avg 500 steps
  desert-megaworm+clanker: 76.7% win rate (230W/58L/12D) avg 500 steps
  builder+toymaker: 76.7% win rate (230W/61L/9D) avg 500 steps
  bombardier+toymaker: 75.7% win rate (227W/66L/7D) avg 500 steps
  rainmaker+toymaker: 75.3% win rate (226W/58L/16D) avg 500 steps
  squirrel+desert-megaworm: 75.0% win rate (225W/63L/12D) avg 500 steps
  worm+desert-megaworm: 74.7% win rate (224W/67L/9D) avg 500 steps
  megasquirrel+megasquirrel: 70.3% win rate (211W/84L/5D) avg 500 steps
  megasquirrel+spiker: 69.7% win rate (209W/81L/10D) avg 500 steps
  megasquirrel+mimic-worm: 67.3% win rate (202W/94L/4D) avg 500 steps
  megasquirrel+zapper: 67.0% win rate (201W/89L/10D) avg 500 steps
  mimic-worm+spiker: 65.0% win rate (195W/97L/8D) avg 500 steps
  mimic-worm+zapper: 64.0% win rate (192W/98L/10D) avg 500 steps
  megasquirrel+miner: 59.3% win rate (178W/92L/30D) avg 500 steps
  megasquirrel+mindmender: 59.3% win rate (178W/95L/27D) avg 500 steps
  megasquirrel+clanker: 59.0% win rate (177W/112L/11D) avg 500 steps
  worm+demon: 58.3% win rate (175W/90L/35D) avg 500 steps
  megasquirrel+fueler: 58.3% win rate (175W/100L/25D) avg 500 steps
  megasquirrel+mechanic: 58.0% win rate (174W/96L/30D) avg 500 steps
  megasquirrel+wildmage: 58.0% win rate (174W/93L/33D) avg 500 steps
  squirrel+demon: 57.7% win rate (173W/68L/59D) avg 500 steps
  megasquirrel+rainmaker: 57.7% win rate (173W/100L/27D) avg 500 steps
  mimic-worm+mimic-worm: 57.7% win rate (173W/123L/4D) avg 500 steps
  megasquirrel+builder: 57.3% win rate (172W/97L/31D) avg 500 steps
  worm+megasquirrel: 56.7% win rate (170W/103L/27D) avg 500 steps
  megasquirrel+skirmisher: 56.3% win rate (169W/92L/39D) avg 500 steps
  megasquirrel+naturist: 56.3% win rate (169W/101L/30D) avg 500 steps
  megasquirrel+freezebot: 55.7% win rate (167W/117L/16D) avg 500 steps
  squirrel+megasquirrel: 55.0% win rate (165W/105L/30D) avg 500 steps
  megasquirrel+roller: 54.7% win rate (164W/121L/15D) avg 500 steps
  bombardier+megasquirrel: 53.3% win rate (160W/127L/13D) avg 500 steps
  ranger+megasquirrel: 53.0% win rate (159W/122L/19D) avg 500 steps
  mimic-worm+mechanic: 53.0% win rate (159W/106L/35D) avg 500 steps
  mimic-worm+mindmender: 50.3% win rate (151W/118L/31D) avg 500 steps
  mimic-worm+fueler: 50.0% win rate (150W/120L/30D) avg 500 steps
  mimic-worm+clanker: 50.0% win rate (150W/138L/12D) avg 500 steps
  mimic-worm+wildmage: 50.0% win rate (150W/121L/29D) avg 500 steps
  mimic-worm+miner: 50.0% win rate (150W/116L/34D) avg 500 steps
  mimic-worm+skirmisher: 49.7% win rate (149W/115L/36D) avg 500 steps
  mimic-worm+builder: 49.7% win rate (149W/114L/37D) avg 500 steps
  rainmaker+mimic-worm: 48.7% win rate (146W/117L/37D) avg 500 steps
  mimic-worm+naturist: 48.7% win rate (146W/117L/37D) avg 500 steps
  mimic-worm+roller: 48.3% win rate (145W/146L/9D) avg 500 steps
  mimic-worm+freezebot: 48.0% win rate (144W/146L/10D) avg 500 steps
  squirrel+mimic-worm: 47.0% win rate (141W/132L/27D) avg 500 steps
  worm+mimic-worm: 46.7% win rate (140W/132L/28D) avg 500 steps
  ranger+mimic-worm: 45.3% win rate (136W/155L/9D) avg 500 steps
  worm+zapper: 45.0% win rate (135W/136L/29D) avg 500 steps
  bombardier+mimic-worm: 45.0% win rate (135W/158L/7D) avg 500 steps`.split('\n');

// Calculate individual unit scores
const unitScores = new Map<string, { totalWinRate: number, appearances: number, avgWinRate: number }>();

results.forEach(line => {
  const match = line.match(/^\s*([^+]+)\+([^:]+):\s*([\d.]+)%/);
  if (match) {
    const [_, unit1, unit2, winRate] = match;
    const rate = parseFloat(winRate);
    
    [unit1, unit2].forEach(unit => {
      if (!unitScores.has(unit)) {
        unitScores.set(unit, { totalWinRate: 0, appearances: 0, avgWinRate: 0 });
      }
      const score = unitScores.get(unit)!;
      score.totalWinRate += rate;
      score.appearances += 1;
    });
  }
});

// Calculate averages
unitScores.forEach(score => {
  score.avgWinRate = score.totalWinRate / score.appearances;
});

// Sort by average win rate
const sortedUnits = Array.from(unitScores.entries())
  .sort((a, b) => b[1].avgWinRate - a[1].avgWinRate);

console.log("=== INDIVIDUAL UNIT POWER RANKINGS ===\n");
console.log("Rank | Unit            | Avg Win % | Appearances");
console.log("-----|-----------------|-----------|-------------");

sortedUnits.forEach(([unit, score], index) => {
  console.log(`${String(index + 1).padStart(4)} | ${unit.padEnd(15)} | ${score.avgWinRate.toFixed(1).padStart(8)}% | ${score.appearances.toString().padStart(11)}`);
});

// Identify top synergies (pairs that overperform)
console.log("\n=== TOP SYNERGIES (Overperforming Pairs) ===\n");

const pairResults: Array<{pair: string, winRate: number, expectedRate: number, synergy: number}> = [];

results.forEach(line => {
  const match = line.match(/^\s*([^+]+)\+([^:]+):\s*([\d.]+)%/);
  if (match) {
    const [_, unit1, unit2, winRate] = match;
    const rate = parseFloat(winRate);
    
    const unit1Score = unitScores.get(unit1)?.avgWinRate || 0;
    const unit2Score = unitScores.get(unit2)?.avgWinRate || 0;
    const expectedRate = (unit1Score + unit2Score) / 2;
    const synergy = rate - expectedRate;
    
    pairResults.push({
      pair: `${unit1}+${unit2}`,
      winRate: rate,
      expectedRate,
      synergy
    });
  }
});

pairResults.sort((a, b) => b.synergy - a.synergy);

console.log("Pair                          | Win % | Expected % | Synergy");
console.log("------------------------------|-------|------------|--------");
pairResults.slice(0, 20).forEach(result => {
  console.log(`${result.pair.padEnd(29)} | ${result.winRate.toFixed(1).padStart(5)}% | ${result.expectedRate.toFixed(1).padStart(9)}% | ${result.synergy > 0 ? '+' : ''}${result.synergy.toFixed(1)}%`);
});

// Bottom performers
console.log("\n=== WORST SYNERGIES (Underperforming Pairs) ===\n");
console.log("Pair                          | Win % | Expected % | Synergy");
console.log("------------------------------|-------|------------|--------");
pairResults.slice(-20).reverse().forEach(result => {
  console.log(`${result.pair.padEnd(29)} | ${result.winRate.toFixed(1).padStart(5)}% | ${result.expectedRate.toFixed(1).padStart(9)}% | ${result.synergy > 0 ? '+' : ''}${result.synergy.toFixed(1)}%`);
});