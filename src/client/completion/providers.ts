/**
 * Turn raw catalog metadata into popup rows.
 *
 * The engine composes these helpers; keeping the mapping here makes it obvious
 * which `CompletionKind` each metadata source produces, and gives the right
 * hand-side hint (column type, view marker, schema of a table, ...).
 */
import type { Completion, CompletionRelation } from './types'

/** A table or view returned by the catalog. */
export interface CatalogTable {
  name: string
  kind: 'table' | 'view'
}

/** A column returned by the catalog. */
export interface CatalogColumn {
  name: string
  typeName?: string
}

function tableDetail(table: CatalogTable, schema?: string): string | undefined {
  if (table.kind === 'view') return '视图'
  return schema === undefined || schema === '' ? undefined : schema
}

/** Tables and views of one schema, in catalog order. */
export function tableCandidates(
  tables: readonly CatalogTable[],
  schema?: string,
): Completion[] {
  return tables.map((table) => {
    const item: Completion = { name: table.name, kind: 'table' }
    const detail = tableDetail(table, schema)
    if (detail !== undefined) item.detail = detail
    return item
  })
}

/** Schema names, in catalog order. */
export function schemaCandidates(schemas: readonly string[]): Completion[] {
  return schemas
    .filter((name) => name !== '')
    .map((name) => ({ name, kind: 'schema' as const }))
}

/**
 * Columns of the relations the caret statement references. When the same column
 * name appears in several relations it is only listed once.
 */
export function columnCandidates(columns: readonly CatalogColumn[]): Completion[] {
  const seen = new Set<string>()
  const items: Completion[] = []
  for (const column of columns) {
    if (column.name === '') continue
    const key = column.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const item: Completion = { name: column.name, kind: 'column' }
    if (column.typeName !== undefined) item.detail = column.typeName
    items.push(item)
  }
  return items
}

/** The `*` shorthand, offered after a relation has been established. */
export function starCandidate(): Completion {
  return { name: '*', kind: 'column', detail: '所有列' }
}

/** CTE names the caret statement can use in a FROM/JOIN clause. */
export function cteCandidates(names: readonly string[]): Completion[] {
  const seen = new Set<string>()
  const items: Completion[] = []
  for (const name of names) {
    if (name === '') continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ name, kind: 'table', detail: 'CTE' })
  }
  return items
}

/**
 * Aliases declared by the statement. A derived table (subquery) has an alias but
 * no catalog relation, so it is shown with a `子查询` hint.
 */
export function aliasCandidates(relations: readonly CompletionRelation[]): Completion[] {
  const seen = new Set<string>()
  const items: Completion[] = []
  for (const relation of relations) {
    if (relation.alias === undefined || relation.alias === '') continue
    const key = relation.alias.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const detail =
      relation.table === ''
        ? '子查询'
        : relation.schema === undefined || relation.schema === ''
          ? relation.table
          : `${relation.schema}.${relation.table}`
    items.push({ name: relation.alias, kind: 'alias', detail })
  }
  return items
}
