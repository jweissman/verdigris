#!/usr/bin/env ruby

require 'json'
require 'parallel'
require 'optparse'

# Tournament orchestrator that distributes matches across processes
class ParallelTournament
  def initialize(units, processes: 4, runs_per_matchup: 1)
    @units = units
    @processes = processes
    @runs_per_matchup = runs_per_matchup
    @results = {}
    @start_time = Time.now
  end

  def run
    teams = generate_teams
    matchups = generate_matchups(teams)
    
    puts "=== Parallel 2v2 Tournament ==="
    puts "Units: #{@units.join(', ')}"
    puts "Total unit types: #{@units.length}"
    puts "Possible teams: #{teams.length}"
    puts "Total matchups: #{matchups.length}"
    puts "Runs per matchup: #{@runs_per_matchup}"
    puts "Total matches: #{matchups.length * @runs_per_matchup}"
    puts "Parallel processes: #{@processes}"
    puts ""
    
    # Run matches in parallel with WORKING progress reporting
    results = Parallel.map_with_index(matchups, in_processes: @processes, progress: "Running matches") do |matchup, index|
      run_matchup(matchup)
    end
    
    # Aggregate results
    results.each do |matchup_results|
      key = matchup_results[:key]
      @results[key] = matchup_results[:results]
    end
    
    print_report
  end

  private

  def generate_teams
    teams = []
    @units.each_with_index do |unit1, i|
      @units[i..-1].each do |unit2|
        teams << [unit1, unit2]
      end
    end
    teams
  end

  def generate_matchups(teams)
    matchups = []
    teams.each do |team1|
      teams.each do |team2|
        matchups << { team1: team1, team2: team2 }
      end
    end
    matchups
  end

  def run_matchup(matchup)
    team1 = matchup[:team1]
    team2 = matchup[:team2]
    key = "#{team1.join('+')} vs #{team2.join('+')}"
    
    results = []
    @runs_per_matchup.times do
      result = run_single_match(team1, team2)
      results << result if result
    end
    
    { key: key, results: results }
  end

  def run_single_match(team1, team2)
    cmd = "bun scripts/run_single_match.ts #{team1.join(' ')} #{team2.join(' ')}"
    output = `#{cmd} 2>/dev/null`
    
    begin
      JSON.parse(output, symbolize_names: true)
    rescue JSON::ParserError => e
      # Silently skip parse errors to avoid cluttering output
      nil
    rescue => e
      # Handle other errors gracefully
      nil
    end
  end

  def print_report
    stats = calculate_stats
    synergies = calculate_synergies
    
    puts "\n=== Tournament Results ==="
    puts "Time elapsed: #{(Time.now - @start_time).round(1)}s"
    puts ""
    
    # Sort by win rate
    sorted_teams = stats.sort_by { |_, s| -s[:win_rate] }
    
    puts "Team Rankings:"
    sorted_teams.first(20).each_with_index do |(team, stat), i|
      total = stat[:wins] + stat[:losses] + stat[:draws]
      next if total == 0
      
      win_rate = (stat[:win_rate] * 100).round(1)
      avg_duration = stat[:total_duration] / total
      
      puts "  ##{i+1} #{team}: #{win_rate}% win rate " \
           "(#{stat[:wins]}W/#{stat[:losses]}L/#{stat[:draws]}D) " \
           "avg #{avg_duration.round} steps"
    end
    
    puts "\nTop Synergies:"
    sorted_synergies = synergies.sort_by { |_, s| -s[:synergy_score] }
    sorted_synergies.first(10).each do |pair, syn|
      if syn[:synergy_score] > 0
        puts "  #{pair}: +#{(syn[:synergy_score] * 100).round(1)}% synergy bonus"
      end
    end
    
    puts "\nWorst Anti-Synergies:"
    sorted_synergies.last(5).each do |pair, syn|
      if syn[:synergy_score] < -0.05
        puts "  #{pair}: #{(syn[:synergy_score] * 100).round(1)}% synergy penalty"
      end
    end
  end

  def calculate_synergies
    synergies = {}
    
    @results.each do |matchup, results|
      team1_name = matchup.split(' vs ')[0]
      team2_name = matchup.split(' vs ')[1]
      
      team1_units = team1_name.split('+')
      team2_units = team2_name.split('+')
      
      # Only track synergies for mixed teams
      if team1_units[0] != team1_units[1]
        pair_key = team1_units.sort.join('+')
        synergies[pair_key] ||= { wins: 0, losses: 0, draws: 0 }
        
        results.each do |result|
          case result[:winner]
          when 'team1' then synergies[pair_key][:wins] += 1
          when 'team2' then synergies[pair_key][:losses] += 1
          else synergies[pair_key][:draws] += 1
          end
        end
      end
      
      if team2_units[0] != team2_units[1]
        pair_key = team2_units.sort.join('+')
        synergies[pair_key] ||= { wins: 0, losses: 0, draws: 0 }
        
        results.each do |result|
          case result[:winner]
          when 'team2' then synergies[pair_key][:wins] += 1
          when 'team1' then synergies[pair_key][:losses] += 1
          else synergies[pair_key][:draws] += 1
          end
        end
      end
    end
    
    # Calculate synergy scores
    synergies.each do |pair, stats|
      total = stats[:wins] + stats[:losses] + stats[:draws]
      win_rate = total > 0 ? stats[:wins].to_f / total : 0
      
      # Compare to individual unit performance
      units = pair.split('+')
      individual_rates = units.map do |unit|
        unit_stats = calculate_stats["#{unit}+#{unit}"]
        if unit_stats
          unit_total = unit_stats[:wins] + unit_stats[:losses] + unit_stats[:draws]
          unit_total > 0 ? unit_stats[:wins].to_f / unit_total : 0
        else
          0
        end
      end
      
      avg_individual = individual_rates.sum / individual_rates.length
      stats[:synergy_score] = win_rate - avg_individual
      stats[:win_rate] = win_rate
    end
    
    synergies
  end

  def calculate_stats
    stats = Hash.new { |h, k| h[k] = { wins: 0, losses: 0, draws: 0, total_duration: 0 } }
    
    @results.each do |matchup, results|
      team1_name = matchup.split(' vs ')[0]
      team2_name = matchup.split(' vs ')[1]
      
      results.each do |result|
        next unless result
        
        duration = result[:duration] || 0
        
        if result[:winner] == 'team1'
          stats[team1_name][:wins] += 1
          stats[team2_name][:losses] += 1
        elsif result[:winner] == 'team2'
          stats[team1_name][:losses] += 1
          stats[team2_name][:wins] += 1
        else
          stats[team1_name][:draws] += 1
          stats[team2_name][:draws] += 1
        end
        
        stats[team1_name][:total_duration] += duration
        stats[team2_name][:total_duration] += duration
      end
    end
    
    # Calculate win rates
    stats.each do |team, stat|
      total = stat[:wins] + stat[:losses] + stat[:draws]
      stat[:win_rate] = total > 0 ? stat[:wins].to_f / total : 0
    end
    
    stats
  end
