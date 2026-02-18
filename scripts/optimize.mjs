import { runSimulation, DEFAULT_PARAMS } from './simulate.mjs';

// Parameter ranges — tuned for oval container with wind oscillation
const PARAM_RANGES = {
  gravityY:           { min: 0.5,    max: 4.0 },
  gravityScale:       { min: 0.001,  max: 0.008 },
  numBalls:           { min: 5,      max: 15,    integer: true },
  ballRadius:         { min: 18,     max: 35,    integer: true },
  ballRestitution:    { min: 0.5,    max: 1.0 },
  ballFriction:       { min: 0.01,   max: 0.2 },
  ballFrictionAir:    { min: 0.005,  max: 0.06 },
  ballDensity:        { min: 0.0001, max: 0.004 },
  wallFriction:       { min: 0.05,   max: 0.5 },
  wallRestitution:    { min: 0.5,    max: 1.0 },
  windForceX:         { min: 0.005,  max: 0.035 },
  windForceY:         { min: 0.01,   max: 0.05 },
  windMaxDistScale:   { min: 0.5,    max: 1.3 },
  windSourceAngle:    { min: 0.2,    max: 1.2 },
  windOscFreq:        { min: 0.3,    max: 3.0 },   // oscillation frequency (Hz)
  windOscAmp:         { min: 0.2,    max: 0.9 },   // oscillation amplitude
  chaosX:             { min: 0.003,  max: 0.03 },
  chaosY:             { min: 0.003,  max: 0.03 },
  angularNudgeMag:    { min: 0.2,    max: 1.0 },
  angularNudgeChance: { min: 0.1,    max: 0.5 },
  mixTime:            { min: 4000,   max: 8000,  integer: true },
};

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function generateRandomParams() {
  const params = {};
  for (const [key, range] of Object.entries(PARAM_RANGES)) {
    let value = randomInRange(range.min, range.max);
    if (range.integer) value = Math.round(value);
    params[key] = value;
  }
  return params;
}

function evaluateConfig(params, numRuns) {
  const winCounts = new Array(params.numBalls).fill(0);
  let successfulRuns = 0;
  let totalCollisions = 0;
  let totalSelectionTime = 0;

  for (let i = 0; i < numRuns; i++) {
    const result = runSimulation(params);
    totalCollisions += result.totalCollisions;
    if (result.winnerIndex >= 0) {
      winCounts[result.winnerIndex]++;
      successfulRuns++;
      totalSelectionTime += result.selectionTimeMs;
    }
  }

  const successRate = successfulRuns / numRuns;
  const avgCollisions = totalCollisions / numRuns;
  const avgSelectionTime = successfulRuns > 0 ? totalSelectionTime / successfulRuns : Infinity;

  // Chi-squared for uniformity
  let chiSquared = Infinity;
  if (successfulRuns > 0) {
    const expected = successfulRuns / params.numBalls;
    chiSquared = 0;
    for (const count of winCounts) {
      chiSquared += (count - expected) ** 2 / Math.max(expected, 0.001);
    }
  }
  const chiSquaredNorm = chiSquared / Math.max(params.numBalls - 1, 1);

  // Max deviation: worst-case ball bias
  let maxDeviation = Infinity;
  if (successfulRuns > 0) {
    const expected = successfulRuns / params.numBalls;
    maxDeviation = Math.max(...winCounts.map(c => Math.abs(c - expected) / expected));
  }

  // Score: heavily penalize non-uniformity and failed runs
  // We want: 100% success, low χ², high collisions
  let score = 0;
  if (successRate > 0) {
    score = successRate * 100
            - chiSquaredNorm * 5       // heavy penalty for non-uniformity
            + Math.log(avgCollisions + 1) * 0.3;
  }

  return {
    params, successRate, avgCollisions, avgSelectionTime,
    chiSquared, chiSquaredNorm, maxDeviation, winCounts, score, numRuns,
  };
}

