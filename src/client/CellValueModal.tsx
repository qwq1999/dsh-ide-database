/**
 * Read-only dialog for one cell: the whole value in a monospace block, with a
 * copy button. The grid keeps cells to a single line, so long JSON and text
 * blobs are only readable here.
 *
 * A result only carries the first 16 KB of a cell. When this one was cut, the
 * dialog asks the bridge for the rest instead of re-running the statement, and
 * says so when that copy is gone.
 */
import { useEffect, useState, type ReactElement } from 'react'
import { api } from './api'
import { cellValueView, CELL_TEXT_LIMIT, type CellValueView } from './cellvalue'
import { copyText } from './colmenu'
import { useCopyFlash } from './copyflash'
import { Button, Modal } from './ui'

export interface CellValueModalProps {
  /** The cell to show; null keeps the dialog closed. */
  view: CellValueView | null
  onClose: () => void
}

export function CellValueModal({ view, onClose }: CellValueModalProps): ReactElement | null {
  const flash = useCopyFlash()
  const column = view?.column ?? ''
  const truncated = view?.truncated ?? null
  const [full, setFull] = useState<CellValueView | null>(null)
  const [loading, setLoading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    flash.reset()
    setFull(null)
    setFailure(null)
    setMissing(false)
  }, [flash.reset, column, truncated])

  useEffect(() => {
    if (truncated === null) return undefined
    let live = true
    setLoading(true)
    api.cellText(column, truncated).then(
      (text) => {
        if (!live) return
        setLoading(false)
        if (text === null) setMissing(true)
        else setFull(cellValueView(column, text))
      },
      (error: unknown) => {
        if (!live) return
        setLoading(false)
        setFailure(error instanceof Error ? error.message : String(error))
      },
    )
    return () => {
      live = false
    }
  }, [column, truncated, attempt])

  if (view === null) return null

  const shown = full ?? view
  const copy = async (): Promise<void> => {
    flash.flash(await copyText(shown.text))
  }
  const retry = (): void => {
    setFailure(null)
    setMissing(false)
    setAttempt((current) => current + 1)
  }
  const notice =
    truncated === null || full !== null
      ? null
      : failure !== null
        ? `完整值读取失败：${failure}`
        : missing
          ? '完整值已失效（数据库桥重启或缓存淘汰），重新执行查询后可以再次打开。'
          : // Not started yet (effect has not run) or in progress: never flash
            // an error before the read has actually failed.
            `结果只取回了前 ${String(CELL_TEXT_LIMIT / 1024)} KB，正在读取完整值…`

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
            {flash.copied ? '已复制' : '复制'}
          </Button>
          <Button size="sm" variant="primary" onClick={onClose}>
            关闭
          </Button>
        </>
      }
    >
      {notice !== null ? (
        <div className="dshdb-cellvalue-note" role="status">
          <span>{notice}</span>
          {loading || missing ? null : (
            <Button size="sm" onClick={retry}>
              重试
            </Button>
          )}
        </div>
      ) : null}
      <pre className="dshdb-cellvalue" aria-label="单元格完整值">
        {shown.text}
      </pre>
    </Modal>
  )
}
