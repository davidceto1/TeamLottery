import Matter from 'matter-js';

const { Engine, World, Bodies, Body, Events } = Matter;

// Fixed layout constants (matching LotteryMachine.tsx oval container)
const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 500;
const WALL = 12;
const LEFT = WALL;
const RIGHT = CANVAS_WIDTH - WALL;
const TOP = WALL;
const BOTTOM = CANVAS_HEIGHT - WALL;

// Oval container dimensions
const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;
const RX = (CANVAS_WIDTH - WALL * 2) / 2;
const RY = (CANVAS_HEIGHT - WALL * 2) / 2;
const OVAL_SEGMENTS = 48;

export const DEFAULT_PARAMS = {
  gravityY: 1.74,
  gravityScale: 0.0045,

  numBalls: 8,
  ballRadius: 37,
  ballRestitution: 0.84,
  ballFriction: 0.11,
  ballFrictionAir: 0.041,
  ballDensity: 0.0008,

  wallFriction: 0.42,
  wallRestitution: 0.84,

  windForceX: 0.014,
  windForceY: 0.006,
  windMaxDistScale: 0.36,
  windSourceAngle: 0.6,

  // NEW: wind oscillation — alternates jet dominance to create swirling flow
  windOscFreq: 0.0,    // Hz, 0 = no oscillation (old behavior)
  windOscAmp: 0.0,     // 0-1, how much to vary jet strength

  chaosX: 0.006,
  chaosY: 0.004,
  angularNudgeMag: 0.64,
  angularNudgeChance: 0.33,

  mixTime: 5000,
};

/**
 * Run a full headless draw cycle on the oval container:
 *   1. Mix with wind for mixTime ms (gate closed)
 *   2. Open gate
 *   3. Continue until a ball hits exit sensor (winner) or timeout
 */
