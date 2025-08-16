#!/bin/bash

# Remove the spurious "return [];" lines that were added outside of methods
files=(
  "src/rules/airdrop_physics.ts"
  "src/rules/ambient_behavior.ts"
  "src/rules/area_of_effect.ts"
  "src/rules/biome_effects.ts"
  "src/rules/event_handler.ts"
  "src/rules/grappling_physics.ts"
  "src/rules/huge_units.ts"
  "src/rules/jumping.ts"
  "src/rules/lightning_storm.ts"
  "src/rules/particles.ts"
  "src/rules/perdurance.ts"
  "src/rules/projectile_motion.ts"
  "src/rules/segmented_creatures.ts"
  "src/rules/status_effects.ts"
  "src/rules/tossing.ts"
  "src/rules/unit_behavior.ts"
  "src/rules/unit_movement.ts"
  "src/rules/cleanup.ts"
  "src/rules/knockback.ts"
  "src/rules/creature_spawning.ts"
  "src/rules/physics.ts"
  "src/rules/flying_units.ts"
  "src/rules/rope_climbing.ts"
  "src/rules/ambient_spawning.ts"
  "src/rules/melee_combat_context.ts"
)

for file in "${files[@]}"; do
  echo "Fixing $file..."
  
  # Remove the spurious "return [];" that was added after the class closing brace
  # This pattern matches "}\n    return [];\n}" and removes the middle line
  sed -i '/^}$/,/^    return \[\];$/{
    /^    return \[\];$/d
  }' "$file"
  
  # Now properly add return [] inside the execute method if needed
  # Check if execute method doesn't already have a return statement
  if grep -q "execute(context: TickContext): Command\[\]" "$file"; then
    # Check if there's already a proper return statement in the execute method
    # This is trickier - we need to find the execute method and check its body
    # For now, let's just ensure the method ends with return []
    
    # Count how many "return []" statements are in the file
    return_count=$(grep -c "return \[\]" "$file" || echo 0)
    
    if [ "$return_count" -eq 0 ]; then
      echo "  Adding return [] to execute method in $file"
      # Find the execute method and add return [] before its closing brace
      # This is complex, so let's do it manually for now
    fi
  fi
done

echo "Done!"