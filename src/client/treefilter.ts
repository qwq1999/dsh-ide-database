/**
 * Which branches the tree should open while a filter is active.
 *
 * Filtering only hides rows; the matching ones may still sit inside collapsed
 * branches. This helper decides which data sources and schemas have to be
 * expanded so that every name matching the filter becomes visible. Names are
 * compared case-insensitively and by substring, the same rule the tree uses
 * when it renders filtered rows.
 */
export interface FilterTargets {
  connections: string[]
  schemas: string[]
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
  const needle = filter.trim().toLowerCase()
  if (needle === '') return { connections: [], schemas: [] }
  const hit = (text: string): boolean => text.toLowerCase().includes(needle)

  const targets: FilterTargets = { connections: [], schemas: [] }
  for (const connection of connections) {
    const schemaList = schemas[connection.id] ?? []
    const hits = schemaList.filter((schema) => hit(schema.name)).map((schema) => schema.name)
    const objectHits = Object.keys(objects).filter((key) => {
      if (!key.startsWith(`${connection.id}:`)) return false
      return (objects[key] ?? []).some((object) => hit(object.name))
    })
    const connectionHit = hit(connection.name) || hits.length > 0 || objectHits.length > 0
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
