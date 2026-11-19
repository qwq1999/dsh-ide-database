// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { CellValueModal } from '../../src/client/CellValueModal'
import { TRUNCATED_SUFFIX } from '../../src/client/cellvalue'

describe('CellValueModal truncated cell first frame', () => {
  it('shows a loading notice, not a spurious read failure, before the read starts', () => {
    // renderToString never runs effects, so this observes the exact first
    // frame a browser paints before the cellText effect flips loading on.
    const view = {
      column: 'body',
      text: 'partial' + TRUNCATED_SUFFIX,
      pretty: false,
      truncated: 'partial' + TRUNCATED_SUFFIX,
    }
    const html = renderToString(<CellValueModal view={view} onClose={() => undefined} />)
    expect(html).toContain('正在读取完整值')
    expect(html).not.toContain('读取失败')
    expect(html).not.toContain('未知错误')
  })
})
