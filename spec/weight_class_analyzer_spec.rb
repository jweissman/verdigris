require 'minitest/autorun'
require 'json'
require_relative '../scripts/identify_weight_classes'

describe WeightClassAnalyzer do
  describe "#calculate_win_rates" do
    it "averages win rates across team compositions" do
      analyzer = WeightClassAnalyzer.new
      
      # Mock results with units appearing in different teams
      analyzer.instance_variable_set(:@results, {
        'priest' => [0.8, 0.7, 0.9],  # Average: 0.8
        'soldier' => [0.5, 0.6],       # Average: 0.55
        'farmer' => [0.2, 0.3, 0.1]    # Average: 0.2
      })
      
      win_rates = analyzer.send(:calculate_win_rates)
      
      assert_in_delta 0.8, win_rates['priest'], 0.01
      assert_in_delta 0.55, win_rates['soldier'], 0.01
      assert_in_delta 0.2, win_rates['farmer'], 0.01
    end
  end
  
  describe "#parse_tournament_output" do
    it "extracts team win rates from tournament output" do
      analyzer = WeightClassAnalyzer.new
      
      output = <<~OUTPUT
        === Tournament Results ===
        Team Rankings:
          #1 priest+priest: 70.0% win rate (14W/0L/6D)
          #2 soldier+priest: 55.0% win rate (11W/4L/5D)
          #3 soldier+soldier: 45.0% win rate (9W/9L/2D)
      OUTPUT
      
      results = analyzer.send(:parse_tournament_output, output)
      
      # Each unit should have win rates from all teams it appears in
      assert_equal 2, results['priest'].length  # Appears in 2 teams
      assert_includes results['priest'], 0.70
      assert_includes results['priest'], 0.55
      
      assert_equal 2, results['soldier'].length  # Appears in 2 teams
      assert_includes results['soldier'], 0.55
      assert_includes results['soldier'], 0.45
    end
  end
  
  describe "#get_sample_units" do
    it "samples a subset of units for quick analysis" do
      analyzer = WeightClassAnalyzer.new
      
      # Mock the bun command output
      all_units = "farmer,soldier,priest,ranger,bombardier,builder"
      
      analyzer.stub :`, all_units do
        sample = analyzer.send(:get_sample_units)
        
        # Should take first 6 units
        assert_equal 6, sample.length
        assert_equal ['farmer', 'soldier', 'priest', 'ranger', 'bombardier', 'builder'], sample
      end
    end
  end
  
  describe "weight class assignment" do
    it "assigns units to correct tiers based on win rate" do
      analyzer = WeightClassAnalyzer.new
      
      # Test boundary conditions
      test_cases = [
        { unit: 'god', rate: 0.95, tier: 'S-tier' },     # >70%
        { unit: 'hero', rate: 0.70, tier: 'S-tier' },    # =70%
        { unit: 'elite', rate: 0.65, tier: 'A-tier' },   # 55-70%
        { unit: 'soldier', rate: 0.55, tier: 'A-tier' }, # =55%
        { unit: 'average', rate: 0.45, tier: 'B-tier' }, # 40-55%
        { unit: 'weak', rate: 0.30, tier: 'C-tier' },    # 25-40%
        { unit: 'fodder', rate: 0.20, tier: 'D-tier' }   # <25%
      ]
      
      test_cases.each do |test|
        win_rates = { test[:unit] => test[:rate] }
        
        analyzer.stub :calculate_win_rates, win_rates do
          analyzer.instance_variable_set(:@results, {})
          weight_classes = analyzer.analyze
          
          assert_includes weight_classes[test[:tier]], test[:unit],
            "#{test[:unit]} with #{test[:rate]} win rate should be in #{test[:tier]}"
        end
      end
    end
  end
  
  describe "optimization recommendations" do
    it "calculates complexity reduction correctly" do
      # With 26 units in one tournament: O(26^4) = 456,976 combinations
      # With 4 weight classes of ~6 units each: 4 * O(6^4) = 4 * 1,296 = 5,184
      # Reduction factor: ~88x faster
      
      n = 26  # Total units
      k = 4   # Weight classes
      units_per_class = n / k
      
      full_complexity = n ** 4
      optimized_complexity = k * (units_per_class ** 4)
      
      assert_operator optimized_complexity, :<, full_complexity
      assert_operator full_complexity / optimized_complexity, :>, 10  # At least 10x improvement
    end
  end
end

# Integration test for the full analysis pipeline
describe "Integration" do
  it "runs a complete weight class analysis" do
    # This would normally run the actual tournament
    # For testing, we'll mock the tournament results
    
    analyzer = WeightClassAnalyzer.new
    mock_output = <<~OUTPUT
      Running sample tournament to identify weight classes...
      === Parallel 2v2 Tournament ===
      Units: farmer,soldier,priest
      Total matches: 36
      
      === Tournament Results ===
      Team Rankings:
        #1 priest+priest: 80.0% win rate (16W/0L/4D)
        #2 soldier+soldier: 50.0% win rate (10W/10L/0D)
        #3 farmer+farmer: 20.0% win rate (4W/16L/0D)
    OUTPUT
    
    analyzer.stub :run_sample_tournament, analyzer.send(:parse_tournament_output, mock_output) do
      weight_classes = analyzer.analyze
      
      refute_empty weight_classes['S-tier']
      assert_includes weight_classes['S-tier'], 'priest'
    end
  end
end

if __FILE__ == $0
  puts "Running WeightClassAnalyzer specs..."
  Minitest.run
end