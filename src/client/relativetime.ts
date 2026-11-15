/**
 * "刚刚 / 5 分钟前 / 2 小时前 / 3 天前" for history rows and tree details.
 *
 * Floor per unit (never rounds a 23h40m age up to "24 小时前"), so the two
 * surfaces that show an age cannot drift apart again.
 */
export function agoText(seconds: number): string {
  if (!Number.isFinite(seconds)) return '刚刚'
  // Floor the age itself: 59.9s is still "刚刚", not the next unit.
  const whole = Math.max(0, Math.floor(seconds))
  if (whole < 60) return '刚刚'
  const minutes = Math.floor(whole / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

/** Cached-structure age shown under a data source; '' when the stamp is unusable. */
export function relativeTime(iso: string): string {
  const stamp = Date.parse(iso)
  if (Number.isNaN(stamp)) return ''
  return agoText((Date.now() - stamp) / 1000)
}
