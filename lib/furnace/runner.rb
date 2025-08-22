require 'json'

module Furnace
  class Runner
    def run_match(team1, team2)
      cmd = "bun scripts/run_single_match.ts #{team1.join(',')} #{team2.join(',')}"
      output = `#{cmd} 2>/dev/null`
      JSON.parse(output.strip)
    rescue => e
      { error: e.message, winner: 'error' }
    end
  end
end