Please guide yourself with tests and types.

- For tests, you can simply run `bun test` to execute the suite (~500 specs that should execute in <10s)
  Bun does not play well with signals/pipes so no bashisms with it `2&1>` kind of things or grep if you can avoid it.
  (We could coalesce similar test cases to reduce output length if we can.)
- For lint, try ` bun x tsc --noEmit --project tsconfig.json` to get all outstanding type errors

You tend to leave lots of docs and notes for yourself in the root, so try reviewing some of that!

Please try to stay on the rails.
- Don't refactor in the red. Prioritize fixing specs/remaining on island of stability
- Don't create random test scripts, use the test harness!
- Try _debugUnits to see clean deltas across ticks for low verbosity
- Try using the profiling suite to identify perf bottlenecks
- Check the readme. 
- Look at MWEs and other entrypoints (like the critical one src/index.html)