end

if __FILE__ == $0
  # Parse command line options
  options = {
    processes: 4,
    runs: 1,
    units: nil
  }

  OptionParser.new do |opts|
  opts.banner = "Usage: ruby parallel_tournament.rb [options]"
  
  opts.on("-p", "--processes N", Integer, "Number of parallel processes (default: 4)") do |n|
    options[:processes] = n
  end
  
  opts.on("-r", "--runs N", Integer, "Runs per matchup (default: 1)") do |n|
    options[:runs] = n
  end
  
  opts.on("-u", "--units UNITS", "Comma-separated list of units (default: folks)") do |units|
    options[:units] = units.split(',')
  end
  
  opts.on("-h", "--help", "Show this help") do
    puts opts
    exit
  end
  end.parse!

  # Default to folks units if not specified
  if options[:units].nil?
    # Get folks units from the TypeScript side
    folks_output = `bun -e "import { Folks } from './src/dmg/folks'; console.log(Folks.names.join(','))" 2>/dev/null`
    options[:units] = folks_output.strip.split(',')
  end

  # Check for parallel gem
  begin
    require 'parallel'
  rescue LoadError
    puts "Error: parallel gem not installed"
    puts "Run: gem install parallel"
    exit 1
  end

  # Run tournament
  tournament = ParallelTournament.new(
    options[:units], 
    processes: options[:processes],
    runs_per_matchup: options[:runs]
  )

  tournament.run
end