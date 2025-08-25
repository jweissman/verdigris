/**
 * Check if two teams should be considered hostile to each other
 * Neutral units should not be attacked by friendly or hostile teams
 */
export function areTeamsHostile(team1: string, team2: string): boolean {
  if (team1 === team2) return false;

  if (team1 === "neutral" || team2 === "neutral") return false;

  return true;
}

/**
 * Check if a unit should be considered an enemy of another unit
 */
export function isEnemy(unit: any, other: any): boolean {
  if (other.state === "dead") return false;
  return areTeamsHostile(unit.team, other.team);
}
