/**
 * Which branches the tree should open while a filter is active.
 *
 * Filtering only hides rows; the matching ones may still sit inside collapsed
 * branches. This helper decides which data sources and schemas have to be
 * expanded so that every name matching the filter becomes visible. Names are
 * compared case-insensitively and by substring, the same rule the tree uses
 * when it renders filtered rows.
 *
 * A filter may qualify the table with its schema (`shop.orders`): the part
 * before the first dot then narrows the schema and the rest matches object
 * names, which is how people usually type once they know where a table lives.
 */
export interface FilterTargets {
  connections: string[]
  schemas: string[]
}

export interface FilterQuery {
  /** Part before the first dot, lower case; empty for unqualified filters. */
  schema: string
  /** Object-name part, lower case. */
  name: string
}

/** Splits `库.表` into its two halves; a plain filter lands entirely in `name`. */
export function parseFilter(filter: string): FilterQuery {
  const needle = filter.trim().toLowerCase()
  const dot = needle.indexOf('.')
  if (dot < 0) return { schema: '', name: needle }
  return { schema: needle.slice(0, dot), name: needle.slice(dot + 1) }
}

/**
 * Whether an object survives the filter. Unqualified filters only look at the
 * object name, qualified ones require the schema to match and then look at the
 * rest (`shop.` alone matches every object of that schema).
 */
export function matchesFilteredObject(query: FilterQuery, schemaName: string, objectName: string): boolean {
  if (query.schema !== '' && !schemaName.toLowerCase().includes(query.schema)) return false
  if (query.name !== '') return objectName.toLowerCase().includes(query.name)
  return query.schema !== ''
}

interface ConnectionLike {
  id: string
  name: string
}

interface ObjectLike {
  name: string
}

export function filterTargets(
  filter: string,
  connections: ConnectionLike[],
  schemas: Record<string, Array<{ name: string }>>,
  objects: Record<string, ObjectLike[]>,
  expanded: Record<string, boolean>,
): FilterTargets {
  const query = parseFilter(filter)
  if (query.schema === '' && query.name === '') return { connections: [], schemas: [] }
  const schemaNeedle = query.schema === '' ? query.name : query.schema
  const hitSchema = (text: string): boolean => text.toLowerCase().includes(schemaNeedle)
  const hitName = (text: string): boolean => text.toLowerCase().includes(query.name)

  const targets: FilterTargets = { connections: [], schemas: [] }
  for (const connection of connections) {
    const schemaList = schemas[connection.id] ?? []
    const hits = schemaList.filter((schema) => hitSchema(schema.name)).map((schema) => schema.name)
    const objectHits = Object.keys(objects).filter((key) => {
      if (!key.startsWith(`${connection.id}:`)) return false
      const schemaName = key.slice(connection.id.length + 1)
      return (objects[key] ?? []).some((object) => matchesFilteredObject(query, schemaName, object.name))
    })
    const connectionHit = (query.name !== '' && hitName(connection.name)) || hits.length > 0 || objectHits.length > 0
    if (!connectionHit) continue
    if (expanded[connection.id] !== true) targets.connections.push(connection.id)

    const wanted = new Set<string>(hits)
    for (const key of objectHits) wanted.add(key.slice(connection.id.length + 1))
    for (const schema of wanted) {
      if (expanded[`${connection.id}:${schema}`] === true) continue
      targets.schemas.push(`${connection.id}:${schema}`)
    }
  }
  return targets
}
