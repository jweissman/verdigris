require 'json'

module TournamentAnalyzer
  class Match
    attr_reader :team1, :team2, :winner, :duration, :survivors

    def initialize(team1, team2)
      @team1 = team1
      @team2 = team2
    end

    def run
      cmd = "bun scripts/run_single_match.ts #{@team1.join(',')} #{@team2.join(',')}"
      output = `#{cmd} 2>/dev/null`
      result = JSON.parse(output.strip)
      
      @winner = result['winner']
      @duration = result['duration']
      @survivors = result['survivors'] || []
      
      result
    rescue => e
      { 'winner' => 'error', 'error' => e.message }
    end
  end

  class SynergyAnalyzer
    def initialize(results)
      @results = results
    end

    def calculate_synergies
      synergies = {}
      
      @results.each do |matchup_key, match_results|
        team1_units = parse_team(matchup_key.split(' vs ')[0])
        team2_units = parse_team(matchup_key.split(' vs ')[1])
        
        # Track performance of each unit pair
        if team1_units[0] != team1_units[1]
          pair_key = team1_units.sort.join('+')
          synergies[pair_key] ||= { wins: 0, losses: 0, draws: 0 }
          
          match_results.each do |result|
            case result['winner']
            when 'team1' then synergies[pair_key][:wins] += 1
            when 'team2' then synergies[pair_key][:losses] += 1
            when 'draw' then synergies[pair_key][:draws] += 1
            end
          end
        end
      end
      
      synergies
    end

    def rank_abilities
      ability_scores = {}
      
      @results.each do |matchup_key, match_results|
        team1_units = parse_team(matchup_key.split(' vs ')[0])
        team2_units = parse_team(matchup_key.split(' vs ')[1])
        
        # Track individual unit performance
        team1_units.each do |unit|
          ability_scores[unit] ||= { wins: 0, losses: 0, draws: 0 }
        end
        team2_units.each do |unit|
          ability_scores[unit] ||= { wins: 0, losses: 0, draws: 0 }
        end
        
        match_results.each do |result|
          case result['winner']
          when 'team1'
            team1_units.each { |u| ability_scores[u][:wins] += 1 }
            team2_units.each { |u| ability_scores[u][:losses] += 1 }
          when 'team2'
            team1_units.each { |u| ability_scores[u][:losses] += 1 }
            team2_units.each { |u| ability_scores[u][:wins] += 1 }
          when 'draw'
            team1_units.each { |u| ability_scores[u][:draws] += 1 }
            team2_units.each { |u| ability_scores[u][:draws] += 1 }
          end
        end
      end
      
      # Calculate win rates
      ability_scores.each do |unit, stats|
        total = stats[:wins] + stats[:losses] + stats[:draws]
        stats[:win_rate] = total > 0 ? stats[:wins].to_f / total : 0
        stats[:total_matches] = total
      end
      
      ability_scores.sort_by { |_, stats| -stats[:win_rate] }.to_h
    end

    private

    def parse_team(team_str)
      team_str.split('+')
    end
  end
end