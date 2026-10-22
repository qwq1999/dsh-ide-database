/**
 * Split a SQL script into individual statements.
 *
 * The console sends one statement per request, so a script has to be cut at
 * top-level semicolons. Semicolons inside strings, quoted identifiers and
 * comments are part of the statement, not separators. MySQL's `#` comment and
 * `--` line comments are recognised so a trailing comment does not swallow the
 * following statement.
 */
export function splitStatements(input: string): string[] {
  const statements: string[] = []
  let current = ''
  let index = 0

  const flush = (): void => {
    const trimmed = current.trim()
    if (trimmed !== '') statements.push(trimmed)
    current = ''
  }

  while (index < input.length) {
    const char = input[index] ?? ''

    // Line comments run to the end of the line and may contain semicolons.
    if (char === '-' && input[index + 1] === '-') {
      const end = input.indexOf('\n', index)
      const stop = end === -1 ? input.length : end
      current += input.slice(index, stop)
      index = stop
      continue
    }

    if (char === '#') {
      const end = input.indexOf('\n', index)
      const stop = end === -1 ? input.length : end
      current += input.slice(index, stop)
      index = stop
      continue
    }

    // Block comments span lines; keep them attached to the current statement.
    if (char === '/' && input[index + 1] === '*') {
      const close = input.indexOf('*/', index + 2)
      const stop = close === -1 ? input.length : close + 2
      current += input.slice(index, stop)
      index = stop
      continue
    }

    // Strings and quoted identifiers: semicolons inside them are literal.
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      current += char
      index += 1
      while (index < input.length) {
        const next = input[index] ?? ''
        current += next
        index += 1
        if (next === '\\' && quote !== '`' && index < input.length) {
          current += input[index] ?? ''
          index += 1
          continue
        }
        if (next === quote) {
          // A doubled quote is an escaped quote, not the end of the literal.
          if (input[index] === quote) {
            current += input[index] ?? ''
            index += 1
            continue
          }
          break
        }
      }
      continue
    }

    if (char === ';') {
      flush()
      index += 1
      continue
    }

    current += char
    index += 1
  }

  flush()
  return statements
}
