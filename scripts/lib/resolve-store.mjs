// Resolves which Shopify store to target, in priority order:
//   1. --store=<name>.myshopify.com flag
//   2. SHOPIFY_FLAG_STORE env var
//   3. the "store" field in clients/<client>/config.json
// Returns undefined if none of those provide one.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export function resolveStore(rootDir, client, argv = process.argv) {
  const storeArg = argv.find((arg) => arg.startsWith('--store='))
  if (storeArg) return storeArg.slice('--store='.length)

  if (process.env.SHOPIFY_FLAG_STORE) return process.env.SHOPIFY_FLAG_STORE

  const configPath = path.join(rootDir, 'clients', client, 'config.json')
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    if (config.store) return config.store
  }

  return undefined
}
