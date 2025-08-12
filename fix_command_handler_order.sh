#!/bin/bash

# Fix the order of CommandHandler in rulebooks - it should be at the end
# This ensures commands queued by other rules are processed in the same step

echo "Fixing CommandHandler order in test files..."

# For each test file that has CommandHandler not at the end
find tests -name "*.ts" -type f | while read -r file; do
  # Check if file has CommandHandler not at the end
  if grep -q "new CommandHandler.*,.*new" "$file"; then
    echo "Fixing: $file"
    
    # Backup original
    cp "$file" "$file.bak"
    
    # Fix patterns where CommandHandler is first
    sed -i 's/\[new CommandHandler(sim), new \([^]]*\)\]/[new \1, new CommandHandler(sim)]/g' "$file"
    
    # Handle multi-rule cases - move CommandHandler to end
    # This is trickier, need to handle various patterns
    perl -i -pe 's/new CommandHandler\(sim\), (.*?)\]/\1, new CommandHandler(sim)]/g' "$file"
    
    # Remove duplicate CommandHandler if any
    perl -i -pe 's/(new CommandHandler\(sim\)), .*, \1/\1/g' "$file"
  fi
done

echo "Done fixing CommandHandler order"