// ============================================================
// PHASE 1: Screen configs
// ============================================================
const PHASE1_CONFIGS = 100;
const PHASE1_RUNS = 40;

console.log(`PHASE 1: Screening ${PHASE1_CONFIGS} configs × ${PHASE1_RUNS} runs...\n`);

const phase1Results = [];
for (let i = 0; i < PHASE1_CONFIGS; i++) {
  const params = generateRandomParams();
  const result = evaluateConfig(params, PHASE1_RUNS);
  phase1Results.push(result);
  if ((i + 1) % 10 === 0) {
    const bestScore = Math.max(...phase1Results.map(r => r.score));
    const bestSuccess = Math.max(...phase1Results.map(r => r.successRate));
    console.log(`  ${i + 1}/${PHASE1_CONFIGS} | best score: ${bestScore.toFixed(1)} | best success: ${(bestSuccess * 100).toFixed(0)}%`);
  }
}

// Default too
const defaultResult = evaluateConfig(DEFAULT_PARAMS, PHASE1_RUNS);
defaultResult.isDefault = true;
phase1Results.push(defaultResult);

phase1Results.sort((a, b) => b.score - a.score);

console.log('\n' + '='.repeat(110));
console.log('PHASE 1 — TOP 15');
console.log('='.repeat(110));
console.log(
  'Rank'.padStart(4) + ' | ' +
  'Score'.padStart(6) + ' | ' +
  'Succ%'.padStart(5) + ' | ' +
  'χ²n'.padStart(6) + ' | ' +
  'MaxDev'.padStart(6) + ' | ' +
  'Coll'.padStart(5) + ' | ' +
  'SelT'.padStart(5) + ' | ' +
  '#B'.padStart(3) + ' | ' +
  'Rad'.padStart(3) + ' | ' +
  'WndY'.padStart(6) + ' | ' +
  'WDst'.padStart(5) + ' | ' +
  'OscF'.padStart(5) + ' | ' +
  'OscA'.padStart(5) + ' | ' +
  'ChsX'.padStart(6) + ' | ' +
  'ChsY'.padStart(6) + ' | ' +
  'Mix'.padStart(5)
);
console.log('-'.repeat(110));

for (let i = 0; i < Math.min(15, phase1Results.length); i++) {
  const r = phase1Results[i];
  const p = r.params;
  console.log(
    `${i + 1}`.padStart(4) + ' | ' +
    r.score.toFixed(1).padStart(6) + ' | ' +
    `${(r.successRate * 100).toFixed(0)}`.padStart(5) + ' | ' +
    r.chiSquaredNorm.toFixed(2).padStart(6) + ' | ' +
    r.maxDeviation.toFixed(2).padStart(6) + ' | ' +
    `${Math.round(r.avgCollisions)}`.padStart(5) + ' | ' +
    `${(r.avgSelectionTime / 1000).toFixed(1)}`.padStart(5) + ' | ' +
    `${p.numBalls}`.padStart(3) + ' | ' +
    `${p.ballRadius}`.padStart(3) + ' | ' +
    p.windForceY.toFixed(3).padStart(6) + ' | ' +
    p.windMaxDistScale.toFixed(2).padStart(5) + ' | ' +
    p.windOscFreq.toFixed(1).padStart(5) + ' | ' +
    p.windOscAmp.toFixed(2).padStart(5) + ' | ' +
    p.chaosX.toFixed(3).padStart(6) + ' | ' +
    p.chaosY.toFixed(3).padStart(6) + ' | ' +
    `${p.mixTime}`.padStart(5) +
    (r.isDefault ? ' DEF' : '')
  );
}

// ============================================================
// PHASE 2: Deep test top 5 with 1000 runs
// ============================================================
const PHASE2_TOP = 5;
const PHASE2_RUNS = 1000;

const phase2Candidates = phase1Results
  .filter(r => r.successRate >= 0.5 && !r.isDefault)
  .slice(0, PHASE2_TOP);

