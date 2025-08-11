# Skipped Tests Review

## Summary
16 tests are currently skipped across the codebase. They fall into these categories:

## 1. Feature Not Implemented (6 tests)
### Rope Climbing - `tests/features/rope_climbing_test.ts`
- **All 6 tests in suite skipped** - Entire `describe.skip` block
- Reason: Rope climbing mechanics not implemented
- Decision: **Remove tests** - Feature not on roadmap

## 2. Flaky/Unreliable Tests (3 tests)
### Lightning Storm - `tests/features/lightning_storm_test.ts`
- `should create lightning storm and generate periodic strikes`
- Reason: Marked as flaky, timing-dependent
- Decision: **Fix test** - Make deterministic or increase tolerances

### Projectile Arcing - `tests/rules/projectile_test.ts`
- `should fire bomb projectiles that arc to targets`
- Reason: Marked as flaky, complex setup
- Decision: **Simplify test** - Focus on core behavior

### Toymaker Overload - `tests/rules/tactical_behavior_test.ts`
- `should limit toymaker deployment to prevent overload`
- Reason: Performance-sensitive test
- Decision: **Review threshold** - May need adjustment

## 3. Complex Integration Tests (4 tests)
### Winter Scenario - `tests/scenarios/toysday_winter_integration_test.ts`
- `should run complete winter toymaker scenario`
- Reason: Large integration test, possibly slow
- Decision: **Keep but optimize** - Valuable for regression testing

### Mechatron Day - `tests/creatures/mechatron_day_test.ts`
- `should deploy Mechatron with full lightning-powered mechanist force`
- Reason: Complex multi-unit scenario
- Decision: **Fix or simplify** - Important for testing mechanist features

### Construct Behavior - `tests/features/construct_hunting_test.ts`
- `should test aggressive clanker behavior toward enemy groups`
- `should test construct AI will engage enemies immediately upon spawn`
- Reason: AI behavior not fully implemented
- Decision: **Implement or remove** - Depends on AI roadmap

## 4. Incomplete Features (3 tests)
### Command System - `tests/core/command_dsl_test.ts`
- `should handle toss command`
- Reason: Toss command not fully integrated
- Decision: **Implement** - Part of command system

### Druid Summoning - `tests/features/druid_naturalist_test.ts`
- `should summon random forest creatures`
- Reason: Random summoning not implemented
- Decision: **Implement** - Core druid feature

### Megasquirrel Chaining - `tests/creatures/megasquirrel_spacing_test.ts`
- `should prevent multiple megasquirrels from chaining together`
- Reason: Complex spacing logic
- Decision: **Review** - May be working, needs verification

## Recommendations
1. **Remove**: Rope climbing tests (6 tests) - not on roadmap
2. **Fix**: Lightning storm, projectile tests (2 tests) - make deterministic
3. **Implement**: Toss command, druid summoning (2 tests) - core features
4. **Review**: Remaining 6 tests - decide based on feature priorities

## Action Plan
1. Delete rope climbing test file
2. Fix flaky tests by making them deterministic
3. Implement missing command/ability features
4. Review and update complex integration tests