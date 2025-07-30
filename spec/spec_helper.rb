require 'rspec'
require 'aua'
require 'flav/runner'

# Custom matcher: expect("body").to generate(hash_including(...))
RSpec::Matchers.define :generate do |expected_matcher|
  match do |task_name|
    @result = run_flav(task_name)

    value = @result
    puts "Running task '#{task_name}' with result: #{value.inspect} (#{value.class})"
    puts "Expected matcher: #{expected_matcher.inspect} (#{expected_matcher.class})"

    exact = expected_matcher == value
    matched = values_match?(expected_matcher, value)

    puts "Exact match: #{exact}, Matched: #{matched}"
    matched || exact

  end

  failure_message do |task_name|
    description = if expected_matcher.respond_to?(:description)
      expected_matcher.description
    else
      "output matching #{expected_matcher.inspect}"
    end
    "Expected Flav task '#{task_name}' to generate #{description} (#{expected_matcher.class}) but got #{@result.inspect} (#{@result.class})"
  end
end

def run_flav(task_name)
    runner = Flav::Runner.new("Flavfile")
    ret = runner.run_task(task_name)
    puts "=== Running task '#{task_name}' with result: #{ret.inspect} (#{ret.class})"
    begin
      YAML.safe_load(ret) || ret
    rescue
      ret
    end
  end
