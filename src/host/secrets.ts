import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { DbError } from './errors.js'

/**
 * Layered password storage.
 *
 * Resolution order is the same one the DSH credentials seam documents:
 * an `env:` layer wins over the plugin-owned store. The store file only ever
 * contains base64 payloads, never plaintext, and lives under the profile data
 * directory with owner-only permissions.
 */
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

export interface SecretSource {
  value: string
  source: 'env' | 'store'
}

interface SecretFile {
  version: 1
  entries: Record<string, { value: string; updatedAt: string }>
}

export function isValidSecretName(name: string): boolean {
  return NAME_PATTERN.test(name)
}

export class SecretStore {
  private entries: Record<string, { value: string; updatedAt: string }> = {}
  private loaded = false

  constructor(
    private readonly file: string,
    private readonly log: (message: string) => void = () => {},
  ) {}

  private load(): void {
    if (this.loaded) return
    this.loaded = true
    if (!existsSync(this.file)) return
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<SecretFile>
      if (parsed.entries !== undefined && typeof parsed.entries === 'object') {
        for (const [name, entry] of Object.entries(parsed.entries)) {
          if (isValidSecretName(name) && entry !== null && typeof entry.value === 'string') {
            this.entries[name] = { value: entry.value, updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString() }
          }
        }
      }
    } catch (error) {
      this.log(`secrets file is unreadable (${error instanceof Error ? error.message : String(error)}); starting empty`)
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 })
    const body: SecretFile = { version: 1, entries: this.entries }
    const temp = `${this.file}.tmp-${process.pid}`
    writeFileSync(temp, `${JSON.stringify(body, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
    renameSync(temp, this.file)
    try {
      chmodSync(this.file, 0o600)
    } catch {
      // Windows: ACLs are inherited from the profile directory.
    }
  }

  resolve(name: string | undefined): SecretSource | undefined {
    if (name === undefined || name === '' || !isValidSecretName(name)) return undefined
    const fromEnv = process.env[name]
    if (fromEnv !== undefined && fromEnv !== '') return { value: fromEnv, source: 'env' }
    this.load()
    const stored = this.entries[name]
    if (stored === undefined || stored.value === '') return undefined
    return { value: Buffer.from(stored.value, 'base64').toString('utf8'), source: 'store' }
  }

  has(name: string | undefined): boolean {
    return this.resolve(name) !== undefined
  }

  set(name: string, value: string): void {
    if (!isValidSecretName(name)) throw new DbError('invalid', `非法密码变量名：${name}`)
    this.load()
    this.entries[name] = { value: Buffer.from(value, 'utf8').toString('base64'), updatedAt: new Date().toISOString() }
    this.persist()
  }

  delete(name: string): void {
    this.load()
    if (this.entries[name] === undefined) return
    delete this.entries[name]
    this.persist()
  }

  /** New connections get a stable, env-safe variable name derived from their id. */
  static nameForConnection(connectionId: string): string {
    return `DSH_IDE_DB_${connectionId.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`
  }

  describe(): { dataDirFile: string; mode: string; entries: number } {
    this.load()
    let mode = 'missing'
    try {
      mode = `0o${(statSync(this.file).mode & 0o777).toString(8)}`
    } catch {
      // missing
    }
    return { dataDirFile: this.file, mode, entries: Object.keys(this.entries).length }
  }
}
