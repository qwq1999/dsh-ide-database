/** State rules behind the console's transaction bar; the driver switches auto-commit. */
export type TxState = 'idle' | 'open'
export type TxAction = 'start' | 'commit' | 'rollback'

/** Start is only offered when idle; commit/rollback only while a transaction is open. */
export function txButtonDisabled(state: TxState, action: TxAction): boolean {
  return action === 'start' ? state === 'open' : state === 'idle'
}
