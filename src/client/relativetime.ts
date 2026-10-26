/**
 * "刚刚 / 5 分钟前 / 2 小时前 / 3 天前" for history rows and tree details.
 *
 * Floor per unit (never rounds a 23h40m age up to "24 小时前"), so the two
 * surfaces that show an age cannot drift apart again.
 */
export function agoText(seconds: number): string {
  if (!Number.isFinite(seconds)) return '刚刚'
  const whole = Math.max(0, Math.round(seconds))
  if (whole < 60) return '刚刚'
  const minutes = Math.floor(whole / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}
