import type { ReactElement } from 'react'
import type { ClientTrashedConnection } from '../../shared/types'
import { dialectLabel, formatDateTime } from '../format'
import { ClearIcon, RecycleIcon, TrashIcon } from '../icons'
import { Button, EmptyState, Modal, Tag } from '../ui'

/** Which row action is in flight; one request at a time. */
export interface TrashBusy {
  id: string
  action: 'restore' | 'purge'
}

export interface TrashModalProps {
  open: boolean
  /** Deleted connections, newest first. */
  items: ClientTrashedConnection[]
  busy: TrashBusy | null
  emptying: boolean
  onClose: () => void
  onRestore: (item: ClientTrashedConnection) => void
  onPurge: (item: ClientTrashedConnection) => void
  onEmpty: () => void
}

function addressOf(item: ClientTrashedConnection): string {
  const database = item.database === '' ? '' : ` / ${item.database}`
  const redisDb = item.redisDb > 0 ? ` / db${String(item.redisDb)}` : ''
  return `${item.host}:${String(item.port)}${database}${redisDb}`
}

export function TrashModal(props: TrashModalProps): ReactElement | null {
  if (!props.open) return null
  const busy = props.busy !== null || props.emptying
  return (
    <Modal
      open
      title="回收站"
      width={640}
      onClose={props.onClose}
      footer={
        <>
          <Button
            size="sm"
            variant="danger"
            icon={<ClearIcon />}
            disabled={props.items.length === 0 || busy}
            loading={props.emptying}
            onClick={props.onEmpty}
          >
            清空回收站
          </Button>
          <span className="dshdb-modal-foot-spacer" />
          <Button size="sm" variant="primary" onClick={props.onClose}>
            关闭
          </Button>
        </>
      }
    >
      {props.items.length === 0 ? (
        <EmptyState
          icon={<RecycleIcon size={20} />}
          title="回收站是空的"
          description="删除的数据源会先放到这里，可随时恢复。"
        />
      ) : (
        <>
          <p className="dshdb-modal-message">彻底删除会同时移除保存的密码与结构缓存，且无法撤销。</p>
          <div className="dshdb-list">
            {props.items.map((item) => {
              const rowBusy = props.busy?.id === item.id
              return (
                <div key={item.id} className="dshdb-driver-row">
                  <div className="dshdb-driver-main">
                    <div className="dshdb-driver-name">
                      {item.name}
                      <Tag>{dialectLabel(item.dialect)}</Tag>
                    </div>
                    <div className="dshdb-driver-sub">
                      {addressOf(item)} · 删除于 {formatDateTime(item.deletedAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    loading={rowBusy && props.busy?.action === 'restore'}
                    disabled={busy && !(rowBusy && props.busy?.action === 'restore')}
                    onClick={() => props.onRestore(item)}
                  >
                    恢复
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<TrashIcon />}
                    loading={rowBusy && props.busy?.action === 'purge'}
                    disabled={busy && !(rowBusy && props.busy?.action === 'purge')}
                    onClick={() => props.onPurge(item)}
                  >
                    彻底删除
                  </Button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Modal>
  )
}
