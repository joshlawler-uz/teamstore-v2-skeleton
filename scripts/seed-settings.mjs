// Seeds config/settings_data.json's default colour scheme from a client config in
// clients/<name>/config.json. Client is selected via the CLIENT env var (defaults to "default").
//
// Unlike generate-tokens.mjs, this is NOT run on every build: settings_data.json is
// merchant-editable once a theme is live (theme editor writes to it directly), so this
// only seeds the initial values. Re-running it will refuse to overwrite an already-seeded
// scheme unless --force is passed.
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

if (settings.current.color_schemes && !force) {
  console.log('config/settings_data.json already has a seeded colour scheme — skipping (pass --force to overwrite).')
  process.exit(0)
}

// "scheme-1" is the default colour_scheme_group entry — any section that doesn't explicitly
// pick a different scheme resolves to this one, so seeding it here is what makes "no scheme
// selected" mean "use the client config's defaults" per the color_scheme_group's own semantics.
//
// color_scheme_group data is stored as an OBJECT keyed by scheme id (each value is the
// settings directly, no separate "id"/"settings" wrapper) — NOT an array. An array here
// produces "Color scheme group must be an object" from the theme editor.
settings.current.color_schemes = {
  'scheme-1': {
    background: config.colors.background,
    text: config.colors.foreground,
    button: config.colors.primary,
    button_label: config.colors.primaryText,
    secondary_button: config.colors.secondary,
    secondary_button_label: config.colors.secondaryText,
  },
}

writeFileSync(settingsPath, leadingComment + JSON.stringify(settings, null, 2) + '\n')
console.log(`Seeded config/settings_data.json colour scheme from clients/${client}/config.json`)
