require 'rspec'
require 'json'
require_relative '../../scripts/parallel_tournament'

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
          survivors: ['unit1']
        }.to_json
        
        allow(tournament).to receive(:`).and_return(json_output)
        
        result = tournament.send(:run_single_match, ['soldier', 'soldier'], ['farmer', 'farmer'])
        
        expect(result[:winner]).to eq('team1')
        expect(result[:duration]).to eq(100)
        expect(result[:survivors]).to eq(['unit1'])
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
        ]
      })
    end
    
    it 'calculates correct win/loss/draw counts' do
      stats = tournament.send(:calculate_stats)
      
      # soldier+soldier: 2 wins, 1 loss, 1 draw
      expect(stats['soldier+soldier'][:wins]).to eq(2)
      expect(stats['soldier+soldier'][:losses]).to eq(1)
      expect(stats['soldier+soldier'][:draws]).to eq(1)
      
      # farmer+farmer: 0 wins, 2 losses, 0 draws
      expect(stats['farmer+farmer'][:wins]).to eq(0)
      expect(stats['farmer+farmer'][:losses]).to eq(2)
    end
  end
end