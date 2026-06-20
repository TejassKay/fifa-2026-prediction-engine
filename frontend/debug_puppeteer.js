const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/fixtures/1', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/Users/tejass/.gemini/antigravity-ide/brain/57d699fb-844f-40ae-a202-e14079303604/radar_debug.png' });
  const html = await page.evaluate(() => {
    const el = document.querySelector('.recharts-surface');
    return el ? el.outerHTML : 'NO CHART FOUND';
  });
  console.log(html);
  await browser.close();
})();
