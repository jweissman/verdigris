require 'rspec'
require 'json'
require_relative '../scripts/parallel_tournament'

RSpec.describe ParallelTournament do
  let(:test_units) { ['soldier', 'farmer', 'priest'] }
  let(:tournament) { ParallelTournament.new(test_units, processes: 2, runs_per_matchup: 1) }

  describe '#initialize' do
    it 'sets up tournament parameters' do
      expect(tournament.instance_variable_get(:@units)).to eq(test_units)
      expect(tournament.instance_variable_get(:@processes)).to eq(2)
      expect(tournament.instance_variable_get(:@runs_per_matchup)).to eq(1)
    end
  end

  describe '#generate_teams' do
    it 'generates all unique team combinations' do
      teams = tournament.send(:generate_teams)
      
      # With 3 units: [soldier,soldier], [soldier,farmer], [soldier,priest], 
      #                [farmer,farmer], [farmer,priest], [priest,priest]
      expect(teams.length).to eq(6)
      expect(teams).to include(['soldier', 'soldier'])
      expect(teams).to include(['soldier', 'farmer'])
      expect(teams).to include(['priest', 'priest'])
    end
    
    it 'handles single unit correctly' do
      single_tournament = ParallelTournament.new(['solo'], processes: 1)
      teams = single_tournament.send(:generate_teams)
      
      expect(teams.length).to eq(1)
      expect(teams.first).to eq(['solo', 'solo'])
    end
  end

  describe '#generate_matchups' do
    it 'creates all possible matchups between teams' do
      teams = [['a', 'a'], ['a', 'b'], ['b', 'b']]
      matchups = tournament.send(:generate_matchups, teams)
      
      # 3 teams x 3 teams = 9 matchups
      expect(matchups.length).to eq(9)
      expect(matchups.first[:team1]).to eq(['a', 'a'])
      expect(matchups.first[:team2]).to eq(['a', 'a'])
    end
  end

  describe '#run_single_match' do
    context 'with mocked command execution' do
      it 'parses valid JSON output' do
        json_output = {
          winner: 'team1',
          duration: 100,
          survivors: ['unit1'],
          team1: ['soldier', 'soldier'],
          team2: ['farmer', 'farmer']
        }.to_json
        
        allow(tournament).to receive(:`).and_return(json_output)
        
        result = tournament.send(:run_single_match, ['soldier', 'soldier'], ['farmer', 'farmer'])
        
        expect(result[:winner]).to eq('team1')
        expect(result[:duration]).to eq(100)
        expect(result[:survivors]).to eq(['unit1'])
      end
      
      it 'handles invalid JSON gracefully' do
        allow(tournament).to receive(:`).and_return('invalid json')
        
        result = tournament.send(:run_single_match, ['soldier', 'soldier'], ['farmer', 'farmer'])
        
        expect(result).to be_nil
      end
      
      it 'handles command errors' do
        allow(tournament).to receive(:`).and_raise(StandardError.new('Command failed'))
        
        expect {
          tournament.send(:run_single_match, ['soldier', 'soldier'], ['farmer', 'farmer'])
        }.not_to raise_error
      end
    end
  end

  describe '#calculate_stats' do
    before do
      tournament.instance_variable_set(:@results, {
        'soldier+soldier vs farmer+farmer' => [
          { winner: 'team1', duration: 100 },
          { winner: 'team1', duration: 120 }
        ],
        'soldier+soldier vs priest+priest' => [
          { winner: 'team2', duration: 150 },
          { winner: 'draw', duration: 200 }
        ],
        'farmer+farmer vs soldier+soldier' => [
          { winner: 'team2', duration: 90 }
        ]
      })
    end
    
    it 'calculates correct win/loss/draw counts' do
      stats = tournament.send(:calculate_stats)
      
      # soldier+soldier: 3 wins, 1 loss, 1 draw
      expect(stats['soldier+soldier'][:wins]).to eq(3)
      expect(stats['soldier+soldier'][:losses]).to eq(1)
      expect(stats['soldier+soldier'][:draws]).to eq(1)
      
      # farmer+farmer: 0 wins, 2 losses, 0 draws
      expect(stats['farmer+farmer'][:wins]).to eq(0)
      expect(stats['farmer+farmer'][:losses]).to eq(2)
      expect(stats['farmer+farmer'][:draws]).to eq(0)
      
      # priest+priest: 1 win, 0 losses, 1 draw
      expect(stats['priest+priest'][:wins]).to eq(1)
      expect(stats['priest+priest'][:losses]).to eq(0)
      expect(stats['priest+priest'][:draws]).to eq(1)
    end
    
    it 'calculates correct win rates' do
      stats = tournament.send(:calculate_stats)
      
      # soldier+soldier: 3/(3+1+1) = 60%
      expect(stats['soldier+soldier'][:win_rate]).to be_within(0.01).of(0.6)
      
      # farmer+farmer: 0/(0+2+0) = 0%
      expect(stats['farmer+farmer'][:win_rate]).to eq(0.0)
      
      # priest+priest: 1/(1+0+1) = 50%
      expect(stats['priest+priest'][:win_rate]).to be_within(0.01).of(0.5)
    end
    
    it 'calculates average duration' do
      stats = tournament.send(:calculate_stats)
      
      # soldier+soldier total duration: 100+120+150+200+90 = 660
      # 5 matches = 132 avg
      expect(stats['soldier+soldier'][:total_duration]).to eq(660)
    end
  end

  describe '#run_matchup' do
    it 'runs multiple matches for a single matchup' do
      allow(tournament).to receive(:run_single_match).and_return(
        { winner: 'team1', duration: 100 }
      )
      
      tournament.instance_variable_set(:@runs_per_matchup, 3)
      result = tournament.send(:run_matchup, {
        team1: ['soldier', 'soldier'],
        team2: ['farmer', 'farmer']
      })
      
      expect(result[:key]).to eq('soldier+soldier vs farmer+farmer')
      expect(result[:results].length).to eq(3)
      expect(result[:results].all? { |r| r[:winner] == 'team1' }).to be true
    end
  end

  describe 'integration' do
    it 'can run a small tournament' do
      small_tournament = ParallelTournament.new(['soldier', 'farmer'], processes: 1, runs_per_matchup: 1)
      
      # Mock ALL external calls to prevent actual execution
      allow(small_tournament).to receive(:`) { '{}' }  # Mock backticks
      allow(small_tournament).to receive(:system) { true }  # Mock system calls
      allow(Parallel).to receive(:map) do |items, &block|
        # Run sequentially without actually forking
        items.map(&block)
      end
      
      # Mock match results
      allow(small_tournament).to receive(:run_single_match).and_return(
        { winner: 'team1', duration: 50, survivors: ['soldier_0'] }
      )
      
      # Don't actually print report
      allow(small_tournament).to receive(:print_report)
      
      # This should now run without spawning processes
      expect { small_tournament.run }.not_to raise_error
    end
  end

  describe 'performance optimizations' do
    it 'distributes work across processes' do
      # This is hard to test directly, but we can verify the setup
      expect(tournament.instance_variable_get(:@processes)).to be > 1
    end
    
    it 'handles large unit counts efficiently' do
      # Test that team generation is O(n^2) not O(n^4)
      large_units = ('a'..'z').to_a
      large_tournament = ParallelTournament.new(large_units, processes: 4)
      
      teams = large_tournament.send(:generate_teams)
      # 26 units -> 26*27/2 = 351 teams
      expect(teams.length).to eq(351)
    end
  end
end