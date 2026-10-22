import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DATA_DIR_NAME } from '../shared/presets.js'

/**
 * On an installed profile the plugin lives at
 * `<profile>/node_modules/dsh-ide-database`, so walking two directories up from
 * `lib/` (or `src/host/` in a checkout) finds the package root.
 */
function findPluginRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const candidate of [resolve(here, '..'), resolve(here, '..', '..')]) {
    try {
      const pkg = JSON.parse(readFileSync(join(candidate, 'package.json'), 'utf8')) as { name?: string }
      if (pkg.name === 'dsh-ide-database') return candidate
    } catch {
      // keep looking
    }
  }
  return resolve(here, '..')
}

export interface PluginPaths {
  root: string
  dataDir: string
  configFile: string
  secretsFile: string
  structureFile: string
  driversDir: string
  bridgeJar: string
  version: string
}

/**
 * Data lives next to the profile: `<profile>/data/dsh-ide-database/`.
 * `DSH_PROFILE_DIR` is set by the desktop host; the remaining fallbacks keep
 * the plugin usable from a bare `dsh` checkout and from tests.
 */
export function resolveDataDir(): string {
  const override = process.env.DSH_IDE_DATABASE_DATA?.trim()
  if (override !== undefined && override !== '') return resolve(override)

  // Prefer the active DSH home over an inherited DSH_PROFILE_DIR: a throwaway
  // DSH_HOME (tests, a second web server) must not write into the desktop
  // profile's data directory just because the launching shell exported it.
  const dshHome = process.env.DSH_HOME?.trim()
  const profile = process.env.DSH_PROFILE?.trim()
  if (dshHome !== undefined && dshHome !== '' && profile !== undefined && profile !== '') {
    return join(dshHome, 'profiles', profile, 'data', DATA_DIR_NAME)
  }

  const profileDir = process.env.DSH_PROFILE_DIR?.trim()
  if (profileDir !== undefined && profileDir !== '') return join(profileDir, 'data', DATA_DIR_NAME)

  if (dshHome !== undefined && dshHome !== '') return join(dshHome, 'data', DATA_DIR_NAME)
  return join(homedir(), '.dsh', 'data', DATA_DIR_NAME)
}

let cached: PluginPaths | undefined

export function pluginPaths(): PluginPaths {
  if (cached !== undefined) return cached
  const root = findPluginRoot()
  const dataDir = resolveDataDir()
  for (const dir of [dataDir, join(dataDir, 'drivers'), join(dataDir, 'logs')]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
  let version = '0.0.0'
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version?: string }
    if (typeof pkg.version === 'string') version = pkg.version
  } catch {
    // fall through
  }
  cached = {
    root,
    dataDir,
    configFile: join(dataDir, 'connections.json'),
    secretsFile: join(dataDir, 'secrets.json'),
    structureFile: join(dataDir, 'structure.json'),
    driversDir: join(dataDir, 'drivers'),
    bridgeJar: join(root, 'bridge', 'dsh-db-bridge.jar'),
    version,
  }
  return cached
}
