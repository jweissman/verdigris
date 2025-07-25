
require 'spec_helper'
require 'aua'
require 'flav/runner'

def load_creature_yaml(creature_id)
  path = Dir["cards/white/#{creature_id}*.yaml"].first
  return nil unless path && File.exist?(path)
  YAML.safe_load(File.read(path))
end

RSpec.describe "Verdigris tasks" do
  it "has expected task structure" do
    runner = Flav::Runner.new("Flavfile")
    tasks = runner.instance_variable_get(:@tasks)
    expect(tasks).to include("app:generates:body")
    expect(tasks).to include("app:generates:creature")
    expect(tasks).to include("app:generates:rare.creature")
    expect(tasks).to include("app:generates:creature.set")
  end

  it "runs the 'body' task and returns a hash with expected keys" do
    expect("body").to generate(hash_including(
      "abilities" => anything,
      "body_type" => anything,
      "description" => anything,
      "nickname" => anything,
      "stats" => hash_including("power" => anything, "toughness" => anything)
    ))
  end

  it "runs the 'identity' task and returns a string with a color code" do
    expect("identity").to generate("#ffffff")
  end

  it "runs the 'moiety' task and returns a hash with likely keys" do
    expect("moiety").to generate(
      a_string_matching(
        /primitive|commoner|government|agricultural|occult|religious|military|scientific|artistic|criminal|nobility|economic|medical|construction|culinary|toxic|mystery|beast|legendary/
      )
    )
  end

  it "runs the 'archetype' task and returns a string or hash" do
    expect("archetype").to generate(a_kind_of(String).or(a_kind_of(Hash)))
  end

  it "runs the 'faction' task and returns a string or hash" do
    expect("faction").to generate(a_kind_of(String).or(a_kind_of(Hash)))
  end

  it "runs the 'creature' task and returns a hash with stats" do
    expect("creature").to generate(a_kind_of(String))
    creature = load_creature_yaml(run_flav("creature"))
    expect(creature).to be_a(Hash)
    expect(creature).to include("stats")
    expect(creature["stats"]).to be_a(Hash)
    expect(creature["stats"]).to include("attack", "defense", "hp")
  end

  it "runs the 'rare.creature' task and returns a hash with stats" do
    expect("rare.creature").to generate(a_kind_of(String))
    creature_id = run_flav("rare.creature")
    expect(creature_id).to be_a(String)
    # puts "Creature ID: #{creature_id}"
    creature = load_creature_yaml(creature_id)
    expect(creature).to be_a(Hash)
    expect(creature).to include("stats")
    expect(creature["stats"]).to be_a(Hash)
    expect(creature["stats"]).to include("attack", "defense", "hp")
  end

  it "runs the 'duel' task and returns a string or hash" do
    expect("duel").to generate(a_kind_of(String).or(a_kind_of(Hash)))
  end

  it "runs the 'creature.set' task and returns a hash", :skip do
    expect("creature.set").to generate(a_kind_of(Hash))
  end

  it "runs the 'prowess' task and returns a string or hash", :skip do
    expect("prowess").to generate(a_kind_of(String).or(a_kind_of(Hash)))
  end
end
