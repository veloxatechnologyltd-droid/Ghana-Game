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
