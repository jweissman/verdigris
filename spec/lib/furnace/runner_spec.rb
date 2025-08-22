require 'rspec'
require_relative '../../../lib/furnace/runner'

RSpec.describe Furnace::Runner do
  let(:runner) { Furnace::Runner.new }
  
  describe '#run_match' do
    it 'executes a match between two teams' do
      # Mock the command execution
      allow(runner).to receive(:`).and_return('{"winner":"team1","duration":100}')
      
      result = runner.run_match(['soldier', 'farmer'], ['priest', 'ranger'])
      
      expect(result).to be_a(Hash)
      expect(result[:winner]).to eq('team1')
      expect(result[:duration]).to eq(100)
    end
    
    it 'handles command errors gracefully' do
      allow(runner).to receive(:`).and_raise(StandardError.new('Command failed'))
      
      result = runner.run_match(['soldier', 'farmer'], ['priest', 'ranger'])
      
      expect(result).to be_a(Hash)
      expect(result[:error]).to eq('Command failed')
      expect(result[:winner]).to eq('error')
    end
    
    it 'handles invalid JSON output' do
      allow(runner).to receive(:`).and_return('invalid json')
      
      result = runner.run_match(['soldier', 'farmer'], ['priest', 'ranger'])
      
      expect(result).to be_a(Hash)
      expect(result[:winner]).to eq('error')
    end
  end
end