import { screen, waitFor } from '@testing-library/react'

/**
 * The console renders its toolbar before the first data source is adopted from
 * the (asynchronously loaded) config, and adopting one clears the editor. Tests
 * that type or click therefore wait for the schema request, which only fires
 * once a data source is actually selected.
 *
 * Wait for the editor too: the schema call is scheduled before React commits
 * the selected source, so under parallel load `getByLabelText` on the Redis/SQL
 * controls could still hit the empty state.
 */
export async function waitForConsoleSource(mocks: { schemas: { mock: { calls: unknown[] } } }): Promise<void> {
  await waitFor(() => {
    if (mocks.schemas.mock.calls.length === 0) throw new Error('console has not selected a data source yet')
    const editor = screen.queryByLabelText('SQL 编辑器') ?? screen.queryByLabelText('Redis 命令')
    if (editor === null) throw new Error('console editor is not ready yet')
  })
}
