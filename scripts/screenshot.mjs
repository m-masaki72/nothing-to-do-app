import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Input state
await page.goto('https://nothing-to-do-app.pages.dev/');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'docs/screenshots/01_input.png' });

// Fill task and capture screaming state (mock API to avoid real call)
await page.evaluate(() => {
  // Inject fake result directly to trigger screaming state
  window.__DEBUG_TRIGGER_SCREAMING = true;
});

// urgency=1
await page.goto('https://nothing-to-do-app.pages.dev/');
await page.waitForLoadState('networkidle');
await page.fill('#task-input', '軽いタスク: メモを見返す');
// intercept fetch to return urgency=1
await page.route('**/api/analyze', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ micro_step: 'メモアプリを開く', angry_speech: 'さっさとやれ！', urgency_level: 1 }),
}));
await page.click('#submit-btn');
await page.waitForTimeout(600);
await page.screenshot({ path: 'docs/screenshots/02_screaming_urgency1.png' });

// urgency=2
await page.goto('https://nothing-to-do-app.pages.dev/');
await page.waitForLoadState('networkidle');
await page.fill('#task-input', '急ぎのタスク: メールを返信する');
await page.route('**/api/analyze', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ micro_step: 'メールを開く', angry_speech: '今すぐやれ！！', urgency_level: 2 }),
}));
await page.click('#submit-btn');
await page.waitForTimeout(600);
await page.screenshot({ path: 'docs/screenshots/03_screaming_urgency2.png' });

// urgency=3
await page.goto('https://nothing-to-do-app.pages.dev/');
await page.waitForLoadState('networkidle');
await page.fill('#task-input', '緊急: 締め切り今日のレポート');
await page.route('**/api/analyze', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ micro_step: 'ファイルを開く', angry_speech: '今すぐやらないと大変なことになるぞ！！！', urgency_level: 3 }),
}));
await page.click('#submit-btn');
await page.waitForTimeout(600);
await page.screenshot({ path: 'docs/screenshots/04_screaming_urgency3.png' });

// monitoring state
await page.waitForTimeout(5500);
await page.screenshot({ path: 'docs/screenshots/05_monitoring.png' });

await browser.close();
console.log('Screenshots saved to docs/screenshots/');
