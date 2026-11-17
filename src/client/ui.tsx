import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { IconWarningOutlineRegular, Toast as PrimitiveToast } from '@deepseek-ai/dsh-client-ui-primitives'
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, CloseIcon, InfoIcon, WarningIcon } from './icons'
import { usePopoverDismiss } from './popover'

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

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className = '', ...rest },
  ref,
) {
  return <input {...rest} ref={ref} className={`dshdb-input ${className}`.trim()} />
})

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

export interface SearchSelectOption {
  value: string
  label: string
}

export interface SearchSelectProps {
  label: string
  title?: string
  value: string
  options: SearchSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * A select the user can type into. The trigger keeps the look (and the
 * accessible name) of the panel's native selects, while the menu adds a filter
 * box - something a native `<select>` cannot offer.
 */
export function SearchSelect({
  label,
  title,
  value,
  options,
  onChange,
  placeholder = '',
  className = '',
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const anchor = useRef<HTMLSpanElement | null>(null)
  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])
  usePopoverDismiss(open, close, anchor)
  const current = options.find((option) => option.value === value)
  const needle = query.trim().toLowerCase()
  const shown =
    needle === ''
      ? options
      : options.filter(
          (option) =>
            option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle),
        )
  const pick = (next: string): void => {
    close()
    onChange(next)
  }
  return (
    <span className="dshdb-search-select" ref={anchor}>
      <button
        type="button"
        className={`dshdb-select dshdb-select-inline dshdb-search-trigger ${className}`.trim()}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title}
        onClick={() => {
          setQuery('')
          setActive(0)
          setOpen((value) => !value)
        }}
      >
        <span className="dshdb-search-value">{current?.label ?? placeholder}</span>
        <ChevronDownIcon size={12} />
      </button>
      {open ? (
        <div className="dshdb-search-pop">
          <input
            className="dshdb-input dshdb-search-input"
            type="search"
            value={query}
            placeholder={`查找${label}…`}
            aria-label={`查找${label}`}
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActive((index) => Math.min(index + 1, shown.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActive((index) => Math.max(index - 1, 0))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                const option = shown[active]
                if (option !== undefined) pick(option.value)
              } else if (event.key === 'Escape') {
                event.preventDefault()
                close()
              }
            }}
          />
          <div className="dshdb-search-list" role="listbox" aria-label={label}>
            {shown.length === 0 ? (
              <div className="dshdb-picker-empty">没有匹配项</div>
            ) : (
              shown.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`dshdb-search-option${index === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(option.value)}
                >
                  <span className="dshdb-search-option-label">{option.label}</span>
                  {option.value === value ? <CheckIcon size={12} /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </span>
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
  collapsible = false,
  defaultOpen = true,
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  scroll?: boolean
  /** Header title becomes a toggle; useful when the panel is mostly read rarely. */
  collapsible?: boolean
  /** Only meaningful with `collapsible`. */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const expanded = !collapsible || open
  return (
    <section className={`dshdb-panel ${className}`.trim()}>
      {title ? (
        <header className="dshdb-panel-head">
          {collapsible ? (
            <button
              type="button"
              className="dshdb-panel-toggle"
              aria-expanded={expanded}
              onClick={() => setOpen((previous) => !previous)}
            >
              {expanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
              <span>{title}</span>
            </button>
          ) : (
            <span className="dshdb-panel-head-title">{title}</span>
          )}
          {actions}
        </header>
      ) : null}
      <div
        className={`dshdb-panel-body ${bodyClassName}`.trim()}
        hidden={!expanded}
        style={{
          ...(scroll ? { overflow: 'auto' } : null),
          // The class sets `display: flex`, which would beat the `hidden` attribute.
          ...(expanded ? null : { display: 'none' }),
        }}
      >
        {children}
      </div>
    </section>
  )
}

export function Tag({
  tone,
  title,
  role,
  children,
}: {
  tone?: 'business' | 'success' | 'warn' | 'error'
  title?: string
  /** Pass "status" so progress like an export count is announced politely. */
  role?: string
  children: ReactNode
}) {
  return (
    <span className="dshdb-tag" data-tone={tone} title={title} role={role}>
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

/**
 * Shared inline status for anything that is waiting on the host or the server.
 *
 * A label renders next to the spinner and marks the element as a status region;
 * `bare` keeps the same layout without the pill chrome, for rows and toolbars
 * where a bordered box would change the height. Without a label the element is
 * purely decorative, so it does not compete with the real status regions.
 */
export function Loading({
  label,
  size,
  bare = false,
  className,
}: {
  label?: string
  size?: number
  bare?: boolean
  className?: string
}) {
  return (
    <span
      className={`dshdb-loading${bare ? ' dshdb-loading-bare' : ''}${className ? ` ${className}` : ''}`}
      role={label === undefined ? undefined : 'status'}
    >
      <Spinner size={size} />
      {label === undefined ? null : <span className="dshdb-loading-label">{label}</span>}
    </span>
  )
}

export function Banner({
  tone = 'info',
  children,
  actions,
  onClose,
}: {
  tone?: BannerTone
  children: ReactNode
  /** Extra controls pinned to the right, before the close button. */
  actions?: ReactNode
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
      {actions ? <span className="dshdb-banner-actions">{actions}</span> : null}
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

/** Modals opened from another modal must sit above it; the stack order decides. */
const modalStack: symbol[] = []

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
  // Nested dialogs (e.g. "新增自定义驱动" opened from the settings dialog) share
  // the same overlay z-index, so the later one has to be lifted above its host.
  const tokenRef = useRef<symbol | null>(null)
  const [layer, setLayer] = useState(0)
  useEffect(() => {
    if (!open) return
    const token = Symbol('dshdb-modal')
    tokenRef.current = token
    modalStack.push(token)
    setLayer(modalStack.length - 1)
    return () => {
      tokenRef.current = null
      const index = modalStack.indexOf(token)
      if (index !== -1) modalStack.splice(index, 1)
      setLayer(0)
    }
  }, [open])
  const isTopmost = (): boolean =>
    tokenRef.current !== null && modalStack[modalStack.length - 1] === tokenRef.current
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
      // Only the dialog on top owns Escape and the focus trap; the host dialog
      // underneath must stay open while a nested one is up.
      if (!isTopmost()) return
      if (event.key === 'Escape') {
        // A focused control that owns Escape (a shortcut-recording field) handles
        // it itself. This runs in the capture phase, ahead of React's bubble
        // handlers, so closing here would swallow that control's cancel action.
        if (event.target instanceof Element && event.target.closest('[data-owns-escape]')) return
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
    // The page behind the overlay must not scroll while the dialog is up.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const start = box?.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]):not([aria-label="关闭"])',
    )
    if (start) start.focus()
    else box?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (previous !== null && previous.isConnected) previous.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="dshdb-modal-overlay"
      style={{ zIndex: 1200 + layer * 10 }}
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
 * Builds the next toast state with a strictly increasing sequence. Reading the
 * clock instead would collide for two notifications in the same millisecond,
 * and the primitive would then skip restarting its fade.
 */
export function nextToast(
  previous: ToastState | null,
  text: string,
  tone: ToastState['tone'] = 'info',
): ToastState {
  return { text, tone, seq: (previous?.seq ?? 0) + 1 }
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
