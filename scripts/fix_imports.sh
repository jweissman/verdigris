#!/bin/bash

# Fix imports from ../sim/types to ../types/
find src -name "*.ts" -type f -exec sed -i 's|from "../sim/types"|from "../types/"|g' {} \;

# Fix imports from ../sim/particles to ../types/Particle  
find src -name "*.ts" -type f -exec sed -i 's|from "../sim/particles"|from "../types/Particle"|g' {} \;

# Fix imports from ../sim/unit to ../types/Unit
find src -name "*.ts" -type f -exec sed -i 's|from "../sim/unit"|from "../types/Unit"|g' {} \;

echo "Fixed import paths"