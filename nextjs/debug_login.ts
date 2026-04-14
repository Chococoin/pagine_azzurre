import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/signin');
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/signin_page.png', fullPage: true });
  console.log('Screenshot saved to /tmp/signin_page.png');

  // Get form structure
  const forms = await page.locator('form').count();
  console.log(`Forms found: ${forms}`);

  const inputs = await page.locator('input').all();
  console.log(`\nInputs found: ${inputs.length}`);

  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const name = await input.getAttribute('name');
    const placeholder = await input.getAttribute('placeholder');
    const id = await input.getAttribute('id');
    console.log(`  - type="${type}" name="${name}" placeholder="${placeholder}" id="${id}"`);
  }

  const buttons = await page.locator('button').all();
  console.log(`\nButtons found: ${buttons.length}`);

  for (const button of buttons) {
    const type = await input.getAttribute('type');
    const text = await button.textContent();
    console.log(`  - type="${type}" text="${text?.trim()}"`);
  }

  // Try to find the exact selectors
  console.log('\nTrying to locate email input...');
  const emailInputs = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').all();
  console.log(`Email inputs found: ${emailInputs.length}`);

  console.log('\nTrying to locate password input...');
  const passwordInputs = await page.locator('input[type="password"]').all();
  console.log(`Password inputs found: ${passwordInputs.length}`);

  // Don't close for manual inspection
  console.log('\nBrowser left open for manual inspection. Press Ctrl+C when done.');
  await page.waitForTimeout(60000);

  await browser.close();
}

main().catch(console.error);
