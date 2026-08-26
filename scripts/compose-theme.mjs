// Assembles a deployable theme directory for one client: the shared base theme
// (assets/, blocks/, config/, layout/, locales/, sections/, snippets/, templates/)
// with that client's clients/<name>/custom/ overrides copied on top, if any exist.
//
// If clients/<name>/settings_data.snapshot.json exists (written by
// scripts/pull-settings-snapshot.mjs), it's used in place of the base config/settings_data.json
// so a deploy pushes back the CURRENT live merchant settings unchanged instead of overwriting
// them with our local seed — run `npm run pull:settings` before composing for a real deploy.
//
// Client is selected via the CLIENT env var (defaults to "default").
// Output goes to .dist/<client>/ — run `npm run tokens` first so assets/tokens.css
// and assets/tailwind.css are current before composing.
import { cpSync, existsSync, rmSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const client = process.env.CLIENT || 'default'
const customDir = path.join(rootDir, 'clients', client, 'custom')
const settingsSnapshotPath = path.join(rootDir, 'clients', client, 'settings_data.snapshot.json')
const outputDir = path.join(rootDir, '.dist', client)

const BASE_THEME_DIRS = ['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']

rmSync(outputDir, { recursive: true, force: true })

for (const dir of BASE_THEME_DIRS) {
  const src = path.join(rootDir, dir)
  if (existsSync(src)) {
    cpSync(src, path.join(outputDir, dir), { recursive: true })
  }
}

if (existsSync(customDir)) {
  cpSync(customDir, outputDir, { recursive: true })
  console.log(`Composed .dist/${client}/ from the base theme + clients/${client}/custom/`)
} else {
  console.log(`Composed .dist/${client}/ from the base theme (no custom/ overrides for this client)`)
}

if (existsSync(settingsSnapshotPath)) {
  copyFileSync(settingsSnapshotPath, path.join(outputDir, 'config', 'settings_data.json'))
  console.log(`Using clients/${client}/settings_data.snapshot.json for config/settings_data.json (protects live merchant settings)`)
} else {
  console.log(`No settings_data.snapshot.json for ${client} — config/settings_data.json will push from the local seed. Run \`npm run pull:settings\` first to avoid overwriting live settings.`)
}
