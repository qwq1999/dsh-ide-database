import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const srcDir = join(root, 'bridge', 'src')
const classesDir = join(root, '.bridge-classes')
const jarPath = join(root, 'bridge', 'dsh-db-bridge.jar')

function javaHomeBin() {
  if (process.env.JAVA_HOME) {
    const bin = join(process.env.JAVA_HOME, 'bin')
    if (existsSync(join(bin, 'javac.exe')) || existsSync(join(bin, 'javac'))) return bin
  }
  return undefined
}

function tool(name) {
  const suffix = process.platform === 'win32' ? '.exe' : ''
  const home = javaHomeBin()
  if (home !== undefined) {
    const candidate = join(home, name + suffix)
    if (existsSync(candidate)) return candidate
  }
  return name + suffix
}

function javaFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...javaFiles(full))
    else if (entry.endsWith('.java')) out.push(full)
  }
  return out
}

const sources = javaFiles(srcDir)
if (sources.length === 0) throw new Error(`no Java sources under ${srcDir}`)

rmSync(classesDir, { recursive: true, force: true })
mkdirSync(classesDir, { recursive: true })

const javac = tool('javac')
const versionProbe = spawnSync(javac, ['-version'], { encoding: 'utf8', windowsHide: true })
const javacVersion = /javac\s+(\d+)/.exec(`${versionProbe.stdout}${versionProbe.stderr}`)
const javacMajor = javacVersion === null ? 8 : Number(javacVersion[1])
const targetFlags = javacMajor >= 9 ? ['--release', '8'] : ['-source', '8', '-target', '8']
const compile = spawnSync(
  javac,
  [...targetFlags, '-encoding', 'UTF-8', '-Xlint:-options', '-d', classesDir, ...sources],
  { stdio: 'inherit', windowsHide: true },
)
if (compile.status !== 0) throw new Error(`javac failed with status ${compile.status}`)

const jarTool = tool('jar')
const jar = spawnSync(jarTool, ['cf', jarPath, '-C', classesDir, '.'], {
  stdio: 'inherit',
  windowsHide: true,
})
if (jar.status !== 0) throw new Error(`jar failed with status ${jar.status}`)

const java = tool('java')
const selfTest = spawnSync(java, ['-cp', jarPath, 'dshdb.Bridge', '--self-test'], {
  encoding: 'utf8',
  windowsHide: true,
  timeout: 30_000,
})
if (selfTest.status !== 0) {
  console.error(selfTest.stdout, selfTest.stderr)
  throw new Error('bridge self-test failed')
}
console.log(`bridge jar built: bridge/dsh-db-bridge.jar (${selfTest.stdout.trim()})`)
