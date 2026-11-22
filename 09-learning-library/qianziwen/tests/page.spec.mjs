import { test, expect } from '@playwright/test';

test('first lesson presents all eight learning sections in the approved sequence', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('#traditional-text')).toHaveText('天地玄黃');
  expect(await page.locator('[data-lesson-section]').evaluateAll((nodes)=>nodes.map((node)=>node.dataset.lessonSection))).toEqual(['text','pinyin','audio','meaning','english','illustration','writing','quiz']);
  await expect(page.locator('body')).not.toContainText('TNCG'); await expect(page.locator('body')).not.toContainText('四宫格');
  await expect(page.locator('#pinyin-list .pinyin-item')).toHaveCount(4); await expect(page.locator('#char-audio button')).toHaveCount(4);
  await expect(page.locator('#writing-grid .writing-card')).toHaveCount(4); await expect(page.getByRole('button', { name:'播放筆順' })).toHaveCount(4);
  await expect(page.locator('#quiz-options button')).toHaveCount(4);
  await expect(page.getByRole('button', { name:'正常速度' })).toHaveCount(0);
  await expect(page.getByRole('button', { name:'普通話語音' })).toBeVisible();
  await expect(page.getByRole('button', { name:'暂停语音' })).toHaveCount(0);
  await expect(page.getByRole('button', { name:'重播' })).toHaveCount(0);
  const meaningPairs = await page.locator('#meaning-reading ruby').evaluateAll((nodes) => nodes.map((node) => [node.childNodes[0].textContent, node.querySelector('rt').textContent]));
  expect(meaningPairs).toEqual([['天','tiān'],['色','sè'],['深','shēn'],['黑','hēi'],['地','dì'],['呈','chéng'],['黄','huáng'],['色','sè']]);
  const pinyinAlignment = await page.locator('#meaning-reading ruby').evaluateAll((nodes) => nodes.map((node) => {
    const range = document.createRange(); range.selectNode(node.firstChild);
    const base = range.getBoundingClientRect(), annotation = node.querySelector('rt').getBoundingClientRect();
    return Math.abs((base.left + base.width / 2) - (annotation.left + annotation.width / 2));
  }));
  expect(pinyinAlignment.every((offset) => offset < 1)).toBe(true);
  await expect(page.locator('#meaning-reading')).toContainText('，');
  await expect(page.locator('#quiz-progress')).toHaveText('第 1 / 10 題');
  await expect(page.getByRole('button', { name:'撤回一步' })).toHaveCount(0);
  await expect(page.getByRole('button', { name:'隱藏范字' })).toHaveCount(0);
});

test('the Mandarin audio control loads the pre-generated group MP3', async ({ page }) => {
  const mp3Requests = [];
  page.on('request', (request) => { if (request.url().endsWith('.mp3')) mp3Requests.push(request.url()); });
  await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  await page.getByRole('button', { name:'普通話語音' }).click();
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
  await expect(page.locator('.stroke-guide').first()).toHaveCSS('visibility','visible');
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
  await expect(page.getByRole('button',{name:'普通話語音'})).toBeVisible();
});

test('phone, tablet and desktop widths have no horizontal overflow', async ({ page }) => {
  for (const [width, height, columns] of [[320, 740, 2], [375, 812, 2], [390, 844, 2], [768, 1024, 4], [1024, 900, 4], [1440, 1000, 4]]) {
    await page.setViewportSize({ width, height }); await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, columns: getComputedStyle(document.querySelector('.writing-grid')).gridTemplateColumns.split(' ').length }));
    expect(layout.overflow, `horizontal overflow at ${width}px`).toBe(false);
    expect(layout.columns).toBe(columns);
    if (width === 320) {
      const toolbar = await page.evaluate(() => [...document.querySelectorAll('.writing-toolbar button')].map((button) => button.getBoundingClientRect().width));
      expect(toolbar[2]).toBeGreaterThan(toolbar[0] * 1.8);
    }
  }
});

test('listening quiz ends after ten answered questions', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  for (let question = 1; question <= 10; question++) {
    if (question > 1) await page.getByRole('button', { name:'下一題' }).click();
    await expect(page.locator('#quiz-progress')).toHaveText(`第 ${question} / 10 題`);
    await page.locator('#quiz-options button').first().click();
  }
  await expect(page.locator('#quiz-feedback')).toContainText('本局 10 題已完成');
  await expect(page.getByRole('button', { name:'下一題' })).toBeDisabled();
  await expect(page.getByRole('button', { name:'播放題目' })).toBeDisabled();
  await expect(page.locator('#quiz-options button:enabled')).toHaveCount(0);
});

test('the corpus has 63 navigable pages with four selectable lessons and a final two', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#lesson')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('#page-indicator')).toHaveText('第 1 / 63 頁');
  await expect(page.locator('#page-groups button')).toHaveCount(4);
  await expect(page.locator('#page-groups button').first()).toHaveAttribute('aria-current','true');
  await expect(page.locator('#page-groups')).toContainText('天地玄黃');
  await page.getByRole('button', { name:'下一頁' }).click();
  await expect(page.locator('#page-indicator')).toHaveText('第 2 / 63 頁');
  await page.locator('#page-groups button').first().click();
  await expect(page.locator('#traditional-text')).toHaveText('寒來暑往');
  await page.getByRole('button', { name:'最後一頁' }).click();
  await expect(page.locator('#page-indicator')).toHaveText('第 63 / 63 頁');
  await expect(page.locator('#page-groups button')).toHaveCount(2);
  await page.goBack();
  await expect(page.locator('#page-indicator')).toHaveText('第 2 / 63 頁');
  await expect(page.locator('#traditional-text')).toHaveText('寒來暑往');
  const targetSize = await page.getByRole('button', { name:'下一頁' }).evaluate((button) => button.getBoundingClientRect().height);
  expect(targetSize).toBeGreaterThanOrEqual(48);
  await page.locator('#page-select').selectOption('3');
  await page.locator('#page-groups button').nth(1).click();
  await expect(page.locator('#traditional-text')).toHaveText('露結爲霜');
  await expect(page.locator('.writing-card')).toHaveCount(3);
  await expect(page.locator('#writing-status')).toContainText('爲');
});
