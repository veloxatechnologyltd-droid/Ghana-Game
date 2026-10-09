# Chale City: agent guide

Chale City is a browser driving and story game set in Accra. The player is Kwesi, back from London to pay for his father's funeral. There is no framework, bundler pipeline or test suite. The game is two hand-written script files plus prebuilt vendor bundles, served as static files.

--

## Behavioral Guidelines (Karpathy Rules — Always Active)

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before writing a single line:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Do not remove pre-existing dead code unless explicitly asked.

The test: Every changed line must trace directly to the current task.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

For multi-step tasks, state a brief plan before starting:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## Scope Control — Stay in Your Lane

Only modify files, functions, and lines directly related to the current task.
Do not refactor, rename, reorganize, reformat, or "improve" anything not explicitly asked for.
If you notice something worth fixing elsewhere, leave a note. Do not touch it.

---

## Destructive Actions — Full Stop

Before deleting any file, overwriting existing code, dropping database records,
or removing dependencies — stop completely. List exactly what will be affected.
Ask for explicit confirmation. Only proceed after Evans says yes in the current message.

---

## Hard Stops — These Never Happen Without Explicit Permission

The following require explicit in-session confirmation, no exceptions:

- Deploying or pushing to any environment (staging, production, etc.)
- Running migrations or schema changes on any database
- Sending any email, message, or external API call to real recipients
- Executing any command with irreversible external side effects

"You mentioned this earlier" is not confirmation. Confirmation must be in the current message.

---

Maintain a file called MEMORY.md. After any significant decision, about direction, format, content, approach, or strategy, add an entry:

## [Date], [Decision]

**What was decided:** [the choice made]
**Why:** [the reasoning]
**What was rejected:** [alternatives considered and why they were ruled out]

Read MEMORY.md at the start of every session before doing anything. Never contradict a logged decision without flagging it first.

## After Every Task — Status Report

After completing any coding task, always end with:

- **Files changed:** [list every file touched]
- **What was modified:** [one line per file]
- **Files intentionally not touched:** [if relevant]
- **Follow-up needed:** [anything requiring a decision or attention]

Keep it short. This is a status update, not a recap.

---

Maintain a file called MEMORY.md. After any significant decision, about direction, format, content, approach, or strategy, add an entry:


## Run it

```bash
npm install          # only needed for build:vendor (esbuild, three)
npm run dev          # python3 -m http.server 8765 → http://localhost:8765
```

You can also open `index.html` directly, but some browsers block the FBX/texture loads over `file://`, so use the dev server when you check visuals.

`npm run build:vendor` rebuilds `vendor/` from `src/`. Run it only after you change `src/*.js`, change `assets/accra-facades.webp`, or upgrade `three`.

## File map

| Path | What it is | Edit? |
|---|---|---|
| `index.html` (~230 KB) | Everything except the 3D renderer: CSS, HUD/overlay markup, and one inline IIFE `<script>` holding all game logic (world gen, physics, AI, missions, jobs, garage, fleet, audio, input, the Canvas 2D fallback renderer, boot) | Yes, this is where most work happens |
| `three-scene.js` (~100 KB) | `window.createChaleScene(data)`: the Three.js street-level renderer (procedural buildings, lofted car bodies, people, day/night, particles, camera). Game rules do **not** belong here | Yes |
| `src/three-global.js` | esbuild entry that exposes `window.THREE` plus `RoomEnvironment`, `mergeGeometries`, `FBXLoader`, `cloneSkeleton` | Rarely. Add Three.js addons here, then rebuild |
| `src/sprite-data.js` | esbuild entry that inlines `assets/accra-facades.webp` as `window.CHALE_SPRITES.facades` | Rarely |
| `vendor/*.js` | Minified build output (~800 KB each) | **Never hand-edit.** Regenerate with `npm run build:vendor` |
| `assets/*.webp` / `*.png` | Sprite atlases and textures. The `.webp` files are what the game loads; the `.png` files are source copies | Keep both in sync if you replace art |
| `assets/characters/rocketbox-female-11/` | MIT-licensed Microsoft Rocketbox FBX + WebP textures (one detailed pedestrian) | Keep `LICENSE.md` with the asset |

