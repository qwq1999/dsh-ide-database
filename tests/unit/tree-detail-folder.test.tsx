// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DetailFolder } from '../../src/client/views/tree-parts'

describe('detail folder', () => {
  afterEach(() => {
    cleanup()
  })

  it('reports the depth the object folder sits at', () => {
    render(
      <DetailFolder label="列" icon={null} count={3} depth={{}} level={5} open onToggle={() => undefined}>
        <span>id</span>
      </DetailFolder>,
    )
    expect(screen.getByRole('treeitem', { name: /列/ }).getAttribute('aria-level')).toBe('5')
  })

  it('leaves the level out when the caller has none', () => {
    render(
      <DetailFolder label="表" icon={null} count={1} depth={{}} open onToggle={() => undefined}>
        <span>orders</span>
      </DetailFolder>,
    )
    expect(screen.getByRole('treeitem', { name: /表/ }).getAttribute('aria-level')).toBeNull()
  })
})
