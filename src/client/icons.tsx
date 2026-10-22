import type { ReactElement, ReactNode } from 'react'

export interface IconProps {
  size?: number
  className?: string
}

function Svg({ size = 14, className, children }: IconProps & { children: ReactNode }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function DatabaseIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      <path d="M4 11.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </Svg>
  )
}

export function RedisIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4" width="17" height="6" rx="2" />
      <rect x="3.5" y="14" width="17" height="6" rx="2" />
      <path d="M7 7h.01M7 17h.01M10 7h6M10 17h6" />
    </Svg>
  )
}

export function PlusIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function RefreshIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      {/* The open arc is drawn around (12, 11), so its ink rides 1 unit high in
          the 24 box; shifting it to y = 12 puts the glyph on the optical centre
          beside an inline label. */}
      <g transform="translate(0 1)">
        <path d="M20 11a8 8 0 1 0-2.6 5.9" />
        <path d="M20 4v7h-7" />
      </g>
    </Svg>
  )
}

export function SettingsIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
    </Svg>
  )
}

export function PlayIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function StopIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function ChevronRightIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </Svg>
  )
}

export function ChevronDownIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M5.5 9 12 15.5 18.5 9" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function DownloadIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M12 3.5v11.5M7 10l5 5 5-5M4.5 20.5h15" />
    </Svg>
  )
}

export function EditIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </Svg>
  )
}

export function TrashIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
    </Svg>
  )
}

export function SearchIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </Svg>
  )
}

export function KeyIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="3.8" />
      <path d="M10.8 10.8 20 20M17 17l2-2M14 14l2-2" />
    </Svg>
  )
}

export function TerminalIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9.5 10.5 12 7 14.5M12.5 15h4.5" />
    </Svg>
  )
}

export function TableIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9.5h18M3 15h18M9.5 4v16" />
    </Svg>
  )
}

export function ViewIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  )
}

export function ColumnsIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M9 4v16M15 4v16" />
    </Svg>
  )
}

export function CopyIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </Svg>
  )
}

export function WarningIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M12 3.8 21 19.5H3L12 3.8Z" />
      <path d="M12 9v4.5M12 16.8h.01" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 7" />
    </Svg>
  )
}

export function InfoIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.8v5M12 7.8h.01" />
    </Svg>
  )
}

export function FolderIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l1.8 2H19.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
    </Svg>
  )
}

/** 例程：存储过程与函数共用。 */
export function FunctionIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M7 4h3.2C12 4 13 5 13 6.6V17c0 2 1 3 3 3h1.4" />
      <path d="M5.5 10.5h11" />
    </Svg>
  )
}

export function SequenceIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M4 7h9M4 12h13M4 17h7" />
      <circle cx="18.5" cy="7" r="1.6" />
      <circle cx="20.5" cy="17" r="1.6" />
    </Svg>
  )
}

export function TriggerIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M13 3 5 13.5h5L9.5 21 19 10h-5.5Z" />
    </Svg>
  )
}

export function ColumnIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M10 4v16M14 4v16" />
    </Svg>
  )
}

export function IndexIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.4-4.4" />
    </Svg>
  )
}

export function ClockIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.8" />
    </Svg>
  )
}

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }): ReactElement {
  return (
    <Svg {...props}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill={filled ? 'currentColor' : 'none'} />
    </Svg>
  )
}

export function FilterIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
    </Svg>
  )
}

export function ClearIcon(props: IconProps): ReactElement {
  return (
    <Svg {...props}>
      <path d="M6 6l1.6 12.2A2 2 0 0 0 9.6 20h4.8a2 2 0 0 0 2-1.8L18 6" />
      <path d="M4.5 6h15" />
      <path d="M9 6V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V6" />
    </Svg>
  )
}