export function runSimulation(params = DEFAULT_PARAMS) {
  const p = { ...DEFAULT_PARAMS, ...params };

  const CHUTE_WIDTH = p.ballRadius * 2 + 14;
  const CHUTE_HEIGHT = 60;
  const CHUTE_LEFT = CANVAS_WIDTH / 2 - CHUTE_WIDTH / 2;
  const CHUTE_RIGHT = CANVAS_WIDTH / 2 + CHUTE_WIDTH / 2;
  const SENSOR_Y = -CHUTE_HEIGHT + 5;

  const engine = Engine.create({
    gravity: { x: 0, y: p.gravityY, scale: p.gravityScale },
  });

  const wallOpts = {
    isStatic: true,
    friction: p.wallFriction,
    restitution: p.wallRestitution,
    label: 'wall',
  };

  // --- Oval walls ---
  const allBodies = [];
  const angleStep = (Math.PI * 2) / OVAL_SEGMENTS;
  for (let i = 0; i < OVAL_SEGMENTS; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    const x1 = CX + RX * Math.cos(a1);
    const y1 = CY + RY * Math.sin(a1);
    const x2 = CX + RX * Math.cos(a2);
    const y2 = CY + RY * Math.sin(a2);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    if (my < CY - RY + 30 && mx > CHUTE_LEFT - 10 && mx < CHUTE_RIGHT + 10) continue;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy) + 4;
    const angle = Math.atan2(dy, dx);
    allBodies.push(Bodies.rectangle(mx, my, length, WALL, { ...wallOpts, angle }));
  }

  // Funnel + chute
  const funnelLen = 80;
  allBodies.push(Bodies.rectangle(CHUTE_LEFT - funnelLen / 2 + 8, TOP + 20, funnelLen, WALL, { ...wallOpts, angle: -0.45 }));
  allBodies.push(Bodies.rectangle(CHUTE_RIGHT + funnelLen / 2 - 8, TOP + 20, funnelLen, WALL, { ...wallOpts, angle: 0.45 }));
  allBodies.push(Bodies.rectangle(CHUTE_LEFT - WALL / 2, TOP - CHUTE_HEIGHT / 2, WALL, CHUTE_HEIGHT, wallOpts));
  allBodies.push(Bodies.rectangle(CHUTE_RIGHT + WALL / 2, TOP - CHUTE_HEIGHT / 2, WALL, CHUTE_HEIGHT, wallOpts));
  World.add(engine.world, allBodies);

  // Gate + sensor
  const gate = Bodies.rectangle(CANVAS_WIDTH / 2, TOP, CHUTE_WIDTH + WALL, WALL, { ...wallOpts, label: 'gate' });
  World.add(engine.world, [gate]);
  const sensor = Bodies.rectangle(CANVAS_WIDTH / 2, SENSOR_Y, CHUTE_WIDTH - 4, 8, {
    isStatic: true, isSensor: true, label: 'exit-sensor',
  });
  World.add(engine.world, [sensor]);

  // --- Balls ---
  const balls = [];
  const cols = Math.min(p.numBalls, 7);
  for (let i = 0; i < p.numBalls; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const y = CY + RY * 0.4 - row * (p.ballRadius * 2 + 6) + (Math.random() - 0.5) * 8;
    const normY = (y - CY) / RY;
    let halfW = RX * Math.sqrt(Math.max(0, 1 - normY * normY)) - p.ballRadius - WALL;
    if (halfW < p.ballRadius) halfW = p.ballRadius;
    const spacingX = (halfW * 2) / (cols + 1);
    const x = CX - halfW + spacingX * (col + 1) + (Math.random() - 0.5) * 10;
    balls.push(Bodies.circle(x, y, p.ballRadius, {
      restitution: p.ballRestitution,
      friction: p.ballFriction,
      frictionAir: p.ballFrictionAir,
      density: p.ballDensity,
      label: `ball-${i}`,
    }));
  }
  World.add(engine.world, balls);

  // --- Wind sources on the oval perimeter ---
  const windAngleL = Math.PI / 2 + p.windSourceAngle;
  const windAngleR = Math.PI / 2 - p.windSourceAngle;
  const srcLx = CX + RX * Math.cos(windAngleL);
  const srcLy = CY + RY * Math.sin(windAngleL);
  const srcRx = CX + RX * Math.cos(windAngleR);
  const srcRy = CY + RY * Math.sin(windAngleR);
  const maxDist = Math.sqrt((RIGHT - LEFT) ** 2 + (BOTTOM - TOP) ** 2);

  // --- Tracking ---
  let ballBallCollisions = 0;
  let ballWallCollisions = 0;
  let winner = null;

  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      if (!winner) {
        const sensorBody = bodyA.label === 'exit-sensor' ? bodyA : bodyB.label === 'exit-sensor' ? bodyB : null;
        if (sensorBody) {
          const ballBody = sensorBody === bodyA ? bodyB : bodyA;
          if (ballBody.label.startsWith('ball-')) winner = ballBody.label;
          continue;
        }
      }
      const aIsBall = bodyA.label.startsWith('ball-');
      const bIsBall = bodyB.label.startsWith('ball-');
      if (aIsBall && bIsBall) ballBallCollisions++;
      else if (aIsBall || bIsBall) ballWallCollisions++;
    }
  });

  // --- Wind with oscillation ---
  let simStep = 0;
  const DT = 1000 / 60;

  Events.on(engine, 'beforeUpdate', () => {
    simStep++;
    const timeSec = simStep * DT / 1000;

    // Oscillation: alternates which jet is dominant → creates swirling
    const oscPhase = Math.sin(2 * Math.PI * p.windOscFreq * timeSec);
    const leftMult = 1 + oscPhase * p.windOscAmp;
    const rightMult = 1 - oscPhase * p.windOscAmp;

    for (const ball of balls) {
      const { x, y } = ball.position;

      const distL = Math.sqrt((x - srcLx) ** 2 + (y - srcLy) ** 2);
      const strengthL = Math.max(0, 1 - distL / (maxDist * p.windMaxDistScale));

      const distR = Math.sqrt((x - srcRx) ** 2 + (y - srcRy) ** 2);
      const strengthR = Math.max(0, 1 - distR / (maxDist * p.windMaxDistScale));

      // Oscillation modulates each jet's strength over time
      const forceX = p.windForceX * strengthL * leftMult - p.windForceX * strengthR * rightMult;
      const forceY = -p.windForceY * strengthL * leftMult + -p.windForceY * strengthR * rightMult;

      const chaosX = (Math.random() - 0.5) * p.chaosX;
      const chaosY = (Math.random() - 0.5) * p.chaosY;

      Body.applyForce(ball, ball.position, {
        x: forceX + chaosX,
        y: forceY + chaosY,
      });

      if (Math.random() < p.angularNudgeChance) {
        Body.setAngularVelocity(ball, ball.angularVelocity + (Math.random() - 0.5) * p.angularNudgeMag);
      }
    }
  });

  // --- Run simulation ---
  const mixSteps = Math.round(p.mixTime / DT);
  const postGateMaxSteps = Math.round(15000 / DT);

  // Phase 1: Mixing (gate closed)
  for (let i = 0; i < mixSteps && !winner; i++) {
    Engine.update(engine, DT);
  }

  // Open gate
  World.remove(engine.world, [gate]);

  // Phase 2: Selection (gate open)
  let selectionSteps = 0;
  for (let i = 0; i < postGateMaxSteps && !winner; i++) {
    Engine.update(engine, DT);
    selectionSteps++;
  }

  Events.off(engine, 'beforeUpdate');
  Events.off(engine, 'collisionStart');
  World.clear(engine.world, false);
  Engine.clear(engine);

  return {
    winner,
    winnerIndex: winner ? parseInt(winner.split('-')[1]) : -1,
    totalCollisions: ballBallCollisions + ballWallCollisions,
    ballBallCollisions,
    ballWallCollisions,
    selectionTimeMs: selectionSteps * DT,
    params: p,
  };
}

if (process.argv[1] && process.argv[1].endsWith('simulate.mjs')) {
  const result = runSimulation();
  console.log('=== Single Draw (Default Params) ===');
  console.log(`Winner:               ${result.winner ?? 'NONE (timeout)'}`);
  console.log(`Selection time:       ${(result.selectionTimeMs / 1000).toFixed(1)}s after gate open`);
  console.log(`Total collisions:     ${result.totalCollisions}`);
  console.log(`Ball-ball:            ${result.ballBallCollisions}`);
  console.log(`Ball-wall:            ${result.ballWallCollisions}`);
}
