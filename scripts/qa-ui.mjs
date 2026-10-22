/**
 * Visual QA for the database tab in a scratch DSH web profile.
 * Usage: DSH_TEST_TOKEN=... node scripts/qa-ui.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const TOKEN = process.env.DSH_TEST_TOKEN
const BASE = process.env.DSH_TEST_BASE ?? 'http://127.0.0.1:16402'
if (!TOKEN) throw new Error('DSH_TEST_TOKEN is required')

await mkdir('test-results', { recursive: true })
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
)
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

await page.goto(`${BASE}/?token=${TOKEN}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

for (const label of ['继续']) {
  const button = page.getByRole('button', { name: label })
  if (await button.count()) {
    await button.first().click()
    await page.waitForTimeout(500)
  }
}
const closeButtons = page.locator('button[aria-label="关闭"]')
if (await closeButtons.count()) {
  await closeButtons.first().click()
  await page.waitForTimeout(400)
}
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

await page.keyboard.press('Control+Shift+B')
await page.waitForTimeout(900)

const openDatabaseTab = async () => {
  await page.evaluate(() => {
    const button = document.querySelector('button[aria-label="新标签页"]')
    if (button instanceof HTMLElement) button.click()
  })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('button, [role="menuitem"], [role="option"]'))
    const target = items.find((el) => (el.textContent ?? '').includes('浏览和查询 MySQL'))
    if (target instanceof HTMLElement) target.click()
  })
  await page.waitForTimeout(1200)
}

await openDatabaseTab()
await page.screenshot({ path: 'test-results/qa-data-empty.png', fullPage: true })

// Select the second connection chip (read-only MySQL) without connecting.
const chips = page.locator('.dshdb-chip')
console.log('chips:', await chips.count())
if (await chips.count() > 1) {
  await chips.nth(1).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'test-results/qa-data-selected.png', fullPage: true })
}

const newConnection = page.getByRole('button', { name: '新建连接' })
if (await newConnection.count()) {
  await newConnection.first().click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'test-results/qa-connection-modal.png', fullPage: true })
  console.log('MODAL TEXT:', (await page.locator('body').innerText()).slice(-2000))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}

for (const [tab, file] of [
  ['SQL', 'qa-sql.png'],
  ['Redis', 'qa-redis.png'],
  ['设置', 'qa-settings.png'],
]) {
  const button = page.locator('.dshdb-tab', { hasText: tab })
  if (await button.count()) {
    await button.first().click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: `test-results/${file}`, fullPage: true })
  }
}

console.log('errors:', errors.length ? JSON.stringify(errors.slice(0, 10), null, 1) : 'none')
await browser.close()
