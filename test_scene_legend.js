const fs = require('fs');

const sceneText = `
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . . . . k k k k k . . . . . . . . . . . . . . . . .
. . . . . . 1 . . . 2 . . . 3 . . . . . . . . . . . . . . . . . . . . . . . . .
---
bg city ultralarge
weather clear
1: philosopher
2: rhetorician
3: logician
k: skeleton
`;

const lines = sceneText.trim().split('\n');
let inMetadata = false;
let customLegend = {};

for (let y = 0; y < lines.length; y++) {
  const line = lines[y];
  
  if (!line.trim()) continue;
  
  if (line === '---') {
    inMetadata = true;
    console.log('Found metadata marker at line', y);
    continue;
  }
  
  if (inMetadata) {
    const trimmed = line.trim();
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const char = trimmed.substring(0, colonIndex).trim();
      const unitType = trimmed.substring(colonIndex + 1).trim().split(' ')[0];
      
      if (char.length === 1) {
        customLegend[char] = unitType;
        console.log(`Added legend: "${char}" -> "${unitType}"`);
      }
    }
  }
}

console.log('\nFinal legend:', customLegend);
