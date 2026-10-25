// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ObjectRow } from '../../src/client/views/tree-parts'

import type { SchemaObject } from '../../src/shared/types'

function row(object: SchemaObject, onOpen: (connectionId: string, schema: string, item: SchemaObject) => void) {
  return (
    <ObjectRow
      connectionId="c1"
      schema="shop"
      object={object}
      selected={false}
      expanded={false}
      description={undefined}
      loading={false}
      onSelect={() => undefined}
      onOpen={onOpen}
      onToggleKey={() => undefined}
      query=""
    />
  )
}

describe('ObjectRow keyboard activation', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens a table tab when Enter is pressed on a table', () => {
    const onOpen = vi.fn()
    render(row({ name: 'orders', kind: 'table' }, onOpen))
    fireEvent.keyDown(screen.getByRole('treeitem'), { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledWith('c1', 'shop', { name: 'orders', kind: 'table' })
  })

  it('leaves other keys and other objects alone', () => {
    const onOpen = vi.fn()
    const { unmount } = render(row({ name: 'orders', kind: 'table' }, onOpen))
    fireEvent.keyDown(screen.getByRole('treeitem'), { key: ' ' })
    expect(onOpen).not.toHaveBeenCalled()
    unmount()

    render(row({ name: 'calc', kind: 'procedure' }, onOpen))
    fireEvent.keyDown(screen.getByRole('treeitem'), { key: 'Enter' })
    expect(onOpen).not.toHaveBeenCalled()
  })
})
