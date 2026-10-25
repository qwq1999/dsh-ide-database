/**
 * Read-only dialog for one cell: the whole value in a monospace block, with a
 * copy button. The grid keeps cells to a single line, so long JSON and text
 * blobs are only readable here.
 */
import { useEffect, useState, type ReactElement } from 'react'
import type { CellValueView } from './cellvalue'
import { copyText } from './colmenu'
import { Button, Modal } from './ui'

export interface CellValueModalProps {
  /** The cell to show; null keeps the dialog closed. */
  view: CellValueView | null
  onClose: () => void
}

export function CellValueModal({ view, onClose }: CellValueModalProps): ReactElement | null {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    setCopied(false)
  }, [view])
  if (view === null) return null

  const copy = async (): Promise<void> => {
    if (await copyText(view.text)) setCopied(true)
  }

  return (
    <Modal
      open
      title={`${view.column} · 完整值`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <div className="dshdb-modal-foot-spacer" />
          <Button size="sm" onClick={() => void copy()}>
            {copied ? '已复制' : '复制'}
          </Button>
          <Button size="sm" variant="primary" onClick={onClose}>
            关闭
          </Button>
        </>
      }
    >
      <pre className="dshdb-cellvalue" aria-label="单元格完整值">
        {view.text}
      </pre>
    </Modal>
  )
}
