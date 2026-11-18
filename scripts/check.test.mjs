import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCheck,
  computeUptime,
  dayKey,
  mergeStatus,
  round2,
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

test('a first healthy check creates a monitor with 100% uptime', () => {
  const monitor = applyCheck(null, result(), T0);
  assert.equal(monitor.checks.length, 1);
  assert.equal(monitor.last.code, 200);
  assert.equal(monitor.uptime24h, 100);
  assert.equal(monitor.uptime30d, 100);
  assert.deepEqual(monitor.incidents, []);
});

test('an outage opens exactly one incident and recovery closes it', () => {
  let monitor = applyCheck(null, result({ code: 500, ok: false }), T0);
  assert.equal(monitor.incidents.length, 1);
  assert.equal(monitor.incidents[0].start, T0);
  assert.equal(monitor.incidents[0].end, null);
  assert.match(monitor.incidents[0].reason, /500/);

  monitor = applyCheck(monitor, result({ t: T0 + 300, code: 503, ok: false }), T0 + 300);
  assert.equal(monitor.incidents.length, 1, 'a second failed check must not duplicate the incident');
  assert.equal(monitor.incidents[0].code, 503);

  monitor = applyCheck(monitor, result({ t: T0 + 600 }), T0 + 600);
  assert.equal(monitor.incidents.length, 1);
  assert.equal(monitor.incidents[0].end, T0 + 600);
});

test('raw checks are capped at 24 hours of five-minute samples', () => {
  let monitor = null;
  for (let i = 0; i < 300; i += 1) {
    monitor = applyCheck(monitor, result({ t: T0 + i * 300 }), T0 + i * 300);
  }
  assert.equal(monitor.checks.length, 288);
  assert.equal(monitor.checks.at(-1).t, T0 + 299 * 300);
});

test('uptime ignores checks outside the window', () => {
  const checks = [
    { t: T0 - 100, ok: true },
    { t: T0, ok: true },
    { t: T0 + 60, ok: false },
  ];
  assert.equal(computeUptime(checks, T0), 50);
  assert.equal(computeUptime([], T0), null);
});

test('daily aggregates keep history beyond the 24-hour check buffer', () => {
  let monitor = applyCheck(null, result({ t: T0 }), T0);
  const nextDay = T0 + 86400;
  monitor = applyCheck(monitor, result({ t: nextDay, code: 500, ok: false }), nextDay);
  assert.equal(monitor.days.length, 2);
  assert.deepEqual(monitor.days[0], { d: dayKey(T0), ok: 1, total: 1 });
  assert.deepEqual(monitor.days[1], { d: dayKey(nextDay), ok: 0, total: 1 });
  assert.equal(monitor.uptime30d, 50);
});

test('mergeStatus preserves order, drops removed monitors and keeps history', () => {
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

  assert.deepEqual(merged.monitors.map((m) => m.id), ['a', 'b']);
  assert.equal(merged.monitors[0].checks.length, 2);
  assert.equal(merged.monitors[1].checks.length, 1);
});

test('round2 keeps percentages readable', () => {
  assert.equal(round2(99.994), 99.99);
  assert.equal(round2(100), 100);
});
