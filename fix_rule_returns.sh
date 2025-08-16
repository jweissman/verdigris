#!/bin/bash

# List of files that need updating
files=(
  "src/rules/particles.ts"
  "src/rules/command_handler.ts"
  "src/rules/ambient_spawning.ts"
  "src/rules/event_handler.ts"
  "src/rules/perdurance.ts"
  "src/rules/melee_combat_context.ts"
  "src/rules/status_effects.ts"
  "src/rules/area_of_effect.ts"
  "src/rules/biome_effects.ts"
  "src/rules/cleanup.ts"
  "src/rules/melee_combat.ts"
  "src/rules/knockback.ts"
  "src/rules/huge_units.ts"
  "src/rules/projectile_motion.ts"
  "src/rules/grappling_physics.ts"
  "src/rules/unit_movement.ts"
  "src/rules/tossing.ts"
  "src/rules/lightning_storm.ts"
  "src/rules/jumping.ts"
  "src/rules/airdrop_physics.ts"
  "src/rules/creature_spawning.ts"
  "src/rules/segmented_creatures.ts"
  "src/rules/unit_behavior.ts"
  "src/rules/physics.ts"
  "src/rules/flying_units.ts"
  "src/rules/rope_climbing.ts"
  "src/rules/ambient_behavior.ts"
)

for file in "${files[@]}"; do
  echo "Processing $file..."
  
  # First update the method signature
  sed -i 's/execute(context: TickContext): void {/execute(context: TickContext): Command[] {/' "$file"
  
  # Find the last line number of the execute method and add return []
  # This is trickier - we need to find the matching closing brace
  # For now, let's add return [] before the last closing brace of the class
  
  # Count the number of "execute(context: TickContext): Command[] {" lines
  # If it's already been updated, skip adding return
  if grep -q "execute(context: TickContext): Command\[\] {" "$file"; then
    # Check if there's already a return statement
    if ! grep -q "return \[\];" "$file"; then
      # Add return [] before the last closing brace
      # Find the line number of the last closing brace
      last_brace=$(grep -n "^}$" "$file" | tail -1 | cut -d: -f1)
      if [ -n "$last_brace" ]; then
        # Insert return [] before it
        sed -i "${last_brace}i\\    return [];" "$file"
      fi
    fi
  fi
done

echo "Done!"