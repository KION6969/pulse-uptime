#!/usr/bin/env node
/**
 * Pulse checker.
 *
 * Reads config/monitors.json, checks every URL, merges the result into the
 * previous status file and writes a fresh status.json. Runs on GitHub Actions
 * every five minutes; can also be run locally with `npm run check`.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mergeStatus, summarize } from './lib.mjs';

const TIMEOUT_MS = 15_000;
const USER_AGENT =
  'Pulse-Uptime/1.0 (+https://github.com/KION6969/pulse-uptime)';

function arg(name, fallback) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  return fallback;
}

async function readJson(file) {
  if (!file) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function checkOne(monitor) {
  const startedAt = Date.now();
  const startedHr = performance.now();
  let code = 0;
  let error;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(monitor.url, {
      method: monitor.method ?? 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT },
    });
    code = response.status;
    // We only need the status line; never download the whole page.
    await response.body?.cancel().catch(() => {});
  } catch (e) {
    const cause = e?.cause?.code ?? e?.cause?.message;
    error =
      e?.name === 'AbortError'
        ? `Timeout after ${TIMEOUT_MS / 1000}s`
        : cause || e?.message || 'Network error';
  } finally {
    clearTimeout(timer);
  }

  const expected = monitor.expect;
  const ok = expected
    ? Array.isArray(expected)
      ? expected.includes(code)
      : code === expected
    : code >= 200 && code < 400;

  return {
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    group: monitor.group ?? 'Services',
    t: Math.floor(startedAt / 1000),
    ms: Math.round(performance.now() - startedHr),
    code,
    ok,
    ...(error ? { error } : {}),
  };
}

function relTime(ts) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function main() {
  const configPath = path.resolve(arg('config', 'config/monitors.json'));
  const outPath = path.resolve(arg('out', 'public/status.json'));
  const prevPath = arg('prev');
  const seedPath = arg('seed', 'public/status.json');

  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (!Array.isArray(config) || !config.length) {
    throw new Error(`No monitors found in ${configPath}`);
  }

  // Prefer the previous data-branch snapshot. Fall back to the bundled seed
  // so a brand-new deployment keeps whatever history already exists.
  const previous = (await readJson(prevPath)) ?? (await readJson(seedPath));

  console.log(`Checking ${config.length} monitors…`);
  const results = await Promise.all(config.map((monitor) => checkOne(monitor)));
  const now = Math.floor(Date.now() / 1000);
  const status = mergeStatus(previous, config, results, now);

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');

  const rows = summarize(status.monitors);
  for (const row of rows) {
    console.log(
      `${row.ok ? 'UP  ' : 'DOWN'}  ${row.name.padEnd(18)} ${String(row.code || 'ERR').padStart(3)}  ${String(row.ms).padStart(5)} ms  ${relTime(now)}`,
    );
  }

  const down = rows.filter((r) => !r.ok);
  console.log(
    `\n${rows.length - down.length}/${rows.length} up · wrote ${path.relative(process.cwd(), outPath)}`,
  );

  // A readable run summary inside the Actions tab.
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      '## Pulse check',
      '',
      `**${rows.length - down.length}/${rows.length} up** · ${new Date(now * 1000).toISOString()}`,
      '',
      '| Monitor | Status | Code | Latency | Uptime 24h |',
      '| --- | --- | ---: | ---: | ---: |',
      ...rows.map(
        (r) =>
          `| ${r.name} | ${r.ok ? '🟢 up' : '🔴 down'} | ${r.code || 'ERR'} | ${r.ms} ms | ${r.uptime24h ?? '—'}% |`,
      ),
      '',
    ];
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`, {
      flag: 'a',
    });
  }

  // Exit 0 even when a target is down: a failing check is data, not a
  // failing workflow. GitHub would otherwise email a failure every 5 min.
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
