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
  kind?: string
}

export interface TreeMatchCounts {
  /** Connections worth showing: schema-label hits, or one when objects match. */
  connections: number
  /** Objects that survive the filter across every loaded schema list. */
  objects: number
}

/**
 * Everything the filtered tree needs, computed in one pass over the loaded
 * object lists. `schemaHits` uses the schema half of the query (the whole
 * term for unqualified filters), matching `filterTargets`; `objectsBySchema`
 * keeps the surviving objects in list order so the folder buckets can be
 * rebuilt without scanning `objects` again.
 */
export interface TreeMatches<T extends ObjectLike = ObjectLike> {
  query: FilterQuery
  /** `${connectionId}|${schema}.${objectName}` for every match. */
  objectHits: Set<string>
  /** `${connectionId}:${schema}` for every schema whose name matches. */
  schemaHits: Set<string>
  connectionHits: Set<string>
  objectsBySchema: Record<string, T[]>
  counts: TreeMatchCounts
}

/**
 * Index the matches of one filter term. This replaces the separate summary
 * pass, the branch-opening pass and the per-schema bucket filtering: each
 * object name is lowered and compared once, and the result feeds the tree,
 * the counters and the derived expansion.
 */
export function matchTree<T extends ObjectLike>(
  filter: string | FilterQuery,
  connections: ConnectionLike[],
  schemas: Record<string, Array<{ name: string }>>,
  objects: Record<string, T[]>,
): TreeMatches<T> {
  const query = typeof filter === 'string' ? parseFilter(filter) : filter
  const matches: TreeMatches<T> = {
    query,
    objectHits: new Set(),
    schemaHits: new Set(),
    connectionHits: new Set(),
    objectsBySchema: {},
    counts: { connections: 0, objects: 0 },
  }
  if (query.schema === '' && query.name === '') return matches

  const schemaNeedle = query.schema === '' ? query.name : query.schema
  const schemaHitConnections = new Set<string>()
  const objectHitConnections = new Set<string>()
  const connectionIds = new Set(connections.map((connection) => connection.id))

  for (const connection of connections) {
    for (const schema of schemas[connection.id] ?? []) {
      if (!schema.name.toLowerCase().includes(schemaNeedle)) continue
      matches.schemaHits.add(`${connection.id}:${schema.name}`)
      schemaHitConnections.add(connection.id)
    }
    // `库.` (trailing dot) counts the data source once, even when several of
    // its schemas match, mirroring `matchesFilteredObject(query, schema, '')`.
    if (query.schema !== '' && query.name === '' && schemaHitConnections.has(connection.id)) {
      matches.counts.connections += 1
    }
  }

  for (const [key, list] of Object.entries(objects)) {
    const separator = key.indexOf(':')
    if (separator <= 0) continue
    const connectionId = key.slice(0, separator)
    if (!connectionIds.has(connectionId)) continue
    const schemaName = key.slice(separator + 1)
    if (query.schema !== '' && !schemaName.toLowerCase().includes(query.schema)) continue
    const hits: T[] = []
    for (const object of list) {
      if (query.name !== '' ? object.name.toLowerCase().includes(query.name) : query.schema !== '') {
        hits.push(object)
      }
    }
    if (hits.length === 0) continue
    matches.objectsBySchema[key] = hits
    objectHitConnections.add(connectionId)
    matches.counts.objects += hits.length
    for (const object of hits) {
      matches.objectHits.add(`${connectionId}|${schemaName}.${object.name}`)
    }
  }

  for (const connection of connections) {
    const nameHit = query.name !== '' && connection.name.toLowerCase().includes(query.name)
    if (!nameHit && !schemaHitConnections.has(connection.id) && !objectHitConnections.has(connection.id)) continue
    matches.connectionHits.add(connection.id)
  }
  matches.counts.connections = Math.max(matches.counts.connections, matches.counts.objects > 0 ? 1 : 0)
  return matches
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
