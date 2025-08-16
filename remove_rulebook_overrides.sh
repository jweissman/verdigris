#!/bin/bash

# Find all test files with rulebook overrides
files=$(grep -l "sim\.rulebook = " tests/**/*.ts 2>/dev/null)

for file in $files; do
  echo "Removing rulebook override from $file"
  # Remove lines that set sim.rulebook
  sed -i '/sim\.rulebook = /d' "$file"
done

echo "Done removing rulebook overrides"