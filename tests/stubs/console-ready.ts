import { waitFor } from '@testing-library/react'

/**
 * The console renders its toolbar before the first data source is adopted from
 * the (asynchronously loaded) config, and adopting one clears the editor. Tests
 * that type or click therefore wait for the schema request, which only fires
 * once a data source is actually selected.
 */
export async function waitForConsoleSource(mocks: { schemas: { mock: { calls: unknown[] } } }): Promise<void> {
  await waitFor(() => {
    if (mocks.schemas.mock.calls.length === 0) throw new Error('console has not selected a data source yet')
  })
}
