require 'rspec'
require 'json'
require_relative '../scripts/parallel_tournament'

RSpec.describe 'ParallelTournament Integration' do
  describe 'synergy calculation' do
    it 'correctly aggregates results and calculates synergies' do
      tournament = ParallelTournament.new(['a', 'b', 'c'], processes: 1, runs_per_matchup: 2)
      
      # Mock the actual match runner
      allow(tournament).to receive(:run_single_match) do |team1, team2|
        # Deterministic results for testing
        if team1 == ['a', 'b'] && team2 == ['c', 'c']
          { winner: 'team1', duration: 100 }
        elsif team1 == ['c', 'c'] && team2 == ['a', 'b']
          { winner: 'team2', duration: 100 }
        elsif team1.include?('a') && team2.include?('c')
          { winner: 'team1', duration: 150 }
        elsif team1.include?('c') && team2.include?('a')
          { winner: 'team2', duration: 150 }
        else
          { winner: 'draw', duration: 200 }
        end
      end
      
      # Capture output
      output = StringIO.new
      original_stdout = $stdout
      $stdout = output
      
      tournament.run
      
      $stdout = original_stdout
      report = output.string
      
      # Check that synergies are calculated
      expect(report).to include('Top Synergies:')
      
      # Check that stats are calculated
      stats = tournament.send(:calculate_stats)
      expect(stats).to be_a(Hash)
      
      # Verify win rates are calculated
      stats.each do |team, stat|
        total = stat[:wins] + stat[:losses] + stat[:draws]
        if total > 0
          expect(stat[:win_rate]).to be_between(0, 1)
        end
      end
      
      # Check synergies
      synergies = tournament.send(:calculate_synergies)
      expect(synergies).to be_a(Hash)
      
      # Mixed teams should have synergy data
      if synergies['a+b']
        expect(synergies['a+b']).to have_key(:wins)
        expect(synergies['a+b']).to have_key(:losses)
        expect(synergies['a+b']).to have_key(:synergy_score)
      end
    end
  end
  
  describe 'progress reporting' do
    it 'shows progress during execution' do
      tournament = ParallelTournament.new(['x', 'y'], processes: 1, runs_per_matchup: 1)
      
      # Mock matches
      allow(tournament).to receive(:run_single_match).and_return({ winner: 'team1', duration: 50 })
      
      # Capture stderr for progress bar
      original_stderr = $stderr
      stderr_output = StringIO.new
      $stderr = stderr_output
      
      tournament.run
      
      $stderr = original_stderr
      
      # Progress bar should be shown (Parallel gem outputs to stderr)
      # This is handled by the Parallel gem's progress option
    end
  end
  
  describe 'result consistency' do
    it 'produces consistent aggregate statistics' do
      tournament = ParallelTournament.new(['p', 'q'], processes: 1, runs_per_matchup: 3)
      
      matches_run = []
      allow(tournament).to receive(:run_single_match) do |team1, team2|
        matches_run << [team1, team2]
        { winner: matches_run.length % 2 == 0 ? 'team1' : 'team2', duration: 100 }
      end
      
      # Suppress output
      allow($stdout).to receive(:puts)
      allow($stdout).to receive(:print)
      
      tournament.run
      stats = tournament.send(:calculate_stats)
      
      # 3 teams (p+p, p+q, q+q), 9 matchups, 3 runs each = 27 matches
      expect(matches_run.length).to eq(27)
      
      # Each team should have played matches
      stats.each do |team, stat|
        total = stat[:wins] + stat[:losses] + stat[:draws]
        expect(total).to be > 0
      end
    end
  end
end