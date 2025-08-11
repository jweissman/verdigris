import Encyclopaedia from '../src/dmg/encyclopaedia';

export function resetTestState() {
  // Reset all global state
  Encyclopaedia.counts = {};
  
  // Clear any other global state that might exist
  // Add more resets here as needed
}

export function setupTest() {
  resetTestState();
}