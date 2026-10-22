/**
 * 测试替身：真实包由 DSH 运行时提供，单测里只需要同名导出。
 */
import type { ReactElement, ReactNode } from 'react'

export function IconWarningOutlineRegular(props: { className?: string }): ReactElement {
  return <span data-testid="icon-warning-outline" className={props.className} />
}

export function Toast(props: {
  text: ReactNode
  tone?: string
  icon?: ReactNode
  onDone?: () => void
}): ReactElement {
  return (
    <div data-testid="primitive-toast" data-tone={props.tone ?? ''}>
      {props.icon}
      {props.text}
    </div>
  )
}
