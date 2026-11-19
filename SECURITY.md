# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |

## Reporting a Vulnerability

Pulse Uptime is a zero-database uptime monitor with no user accounts, no API keys, and no server-side secrets. The attack surface is minimal:

- No credentials are stored in the repository
- No environment variables are required
- The checker only reads URLs you configure in `config/monitors.json`
- The dashboard is a static React app served from Vercel

If you find a security issue, please open a GitHub issue or email the repository owner. Do not submit pull requests that contain credentials, tokens, or API keys.

## Disclosure

We will acknowledge receipt within 72 hours and provide a timeline for resolution within 7 days.