/**
 * 一个保守的 SQL 排版器：只做“关键字大写 + 主要子句换行 + 缩进”，
 * 不动字符串、反引号标识符与注释里的内容。
 *
 * 它不解析语法，因此对任何输入都不会失败：无法判断的地方原样保留。
 */

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN',
  'EXISTS', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT', 'RIGHT',
  'INNER', 'OUTER', 'CROSS', 'ON', 'USING', 'AS', 'DISTINCT', 'UNION', 'ALL', 'INTERSECT',
  'EXCEPT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP',
  'TABLE', 'VIEW', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'DEFAULT', 'CONSTRAINT',
  'UNIQUE', 'COLUMN', 'ADD', 'MODIFY', 'RENAME', 'TO', 'WITH', 'RECURSIVE', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'TRUE', 'FALSE', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'CAST', 'CONVERT', 'COALESCE', 'NULLIF', 'IFNULL', 'NOW', 'CURRENT_TIMESTAMP', 'EXPLAIN',
  'DESCRIBE', 'SHOW', 'DATABASES', 'TABLES', 'COLUMNS', 'USE',
])

/** 这些词出现在行首时另起一行。 */
const LINE_STARTERS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'UNION',
  'INTERSECT', 'EXCEPT', 'VALUES', 'SET', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS',
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'WITH',
])

type Atom = { kind: 'word' | 'punct' | 'op' | 'literal' | 'comment'; text: string }

function tokenize(sql: string): Atom[] {
  const atoms: Atom[] = []
  let i = 0
  const push = (kind: Atom['kind'], text: string) => atoms.push({ kind, text })
  while (i < sql.length) {
    const ch = sql[i]!
    const next = sql[i + 1] ?? ''
    if (ch === '-' && next === '-') {
      const end = sql.indexOf('\n', i)
      const stop = end === -1 ? sql.length : end
      push('comment', sql.slice(i, stop))
      i = stop
      continue
    }
    if (ch === '#') {
      const end = sql.indexOf('\n', i)
      const stop = end === -1 ? sql.length : end
      push('comment', sql.slice(i, stop))
      i = stop
      continue
    }
    if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2)
      const stop = end === -1 ? sql.length : end + 2
      push('comment', sql.slice(i, stop))
      i = stop
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === String.fromCharCode(92) && ch !== '`') {
          j += 2
          continue
        }
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2
            continue
          }
          j += 1
          break
        }
        j += 1
      }
      push('literal', sql.slice(i, j))
      i = j
      continue
    }
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (/[A-Za-z0-9_$]/.test(ch)) {
      let j = i + 1
      while (j < sql.length && /[A-Za-z0-9_$]/.test(sql[j]!)) j += 1
      push('word', sql.slice(i, j))
      i = j
      continue
    }
    if ('(),;.'.includes(ch)) {
      push('punct', ch)
      i += 1
      continue
    }
    if ('=<>!+-*/%|&^~'.includes(ch)) {
      push('op', ch)
      i += 1
      continue
    }
    push('punct', ch)
    i += 1
  }
  return atoms
}

const noSpaceBefore = new Set([',', ';', '.'])
const noSpaceAfter = new Set(['(', '.'])
/** 这些词后面出现左括号时留一个空格，其余（函数名、表名）紧贴。 */
const SPACE_BEFORE_PAREN = new Set([
  'IN', 'AS', 'ON', 'AND', 'OR', 'NOT', 'WHERE', 'HAVING', 'EXISTS', 'ALL', 'ANY', 'BETWEEN',
  'LIKE', 'WHEN', 'THEN', 'ELSE', 'VALUES', 'SET', 'SELECT', 'FROM', 'BY', 'JOIN',
])

