#!/usr/bin/env ruby

require 'json'
require 'parallel'
require_relative 'identify_weight_classes'

# Optimized tournament that uses weight classes to reduce complexity
class OptimizedTournament
  def initialize(processes: 8)
    @processes = processes
  end
  
  def run
    puts "=== Optimized Tournament Strategy ==="
    puts "1. Identifying weight classes with sample matches..."
    
    # First identify weight classes
    analyzer = WeightClassAnalyzer.new
    weight_classes = analyzer.analyze
    
    puts "\n2. Running mini-tournaments within weight classes..."
    
    class_champions = {}
    
    weight_classes.each do |tier, units|
      next if units.empty?
      
      puts "\n--- #{tier} Tournament (#{units.length} units) ---"
      
      if units.length == 1
        class_champions[tier] = units.first
        next
      end
      
      # Run mini tournament for this weight class
      tournament = ParallelTournament.new(units, processes: @processes, runs_per_matchup: 2)
      results = tournament.run
      stats = tournament.calculate_stats
      
      # Get top performer from this tier
      champion = stats.max_by { |_, s| s[:win_rate] }&.first
      class_champions[tier] = champion
      
      puts "#{tier} Champion: #{champion}"
    end
    
    puts "\n3. Running champions tournament..."
    
    # Run final tournament with class champions
    champion_units = class_champions.values.compact
    if champion_units.length > 1
      final_tournament = ParallelTournament.new(
        champion_units, 
        processes: @processes, 
        runs_per_matchup: 3
      )
      final_tournament.run
      
      puts "\n=== FINAL RANKINGS ==="
      final_tournament.print_report
    end
    
    puts "\nTotal time: #{(Time.now - @start_time).round(1)}s" if @start_time
  end
end

# Load ParallelTournament if not already loaded
unless defined?(ParallelTournament)
  require_relative 'parallel_tournament'
end

if __FILE__ == $0
  require 'optparse'
  
  options = { processes: 8 }
  
  OptionParser.new do |opts|
    opts.banner = "Usage: ruby optimized_tournament.rb [options]"
    
    opts.on("-p", "--processes N", Integer, "Number of processes (default: 8)") do |n|
      options[:processes] = n
    end
    
    opts.on("-h", "--help", "Show this help") do
      puts opts
      exit
    end
  end.parse!
  
  tournament = OptimizedTournament.new(processes: options[:processes])
  tournament.instance_variable_set(:@start_time, Time.now)
  tournament.run
end