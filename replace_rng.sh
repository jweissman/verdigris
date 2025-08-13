#!/bin/bash

# Replace Math.random() with Simulator.rng.random() in all source files

FILES=$(find src -type f -name "*.ts" -exec grep -l "Math\.random" {} \;)

for file in $FILES; do
  echo "Processing $file..."
  
  # Check if Simulator is already imported
  if ! grep -q "import.*Simulator" "$file"; then
    # Add import at the top of the file after the first import line
    sed -i '0,/^import/{s/^import/import { Simulator } from "..\/core\/simulator";\nimport/}' "$file"
    echo "  Added Simulator import"
  fi
  
  # Replace Math.random() with Simulator.rng.random()
  sed -i 's/Math\.random()/Simulator.rng.random()/g' "$file"
  echo "  Replaced Math.random() calls"
done

echo "Done! Replaced Math.random() in $(echo $FILES | wc -w) files"