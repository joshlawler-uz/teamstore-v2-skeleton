// Seeds config/settings_data.json's color palette from a client config in clients/<name>/config.json.
// Client is selected via the CLIENT env var (defaults to "default").
//
// Unlike generate-tokens.mjs, this is NOT run on every build: settings_data.json is
// merchant-editable once a theme is live (theme editor writes to it directly), so this
// only seeds the initial values. Re-running it will refuse to overwrite an already-seeded
// palette unless --force is passed.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const client = process.env.CLIENT || 'default'
const force = process.argv.includes('--force')
const configPath = path.join(rootDir, 'clients', client, 'config.json')
const settingsPath = path.join(rootDir, 'config', 'settings_data.json')

const config = JSON.parse(readFileSync(configPath, 'utf8'))
const rawSettings = readFileSync(settingsPath, 'utf8')

// settings_data.json ships with a leading /* ... */ comment, which isn't valid JSON —
// strip it to parse, and re-prepend it unchanged when writing back out.
const commentMatch = rawSettings.match(/^\s*\/\*[\s\S]*?\*\/\s*/)
const leadingComment = commentMatch ? commentMatch[0] : ''
const settings = JSON.parse(rawSettings.slice(leadingComment.length))

settings.current ??= {}

if (settings.current.color_palette && !force) {
  console.log('config/settings_data.json already has a seeded color palette — skipping (pass --force to overwrite).')
  process.exit(0)
}

settings.current.color_palette = {
  background: config.colors.background,
  foreground: config.colors.foreground,
}
settings.current.palette_primary_button_background = config.colors.primary
settings.current.palette_secondary_button_background = config.colors.secondary

writeFileSync(settingsPath, leadingComment + JSON.stringify(settings, null, 2) + '\n')
console.log(`Seeded config/settings_data.json color palette from clients/${client}/config.json`)
