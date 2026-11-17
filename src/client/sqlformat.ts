/**
 * 一个保守的 SQL 排版器：只做“关键字大写 + 主要子句换行 + 缩进”，
 * 不动字符串、反引号标识符与注释里的内容。
 *
 * 它不解析语法，因此对任何输入都不会失败：无法判断的地方原样保留。
 */

import type { SqlDialect } from '../shared/types'
import { backslashEscapes } from './sqllex'

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

function tokenize(sql: string, dialect: SqlDialect | undefined): Atom[] {
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
      // Only MySQL (and PostgreSQL E'...') treat a backslash as an escape
      // inside a string. The rest of the codebase agrees on this via
      // backslashEscapes; assuming it everywhere merges two adjacent literals
      // such as 'a\', 'b' in standard SQL and silently changes their meaning.
      const escapes = dialect === undefined ? false : backslashEscapes(sql, i, ch, dialect)
      let j = i + 1
      while (j < sql.length) {
        if (escapes && sql[j] === String.fromCharCode(92)) {
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
    // Multi-character operators must stay one atom; splitting them would print
    // '>=' as '> =' (and '||' as '| |'), which changes the statement's meaning.
    const multi = MULTI_CHAR_OPS.find((op) => sql.startsWith(op, i))
    if (multi !== undefined) {
      push('op', multi)
      i += multi.length
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

const MULTI_CHAR_OPS = [
  '<=>', '!~*', '->>', '<=', '>=', '<>', '!=', '<<', '>>', '||', '&&', '::', ':=', '=>', '->', '!~', '~*',
]

const noSpaceBefore = new Set([',', ';', '.'])
const noSpaceAfter = new Set(['(', '.'])
/** 这些词后面出现左括号时留一个空格，其余（函数名、表名）紧贴。 */
const SPACE_BEFORE_PAREN = new Set([
  'IN', 'AS', 'ON', 'AND', 'OR', 'NOT', 'WHERE', 'HAVING', 'EXISTS', 'ALL', 'ANY', 'BETWEEN',
  'LIKE', 'WHEN', 'THEN', 'ELSE', 'VALUES', 'SET', 'SELECT', 'FROM', 'BY', 'JOIN',
])

export function formatSql(input: string, dialect?: SqlDialect): string {
  const atoms = tokenize(input, dialect)
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
