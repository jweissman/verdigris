import Encyclopaedia from '../src/dmg/encyclopaedia';

export function resetTestState() {

  Encyclopaedia.counts = {};
  


}

export function setupTest() {
  resetTestState();
}