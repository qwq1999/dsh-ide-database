/**
 * Tolerant SQL lexer for the completion popup.
 *
 * A console editor is full of half-written statements, so the lexer never
 * throws: unclosed strings, comments and quoted identifiers simply run to the
 * end of the text. Comments are dropped, everything else keeps its source
 * offsets so the callers can map tokens back to the editor.
 */
import type { SqlDialect } from '../../shared/types'
import { backslashEscapes } from '../sqllex'
import { isKeyword } from './keywords'

/**
 * Scan the single-quoted literal starting at `quote`.
 *
 * Besides doubled quotes, MySQL (and PostgreSQL `E'...'`) treat `\` as an
 * escape, so `\'` must not end the literal. Returns the exclusive end and
 * whether a closing quote was actually found; an unterminated literal simply
 * runs to the end of the text, which keeps the lexer tolerant of half-written
 * input.
 */
function scanString(text: string, quote: number, dialect: SqlDialect): { end: number; terminated: boolean } {
  const length = text.length
  const escapes = backslashEscapes(text, quote, "'", dialect)
  let index = quote + 1
  while (index < length) {
    const current = text[index] as string
    if (escapes && current === '\\') {
      index = Math.min(length, index + 2)
      continue
    }
    index += 1
    if (current !== "'") continue
    if (text[index] === "'") {
      index += 1
      continue
    }
    return { end: index, terminated: true }
  }
  return { end: index, terminated: false }
}

/** Kinds produced by {@link tokenize}. */
export type TokenKind = 'ident' | 'keyword' | 'string' | 'number' | 'punct' | 'param'

/** One lexed piece of the statement. */
export interface Token {
  kind: TokenKind
  /**
   * Source text of the token. Identifiers keep their unquoted spelling, so
   * `"orders"` and `` `orders` `` both give `orders`; keywords keep the case
   * the user typed.
   */
  text: string
  /** `text` lowercased, for case-insensitive comparisons. */
  lower: string
  /** Offset of the first source character (the opening quote for identifiers). */
  start: number
  /** Offset one past the last source character (past the closing quote). */
  end: number
  /** True when the identifier was written as `"x"`, `` `x` `` or `[x]`. */
  quoted?: boolean
}

const WORD_CHAR = /[\p{L}\p{N}_$]/u
const DIGIT = /[0-9]/u

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD_CHAR.test(char)
}

function makeToken(
  kind: TokenKind,
  text: string,
  start: number,
  end: number,
  quoted?: boolean,
): Token {
  const token: Token = { kind, text, lower: text.toLowerCase(), start, end }
  if (quoted === true) token.quoted = true
  return token
}

/**
 * Split `text` into tokens. Whitespace and comments are skipped, not emitted.
 */
export function tokenize(text: string, dialect: SqlDialect = 'generic'): Token[] {
  const tokens: Token[] = []
  const length = text.length
  let index = 0

  while (index < length) {
    const char = text[index] as string

    if (/\s/u.test(char)) {
      index += 1
      continue
    }

    // -- line comment
    if (char === '-' && text[index + 1] === '-') {
      index += 2
      while (index < length && text[index] !== '\n') index += 1
      continue
    }

    // /* block comment */, unclosed runs to the end
    if (char === '/' && text[index + 1] === '*') {
      index += 2
      while (index < length && !(text[index] === '*' && text[index + 1] === '/')) index += 1
      index = Math.min(length, index + 2)
      continue
    }

    // 'string literal', with '' (and, in MySQL/E'', \') as the escaped quote
    if (char === "'") {
      const start = index
      const { end } = scanString(text, index, dialect)
      index = end
      tokens.push(makeToken('string', text.slice(start, index), start, index))
      continue
    }

    // "quoted" / `quoted` / [quoted] identifiers; the close character doubles
    if (char === '"' || char === '`' || char === '[') {
      const close = char === '[' ? ']' : char
      const start = index
      index += 1
      let inner = ''
      while (index < length) {
        const current = text[index] as string
        if (current !== close) {
          inner += current
          index += 1
          continue
        }
        index += 1
        if (text[index] === close) {
          inner += close
          index += 1
          continue
        }
        break
      }
      tokens.push(makeToken('ident', inner, start, index, true))
      continue
    }

    // 42, 42.5
    if (DIGIT.test(char)) {
      const start = index
      while (index < length && DIGIT.test(text[index] as string)) index += 1
      if (text[index] === '.' && isDigit(text[index + 1])) {
        index += 1
        while (index < length && isDigit(text[index])) index += 1
      }
      tokens.push(makeToken('number', text.slice(start, index), start, index))
      continue
    }

    // ?, :name, @name, @@name
    if (char === '?') {
      tokens.push(makeToken('param', '?', index, index + 1))
      index += 1
      continue
    }
    if (char === ':' && text[index + 1] !== ':' && text[index - 1] !== ':' && isWordChar(text[index + 1])) {
      const start = index
      index += 1
      while (index < length && isWordChar(text[index])) index += 1
      tokens.push(makeToken('param', text.slice(start, index), start, index))
      continue
    }
    if (char === '@') {
      const afterAt = text[index + 1] === '@' ? text[index + 2] : text[index + 1]
      if (isWordChar(afterAt)) {
        const start = index
        index += 1
        if (text[index] === '@') index += 1
        while (index < length && isWordChar(text[index])) index += 1
        tokens.push(makeToken('param', text.slice(start, index), start, index))
        continue
      }
    }

    // plain or keyword word
    if (WORD_CHAR.test(char)) {
      const start = index
      while (index < length && isWordChar(text[index])) index += 1
      const word = text.slice(start, index)
      tokens.push(makeToken(isKeyword(word) ? 'keyword' : 'ident', word, start, index))
      continue
    }

    // anything else, including :: and := one character at a time
    tokens.push(makeToken('punct', char, index, index + 1))
    index += 1
  }

  return tokens
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && DIGIT.test(char)
}

