#!/usr/bin/env ruby

require 'json'

# Analyze tournament results to identify weight classes
class WeightClassAnalyzer
  def initialize(results_file = nil)
    @results = results_file ? load_results(results_file) : run_sample_tournament
  end

  def analyze
    win_rates = calculate_win_rates
    
    # Group units into weight classes based on win rate
    weight_classes = {
      'S-tier' => [],  # 70%+ win rate
      'A-tier' => [],  # 55-70% win rate  
      'B-tier' => [],  # 40-55% win rate
      'C-tier' => [],  # 25-40% win rate
      'D-tier' => []   # <25% win rate
    }
    
    win_rates.each do |unit, rate|
      if rate >= 0.70
        weight_classes['S-tier'] << unit
      elsif rate >= 0.55
        weight_classes['A-tier'] << unit
      elsif rate >= 0.40
        weight_classes['B-tier'] << unit
      elsif rate >= 0.25
        weight_classes['C-tier'] << unit
      else
        weight_classes['D-tier'] << unit
      end
    end
    
    puts "=== Weight Classes Identified ==="
    weight_classes.each do |tier, units|
      next if units.empty?
      puts "\n#{tier}: #{units.join(', ')}"
      puts "  Suggested tournaments within this tier: #{units.length * (units.length + 1) / 2} teams"
    end
    
    # Suggest optimized tournament structure
    puts "\n=== Optimized Tournament Structure ==="
    puts "Instead of running all #{win_rates.keys.length} units together:"
    puts "  - Run separate tournaments within each weight class"
    puts "  - Run champions tournament with top 2 from each class"
    puts "  - This reduces complexity from O(n^4) to O(k * (n/k)^4) where k = number of classes"
    
    weight_classes
  end
  
  private
  
  def load_results(file)
    JSON.parse(File.read(file), symbolize_names: true)
  end
  
  def run_sample_tournament
    # Run a quick sample tournament to get initial weight classes
    puts "Running sample tournament to identify weight classes..."
    
    # Get a sample of units
    sample_units = get_sample_units
    
    # Run quick tournament with minimal matches
    cmd = "ruby scripts/parallel_tournament.rb --units #{sample_units.join(',')} --runs 1 --processes 4"
    output = `#{cmd} 2>&1`
    
    # Parse results from output
    parse_tournament_output(output)
  end
  
  def get_sample_units
    # Get a representative sample of units
    folks_output = `bun -e "import { Folks } from './src/dmg/folks'; console.log(Folks.names.join(','))" 2>/dev/null`
    all_units = folks_output.strip.split(',')
    
    # Take first 6 units for quick sampling
    sample = all_units.first(6)
    
    sample
  end
  
  def parse_tournament_output(output)
    results = {}
    
    # Parse the team rankings section
    in_rankings = false
    output.lines.each do |line|
      if line.include?("Team Rankings:")
        in_rankings = true
        next
      end
      
      next unless in_rankings
      
      # Parse lines like: #1 priest+priest: 70.0% win rate (14W/0L/6D)
      if match = line.match(/#\d+\s+(\S+):\s+([\d.]+)%\s+win rate/)
        team = match[1]
        win_rate = match[2].to_f / 100
        
        # Extract individual units from team
        units = team.split('+')
        units.each do |unit|
          results[unit] ||= []
          results[unit] << win_rate
        end
      end
    end
    
    results
  end
  
  def calculate_win_rates
    win_rates = {}
    
    @results.each do |unit, rates|
      # Average win rate across all team compositions
      win_rates[unit] = rates.sum / rates.length.to_f
    end
    
    # Sort by win rate
    win_rates.sort_by { |_, rate| -rate }.to_h
  end
end

# Run analyzer
if __FILE__ == $0
  analyzer = WeightClassAnalyzer.new
  analyzer.analyze
end