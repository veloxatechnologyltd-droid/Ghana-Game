# Chale City

Open `index.html` in a modern browser, or run `npm install` followed by `npm run dev` and visit `http://localhost:8765`.

## Controls

- **WASD / arrows:** walk relative to the camera; steer and accelerate while driving.
- **Space / BRAKE:** handbrake (slide the back out) while driving, or continue a conversation.
- **E / IN/OUT:** enter a car when the prompt appears; press again to leave after stopping.
- **J / JOB:** start or stop a hustle job in a taxi, trotro or okada.
- **Tab / MISSIONS:** open Kwesi's phone: missions and replays, your garage, your trotro fleet, and your rank and progress.
- **C / VIEW:** switch between close follow, chase and wide views. The camera adjusts for walking and driving; close follow is the default.
- **Drag the scene:** turn the camera. On a phone, drag on the right side.
- **Shift:** run. **H:** horn or greet a pedestrian. **R:** change radio station.

## How the game is built

- **Missions are a web, not a line.** Each mission lists the missions it needs (`req`), so several are open at once and each giver has a light beam on the map. Every mission is scored out of three stars: finishing it, beating its par time, and clean driving (low damage, nobody knocked down). Finished missions can be replayed from the phone for missing stars.
- **Hustle jobs never run out.** Taxi fares (rushed passengers, egg-carriers, big men), trotro runs with real crowds at the stops, and okada food deliveries are generated on the fly. Streaks raise the pay.
- **Your own cars.** After "Mate Work", Fitter Kojo at the Abossey Okai garage sells home-used cars and upgrades them: engine (speed and pull), tyres (grip, braking, new rims), armour (less damage, bull bar, rails, roof bar), spray paint and back-window stickers ("GOD DEY", "SEA NEVER DRY"...). Upgrades show on the car. Drive in and stop in the orange marker to open the garage. Owned cars are saved and park in the yard of the family house in Jamestown each time you load; the phone can send a fitter to bring one to you.
- **Trotro fleet.** After "This Land Is Not For Sale", buy trotros at the Circle station, hire drivers (trainee, experienced, veteran), move them to better routes, and service them as they wear. Trotros with drivers earn by the real clock, even while the game is closed, into a till that fills after 12 hours. Collect at the station once a day to build a streak bonus (up to +50%), or collect by MoMo from the phone for a 15% charge. When you come back, a screen shows what the fleet earned while you were away. Your trotros also turn up in traffic and greet their boss.
- **Rank.** Net worth (cash plus cars and trotros) moves Kwesi from "Just landed" up to "Ohene of Accra".
- **Chapter 2: Papa's debts.** Six missions follow the cliffhanger at Teshie beach: Chairman Odartey, the loan behind Kwesi's London school fees, the stolen land, the ledger, and a race to the High Court. Chairman's pickups hunt you down and ram you, so you have to lose them or lead them to the police.
- **Street events** pop up in free roam: phone thieves to chase down, and a woman in labour who needs a fast ride to Korle Bu.
- **Driving** uses a bicycle model: the front wheels steer, tyres have limited grip (so you can drift), surfaces change grip (tarmac, pavement, sand), the body pitches and rolls on its suspension, and the engine note changes gear.
- **Visuals** are procedural Three.js: lofted car bodies with clear-coat paint and glass, real-time sun shadows, a full day/night cycle, raised pavements with open gutters, electric poles and sagging wires, zinc and clay roofs, polytanks, kiosks, market stalls, fishing canoes, and people in wax-print cloth.

The street facade source art is in `assets/`. After changing it or upgrading Three.js, run `npm run build:vendor` to regenerate the bundled scripts in `vendor/`. The original Canvas view remains as a fallback if WebGL is unavailable.
# Ghana-Game
