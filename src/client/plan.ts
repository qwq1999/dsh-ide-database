import type { QueryResult } from '../shared/types'

/**
 * Plans that come back as one text column (MySQL 8 `EXPLAIN FORMAT=TREE`,
 * PostgreSQL text mode, …) read badly inside a grid cell: the tree indentation
 * collapses and long nodes get truncated. Detect that shape so the console can
 * show the plan as pre-formatted text instead.
 */
export function planTextOf(plan: QueryResult | null | undefined): string | null {
  if (plan === null || plan === undefined) return null
  if (plan.columns.length !== 1 || plan.rows.length === 0) return null
  const lines = plan.rows.map((row) => (row[0] === null || row[0] === undefined ? '' : String(row[0])))
  const text = lines.join('\n').trimEnd()
  if (text === '') return null
  const looksLikeTree = lines.length > 1 || /(^|\n)\s*->/u.test(text) || text.includes('\n')
  return looksLikeTree ? text : null
}
