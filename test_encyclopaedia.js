import Encyclopaedia from './src/dmg/encyclopaedia.js';

console.log('Checking mage units in Encyclopaedia:');
const mageTypes = ['philosopher', 'rhetorician', 'logician', 'geometer', 'mentalist', 'trickster'];

for (const mageType of mageTypes) {
  const unitData = Encyclopaedia.unit(mageType);
  if (unitData) {
    console.log(`${mageType}: team=${unitData.team}, abilities=${unitData.abilities}`);
  } else {
    console.log(`${mageType}: NOT FOUND`);
  }
}
