/** Statements and state rules behind the console's transaction bar. */
export type TxState = 'idle' | 'open'
export type TxAction = 'start' | 'commit' | 'rollback'

/** MySQL and the Oracle family both accept these spellings for the common flow. */
export function txStatement(action: TxAction): string {
  switch (action) {
    case 'start':
      return 'BEGIN'
    case 'commit':
      return 'COMMIT'
    default:
      return 'ROLLBACK'
  }
}

/** Start is only offered when idle; commit/rollback only while a transaction is open. */
export function txButtonDisabled(state: TxState, action: TxAction): boolean {
  return action === 'start' ? state === 'open' : state === 'idle'
}
