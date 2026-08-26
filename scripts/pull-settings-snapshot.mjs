// Fetches the CURRENT live config/settings_data.json for one client's store and saves it
// to clients/<name>/settings_data.snapshot.json, so `compose` can push it back unchanged
// instead of overwriting live merchant settings (colors, fonts, etc.) with our stale local
// copy. Runs automatically as part of `deploy:preview`/`deploy:live` — this is the piece
// that stops a normal deploy from clobbering non-code changes a merchant made themselves.
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { resolveStore } from './lib/resolve-store.mjs'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const client = process.env.CLIENT || 'default'
const store = resolveStore(rootDir, client)

if (!store) {
  console.error('Missing store: pass --store=<name>.myshopify.com, set SHOPIFY_FLAG_STORE, or add "store" to clients/<name>/config.json')
  process.exit(1)
}

const stagingDir = mkdtempSync(path.join(tmpdir(), 'settings-pull-'))

console.log(`Fetching live config/settings_data.json from ${store}...`)
try {
  execFileSync(
    'shopify',
    ['theme', 'pull', '--path', stagingDir, '--store', store, '--only', 'config/settings_data.json'],
    { stdio: 'inherit' }
  )
  const snapshotPath = path.join(rootDir, 'clients', client, 'settings_data.snapshot.json')
  writeFileSync(snapshotPath, readFileSync(path.join(stagingDir, 'config', 'settings_data.json')))
  console.log(`Saved clients/${client}/settings_data.snapshot.json`)
} finally {
  rmSync(stagingDir, { recursive: true, force: true })
}
