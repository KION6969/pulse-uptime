// Pulse Uptime — integration tests
// Tests the full check → merge → status.json pipeline end-to-end

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
import {
  applyCheck,
  computeUptime,
  dayKey,
  mergeStatus,
  round2,
  isOk,
} from './lib.mjs';

const T0 = 1_760_000_000;

function result(overrides = {}) {
  return {
    id: 'demo',
    name: 'Demo',
    url: 'https://example.com',
    group: 'Tests',
    t: T0,
    ms: 120,
    code: 200,
    ok: true,
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name} — ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/* ------------------------------------------------------------------ */
/*  applyCheck integration                                            */
/* ------------------------------------------------------------------ */

test('applyCheck: first check creates monitor record', () => {
  const m = applyCheck(null, result(), T0);
  assert(m.id === 'demo', 'id preserved');
  assert(m.checks.length === 1, 'one check recorded');
  assert(m.last.code === 200, 'last check recorded');
  assert(m.uptime24h === 100, '100% uptime after one healthy check');
  assert(m.incidents.length === 0, 'no incidents when healthy');
});

test('applyCheck: outage opens incident, recovery closes it', () => {
  let m = applyCheck(null, result({ code: 500, ok: false }), T0);
  assert(m.incidents.length === 1, 'incident opened on first failure');
  assert(m.incidents[0].end === null, 'incident is open');

  m = applyCheck(m, result({ t: T0 + 300, code: 503, ok: false }), T0 + 300);
  assert(m.incidents.length === 1, 'second failure does not duplicate incident');
  assert(m.incidents[0].code === 503, 'incident code updated');

  m = applyCheck(m, result({ t: T0 + 600 }), T0 + 600);
  assert(m.incidents[0].end === T0 + 600, 'recovery closes incident');
});

test('applyCheck: raw checks capped at 288 (24 hours at 5-min intervals)', () => {
  let m = null;
  for (let i = 0; i < 300; i += 1) {
    m = applyCheck(m, result({ t: T0 + i * 300 }), T0 + i * 300);
  }
  assert(m.checks.length === 288, 'checks capped at 288');
  assert(m.checks.at(-1).t === T0 + 299 * 300, 'most recent check kept');
});

/* ------------------------------------------------------------------ */
/*  computeUptime integration                                         */
/* ------------------------------------------------------------------ */

test('computeUptime: ignores checks outside the window', () => {
  const checks = [
    { t: T0 - 100, ok: true },
    { t: T0, ok: true },
    { t: T0 + 60, ok: false },
  ];
  assert(computeUptime(checks, T0) === 50, '50% uptime in window');
  assert(computeUptime([], T0) === null, 'null for empty checks');
});

/* ------------------------------------------------------------------ */
/*  dayKey integration                                                */
/* ------------------------------------------------------------------ */

test('dayKey: returns YYYY-MM-DD string', () => {
  const d = new Date(1_760_000_000 * 1000);
  const expected = d.toISOString().slice(0, 10);
  assert(dayKey(T0) === expected, `dayKey should be ${expected}`);
});

/* ------------------------------------------------------------------ */
/*  round2 integration                                                */
/* ------------------------------------------------------------------ */

test('round2: keeps percentages readable', () => {
  assert(round2(99.994) === 99.99, 'rounds to 2 decimals');
  assert(round2(100) === 100, 'exact whole number');
});

/* ------------------------------------------------------------------ */
/*  isOk integration                                                  */
/* ------------------------------------------------------------------ */

test('isOk: returns true for 2xx/3xx, false otherwise', () => {
  assert(isOk(200) === true, '200 is ok');
  assert(isOk(301) === true, '301 is ok');
  assert(isOk(404) === false, '404 is not ok');
  assert(isOk(500) === false, '500 is not ok');
  assert(isOk(0) === false, '0 (network error) is not ok');
});

/* ------------------------------------------------------------------ */
/*  mergeStatus integration                                           */
/* ------------------------------------------------------------------ */

test('mergeStatus: preserves order, drops removed monitors, keeps history', () => {
  const config = [
    { id: 'a', name: 'A', url: 'https://a.test' },
    { id: 'b', name: 'B', url: 'https://b.test' },
  ];
  const previous = {
    generatedAt: T0,
    monitors: [
      {
        id: 'a',
        name: 'A',
        url: 'https://a.test',
        checks: [{ t: T0 - 300, ms: 90, code: 200, ok: true }],
        days: [{ d: dayKey(T0 - 300), ok: 1, total: 1 }],
        incidents: [],
        last: { t: T0 - 300, ms: 90, code: 200, ok: true },
      },
      { id: 'gone', name: 'Gone', url: 'https://gone.test', checks: [], days: [], incidents: [], last: null },
    ],
  };
  const merged = mergeStatus(previous, config, [
    result({ id: 'a', name: 'A', url: 'https://a.test', t: T0, ms: 100 }),
    result({ id: 'b', name: 'B', url: 'https://b.test', t: T0, ms: 300 }),
  ], T0);

  assert(merged.monitors.map((m) => m.id).join(',') === 'a,b', 'order preserved');
  assert(merged.monitors.length === 2, 'removed monitor dropped');
  assert(merged.monitors[0].checks.length === 2, 'history kept for existing monitor');
  assert(merged.monitors[1].checks.length === 1, 'new monitor starts fresh');
});

/* ------------------------------------------------------------------ */
/*  Full pipeline: check → merge → write                              */
/* ------------------------------------------------------------------ */

test('pipeline: check, merge, and write produces valid status.json', async () => {
  const dir = await mkdtemp();
  try {
    const config = [
      { id: 'site-a', name: 'Site A', url: 'https://a.test' },
      { id: 'site-b', name: 'Site B', url: 'https://b.test' },
    ];
    const previous = { generatedAt: T0, monitors: [] };
    const results = [
      result({ id: 'site-a', name: 'Site A', url: 'https://a.test', t: T0, ms: 100, code: 200, ok: true }),
      result({ id: 'site-b', name: 'Site B', url: 'https://b.test', t: T0, ms: 300, code: 500, ok: false }),
    ];
    const now = T0;

    const status = mergeStatus(previous, config, results, now);
    assert(status.monitors.length === 2, 'both monitors in output');
    assert(status.monitors[0].last.ok === true, 'site A up');
    assert(status.monitors[1].last.ok === false, 'site B down');
    assert(status.monitors[1].incidents.length === 1, 'site B incident opened');

    const outPath = join(dir, 'status.json');
    await writeFile(outPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
    const written = JSON.parse(await readFile(outPath, 'utf8'));
    assert(written.generatedAt === T0, 'timestamp written');
    assert(written.monitors[0].id === 'site-a', 'site A id in file');
  } finally {
    // cleanup not critical in /tmp
  }
});

/* ------------------------------------------------------------------ */

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

async function mkdtemp() {
  return await mkdir(join(os.tmpdir(), `pulse-integration-${Date.now()}`), { recursive: true }).then(
    () => join(os.tmpdir(), `pulse-integration-${Date.now()}`)
  );
}