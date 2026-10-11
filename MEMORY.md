## 2026-10-09, Touch driving controls: steering wheel + pedals

**What was decided:** On touch devices, while in any vehicle (car, trotro, okada), the joystick is replaced by a steering wheel on the left (rotational drag, ±2.1 rad = full lock, springs back to centre) and GAS / BRAKE pedals on the right. Horn, radio, IN/OUT, H-BRAKE, LIMIT and JOB sit beside or above the pedals (spread wide in landscape, stacked in portrait). The old BRAKE button was relabelled H-BRAKE, because it was always the handbrake. Toggled through the `body.driving` class.
**Why:** The user said the joystick made driving hard and asked for a real steering wheel with the accelerator and brake on the right.
**What was rejected:** Changing the vehicle physics (left alone, because the controls were the problem). Analogue pressure-sensitive pedals (on/off is simpler, and the physics already eases the throttle). A separate handlebar graphic for the okada (it uses the same wheel).

## 2026-10-09, Phone layout, fuel and chase difficulty fixes

**What was decided:**
- `.screen` overlays use `align-items:flex-start` with `margin:auto 0` on `.card`, so tall cards scroll instead of losing their top on short landscape phones. On phones (≤600px wide or ≤500px tall) the title card and dialog box are more compact. WALK and LIMIT show only in `play` mode, and the touch help panel is hidden while a conversation is on screen.
- Fuel use dropped from distance/45 to distance/110 per point. A broke player at a station with under 35% gets topped up to 35% for free ("Pump boy dashed you fuel"). The low-fuel toast names the nearest station.
- Chases: any player impact of 25 or more on a `flee`/`chased` vehicle deals `8+(imp-25)*0.2` damage (the normal 70 threshold still applies on top). Flee cruise went from 300 to 270, and chased vehicles slow down as their hp drops.
**Why:** The user reported the title and dialog covering the phone screen, running out of fuel with no way to refuel, and never winning the land guards' chase (m4). Root cause: a rear-end ram only closes at the speed difference (about 45 against a 300-cruise pickup), which was below the 70 impact damage threshold, so rams never did damage.
**What was rejected:** Lowering the global impact threshold (it would make every fender-bender costly). Adding more fuel stations (the 5 existing ones were fine once a tank lasts longer and being broke can't strand you).

## 2026-10-10, Decluttered phone controls and objective

**What was decided:** On touch, on foot shows only IN/OUT and WALK (HORN, RADIO and H-BRAKE hide). While driving, only the wheel, GAS, BRAKE, IN/OUT and a ••• button show. ••• toggles `body.tmenu`, which reveals H-BRAKE, HORN, RADIO and LIMIT (a row above the pedals in landscape, a column above ••• in portrait), and the menu closes when Kwesi leaves the vehicle. The floating "IN/OUT · Get out" / "JOB · Start" label is not shown on touch while driving, because the buttons already say it. The objective box (`#obj`) shrinks to one line (`.min`) 7 s after its text changes on touch, and tapping it opens it again. On short landscape phones it sits at the top between the MISSIONS button and the stats.
**Why:** The user said that on a phone the objective box, the "Get out" label and the row of buttons covered the game, and that the driving extras should not show on foot.
**What was rejected:** Hiding IN/OUT behind the menu (it is used too often, and the mission text tells players to tap it). Removing the on-foot "Enter vehicle" label (it shows which car you are next to).

## 2026-10-10, GoatCounter analytics (exception to the no-external-scripts rule)

**What was decided:** Added the GoatCounter `count.js` tag (site code `johnokyere`) in `<head>`, plus a `track(path)` helper (beside `STAR` under DOM HELPERS) that sends events: `new-game` and `continue` from `newGame()`, and `mission/<id>` from `completeMission()` the first time each mission is passed. Together these give a funnel: visits → started → m1 → … → chapter 2 (`mission/c*`). `continue` counts returning players. The helper does nothing if the script is blocked. GoatCounter skips localhost, so dev runs aren't counted.
**Why:** The user wants to see whether people adopt the game after the Netlify release, and explicitly allowed an external script for this.
**What was rejected:** Netlify Analytics (paid, page views only). Cloudflare Web Analytics (needs Cloudflare hosting, no custom events). Google Analytics (cookies, so it needs a consent banner, and it's heavy). Plausible (paid). Self-hosted Umami (a server to run).

## 2026-10-11, Jamestown neighbour story

**What was decided:** Add a short side mission after "Akwaaba, Kwesi" in which Auntie Esi asks Kwesi to carry supper to her daughter Akosua at Korle Bu. The player can accept petrol money or help for free. The choice is saved, Auntie Naa responds when Kwesi returns home, and the Missions phone remembers it. Later ordinary taxi rides with Esi or Akosua refer to the errand.
**Why:** A familiar person remembering Papa, a practical errand, a response at home, and later recognition make Jamestown feel like a community. Existing mission, dialogue, GPS, taxi and save systems support the story with a small change.
**What was rejected:** A citywide reputation system and multiple new social activities before this first neighbourhood story has been played and assessed.

## 2026-10-11, Visible and spoken conversations

**What was decided:** In-person dialogue shows a character beside Kwesi and frames both people while they exchange lines. The speaker gestures as each line is shown. Dialogue lines are spoken with the browser's built-in speech engine, choosing an en-GH voice when the device offers one and following the game's sound mute. Phone dialogue remains voice-only. The 2D renderer shows the same meeting.
**Why:** The user wants to see a person and hear a voice during conversations. This uses the existing character renderer and works in the static, offline game without adding a remote voice service.
**What was rejected:** Treating the existing initials and text box as a person; assigning the existing young Rocketbox woman as every named Ghanaian woman; claiming device speech is a recorded Ghanaian actor or that the existing models are photorealistic.

## 2026-10-11, Quiet dialogue and softer character shapes

**What was decided:** Remove browser speech from all dialogue while keeping readable text and visible speaker gestures. Put in-person speakers nearer Kwesi in the world, and show both people in a foreground 3D conversation view so buildings cannot hide them. Narrow the dialogue field of view and round the procedural characters' shoulders, shoes and face details.
**Why:** The synthesized voice sounded strange, and the small angular figures did not feel human enough during conversations.
**What was rejected:** Adding another synthetic voice or presenting the lightweight procedural figures as photorealistic people.

## 2026-10-11, Traffic gives way at junctions and turns lane to lane

**What was decided:** AI traffic (`traffic` and `route` modes) waits at the line when a vehicle on the crossing road holds the junction (`juncClear`, per-car `jKey`/`jAx`, 8 s fallback). Once it commits, it plans its turn early and follows lane-to-lane waypoints (`turnWps`), slowing for the turn. Street traffic gets 1.35× steering lock so trotros can make corners, and a car wedged on a kerb backs up and retries. Flee, police and chase AI are unchanged.
**Why:** The user said the other cars just move around and should keep to their lanes. A headless measurement showed junction gridlock: cars stopped most of the time, 1,595 crosswise overlaps in 90 s, and trotros stuck on corners. After the change, stopped samples fell about 5×, overlaps about 7×, and wrong-side driving almost disappeared.
**What was rejected:** Traffic lights (they need new visuals in both renderers, and give-way solves the gridlock on its own). Relaxing the kerb check for AI (cars would visibly mount pavements).

## 2026-10-11, Closed side streets for longer through-roads

**What was decided:** The vertical roads at VX[1], VX[3], VX[5] and VX[7] (x=14, 36, 58, 80) are closed between HY[2] (y=23) and the coast road (y=62), set by `CUT`/`cutV`. Rows y=33, 43 and 53 now meet a junction every 22 tiles instead of every 11. The closed strips are built over at the end of `genWorld` (Makola's strip becomes market), so seeded blocks keep their layout; only kiosks and street trees shift. The old junctions stay in the road graph as pass-through nodes. The 3D renderer lays roads, centre lines and zebras only where road tiles exist. Points that were on the closed streets moved: Odawna stop [36,18], Ridge [58,18], Korle Bu [9,34] / place [9,35] / emergency job P(9,35), High Court (c6) [55,52].
**Why:** The user said the game was hard to play because a junction came every short distance, and chose closing some side streets over stretching the whole city.
**What was rejected:** Stretching the whole grid 1.5× (rescales every coordinate and changes the city's look). Leaving the map as it was.

## 2026-10-11, Varied rigged adults in conversation and nearby streets

**What was decided:** Use locally bundled, MIT-licensed Rocketbox FBX adults for Kwesi, named speakers and a capped set of nearby pedestrians. Keep the procedural figures as the load and low-detail fallback, reduce repeated wax-print clothing, and hide nearby street poles, wires and vehicles during the foreground conversation view.
**Why:** The identical patterned figures looked boxy, a dark street pole crossed the person speaking at Circle Station, and a parked trotro made the foreground figures appear to stand on its roof. A small nearby set limits skinned-mesh cost on phones. Male Adult 12's casual appearance fits Kwesi better than the first male asset preview.
**What was rejected:** Giving every crowd member a skinned mesh (too costly for phones), and using one clothing model for the whole cast. A fully bespoke Ghanaian avatar set remains outside this focused change.

## 2026-10-11, Motion-captured walk, run, idle and talk for the detailed people

**What was decided:** The Rocketbox adults (Kwesi, named speakers and nearby pedestrians) are animated by Microsoft Rocketbox mocap clips (MIT, same `Bip01` skeleton, no retargeting): neutral walk, run, breathing idle and gesture-talk, male and female sets. `assets/characters/animations/convert.mjs` turns the 17 MB of source FBX into one 208 KB JSON file (`rocketbox-anims.json`, 38 KB gzipped). It keeps 21 body bones plus the root bob, removes forward travel, records each cycle's stride, aligns the run's footfall with the walk, and cuts each talk take to its best seamless loop. In `three-scene.js`, each detailed person gets an `AnimationMixer`. Walk and run times follow the distance actually moved, so feet don't slide, and the clips blend by speed (game walk 20 px/s, run 36 px/s). `p.talking` fades in the talk clip. The old hand-posed sine gait stays as the fallback until the JSON loads, or if it fails.
**Why:** The user said the real-human models couldn't walk or move freely like GTA characters. The sine gait only moved about 8 bones; the pelvis, feet, forearms and spine stayed rigid.
**What was rejected:** Tuning the sine gait (can't look like mocap). Mixamo clips (different skeleton needing retargeting, murkier redistribution terms). Shipping the raw FBX clips (about 17 MB, too heavy for phones).
