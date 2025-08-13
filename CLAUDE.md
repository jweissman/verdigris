Please guide yourself with tests and types.

- For tests, you can simply run `bun test` to execute the suite (~350 specs that should execute in <10s)
  Bun does not play well with signals/pipes so no bashisms with it `2&1>` kind of things or grep if you can avoid it.
  (We could coalesce similar test cases to reduce output length if we can.)
- For lint, try `bun x tsc --noEmit src/freehold.ts` to get all outstanding type errors

You tend to leave lots of docs and notes for yourself in the root, so try that!

Please try to stay on the rails.

