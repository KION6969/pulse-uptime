import { REPO_URL } from '../lib/format'
import { ArrowIcon, CodeIcon, ServerIcon, ZapIcon } from './Icons'

const snippet = `[
  {
    "id": "my-app",
    "name": "My app",
    "url": "https://my-app.vercel.app",
    "group": "Apps"
  }
]`

export function AboutView() {
  return (
    <div className="about">
      <section className="about-hero">
        <span className="eyebrow">Architecture</span>
        <h2>An uptime monitor with no servers to run.</h2>
        <p>
          Pulse is a static React app. The checks happen on GitHub's
          infrastructure, history lives on a branch, and Vercel serves the
          dashboard. That means no database, no cron service, no API keys and
          nothing to pay for.
        </p>
      </section>

      <div className="arch">
        <article className="arch-card">
          <span className="arch-icon">
            <ZapIcon size={17} />
          </span>
          <span className="arch-num">01 · check</span>
          <h3>GitHub Actions</h3>
          <p>
            A scheduled workflow runs every five minutes, measures each URL and
            writes one compact JSON file.
          </p>
        </article>
        <article className="arch-card">
          <span className="arch-icon">
            <CodeIcon size={17} />
          </span>
          <span className="arch-num">02 · store</span>
          <h3>The data branch</h3>
          <p>
            Results are merged into 24 hours of checks, 90 days of aggregates
            and an incident log, then force-pushed as a single commit.
          </p>
        </article>
        <article className="arch-card">
          <span className="arch-icon">
            <ServerIcon size={17} />
          </span>
          <span className="arch-num">03 · serve</span>
          <h3>Vercel</h3>
          <p>
            The dashboard reads that branch and renders it. Every view is
            client-side, so the page loads from the edge and costs nothing.
          </p>
        </article>
      </div>

      <section className="config-card">
        <div className="config-head">
          <div>
            <h3>Add a monitor</h3>
            <p>Append one object to the list and push. That is the whole API.</p>
          </div>
          <a className="ghost-btn" href={`${REPO_URL}/blob/main/config/monitors.json`} target="_blank" rel="noreferrer">
            Open config <ArrowIcon size={13} />
          </a>
        </div>
        <pre>
          <code>{snippet}</code>
        </pre>
        <div className="config-foot">
          <span>Timing is automatic — the workflow reads the same file.</span>
          <a href={`${REPO_URL}/blob/main/.github/workflows/check.yml`} target="_blank" rel="noreferrer">
            See the workflow <ArrowIcon size={12} />
          </a>
        </div>
      </section>

      <div className="limits">
        <article>
          <h3>Honest limits</h3>
          <ul>
            <li>Checks run every five minutes — GitHub's minimum schedule.</li>
            <li>There is no email or SMS alerting yet. Outages are recorded here.</li>
            <li>The data branch is public, so anyone can read your uptime history.</li>
          </ul>
        </article>
        <article>
          <h3>Run your own</h3>
          <ul>
            <li>Fork the repo and edit <code>config/monitors.json</code>.</li>
            <li>Let the <code>check</code> workflow run once.</li>
            <li>Import the repo into Vercel — no environment variables.</li>
          </ul>
        </article>
      </div>

      <a className="repo-cta" href={REPO_URL} target="_blank" rel="noreferrer">
        <span className="repo-mark">⌘</span>
        <span>
          <strong>KION6969 / pulse-uptime</strong>
          <small>Source, docs and the checking engine</small>
        </span>
        <ArrowIcon size={16} />
      </a>
    </div>
  )
}
