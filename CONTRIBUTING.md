# Contributing to Pulse Uptime

Thanks for your interest in contributing! Pulse is a zero-database uptime monitor powered by GitHub Actions and Vercel.

## How to contribute

1. **Fork the repo** and create a branch from `main`.
2. **Make your change** — keep it focused on one issue or feature.
3. **Run the tests** — `npm test` must pass (8 unit tests for the checker logic).
4. **Run the build** — `npm run build` must succeed (TypeScript + Vite).
5. **Commit with a clear message** — e.g. `fix: handle 429 responses in checker`.
6. **Open a pull request** — describe what changed and why.

## What we're looking for

- Bug fixes for the HTTP checker or status merge logic
- New monitor configuration options
- Dashboard accessibility improvements
- Documentation and README improvements

## What we're not looking for

- New infrastructure or paid services (Pulse is intentionally zero-database)
- Email/SMS alerting (documented as a known limitation, not a gap)

## Code style

- Prettier-compatible formatting
- No external dependencies beyond React, Vite, and TypeScript
- Pure functions in `scripts/lib.mjs` so they stay unit-testable

## License

MIT © KION6969