export function formatSql(input: string): string {
  const atoms = tokenize(input)
  let out = ''
  let depth = 0
  let pendingNewline = false

  const startLine = () => {
    out = `${out.replace(/\s+$/u, '')}\n${'  '.repeat(depth)}`
    pendingNewline = false
  }
  const append = (text: string, space: boolean) => {
    if (pendingNewline) {
      startLine()
    } else if (space && out !== '' && !/\s$/u.test(out)) {
      out += ' '
    }
    out += text
  }

  for (let index = 0; index < atoms.length; index += 1) {
    const atom = atoms[index]!
    if (atom.kind === 'comment') {
      append(atom.text, out !== '' && !/\s$/u.test(out))
      pendingNewline = true
      continue
    }
    if (atom.kind === 'literal') {
      append(atom.text, out !== '' && !/[(\s.]$/u.test(out))
      continue
    }
    if (atom.kind === 'punct') {
      if (atom.text === ',') {
        append(',', false)
        out += ' '
        continue
      }
      if (atom.text === ';') {
        append(';', false)
        out += '\n'
        continue
      }
      if (atom.text === '(') {
        const previous = atoms[index - 1]
        const previousWord = previous?.kind === 'word' ? previous.text.toUpperCase() : ''
        const space = out !== '' && (SPACE_BEFORE_PAREN.has(previousWord) || previous?.kind !== 'word')
        append('(', space)
        depth += 1
        continue
      }
      if (atom.text === ')') {
        depth = Math.max(0, depth - 1)
        out = out.replace(/\s+$/u, '')
        append(')', false)
        continue
      }
      if (atom.text === '.') {
        append('.', false)
        continue
      }
      append(atom.text, true)
      continue
    }
    if (atom.kind === 'op') {
      const previous = atoms[index - 1]
      const nextAtom = atoms[index + 1]
      if (atom.text === '*' && (previous?.text === '(' || nextAtom?.text === ')')) {
        append('*', false)
        continue
      }
      append(atom.text, true)
      out += ' '
      continue
    }
    // word
    const upper = atom.text.toUpperCase()
    const keyword = KEYWORDS.has(upper) ? upper : atom.text
    const before = out.slice(-1)
    const startsLine = LINE_STARTERS.has(upper) && out !== '' && !/^\s*$/u.test(out)
    if (startsLine && (before !== '(' || upper === 'SELECT')) {
      pendingNewline = true
    }
    append(keyword, !noSpaceBefore.has(before) && before !== '' && !/\s$/u.test(out) && !noSpaceAfter.has(before))
  }
  return out
    .split('\n')
    .map((line) => line.replace(/\s+$/u, ''))
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

/** CREATE SEQUENCE 的选项词：每个选项单独占一行。 */
const SEQUENCE_CLAUSES = new Set([
  'INCREMENT', 'START', 'MINVALUE', 'MAXVALUE', 'NO', 'CACHE', 'NOCACHE', 'CYCLE',
  'NOCYCLE', 'ORDER', 'NOORDER', 'OWNED', 'KEEP', 'NOKEEP', 'SCALE', 'NOSCALE',
  'SESSION', 'GLOBAL',
])

const SEQUENCE_HEADER = new Set(['CREATE', 'OR', 'REPLACE', 'SEQUENCE'])

/**
 * 格式化服务器返回的 DDL。普通对象交给 {@link formatSql}；
 * `CREATE SEQUENCE` 的选项逐个换行，避免一整行很长还要横向滚动。
 */
export function formatDdl(input: string): string {
  const ddl = input.trim()
  if (ddl === '') return ''
  if (!/^CREATE\s+(?:OR\s+REPLACE\s+)?SEQUENCE\b/iu.test(ddl)) return formatSql(ddl)

  const atoms = tokenize(ddl)
  const lines: string[] = []
  let current = ''
  let depth = 0
  let continuation = false
  const push = (text: string, space: boolean): void => {
    if (space && current !== '' && !/\s$/u.test(current)) current += ' '
    current += text
  }
  const newLine = (indent: boolean): void => {
    lines.push(current.replace(/\s+$/u, ''))
    current = indent ? '  ' : ''
  }

  for (let index = 0; index < atoms.length; index += 1) {
    const atom = atoms[index]!
    if (atom.kind === 'comment') {
      if (current.trim() !== '') newLine(false)
      lines.push(atom.text)
      current = ''
      continue
    }
    if (atom.kind === 'literal') {
      push(atom.text, current !== '' && !/[.\s]$/u.test(current))
      continue
    }
    if (atom.kind === 'punct') {
      if (atom.text === ',') {
        push(',', false)
        current += ' '
        continue
      }
      if (atom.text === ';') {
        push(';', false)
        newLine(false)
        continue
      }
      if (atom.text === '(') {
        push('(', false)
        depth += 1
        continue
      }
      if (atom.text === ')') {
        depth = Math.max(0, depth - 1)
        push(')', false)
        continue
      }
      if (atom.text === '.') {
        push('.', false)
        continue
      }
      push(atom.text, true)
      continue
    }
    if (atom.kind === 'op') {
      push(atom.text, true)
      current += ' '
      continue
    }
    const upper = atom.text.toUpperCase()
    if (depth === 0 && current.trim() !== '' && SEQUENCE_CLAUSES.has(upper) && !continuation) {
      newLine(true)
      continuation = upper === 'NO'
      push(upper, false)
      continue
    }
    if (continuation) {
      continuation = false
      push(SEQUENCE_CLAUSES.has(upper) ? upper : atom.text, true)
      continue
    }
    const keyword = KEYWORDS.has(upper) || SEQUENCE_HEADER.has(upper) ? upper : atom.text
    push(keyword, current !== '' && !/[.\s]$/u.test(current) && current.slice(-1) !== '(')
  }
  if (current.trim() !== '') newLine(false)
  return lines.join('\n').trim()
}
