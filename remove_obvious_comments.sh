#!/bin/bash

# This script removes obvious/redundant comments but keeps TODOs, NOTEs, FIXMEs, etc.
# It also keeps multi-line documentation comments

echo "This will remove obvious single-line comments but keep:"
echo "- TODO/NOTE/FIXME/HACK/XXX comments"
echo "- Multi-line /* */ comments"
echo "- JSDoc /** */ comments"
echo ""
echo "Examples of comments that WILL be removed:"
echo "  // Find dead units"
echo "  // Process commands"
echo "  // Return empty array"
echo ""
echo "Examples that will be KEPT:"
echo "  // TODO: implement this"
echo "  // NOTE: this is important because..."
echo "  /* Multi-line comment */"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# Find all TypeScript files
find src tests -name "*.ts" -type f | while read file; do
  # Create a backup
  cp "$file" "$file.bak"
  
  # Remove obvious single-line comments but keep important ones
  sed -i '
    # Skip lines with TODO, NOTE, FIXME, HACK, XXX, IMPORTANT, WARNING, BUG
    /\/\/.*\(TODO\|NOTE\|FIXME\|HACK\|XXX\|IMPORTANT\|WARNING\|BUG\|@\)/! {
      # Skip lines that are part of a multi-line comment or JSDoc
      /\/\*/! {
        /\*\//! {
          # Remove single-line comments that are just describing the next line
          s/^[[:space:]]*\/\/[^\/].*$//
          # Remove inline comments that are obvious
          s/[[:space:]]*\/\/[[:space:]]*[a-z].*$//
        }
      }
    }
  ' "$file"
  
  # Remove empty lines that were created by comment removal (keep max 2 consecutive empty lines)
  sed -i '/^$/N;/^\n$/N;//D' "$file"
  
  # Check if file changed
  if diff -q "$file" "$file.bak" > /dev/null; then
    # No changes, remove backup
    rm "$file.bak"
  else
    echo "Updated: $file (backup saved as $file.bak)"
  fi
done

echo "Done! Backups created with .bak extension"
echo "To review changes: git diff"
echo "To restore a file: mv file.ts.bak file.ts"
echo "To remove all backups: find . -name '*.bak' -delete"