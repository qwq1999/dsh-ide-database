import type { ReactElement } from 'react'
import type { DbSettings, DriverStatus, EnvStatus } from '../../shared/types'
import { SettingsView } from '../views/SettingsView'
import { Modal } from '../ui'

export interface SettingsModalProps {
  open: boolean
  settings: DbSettings
  env: EnvStatus
  drivers: DriverStatus[]
  saving: boolean
  downloading: string
  onClose: () => void
  onSave: (settings: DbSettings) => void
  onRefresh: () => void
  onDownload: (driverId: string) => void
  onAddCustomDriver: () => void
  onEditCustomDriver: (driver: DriverStatus) => void
  onDeleteCustomDriver: (driver: DriverStatus) => void
}

export function SettingsModal(props: SettingsModalProps): ReactElement | null {
  if (!props.open) return null
  return (
    <Modal open title="数据库设置" width={720} onClose={props.onClose}>
      <SettingsView
        settings={props.settings}
        env={props.env}
        drivers={props.drivers}
        saving={props.saving}
        downloading={props.downloading}
        onSave={props.onSave}
        onRefresh={props.onRefresh}
        onDownload={props.onDownload}
        onAddCustomDriver={props.onAddCustomDriver}
        onEditCustomDriver={props.onEditCustomDriver}
        onDeleteCustomDriver={props.onDeleteCustomDriver}
      />
    </Modal>
  )
}
