const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('http://localhost:3000');
  
  // Wait for the first book card (using the h3 text)
  await page.waitForSelector('h3');
  const cards = await page.$$('h3');
  await cards[0].click();
  
  // Wait for the PDF Viewer toolbar input
  await page.waitForSelector('input[type="text"]');
  // Wait 2 seconds for initial jump to finish
  await new Promise(r => setTimeout(r, 2000));
  
  // Capture screenshot showing the viewer loaded at Page 205
  await page.screenshot({ path: '/Users/mengtian/.gemini/antigravity/brain/0d63724f-583d-46c8-ad7a-4fecf5e5e2f9/scroll_test_success.png' });
  await browser.close();
  console.log('SUCCESS');
})();
