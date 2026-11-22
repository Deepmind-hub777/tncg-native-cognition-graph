import { test, expect } from '@playwright/test';

test('first lesson presents all eight learning sections in the approved sequence', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('#traditional-text')).toHaveText('天地玄黃');
  expect(await page.locator('[data-lesson-section]').evaluateAll((nodes)=>nodes.map((node)=>node.dataset.lessonSection))).toEqual(['text','pinyin','audio','meaning','english','illustration','writing','quiz']);
  await expect(page.locator('body')).not.toContainText('TNCG'); await expect(page.locator('body')).not.toContainText('四宫格');
  await expect(page.locator('#pinyin-list .pinyin-item')).toHaveCount(4); await expect(page.locator('#char-audio button')).toHaveCount(4);
  await expect(page.locator('#writing-grid .writing-card')).toHaveCount(4); await expect(page.getByRole('button', { name:'播放筆順' })).toHaveCount(4);
  await expect(page.getByRole('button', { name:'暂停语音' })).toBeVisible(); await expect(page.locator('#quiz-options button')).toHaveCount(4);
  await expect(page.getByRole('button', { name:'正常速度' })).toHaveCount(0);
  await expect(page.getByRole('button', { name:'慢速聽' })).toBeVisible();
});

test('slow playback loads the pre-generated slow Mandarin sample MP3', async ({ page }) => {
  const mp3Requests = [];
  page.on('request', (request) => { if (request.url().endsWith('.mp3')) mp3Requests.push(request.url()); });
  await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  await page.getByRole('button', { name:'慢速聽' }).click();
  await expect.poll(() => mp3Requests.some((url) => url.endsWith('/assets/audio/qzw-001-slow.mp3'))).toBe(true);
  await expect(page.locator('#audio-status')).toContainText('標準錄音');
});

test('stroke guide aligns with drawing surface and tracing controls work in browser', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  expect(await page.evaluate(() => typeof window.HanziWriter?.create)).toBe('function');
  await expect(page.locator('.writing-card .stroke-guide svg')).toHaveCount(4);
  expect(await page.locator('.writing-card .stroke-guide svg path').count()).toBeGreaterThan(0);
  const alignment = await page.locator('.writing-card').evaluateAll((cards)=>cards.map((card)=>{
    const guide=card.querySelector('.stroke-guide svg').getBoundingClientRect(), canvas=card.querySelector('canvas').getBoundingClientRect();
    return Math.max(Math.abs(guide.x-canvas.x),Math.abs(guide.y-canvas.y),Math.abs(guide.width-canvas.width),Math.abs(guide.height-canvas.height));
  })); expect(alignment.every((difference)=>difference<1)).toBe(true);
  await page.getByRole('button', { name:'自由書寫' }).click(); await expect(page.locator('.stroke-guide').first()).toHaveCSS('visibility','hidden');
  await page.getByRole('button', { name:'描紅' }).click(); await expect(page.locator('.stroke-guide').first()).toHaveCSS('visibility','visible');
  await page.getByRole('button', { name:'播放筆順' }).first().click();
  const canvas=page.locator('.writing-card canvas').first(); await canvas.scrollIntoViewIfNeeded(); const box=await canvas.boundingBox();
  await page.mouse.move(box.x+30,box.y+30); await page.mouse.down(); await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:5}); await page.mouse.up();
  const pixels=await canvas.evaluate((el)=>el.getContext('2d').getImageData(0,0,el.width,el.height).data.filter((v,i)=>i%4===3&&v>0).length); expect(pixels).toBeGreaterThan(0);
  await page.getByRole('button',{name:'清除'}).click();
  const cleared=await canvas.evaluate((el)=>el.getContext('2d').getImageData(0,0,el.width,el.height).data.filter((v,i)=>i%4===3&&v>0).length); expect(cleared).toBe(0);
  await page.getByRole('button',{name:'隱藏范字'}).click(); await expect(page.locator('.stroke-guide').first()).toHaveCSS('visibility','hidden');
});

test('mobile portrait and landscape layouts retain vector writing and usable controls', async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  expect(await page.locator('.writing-grid').evaluate((el)=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
  const portrait=await page.locator('.writing-stage').first().boundingBox(); expect(Math.abs(portrait.width-portrait.height)).toBeLessThanOrEqual(1);
  const canvas=page.locator('.writing-card canvas').first(); await canvas.scrollIntoViewIfNeeded(); const box=await canvas.boundingBox();
  await page.mouse.move(box.x+20,box.y+20); await page.mouse.down(); await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:4}); await page.mouse.up();
  const before=await canvas.evaluate((el)=>el.getContext('2d').getImageData(0,0,el.width,el.height).data.filter((v,i)=>i%4===3&&v>0).length); expect(before).toBeGreaterThan(0);
  await page.setViewportSize({width:844,height:390}); expect(await page.locator('.writing-grid').evaluate((el)=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(4);
  await expect.poll(()=>canvas.evaluate((el)=>el.getContext('2d').getImageData(0,0,el.width,el.height).data.filter((v,i)=>i%4===3&&v>0).length)).toBeGreaterThan(0);
  await expect(page.getByRole('button',{name:'慢速聽'})).toBeVisible();
});
