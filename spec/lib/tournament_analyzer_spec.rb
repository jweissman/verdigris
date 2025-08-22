require 'rspec'
require 'json'
require_relative '../../lib/tournament_analyzer'

RSpec.describe TournamentAnalyzer do
  describe TournamentAnalyzer::Match do
    let(:match) { TournamentAnalyzer::Match.new(['soldier', 'farmer'], ['priest', 'ranger']) }

    describe '#initialize' do
      it 'stores teams' do
        expect(match.team1).to eq(['soldier', 'farmer'])
        expect(match.team2).to eq(['priest', 'ranger'])
      end
    end

    describe '#run' do
      context 'with successful execution' do
        before do
          allow(match).to receive(:`).and_return(
            JSON.generate({
              'winner' => 'team1',
              'duration' => 100,
              'survivors' => ['soldier_0']
            })
          )
        end

        it 'returns match result' do
          result = match.run
          expect(result['winner']).to eq('team1')
          expect(result['duration']).to eq(100)
          expect(result['survivors']).to eq(['soldier_0'])
        end

        it 'sets instance variables' do
          match.run
          expect(match.winner).to eq('team1')
          expect(match.duration).to eq(100)
          expect(match.survivors).to eq(['soldier_0'])
        end
      end

      context 'with command failure' do
        before do
          allow(match).to receive(:`).and_raise(StandardError.new('Command failed'))
        end

        it 'returns error result' do
          result = match.run
          expect(result['winner']).to eq('error')
          expect(result['error']).to eq('Command failed')
        end
      end
    end
  end

  describe TournamentAnalyzer::SynergyAnalyzer do
    let(:results) do
      {
        'soldier+farmer vs priest+ranger' => [
          { 'winner' => 'team1' },
          { 'winner' => 'team1' },
          { 'winner' => 'team2' }
        ],
        'soldier+soldier vs farmer+farmer' => [
          { 'winner' => 'team1' },
          { 'winner' => 'draw' }
        ],
        'priest+ranger vs soldier+farmer' => [
          { 'winner' => 'team1' },
          { 'winner' => 'team1' }
        ]
      }
    end

    let(:analyzer) { TournamentAnalyzer::SynergyAnalyzer.new(results) }

    describe '#calculate_synergies' do
      it 'calculates synergy scores for unit pairs' do
        synergies = analyzer.calculate_synergies
        
        # soldier+farmer pair appears in matches
        expect(synergies['farmer+soldier']).to eq({
          wins: 2,
          losses: 3,
          draws: 0
        })
        
        # priest+ranger pair
        expect(synergies['priest+ranger']).to eq({
          wins: 3,
          losses: 2,
          draws: 0
        })
      end

      it 'ignores duplicate unit teams' do
        synergies = analyzer.calculate_synergies
        
        # soldier+soldier should not appear (it's not a synergy)
        expect(synergies).not_to have_key('soldier+soldier')
        expect(synergies).not_to have_key('farmer+farmer')
      end

      it 'sorts unit names consistently' do
        synergies = analyzer.calculate_synergies
        
        # Should always be farmer+soldier (alphabetical)
        expect(synergies).to have_key('farmer+soldier')
        expect(synergies).not_to have_key('soldier+farmer')
      end
    end

    describe '#rank_abilities' do
      it 'ranks units by individual performance' do
        rankings = analyzer.rank_abilities
        
        expect(rankings).to be_a(Hash)
        expect(rankings.keys).to include('soldier', 'farmer', 'priest', 'ranger')
      end

      it 'calculates win rates correctly' do
        rankings = analyzer.rank_abilities
        
        # Soldier appears in all matches
        soldier_stats = rankings['soldier']
        expect(soldier_stats[:total_matches]).to eq(5)
        expect(soldier_stats[:wins]).to eq(3)
        expect(soldier_stats[:losses]).to eq(1)
        expect(soldier_stats[:draws]).to eq(1)
        expect(soldier_stats[:win_rate]).to be_within(0.01).of(0.6)
      end

      it 'sorts by win rate descending' do
        rankings = analyzer.rank_abilities
        
        win_rates = rankings.values.map { |s| s[:win_rate] }
        expect(win_rates).to eq(win_rates.sort.reverse)
      end
    end
  end

  describe 'Integration' do
    it 'can analyze a small tournament' do
      # Mock a small tournament
      match1 = TournamentAnalyzer::Match.new(['soldier', 'farmer'], ['priest', 'ranger'])
      allow(match1).to receive(:`).and_return('{"winner":"team1","duration":50}')
      
      match2 = TournamentAnalyzer::Match.new(['priest', 'ranger'], ['soldier', 'farmer'])
      allow(match2).to receive(:`).and_return('{"winner":"team2","duration":60}')
      
      results = {
        'soldier+farmer vs priest+ranger' => [match1.run],
        'priest+ranger vs soldier+farmer' => [match2.run]
      }
      
      analyzer = TournamentAnalyzer::SynergyAnalyzer.new(results)
      
      synergies = analyzer.calculate_synergies
      expect(synergies['farmer+soldier'][:wins]).to eq(2)
      
      rankings = analyzer.rank_abilities
      expect(rankings['soldier'][:win_rate]).to eq(1.0)
      expect(rankings['farmer'][:win_rate]).to eq(1.0)
    end
  end
end