Script load order (end of `index.html`): `vendor/three-global.js` → `vendor/sprite-data.js` → `three-scene.js` → inline game script.

## Architecture

### index.html inline script

The code is one long IIFE split by banner comments such as `/* ================= MISSIONS ================= */`. Search for the banner to find a subsystem. Line numbers move with every edit, so don't rely on them:

`WORLD` → `ROAD GRAPH` → `ENTITIES` → `STATE` → `MISSIONS` → `DOM HELPERS` → `AUDIO` → `INPUT` → `VEHICLE PHYSICS` → `AI` → `SPAWNING` → `PEDS` → `PLAYER` → `WANTED` → `MISSION ENGINE` → `HUSTLE JOBS` → `OWNERSHIP: GARAGE` → `OWNERSHIP: TROTRO FLEET` → `PLACES` → `PROGRESS` → `SHOP SCREENS` → `STREET EVENTS` → `BUBBLES / PARTICLES` → `CAMERA / UPDATE` → `HUD` → `CONTROLS PANEL` → `RENDER` (2D fallback) → `LOOP` → `BOOT`.

Key concepts:

- **World is a tile grid.** `T=40` px per tile, `MW×MH = 112×82` tiles. Tile types: `G, RD, SW, BL, BE, SEA, PK, MK, TR` (grass/laterite, road, sidewalk, building, beach, sea, park, market, tree). Roads run along columns `VX` and rows `HY`; `P(tx,ty)` converts tile coords to world px (tile center). Mission and place coordinates are in **tiles**, e.g. `at:[9,61]`.
- **World generation is seeded** (`seed=1957`, `rnd()`), so the city is the same on every load. Changing the order of `rnd()` calls in `genWorld` reshuffles the whole city.
- **Global state:** `S` (game/mission/economy state, including `S.mode`: `title | play | dialog | phone | shop | paused | over`), `PL` (player), and the arrays `vehicles`, `peds`, `parts`, `bubbles`, `buildings`, `decor`.
- **Game coordinates are 2D** (`x`, `y`, angle `a`). `three-scene.js` maps them to 3D with `U=0.1` (`toX`, `toZ`), with `y` becoming `z`.
- **Loop:** `frame()` clamps `dt` to 0.05 s and calls `update`/`updTitle`, `updCommon`, `render`, `hudTick`, `audioTick` and `engineTick`, all inside a try/catch that logs errors and keeps running. Watch the console, because a broken tick logs every frame rather than stopping the game.
- **Rendering:** `render()` calls `threeScene.render({vehicles, peds, parts, markers, arrowTo})` when WebGL is available and otherwise draws the Canvas 2D fallback. Gameplay changes that add visible things usually need work in **both** renderers, or at least must not break the fallback.
- **Audio** is all synthesized with WebAudio (`tone`, `noiseHit`, `pluck`). The radio stations (`HL`, `DR`, `GO`, in `STATIONS`) are procedural sequencers. There are no audio files.

### Missions (data-driven)

`MISSIONS` is an array of objects:

```js
{id:'m1', req:[], par:75, dmgPar:15, title:'…', at:[tx,ty], giver:'Auntie Naa', hint:'…',
 intro:[[speaker, line], …], steps:[{t:'spawn',…}, {t:'goto',…}, …], outro:[…], reward:…}
```

- `req` lists prerequisite mission ids, so missions form a web rather than a line. Chapter 2 ids start with `c`.
- `par` (seconds) and `dmgPar` set the time and clean-driving stars. Each mission is worth up to 3 stars.
- The step types handled in `nextStep()` / `missionActive()` are `spawn, dialog, timer, timerStop, calm, wanted, enter, veh, pickup, goto, chase, escape, tail`. If you add a new step type, implement it in **both** places: one-shot steps go in `nextStep`, per-frame steps go in `missionActive`.
- Speaker colours and initials come from `SPK`. Add new characters there.

