import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { IconWarningOutlineRegular, Toast as PrimitiveToast } from '@deepseek-ai/dsh-client-ui-primitives'
import { CheckIcon, CloseIcon, InfoIcon, WarningIcon } from './icons'

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
export type BannerTone = 'info' | 'success' | 'warn' | 'error'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  icon?: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const iconOnly = children === undefined || children === null || children === false
  return (
    <button
      type="button"
      {...rest}
      className={`dshdb-btn ${className}`.trim()}
      data-variant={variant}
      data-size={size}
      data-density={iconOnly ? 'icon' : undefined}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <Spinner /> : icon}
      {iconOnly ? null : <span>{children}</span>}
    </button>
  )
}

export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'children'> {
  label: string
  icon: ReactNode
}

export function IconButton({ label, icon, ...rest }: IconButtonProps) {
  return <Button {...rest} icon={icon} aria-label={label} title={rest.title ?? label} />
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function TextInput({ className = '', ...rest }: TextInputProps) {
  return <input {...rest} className={`dshdb-input ${className}`.trim()} />
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function TextArea({ className = '', ...rest }: TextAreaProps) {
  return <textarea {...rest} className={`dshdb-textarea ${className}`.trim()} />
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[]
  onValueChange?: (value: string) => void
  inline?: boolean
}

export function Select({ options, onValueChange, inline = false, className = '', ...rest }: SelectProps) {
  return (
    <select
      {...rest}
      className={`dshdb-select ${inline ? 'dshdb-select-inline' : ''} ${className}`.trim()}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export interface FieldProps {
  label?: string
  required?: boolean
  hint?: ReactNode
  error?: string | undefined
  children: ReactNode
  span?: boolean
}

export function Field({ label, required, hint, error, children, span }: FieldProps) {
  return (
    <label className={`dshdb-field ${span ? 'dshdb-span-2' : ''}`.trim()}>
      {label ? (
        <span className="dshdb-field-label">
          {label}
          {required ? <em>*</em> : null}
        </span>
      ) : null}
      {children}
      {error ? <span className="dshdb-field-error">{error}</span> : hint ? <span className="dshdb-field-hint">{hint}</span> : null}
    </label>
  )
}

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <span className="dshdb-inline">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        className="dshdb-switch"
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
      {label ? <span className="dshdb-muted">{label}</span> : null}
    </span>
  )
}

export function Panel({
  title,
  actions,
  children,
  className = '',
  bodyClassName = '',
  scroll = false,
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  scroll?: boolean
}) {
  return (
    <section className={`dshdb-panel ${className}`.trim()}>
      {title ? (
        <header className="dshdb-panel-head">
          <span className="dshdb-panel-head-title">{title}</span>
          {actions}
        </header>
      ) : null}
      <div
        className={`dshdb-panel-body ${bodyClassName}`.trim()}
        style={scroll ? { overflow: 'auto' } : undefined}
      >
        {children}
      </div>
    </section>
  )
}

export function Tag({ tone, children }: { tone?: 'business' | 'success' | 'warn' | 'error'; children: ReactNode }) {
  return (
    <span className="dshdb-tag" data-tone={tone}>
      {children}
    </span>
  )
}

export function StateDot({ tone }: { tone?: 'success' | 'error' | 'warn' | 'business' | 'idle' }) {
  return <span className="dshdb-dot" data-tone={tone ?? 'idle'} />
}

export function Spinner({ size }: { size?: number }) {
  return <span className="dshdb-spinner" style={size ? { width: size, height: size } : undefined} aria-hidden="true" />
}

export function Banner({
  tone = 'info',
  children,
  onClose,
}: {
  tone?: BannerTone
  children: ReactNode
  onClose?: () => void
}) {
  return (
    <div className="dshdb-banner" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="dshdb-banner-icon">
        {tone === 'error' || tone === 'warn' ? (
          <WarningIcon size={13} />
        ) : tone === 'success' ? (
          <CheckIcon size={13} />
        ) : (
          <InfoIcon size={13} />
        )}
      </span>
      <div className="dshdb-banner-text">{children}</div>
      {onClose ? <IconButton label="关闭" size="sm" variant="ghost" icon={<CloseIcon size={12} />} onClick={onClose} /> : null}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="dshdb-empty">
      {icon ? <div className="dshdb-empty-icon">{icon}</div> : null}
      <div className="dshdb-empty-title">{title}</div>
      {description ? <div className="dshdb-empty-text">{description}</div> : null}
      {actions ? <div className="dshdb-empty-actions">{actions}</div> : null}
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width,
}: {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  // A caller usually passes an inline arrow, so keeping the latest handler in a
  // ref stops the effect from re-focusing the dialog on every parent render.
  const latestClose = useRef(onClose)
  useEffect(() => {
    latestClose.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!open) return
    const box = boxRef.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = (): HTMLElement[] => {
      if (box === null) return []
      return Array.from(
        box.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      )
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        latestClose.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const first = items[0]!
      const last = items[items.length - 1]!
      const active = document.activeElement
      if (event.shiftKey && (active === first || !box?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !box?.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    const start = box?.querySelector<HTMLElement>(
      'input, textarea, select, button:not([aria-label="关闭"])',
    )
    if (start) start.focus()
    else box?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (previous !== null && previous.isConnected) previous.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="dshdb-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={boxRef}
        className="dshdb-modal"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        style={width ? { width } : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dshdb-modal-head">
          <div className="dshdb-modal-title">{title}</div>
          <IconButton
            label="关闭"
            size="sm"
            variant="ghost"
            icon={<CloseIcon size={13} />}
            onClick={onClose}
          />
        </header>
        <div className="dshdb-modal-body">{children}</div>
        {footer ? <footer className="dshdb-modal-foot">{footer}</footer> : null}
      </div>
    </div>
  )
}

export interface ConfirmRequest {
  title: string
  message: string
  detail?: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({
  request,
  busy,
  onConfirm,
  onCancel,
}: {
  request: ConfirmRequest | null
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      open={request !== null}
      title={request?.title ?? ''}
      onClose={onCancel}
      footer={
        <>
          <div className="dshdb-modal-foot-spacer" />
          <Button onClick={onCancel} disabled={busy}>
            取消
          </Button>
          <Button
            variant={request?.danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={busy}
          >
            {request?.confirmLabel ?? '确定'}
          </Button>
        </>
      }
    >
      <div className="dshdb-modal-message">
        {request?.message}
        {request?.detail ? <span className="dshdb-mono">{request.detail}</span> : null}
      </div>
    </Modal>
  )
}

export interface ToastState {
  text: string
  tone?: 'info' | 'success' | 'error'
  seq: number
}

/**
 * Transient notice, rendered by the Harness' own toast primitive so a plugin
 * announcement matches the product chrome exactly: fixed top-center, dark
 * surface in both themes, hold then fade.
 */
export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  if (toast === null) return null
  return (
    <PrimitiveToast
      key={toast.seq}
      text={toast.text}
      tone={toast.tone === 'success' ? 'success' : undefined}
      icon={toast.tone === 'error' ? <IconWarningOutlineRegular /> : undefined}
      onDone={onDismiss}
    />
  )
}
