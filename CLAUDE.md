# CLAUDE.md

The shared project guide for all coding agents is in AGENTS.md:

@AGENTS.md

## Claude-specific notes

- `index.html` is ~230 KB with very long lines. Don't Read the whole file. Find a subsystem with `grep -n` on its banner comment (e.g. `grep -n '================= MISSION ENGINE' index.html`), then Read with `offset`/`limit`.
- When editing, make `old_string` a short, unique fragment of a long line rather than the whole line.
- Never Read or Grep `vendor/` or `node_modules/`.
- To check that a change works, run `npm run dev` in the background and drive the page with the browser tools. Read `window.chaleDebug` state and filter the console for errors.