/** A comment or single-quoted string literal in the analysed text. */
export interface MaskSpan {
  /** First character, including the opening delimiter. */
  start: number
  /** One past the last character, including a closing delimiter when present. */
  end: number
  /** True when the closing delimiter was found (false for an unterminated span). */
  terminated: boolean
}

/**
 * Spans of comments and string literals, in source order.
 *
 * A `--` comment stops before its newline; an unterminated comment or string
 * runs to the end of the text. Quoted identifiers are deliberately absent: the
 * context parser still needs to read `"shop"."orders"`.
 */
export function maskedRanges(text: string, dialect: SqlDialect = 'generic'): MaskSpan[] {
  const spans: MaskSpan[] = []
  const length = text.length
  let index = 0

  while (index < length) {
    const char = text[index] as string
    if (char === '-' && text[index + 1] === '-') {
      const start = index
      index += 2
      while (index < length && text[index] !== '\n') index += 1
      // A `--` comment ends at the newline; running out of text leaves it open.
      spans.push({ start, end: index, terminated: index < length })
      continue
    }
    if (char === '/' && text[index + 1] === '*') {
      const start = index
      index += 2
      let closed = false
      while (index < length && !(text[index] === '*' && text[index + 1] === '/')) index += 1
      if (index < length) {
        index += 2
        closed = true
      }
      spans.push({ start, end: index, terminated: closed })
      continue
    }
    if (char === "'") {
      const start = index
      const { end, terminated } = scanString(text, index, dialect)
      index = end
      spans.push({ start, end: index, terminated })
      continue
    }
    index += 1
  }

  return spans
}

/**
 * Replace comments and string literals with spaces while keeping every offset
 * (and every newline) in place.
 */
export function maskCommentsAndStrings(text: string, dialect: SqlDialect = 'generic'): string {
  const chars = text.split('')
  for (const span of maskedRanges(text, dialect)) {
    for (let cursor = span.start; cursor < Math.min(span.end, chars.length); cursor += 1) {
      if (chars[cursor] !== '\n') chars[cursor] = ' '
    }
  }
  return chars.join('')
}

/**
 * Whether `index` sits inside a comment or a single-quoted string literal.
 *
 * A caret right after a closed literal or comment is outside; inside an
 * unterminated one the very end of the text still counts as inside.
 */
export function isInsideCommentOrString(text: string, index: number, dialect: SqlDialect = 'generic'): boolean {
  const at = Math.max(0, Math.min(index, text.length))
  for (const span of maskedRanges(text, dialect)) {
    if (at <= span.start) continue
    if (at < span.end) return true
    // Only an unterminated span counts at its end-of-text boundary. A closed
    // literal/comment ending exactly at the caret leaves the caret outside, so
    // expression-tail completions (AS/FROM/…) remain available.
    if (at === span.end && span.end === text.length && !span.terminated) return true
  }
  return false
}
