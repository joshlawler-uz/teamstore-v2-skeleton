// Pulls the live theme for one client's store and captures only what genuinely
// differs from the shared base theme into clients/<name>/custom/ — so changes made
// in the Shopify Theme Editor (rearranged sections/blocks, a merchant's content
// changes), or by a third-party app installing its own snippet/script, get captured
// without polluting the shared base every other client uses.
//
// Usage: CLIENT=<name> npm run pull -- --store=<name>.myshopify.com --theme=<id>
// Store resolves from --store=, then SHOPIFY_FLAG_STORE, then clients/<name>/config.json's
// "store" field. Prompts interactively (confirm before pulling, which theme on that store to
// pull from, whether to include a settings snapshot) when run in a terminal. Pass --yes to skip
// prompts for CI — flags always take precedence over prompting, so a fully-flagged invocation
// never blocks waiting for input.
//
// Most JSON is treated like any other file and captured when it genuinely differs —
// templates/*.json and sections/*-group.json hold real merchant customization
// (section/block arrangement and content) and would be silently lost if skipped.
//
// config/settings_data.json is never captured into custom/: capturing it there would mean
// the next `compose`+`push` silently overwrites whatever's live on the store with a stale
// snapshot — a correctness hazard, not just noise. Choose to include a read-only snapshot
// instead, written to clients/<name>/settings_data.snapshot.json (a path `compose` never
// reads as an override source, so it can't accidentally get redeployed).
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import inquirer from 'inquirer'
import { resolveStore } from './lib/resolve-store.mjs'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const client = process.env.CLIENT || 'default'
const yes = process.argv.includes('--yes')
const isInteractive = process.stdout.isTTY && !yes

let store = resolveStore(rootDir, client)

if (!store && isInteractive) {
  ;({ store } = await inquirer.prompt([
    { type: 'input', name: 'store', message: 'Shopify store to pull from (e.g. hibernian.myshopify.com):' },
  ]))
}

if (!store) {
  console.error('Missing store: pass --store=<name>.myshopify.com, set SHOPIFY_FLAG_STORE, or add "store" to clients/<name>/config.json')
  process.exit(1)
}

const themeArg = process.argv.find((arg) => arg.startsWith('--theme='))
let theme = themeArg ? themeArg.slice('--theme='.length) : undefined

if (!theme && isInteractive) {
  const listOutput = execFileSync('shopify', ['theme', 'list', '--store', store, '--json'], { encoding: 'utf8' })
  const themes = JSON.parse(listOutput)
  const { chosen } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosen',
      message: `Which theme on ${store} do you want to pull from?`,
      choices: themes.map((t) => ({ name: `${t.name} (${t.role})`, value: t.id })),
    },
  ])
  theme = chosen
}

if (isInteractive) {
  const { proceed } = await inquirer.prompt([
    {
      type: 'list',
      name: 'proceed',
      message: `Pull the live theme for "${client}" from ${store} and capture changes into clients/${client}/custom/?`,
      choices: ['Yes, pull and capture', 'No, cancel'],
      default: 'Yes, pull and capture',
    },
  ])
  if (proceed !== 'Yes, pull and capture') {
    console.log('Cancelled.')
    process.exit(0)
  }
}

let includeSettingsSnapshot = process.argv.includes('--settings-snapshot')
  ? true
  : process.argv.includes('--no-settings-snapshot')
    ? false
    : null

if (includeSettingsSnapshot === null) {
  if (isInteractive) {
    const { snapshot } = await inquirer.prompt([
      {
        type: 'list',
        name: 'snapshot',
        message: 'Also save a read-only snapshot of the live config/settings_data.json for reference?',
        choices: ['No, skip', 'Yes, save a snapshot'],
        default: 'No, skip',
      },
    ])
    includeSettingsSnapshot = snapshot.startsWith('Yes')
  } else {
    includeSettingsSnapshot = false
  }
}

const BASE_THEME_DIRS = ['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']
const NEVER_CAPTURE = new Set(['config/settings_data.json'])
const customDir = path.join(rootDir, 'clients', client, 'custom')
const stagingDir = mkdtempSync(path.join(tmpdir(), 'theme-pull-'))

console.log(`Pulling theme from ${store}${theme ? ` (theme ${theme})` : ''}...`)
const pullArgs = ['theme', 'pull', '--path', stagingDir, '--store', store]
if (theme) pullArgs.push('--theme', theme)
execFileSync('shopify', pullArgs, { stdio: 'inherit' })

function walk(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walk(full))
    } else {
      results.push(full)
    }
  }
  return results
}

// settings_data.json ships with a leading /* ... */ comment that isn't valid JSON,
// and pretty-printing differences shouldn't count as a real change — normalize before comparing.
function normalize(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  if (path.extname(filePath) === '.json') {
    const stripped = raw.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')
    try {
      return JSON.stringify(JSON.parse(stripped))
    } catch {
      return stripped
    }
  }
  return raw
}

let captured = 0
let neverCaptured = 0
let matchedBase = 0

for (const filePath of walk(stagingDir)) {
  const relativePath = path.relative(stagingDir, filePath)
  const topLevelDir = relativePath.split(path.sep)[0]
  if (!BASE_THEME_DIRS.includes(topLevelDir)) continue

  const basePath = path.join(rootDir, relativePath)
  const differsFromBase = !existsSync(basePath) || normalize(filePath) !== normalize(basePath)

  if (!differsFromBase) {
    matchedBase++
    continue
  }

  if (NEVER_CAPTURE.has(relativePath.split(path.sep).join('/'))) {
    neverCaptured++
    if (includeSettingsSnapshot) {
      const snapshotPath = path.join(rootDir, 'clients', client, 'settings_data.snapshot.json')
      writeFileSync(snapshotPath, readFileSync(filePath))
      console.log(`  snapshotted (read-only, not deployed) -> clients/${client}/settings_data.snapshot.json`)
    } else {
      console.log(`  live-only, not captured -> ${relativePath} (differs from base, expected — merchant settings state)`)
    }
    continue
  }

  const targetPath = path.join(customDir, relativePath)
  mkdirSync(path.dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, readFileSync(filePath))
  captured++
  console.log(`  captured -> clients/${client}/custom/${relativePath}`)
}

rmSync(stagingDir, { recursive: true, force: true })

console.log(`\nDone: ${captured} file(s) captured, ${matchedBase} matched the shared base (skipped), ${neverCaptured} live-only file(s) left uncaptured.`)