### Persistence

The save lives in `localStorage` under `chalecity.v2`. `chalecity.v1` is migrated in `loadSave()`. `save()` writes an explicit field list. **If you add persistent state, add it to `save()`, restore it in `newGame(saved)` with a default for old saves, and never break existing saves.** The fleet earns by wall-clock time (`Date.now()`), which affects testing (see below).

### three-scene.js

`createChaleScene(data)` receives `{T, MW, MH, VX, HY, buildings, decor, PL, S, at, TILE, CX, CY, ISL, COAST, SEA_Y, districtAt}` and returns `{render, resize, inputVector, cycleCamera, project, resetCamera}`. Keep that contract stable. If creation throws, the game falls back to the 2D canvas.

The file builds geometry procedurally: textures come from `canvasTexture`, car bodies from `loft` and `PartBuilder`, and repeated props from instanced meshes. Vehicles, people and goats are synced through `sync(map, entities, make, update)`. There is a `lowEnd` path that caps pixel ratio and reduces detail, and mobile performance matters.

## Debugging and verification

There are no automated tests. To verify a change, run the game:

1. `npm run dev`, then open `http://localhost:8765`.
2. Check the browser console. The loop swallows errors, so look for repeated `console.error` output.
3. Use `window.chaleDebug`, which exposes `S, PL, vehicles, peds, MISSIONS, JOBS, startMission, completeMission, toggleJob, startThief, startEmergency, buyCar, buyBus, collectFleet, newGame, save, loadSave, netWorth, …`. For example, `chaleDebug.S.money = 50000` or `chaleDebug.startMission(chaleDebug.MISSIONS.find(m => m.id === 'c1'))` lets you reach late content without playing through.
4. Playwright is in `node_modules` (not listed in `package.json`), so a headless smoke test can load the page, wait for frames and read `chaleDebug`.
5. Check both desktop (keyboard) and touch layouts (`isTouch`, `body.touch`, `#touch` controls) for UI changes, and the 2D fallback for rendering changes.

Clear `localStorage` (`chalecity.v2`, `chale-keys-hidden`) to test a fresh start.

## Conventions

- **Match the existing style:** dense, terse JS, short names (`v`, `p`, `st`, `dt`), many one-line functions, `const`/arrow helpers (`clamp`, `lerp`, `dist`, `pick`, `fmt`, `esc`, `$`). Don't reformat or "clean up" large regions, because the diffs become unreadable. Keep comments sparse and explain *why*, as the existing ones do.
- **No new dependencies or build steps** for game logic. Everything runs as plain browser JS. New Three.js addons go through `src/three-global.js` and `build:vendor`.
- **External scripts are not allowed.** The only remote resource is Google Fonts. Assets must be local.
- **Money** is Ghana cedis and is always displayed through `fmt()` (`GH₵ 1,234`).
- **Tone and setting:** Accra-specific (real districts, Ghanaian English and pidgin, Twi phrases, trotro slogans) and respectful. New dialogue should sound like the existing cast. Avoid generic placeholder text.
- **UI text** lives in HTML ids referenced through `el.*` / `$()`. Update the README's Controls section when you change controls, and update `keysHtml()`/`TOUCH_KEY`/`KEY_CODES` too.
- **Performance:** the game runs every frame on phones. Avoid per-frame allocations in hot paths (physics, AI, `three-scene.js` render/sync). Reuse temp vectors and instanced meshes.

## Gotchas

- `index.html` has very long lines (up to ~650 chars). Use targeted search with `grep -n` or banner names and edit precisely. Don't rewrite whole lines you didn't need to touch.
- Names like `T` (tile size) are shadowed locally in a few places (for example `viewRect` uses `T` as "top"). Check the scope before you reuse a short name.
- `vendor/` and `node_modules/` are huge and generated, so don't read or grep them.
- The directory is currently **not a git repository**, so there is no history to diff against. Be careful with destructive edits and consider asking the user to run `git init` first.