if (phase2Candidates.length === 0) {
  console.log('\nNo configs achieved >= 50% success rate.');
  process.exit(1);
}

console.log(`\nPHASE 2: Deep testing ${phase2Candidates.length} configs × ${PHASE2_RUNS} runs...\n`);

const phase2Results = [];
for (let i = 0; i < phase2Candidates.length; i++) {
  const params = phase2Candidates[i].params;
  console.log(`  Config ${i + 1}/${phase2Candidates.length} (ph1 score: ${phase2Candidates[i].score.toFixed(1)})...`);
  const result = evaluateConfig(params, PHASE2_RUNS);
  phase2Results.push(result);
  console.log(`    success: ${(result.successRate * 100).toFixed(1)}% | χ²n: ${result.chiSquaredNorm.toFixed(2)} | maxDev: ${result.maxDeviation.toFixed(2)} | score: ${result.score.toFixed(1)}`);
}

phase2Results.sort((a, b) => b.score - a.score);

// ============================================================
// FINAL REPORT
// ============================================================
console.log('\n' + '='.repeat(100));
console.log('FINAL RESULTS');
console.log('='.repeat(100));

for (let i = 0; i < phase2Results.length; i++) {
  const r = phase2Results[i];
  const p = r.params;
  console.log(`\n--- #${i + 1} (score: ${r.score.toFixed(1)}) ---`);
  console.log(`  Success: ${(r.successRate * 100).toFixed(1)}% | χ²norm: ${r.chiSquaredNorm.toFixed(3)} | maxDev: ${(r.maxDeviation * 100).toFixed(0)}% | collisions: ${Math.round(r.avgCollisions)} | selectTime: ${(r.avgSelectionTime / 1000).toFixed(1)}s`);
  console.log(`  Win distribution (expected: ${(100 / p.numBalls).toFixed(1)}% each):`);

  const maxCount = Math.max(...r.winCounts);
  const expected = r.successRate * r.numRuns / p.numBalls;
  for (let b = 0; b < p.numBalls; b++) {
    const count = r.winCounts[b];
    const pct = (count / r.numRuns * 100).toFixed(1);
    const barLen = Math.round((count / Math.max(maxCount, 1)) * 30);
    const bar = '█'.repeat(barLen) + '░'.repeat(30 - barLen);
    const dev = expected > 0 ? ((count - expected) / expected * 100).toFixed(0) : '—';
    console.log(`    ball-${String(b).padStart(2)}: ${bar} ${String(count).padStart(4)} (${pct.padStart(5)}%) [${dev > 0 ? '+' : ''}${dev}%]`);
  }
}

// Best params as code
const best = phase2Results[0];
console.log('\n' + '='.repeat(100));
console.log('BEST PARAMETERS (copy-paste ready)');
console.log('='.repeat(100));
console.log(`// Score: ${best.score.toFixed(1)} | Success: ${(best.successRate * 100).toFixed(1)}% | χ²norm: ${best.chiSquaredNorm.toFixed(3)} | maxDev: ${(best.maxDeviation * 100).toFixed(0)}%`);
console.log('const OPTIMIZED_PARAMS = {');
for (const [key, value] of Object.entries(best.params)) {
  if (typeof value === 'number') {
    console.log(`  ${key}: ${Number.isInteger(value) ? value : value.toFixed(6)},`);
  }
}
console.log('};');

console.log('\n' + '='.repeat(100));
console.log('SUMMARY');
console.log('='.repeat(100));
console.log(`Phase 1: ${PHASE1_CONFIGS} configs, ${phase1Results.filter(r => r.successRate >= 0.5).length} had ≥50% success`);
console.log(`Phase 2: ${phase2Candidates.length} deep-tested × ${PHASE2_RUNS} runs`);
console.log(`Default: success ${(defaultResult.successRate * 100).toFixed(0)}%, score ${defaultResult.score.toFixed(1)}`);
