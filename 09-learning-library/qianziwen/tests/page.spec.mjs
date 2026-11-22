import { test, expect } from '@playwright/test';

test('first lesson presents all eight learning sections in the approved sequence', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#lesson')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#traditional-text')).toHaveText('天地玄黃');
  expect(await page.locator('[data-lesson-section]').evaluateAll((nodes)=>nodes.map((node)=>node.dataset.lessonSection))).toEqual(['text','pinyin','audio','meaning','english','illustration','writing','quiz']);
  await expect(page.locator('body')).not.toContainText('TNCG');
  await expect(page.locator('body')).not.toContainText('四宫格');
  await expect(page.locator('#pinyin-list .pinyin-item')).toHaveCount(4);
  await expect(page.locator('#char-audio button')).toHaveCount(4);
  await expect(page.locator('#writing-grid .writing-card')).toHaveCount(4);
  await expect(page.getByRole('button', { name:'播放筆順' })).toHaveCount(4);
  await expect(page.getByRole('button', { name:'暂停语音' })).toBeVisible();
  await expect(page.locator('#quiz-options button')).toHaveCount(4);
});

test('guide animation, touch drawing, clear and guide visibility controls work in the browser', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy', 'false');
  expect(await page.evaluate(() => typeof window.HanziWriter?.create)).toBe('function');
  await page.getByRole('button', { name:'播放筆順' }).first().click();
  await expect(page.locator('.writing-card .stroke-guide svg')).toHaveCount(1);
  const canvas = page.locator('.writing-card canvas').first(); const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 30, box.y + 30); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 }); await page.mouse.up();
  const pixels = await canvas.evaluate((el)=>{const c=el.getContext('2d');return c.getImageData(0,0,el.width,el.height).data.filter((v,i)=>i%4===3&&v>0).length;});
  expect(pixels).toBeGreaterThan(0);
  await page.getByRole('button', { name:'清除' }).click();
  const cleared = await canvas.evaluate((el)=>{const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;return d.filter((v,i)=>i%4===3&&v>0).length;});
  expect(cleared).toBe(0);
  await page.getByRole('button', { name:'隱藏范字' }).click();
  await expect(page.locator('.stroke-guide').first()).toHaveCSS('visibility','hidden');
  await page.getByRole('button', { name:'自由書寫' }).click();
  await expect(page.getByRole('button', { name:'自由書寫' })).toHaveAttribute('aria-pressed','true');
});

test('mobile portrait and landscape layouts keep writing canvases square and controls usable', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 }); await page.goto('/');
  await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  expect(await page.locator('.writing-grid').evaluate((el)=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
  const portrait = await page.locator('.writing-stage').first().boundingBox(); expect(Math.abs(portrait.width-portrait.height)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width:844, height:390 });
  expect(await page.locator('.writing-grid').evaluate((el)=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(4);
  await expect(page.getByRole('button', { name:'正常速度' })).toBeVisible();
});
