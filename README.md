# Adventure Dinner: Seafaring Adventure

An offline-first, pass-and-play board and card game for 6–10 people. The crew
explores six islands while preparing and eating a complete dinner in the real
world. One large iPad or desktop browser is the only game component required.

## Play locally

1. Install Node.js 20 or newer.
2. Run `npm run dev`.
3. Open the displayed local address.

There is no backend, dependency installation or production build required. The app
consists of plain HTML, CSS and JavaScript and can be served by any static web server.

`index.html` can also be opened directly by double-clicking it. The checked-in
`js/app.bundle.js` is generated from the same modular source specifically for browsers
that block ES-module imports on `file://` pages. Run `npm run build` after changing the
JavaScript source.

## GitHub Pages

The included workflow tests the game and publishes a clean static runtime bundle whenever
`main` is pushed. In the repository settings, set **Pages → Source** to
**GitHub Actions**.

All paths are relative, so project Pages URLs such as
`https://user.github.io/repository/` work without configuration.

## Data and privacy

Sessions, timer timestamps, player languages, settings and the full game state
are stored only in the browser's local storage. There are no accounts,
analytics, cookies or network APIs. The service worker keeps the game available
after the first successful load.

## Validation

- `npm test` runs rules and persistence tests.
- `npm run simulate` plays many complete 6–10-player games with deterministic
  virtual crews and checks completion, ingredient coverage, fairness and time.
- `npm run validate` runs the complete release gate used by GitHub Pages.

The runtime contains 504 bilingual event cards with location-specific rule variants,
144 bilingual cooking tasks, ten roles, a global tagged ingredient pool and 20 prepared ingredient effects.

The measured simulation evidence, kitchen assumptions and a practical pilot protocol are
documented in [REAL_WORLD_READINESS.md](./REAL_WORLD_READINESS.md).

## Copyright and licence

Copyright © 2026 Jonas Lummerzheim. This project is source-available but not
open source. The official hosted game may be played freely; reuse, modification
and rehosting are not permitted. See [LICENSE](./LICENSE).

The project contains no third-party fonts, libraries, music, icons or stock
artwork. Interface sounds are synthesized locally with the Web Audio API.
