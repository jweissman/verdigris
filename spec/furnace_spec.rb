require 'spec_helper'
require 'flav/runner'
require_relative '../lib/verdigris/furnace'

describe Furnace do
  it "runs a 1v1 duel and returns a result hash with winner and combatants" do
    a_id = run_flav("creature")
    b_id = run_flav("creature")
    furnace = Furnace.new
    result = furnace.run_duel(a_id, b_id)
    expect(result).to be_a(Hash)
    expect(result).to include("combatants", "winner")
    expect(result["combatants"].size).to eq(2)
    expect([a_id, b_id]).to include(result["winner"])
  end
end
