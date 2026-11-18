/**
 * The one place to point Pulse at your own repository.
 *
 * Forking? Change these three values, then push. The checker workflow reads
 * the config in `config/monitors.json`; the dashboard reads the `data` branch.
 */
export const REPO_OWNER = 'KION6969'
export const REPO_NAME = 'pulse-uptime'

export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`

export const STATUS_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/data/status.json`
