import { test, expect } from '@playwright/test';

test('listen page renders one lesson with per-character pinyin and meaning ruby', async ({ page }) => {
  await page.goto('/site/index.html');
  await expect(page.locator('#lesson-card')).toHaveAttribute('aria-busy', 'false');
  await expect(page).toHaveTitle('第 1 组 · 千字文听读');
  await expect(page.locator('#traditional-text')).toHaveText('天地玄黃');
  await expect(page.locator('#character-pinyin .pinyin-pair')).toHaveCount(4);
  await expect(page.locator('#character-pinyin .pinyin-syllable').first()).toHaveText('tiān');
  await expect(page.locator('#lesson-art')).toHaveAttribute('src', /assets\/illustrations\/qzw-001\.png$/);
  // Desktop paints the artwork as the page backdrop and keeps the inline img as a screen-reader-only node.
  await expect(page.locator('body')).toHaveClass(/has-lesson-art/);
  const backdrop = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--lesson-artwork').trim());
  expect(backdrop).toContain('qzw-001.png');
  await expect(page.locator('#meaning-reading ruby')).not.toHaveCount(0);
  await expect(page.locator('#english-note')).not.toBeEmpty();
  await expect(page.locator('#audio-state')).toHaveText('点按按钮收听');
  await expect(page.locator('#play-audio')).toBeEnabled();
  await expect(page.locator('#page-groups, #page-select')).toHaveCount(0);
});

test('listen page plays the generated group MP3 and falls back only when needed', async ({ page }) => {
  const mp3 = [];
  page.on('request', (request) => { if (request.url().endsWith('.mp3')) mp3.push(request.url()); });
  await page.goto('/site/index.html');
  await expect(page.locator('#lesson-card')).toHaveAttribute('aria-busy', 'false');
  await page.locator('#play-audio').click();
  await expect.poll(() => mp3.some((url) => url.endsWith('/assets/audio/qzw-001-normal.mp3'))).toBe(true);
  await expect(page.locator('#audio-state')).toContainText('标准录音');
});

test('listen page navigates by buttons and deep link, keeping the corrected reading', async ({ page }) => {
  await page.goto('/site/index.html');
  await expect(page.locator('#lesson-card')).toHaveAttribute('aria-busy', 'false');
  await page.locator('#next-lesson').click();
  await expect(page.locator('#traditional-text')).toHaveText('宇宙洪荒');
  await expect(page.locator('#lesson-index')).toHaveText('第 2 组');
  await expect(page).toHaveURL(/group=2/);
  await expect(page.locator('#previous-lesson')).toBeEnabled();

  await page.goto('/site/index.html?group=10');
  await expect(page.locator('#traditional-text')).toHaveText('露結爲霜');
  await expect(page.locator('#character-pinyin .pinyin-syllable')).toHaveText(['lù', 'jié', 'wéi', 'shuāng']);
  await expect(page.locator('#audio-state')).toHaveText('点按按钮收听');

  await page.goto('/site/index.html?group=250');
  await expect(page.locator('#traditional-text')).toHaveText('焉哉乎也');
  await expect(page.locator('#next-lesson')).toBeDisabled();
});

test('listen page rejects out-of-range jumps and survives a missing illustration', async ({ page }) => {
  await page.goto('/site/index.html');
  await expect(page.locator('#lesson-card')).toHaveAttribute('aria-busy', 'false');
  await page.locator('#lesson-jump').fill('251');
  await page.locator('#jump-form').press('Enter');
  await expect(page.locator('#jump-message')).toHaveText('请输入 1 到 250 之间的组号。');
  await expect(page.locator('#lesson-jump')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#traditional-text')).toHaveText('天地玄黃');
  await page.locator('#lesson-jump').fill('3');
  await page.locator('#jump-form').press('Enter');
  await expect(page.locator('#traditional-text')).toHaveText('日月盈昃');

  await page.route('**/assets/illustrations/qzw-003.jpg', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto('/site/index.html?group=3');
  await expect(page.locator('#lesson-art')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/has-lesson-art/);
  await expect(page.locator('#art-caption')).toHaveText('本组插画暂不可用');
});

test('listen page is linked from the main lesson page and keeps mobile layout usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#lesson')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('link', { name: '試聽模式 · 逐句聽讀' })).toBeVisible();
  await page.goto('/site/index.html');
  await expect(page.locator('#lesson-card')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#lesson-art')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  const sizes = await page.locator('#play-audio, #previous-lesson, #next-lesson').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(sizes.every((height) => height >= 44)).toBe(true);
});
