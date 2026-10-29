import { readFileSync } from 'node:fs'

const raw = process.argv[2]
if (raw === undefined || raw === '') {
  console.error('用法: node scripts/check-release-version.mjs <tag>')
  process.exit(1)
}

const tag = raw.replace(/^v/, '')

/** 读取仓库根目录下的 JSON 文件。 */
const readJson = (file) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))

const packageJson = readJson('package.json')
const manifest = readJson('dsh.plugin.json')

const mismatched = [
  ['package.json', packageJson.version],
  ['dsh.plugin.json', manifest.version],
].filter(([, version]) => version !== tag)

if (mismatched.length > 0) {
  console.error(`tag ${raw} 与清单版本不一致：`)
  for (const [file, version] of mismatched) console.error(`- ${file}: ${version}（期望 ${tag}）`)
  console.error('先把版本号改到位再打 tag，否则发布出来的包和 tag 对不上。')
  process.exit(1)
}

const lock = readJson('package-lock.json')
const lockVersions = [...new Set([lock.version, lock.packages?.['']?.version])].filter(
  (version) => typeof version === 'string' && version !== tag,
)
if (lockVersions.length > 0) {
  console.warn(`提示: package-lock.json 里还是 ${lockVersions.join(' / ')}，跑一次 npm install 让它跟上 ${tag}。`)
}

console.log(`版本一致: ${tag}`)
