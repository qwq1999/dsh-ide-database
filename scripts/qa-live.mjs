/**
 * Live QA: open the Database tab in a scratch DSH web profile, connect to the
 * docker MySQL/Redis services and run one query. Requires the scratch server
 * (DSH_TEST_TOKEN) and the containers on 13306/16379.
 * Usage: DSH_TEST_TOKEN=... node scripts/qa-live.mjs
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
const cont = page.getByRole('button', { name: '继续' })
if (await cont.count()) {
  await cont.first().click()
  await page.waitForTimeout(600)
}
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
await page.keyboard.press('Control+Shift+B')
await page.waitForTimeout(800)

// Fall back to opening the sidebar through its shell toggle when the shortcut
// was not bound in this profile.
if ((await page.locator('.dshdb-root').count()) === 0) {
  const toggle = page.locator('button[aria-label="打开右侧边栏"], button[aria-label="展开右侧边栏"]')
  if (await toggle.count()) {
    await toggle.first().click()
    await page.waitForTimeout(700)
  }
}

async function openDatabaseTab() {
  await page.evaluate(() => {
    const button = document.querySelector('button[aria-label="新标签页"]')
    if (button instanceof HTMLElement) button.click()
  })
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('button, [role="menuitem"], [role="option"]'))
    const target = items.find((el) => (el.textContent ?? '').includes('浏览和查询 MySQL'))
    if (target instanceof HTMLElement) target.click()
  })
  await page.waitForTimeout(1500)
}

await openDatabaseTab()
if ((await page.locator('.dshdb-root').count()) === 0) throw new Error('database panel did not open')

// --- MySQL: select saved docker connection, connect, run a query ---
await page.locator('.dshdb-chip', { hasText: 'Docker MySQL' }).first().click()
await page.waitForTimeout(600)
const connect = page.getByRole('button', { name: '连接', exact: true })
if (await connect.count()) {
  await connect.first().click()
  await page.waitForTimeout(2500)
}
await page.locator('.dshdb-tab', { hasText: 'SQL' }).first().click()
await page.waitForTimeout(500)
await page.locator('textarea.dshdb-editor').fill('SELECT id, name, email, age FROM users ORDER BY id')
await page.getByRole('button', { name: '执行' }).first().click()
await page.waitForTimeout(2000)
const panelText = await page.locator('.dshdb-root').innerText()
if (!panelText.includes('Alice') || !panelText.includes('alice@example.com')) {
  throw new Error(`query result not rendered:\n${panelText.slice(-1500)}`)
}
await page.screenshot({ path: 'test-results/qa-live-mysql.png', fullPage: true })

// --- Redis: switch connection, connect, scan ---
await page.locator('.dshdb-chip', { hasText: 'Docker Redis' }).first().click()
await page.waitForTimeout(600)
const redisConnect = page.getByRole('button', { name: '连接', exact: true })
if (await redisConnect.count()) {
  await redisConnect.first().click()
  await page.waitForTimeout(2000)
}
await page.locator('.dshdb-tab', { hasText: 'Redis' }).first().click()
await page.waitForTimeout(1200)
await page.screenshot({ path: 'test-results/qa-live-redis.png', fullPage: true })

console.log('panel text tail:', (await page.locator('.dshdb-root').innerText()).slice(-600))
console.log('errors:', errors.length ? JSON.stringify(errors.slice(0, 8), null, 1) : 'none')
await browser.close()
console.log('LIVE QA OK')
