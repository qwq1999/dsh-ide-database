/** Pick what "run" should execute: the selection when there is one, else everything. */
export function pickStatement(value: string, start: number, end: number): { statement: string; selected: boolean } {
  if (start !== end) {
    const slice = value.slice(Math.min(start, end), Math.max(start, end))
    if (slice.trim() !== '') return { statement: slice, selected: true }
  }
  return { statement: value, selected: false }
}
