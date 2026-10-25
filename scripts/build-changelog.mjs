/**
 * Regenerate CHANGELOG.md from the commits made after the optimisation baseline.
 *
 * The file is a projection of `git log`, so it can never drift from history:
 * run `npm run changelog` after committing, or `npm run changelog:check` to
 * fail when it is stale.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASELINE = '88205d8'
const TITLES = {
  feat: '新功能',
  fix: '修复',
  perf: '性能',
  refactor: '重构',
  test: '测试',
  docs: '文档',
  chore: '杂项',
}
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const TARGET = join(ROOT, 'CHANGELOG.md')

function commits() {
  const text = execFileSync('git', ['log', '--format=%h\t%s', `${BASELINE}..HEAD`], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return text
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [hash, subject] = line.split('\t')
      return { hash: hash ?? '', subject: subject ?? '' }
    })
}

function render(list) {
  const groups = new Map(Object.keys(TITLES).map((kind) => [kind, []]))
  const other = []
  for (const entry of list) {
    const head = entry.subject.includes(':') ? entry.subject.slice(0, entry.subject.indexOf(':')) : ''
    const kind = head.split('(')[0] ?? ''
    const bucket = groups.get(kind)
    if (bucket === undefined) other.push(entry)
    else bucket.push(entry)
  }

  const lines = [
    '# 更新日志',
    '',
    `本文件按提交类型分组，列出 \`${BASELINE}\` 之后的自优化提交（最新在前）。每条改动都有对应测试与重建后的 \`lib/\` 产物。`,
    '',
    '由 `npm run changelog` 根据 `git log` 生成，不要手工编辑。',
    '',
  ]
  for (const [kind, entries] of groups) {
    if (entries.length === 0) continue
    lines.push(`## ${TITLES[kind]}（${entries.length}）`, '')
    for (const entry of entries) lines.push(`- \`${entry.hash}\` ${entry.subject}`)
    lines.push('')
  }
  if (other.length > 0) {
    lines.push(`## 其它（${other.length}）`, '')
    for (const entry of other) lines.push(`- \`${entry.hash}\` ${entry.subject}`)
    lines.push('')
  }
  return lines.join('\n')
}

const next = render(commits())

if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(TARGET, 'utf8')
  } catch {
    current = ''
  }
  if (current !== next) {
    console.error('CHANGELOG.md is stale: run npm run changelog')
    process.exitCode = 1
  }
} else {
  writeFileSync(TARGET, next)
  console.log(`CHANGELOG.md updated (${next.split('\n').filter((line) => line.startsWith('- `')).length} commits)`)
}
