// Single entry point for local development. Interactively (in a terminal):
//   1. asks which client you're working on
//   2. asks how to set up its local data (continue / pull from store / reset)
//   3. starts the dev server
// Non-interactively (CLIENT env var set, or piped/CI), it skips straight to step 3 with
// whatever's already on disk — so `CLIENT=hibernian npm run dev` still works with no prompts.
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import inquirer from 'inquirer'
import { resolveStore } from './lib/resolve-store.mjs'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const isInteractive = process.stdout.isTTY
const clientsDir = path.join(rootDir, 'clients')

let client = process.env.CLIENT

if (!client && isInteractive) {
  const existing = existsSync(clientsDir)
    ? readdirSync(clientsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
  const { chosen } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosen',
      message: 'Which client are you working on?',
      choices: existing.length ? existing : ['default'],
      default: existing.includes('default') ? 'default' : existing[0],
    },
  ])
  client = chosen
}
client = client || 'default'

const store = resolveStore(rootDir, client)
const env = { ...process.env, CLIENT: client, ...(store ? { SHOPIFY_FLAG_STORE: store } : {}) }
const customDir = path.join(clientsDir, client, 'custom')

if (!store) {
  console.log(`No store resolved for "${client}" — set SHOPIFY_FLAG_STORE, or add "store" to clients/${client}/config.json. Shopify CLI will prompt you to pick one.`)
}

if (isInteractive) {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: `How do you want to set up local dev data for "${client}"?`,
      choices: [
        'Continue with existing local config',
        'Pull latest changes from the Shopify store',
        'Reset to defaults (discard local custom/ overrides)',
      ],
      default: 'Continue with existing local config',
    },
  ])

  if (mode.startsWith('Pull')) {
    execFileSync('node', ['scripts/pull-client.mjs'], { stdio: 'inherit', cwd: rootDir, env })
  } else if (mode.startsWith('Reset')) {
    rmSync(customDir, { recursive: true, force: true })
    console.log(`Cleared clients/${client}/custom/`)
  }
}

execFileSync('node', ['scripts/generate-tokens.mjs'], { stdio: 'inherit', cwd: rootDir, env })

const hasCustomOverrides = existsSync(customDir)

if (hasCustomOverrides) {
  execFileSync('node', ['scripts/compose-theme.mjs'], { stdio: 'inherit', cwd: rootDir, env })
  console.log(
    `\nNote: "${client}" has custom/ overrides, so this preview runs against .dist/${client}/. ` +
      `Editing a shared base file (outside clients/${client}/custom/) mid-session won't hot-reload — ` +
      `restart \`npm run dev\` to pick it up.\n`
  )
  spawn(
    'npx',
    ['concurrently', '-k', '-n', 'vite,shopify', '-c', 'cyan,magenta', '"vite build --watch"', `"shopify theme dev --path .dist/${client}"`],
    { stdio: 'inherit', shell: true, cwd: rootDir, env }
  )
} else {
  spawn(
    'npx',
    ['concurrently', '-k', '-n', 'vite,shopify', '-c', 'cyan,magenta', '"vite build --watch"', '"shopify theme dev"'],
    { stdio: 'inherit', shell: true, cwd: rootDir, env }
  )
}
