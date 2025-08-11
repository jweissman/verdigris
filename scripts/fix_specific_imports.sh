#!/bin/bash

# Fix imports from "../types/" with trailing slash to proper imports
# These need to import from specific files

# Fix dmg/encyclopaedia.ts
sed -i 's|import { Unit, UnitState, Vec2 } from "../types/";|import { Unit, UnitState } from "../types/Unit";\nimport { Vec2 } from "../types/Vec2";|' src/dmg/encyclopaedia.ts

# Fix commands/toss.ts  
sed -i 's|import { Unit } from "../types/";|import { Unit } from "../types/Unit";|' src/commands/toss.ts

# Fix various rules files
sed -i 's|import { Vec2, Unit } from "../types/";|import { Unit } from "../types/Unit";\nimport { Vec2 } from "../types/Vec2";|' src/rules/desert_effects.ts
sed -i 's|import { Unit, Vec2, Projectile } from "../types/";|import { Unit } from "../types/Unit";\nimport { Vec2 } from "../types/Vec2";\nimport { Projectile } from "../types/Projectile";|' src/rules/grappling_physics.ts
sed -i 's|import { Unit } from "../types/";|import { Unit } from "../types/Unit";|' src/rules/huge_units.ts
sed -i 's|import type { Unit } from "../types/";|import type { Unit } from "../types/Unit";|' src/rules/knockback.ts
sed -i 's|import type { Unit, UnitState } from "../types/";|import type { Unit, UnitState } from "../types/Unit";|' src/rules/melee_combat.ts
sed -i 's|import { Unit } from "../types/";|import { Unit } from "../types/Unit";|' src/rules/perdurance.ts
sed -i 's|import { Projectile } from "../types/";|import { Projectile } from "../types/Projectile";|' src/rules/projectile_motion.ts
sed -i 's|import type { Unit } from "../types/";|import type { Unit } from "../types/Unit";|' src/rules/rule.ts
sed -i 's|import { Unit } from "../types/";|import { Unit } from "../types/Unit";|' src/rules/status_effects.ts
sed -i 's|import { Unit } from "../types/";|import { Unit } from "../types/Unit";|' src/rules/unit_movement.ts
sed -i 's|import { Unit, Vec2 } from "../types/";|import { Unit } from "../types/Unit";\nimport { Vec2 } from "../types/Vec2";|' src/rules/winter_effects.ts

# Fix view files
sed -i 's|import { Unit } from "../types/";|import { Unit } from "../types/Unit";|' src/views/cinematic.ts
sed -i 's|import { Projectile, Unit } from "../types/";|import { Projectile } from "../types/Projectile";\nimport { Unit } from "../types/Unit";|' src/views/isometric.ts
sed -i 's|import { Projectile, Unit } from "../types/";|import { Projectile } from "../types/Projectile";\nimport { Unit } from "../types/Unit";|' src/views/orthographic.ts

# Fix other wrong imports
sed -i "s|import { Unit } from '../types';|import { Unit } from '../types/Unit';|" src/rules/jumping.ts
sed -i "s|import { Unit } from '../types';|import { Unit } from '../types/Unit';|" src/rules/tossing.ts
sed -i "s|import type { Position } from '../types';|// Position type removed - use Vec2 instead|" src/rules/lightning_storm.ts

# Fix view.ts simulator import
sed -i 's|import { Simulator } from "../simulator";|import { Simulator } from "../core/simulator";|' src/views/view.ts

echo "Fixed specific import issues"