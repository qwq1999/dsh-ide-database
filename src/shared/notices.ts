import type { UpdateNotice } from './types.js'

/**
 * What the panel announces above the data-source tree. Entries are permanent:
 * the user dismisses one and its `id` is remembered in the config file, so a
 * later release can add another notice without the closed ones coming back.
 */
export const UPDATE_NOTICES: UpdateNotice[] = [
  {
    id: 'table-comments',
    level: 'success',
    title: '数据源树现在会显示表注释',
    body:
      '表名后面带着表注释，达梦、Oracle 与 MySQL 都能读到；行宽不够时注释随表名一起截断。' +
      '不想看注释的话，可以在「设置 → 数据源」里关掉。',
    settingsAction: true,
  },
]

/** What this user has not closed yet, in catalog order. */
export function visibleNotices(dismissed: readonly string[]): UpdateNotice[] {
  const hidden = new Set(dismissed)
  return UPDATE_NOTICES.filter((notice) => !hidden.has(notice.id))
}
