# Plan: Physics-Driven Lottery Machine

## Goal
Replace the current random-pick animation with a true physics-driven lottery. Air blows balls upward continuously, an exit chute opens, and whichever ball reaches the opening first (determined entirely by the physics simulation) is the winner.

---

## 1. Redesign the container shape (LotteryMachine.tsx — `createWalls`)

**Current:** Open bowl with angled walls.
**New:** Enclosed capsule (rounded rectangle / dome top) with:
- Solid floor, left wall, right wall, ceiling
- A **chute/exit tube** at the top-center — a short vertical channel leading out of the capsule
- The chute has a **gate** (a small static body) that blocks the exit initially
- Funnel slopes on the ceiling angling toward the chute opening to guide balls toward it

The gate body will be stored in a ref so it can be removed from the world when the draw triggers.

## 2. Continuous upward air force (new per-frame logic)

Add a `beforeUpdate` event on the Matter.js engine that applies an upward force to every ball on each physics tick:
- Constant upward force simulating air blowing from below (e.g. `y: -0.003` per ball)
- Small random horizontal jitter (`x: ±0.001`) per tick for chaotic mixing
- Slight random angular velocity nudges for visual tumble
- Balls should have **low density** (~0.0005) and moderate `frictionAir` (~0.03) so they float and bob rather than shoot off-screen — gravity + air force should roughly balance to keep them bouncing around mid-capsule

## 3. Render the capsule and air particles visually (render loop)

Update `drawContainer`:
- Draw the full capsule outline (rounded rect or dome shape)
- Draw the chute channel at the top center
- Draw the gate when closed (a small colored bar across the chute)
- Optional: draw small rising bubble/particle dots from the floor to sell the "air blowing" effect

## 4. Two-phase draw flow

**Phase 1 — Mixing (always active, or starts on first "Draw" press):**
- Air is blowing continuously, balls are bouncing around
- The gate is closed — no ball can escape

**Phase 2 — Open the gate (triggered by button press):**
- Remove the gate body from the physics world
- The funnel slopes guide balls toward the chute
- A sensor body is placed just outside the chute exit
- Use `Events.on(engine, 'collisionStart')` to detect when any ball touches the sensor
- The **first ball** to hit the sensor is the winner — this is pure physics, no randomness injected
- Once the winner is detected:
  - Immediately call `onDrawComplete(winner.label)`
  - Visually highlight the escaped ball (gold glow)
  - Stop the air force
  - Close the gate again (re-add it) for next round

## 5. Update App.tsx draw state flow

- `DrawState` changes: `'idle' | 'mixing' | 'opening' | 'winner'`
- "Draw" button behavior:
  - In `idle`: starts the air blower → state becomes `mixing`
  - In `mixing`: opens the gate → state becomes `opening`
  - Button label changes: "Start" → "Draw!" → disabled until reset
- Or alternatively keep it simpler: one "Draw" button starts mixing, then after ~5 seconds automatically opens the gate. A single press does the whole sequence.

**Decision:** Keep the single-button UX. Press "Draw" → air starts → after 5s the gate opens automatically → physics picks the winner. This matches the user's description ("maybe 5 seconds or triggered by a second button").

## 6. Ball physics tuning

Update `createBall`:
- `density: 0.0005` (very light, blown by air)
- `restitution: 0.7` (bouncy)
- `friction: 0.02` (low surface friction for sliding)
- `frictionAir: 0.03` (air resistance so they don't fly too fast)
- Keep `BALL_RADIUS` at 32

## 7. Reset behavior

After a winner is picked:
- Stop air force
- Re-add the gate body
- Balls settle to the bottom naturally
- Winner ball highlighted with gold glow
- Next "Draw" press restarts the cycle

## Files changed

| File | Changes |
|------|---------|
| `src/components/LotteryMachine.tsx` | Major rewrite: capsule walls, gate, air force, sensor, collision-based winner detection |
| `src/App.tsx` | Update draw states and button label logic |
| `src/components/DrawButton.tsx` | Accept a `label` prop for dynamic button text |
| `src/App.css` | Minor adjustments if canvas size changes |
