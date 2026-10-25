/**
 * Read-only dialog for one DDL statement (usually CREATE TABLE), with a copy
 * button. The table tab opens it so the structure is one click away without
 * going back to the tree.
 */
import { useEffect, useState, type ReactElement } from 'react'
import { copyText } from './colmenu'
import { Button, Modal } from './ui'

export interface DdlModalProps {
  title: string
  /** Statement to show; null keeps the dialog closed. */
  text: string | null
  /** Why the server could not provide the statement, when it said so. */
  warnings?: string[]
  onClose: () => void
}

export function DdlModal({ title, text, warnings = [], onClose }: DdlModalProps): ReactElement | null {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    setCopied(false)
  }, [text])
  if (text === null) return null

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      width={720}
      footer={
        <>
          <div className="dshdb-modal-foot-spacer" />
          <Button
            size="sm"
            onClick={() => {
              void copyText(text).then((ok) => setCopied(ok))
            }}
          >
            {copied ? '已复制' : '复制'}
          </Button>
          <Button size="sm" variant="primary" onClick={onClose}>
            关闭
          </Button>
        </>
      }
    >
      {warnings.length > 0 ? (
        <p className="dshdb-muted" style={{ margin: '0 0 8px' }}>
          {warnings.join('；')}
        </p>
      ) : null}
      <pre className="dshdb-cellvalue" aria-label="建表语句">
        {text}
      </pre>
    </Modal>
  )
}
