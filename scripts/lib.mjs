/**
 * Pure helpers behind the uptime engine.
 *
 * Kept free of I/O so they can be unit tested and reasoned about:
 * given a previous monitor record and one fresh check, what does the
 * new record look like?
 */

export const MAX_CHECKS = 288; // 24 h at one check every 5 min
export const MAX_DAYS = 90;
export const MAX_INCIDENTS = 50;

export function isOk(code) {
  return code >= 200 && code < 400;
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function dayKey(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function computeUptime(checks, since) {
  const window = checks.filter((c) => c.t >= since);
  if (!window.length) return null;
  const ok = window.filter((c) => c.ok).length;
  return round2((ok / window.length) * 100);
}

/**
 * Merge one check into a monitor record.
 *
 * @param {object|null} prev previous monitor (from the data branch)
 * @param {{id:string,name:string,url:string,group?:string,t:number,ms:number,code:number,ok:boolean,error?:string}} result
 * @param {number} now epoch seconds
 */
export function applyCheck(prev, result, now = result.t) {
  const base = prev ?? {
    id: result.id,
    name: result.name,
    url: result.url,
    group: result.group ?? 'Services',
    checks: [],
    days: [],
    incidents: [],
    last: null,
  };

  const checks = [...(base.checks ?? []), result].slice(-MAX_CHECKS);
  const incidents = (base.incidents ?? []).map((i) => ({ ...i }));
  const open = incidents.find((i) => !i.end);

  if (!result.ok) {
    if (open) {
      open.code = result.code;
      open.reason = result.error ?? `HTTP ${result.code}`;
    } else {
      incidents.push({
        id: `${result.id}-${result.t}`,
        start: result.t,
        end: null,
        code: result.code,
        reason: result.error ?? `HTTP ${result.code}`,
      });
    }
  } else if (open) {
    open.end = result.t;
  }

  // Roll today's numbers forward. Older days stay untouched, so a 90-day
  // uptime figure survives even though raw checks only cover 24 hours.
  const key = dayKey(result.t);
  const days = (base.days ?? []).map((d) => ({ ...d }));
  const today = days.find((d) => d.d === key);
  if (today) {
    today.total += 1;
    if (result.ok) today.ok += 1;
  } else {
    days.push({ d: key, ok: result.ok ? 1 : 0, total: 1 });
  }

  const total = days.reduce((n, d) => n + d.total, 0);
  const up = days.reduce((n, d) => n + d.ok, 0);

  return {
    ...base,
    id: result.id,
    name: result.name,
    url: result.url,
    group: result.group ?? base.group ?? 'Services',
    checks,
    days: days.slice(-MAX_DAYS),
    incidents: incidents.slice(-MAX_INCIDENTS),
    last: result,
    uptime24h: computeUptime(checks, now - 86400),
    uptime30d: total ? round2((up / total) * 100) : null,
  };
}

/**
 * Build a whole status payload from the monitor config and fresh results.
 * Monitors removed from config disappear from the payload.
 */
export function mergeStatus(prevStatus, config, results, now) {
  const previous = new Map((prevStatus?.monitors ?? []).map((m) => [m.id, m]));
  const byId = new Map(results.map((r) => [r.id, r]));
  const monitors = config
    .filter((m) => byId.has(m.id))
    .map((m) => applyCheck(previous.get(m.id), byId.get(m.id), now));
  return { generatedAt: now, monitors };
}

export function summarize(monitors) {
  return monitors.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.last?.code ?? 0,
    ms: m.last?.ms ?? 0,
    ok: Boolean(m.last?.ok),
    uptime24h: m.uptime24h,
  }));
}
