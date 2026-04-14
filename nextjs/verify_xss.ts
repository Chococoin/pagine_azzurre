/**
 * VERIFY XSS EXECUTION
 * Navigate directly to the product created in previous run
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const TARGET_URL = 'http://localhost:3000';
const PRODUCT_ID = '69de42946db11ad346a6765b'; // From previous run

async function verify() {
  console.log('\n=== VERIFYING XSS-VULN-02 EXPLOITATION ===');
  console.log('Product ID:', PRODUCT_ID);

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log('  [CONSOLE]:', text);
  });

  let alertTriggered = false;
  let alertMessage = '';

  page.on('dialog', async dialog => {
    alertTriggered = true;
    alertMessage = dialog.message();
    console.log('\n✓ ALERT TRIGGERED:', alertMessage, '\n');
    await dialog.accept();
  });

  try {
    const productUrl = `${TARGET_URL}/product/${PRODUCT_ID}`;
    console.log('Navigating to:', productUrl);

    await page.goto(productUrl);
    await page.waitForTimeout(5000);

    console.log('\n=== RESULTS ===');
    console.log('Alert triggered:', alertTriggered);
    if (alertTriggered) {
      console.log('Alert message:', alertMessage);
    }

    // Check page source
    const content = await page.content();
    const hasPayload = content.includes('</script><script>');
    const hasProductJsonLd = content.includes('"@type":"Product"');
    const hasBreadcrumbJsonLd = content.includes('"@type":"BreadcrumbList"');

    console.log('Payload in HTML:', hasPayload);
    console.log('Product JSON-LD:', hasProductJsonLd);
    console.log('Breadcrumb JSON-LD:', hasBreadcrumbJsonLd);

    // Extract a snippet showing the vulnerability
    const productJsonLdMatch = content.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
    if (productJsonLdMatch) {
      console.log('\n=== JSON-LD SCRIPT TAGS FOUND:', productJsonLdMatch.length, '===');
      productJsonLdMatch.forEach((script, idx) => {
        console.log(`\nJSON-LD ${idx + 1}:`);
        const snippet = script.substring(0, 500);
        console.log(snippet + '...');
      });
    }

    // Save evidence
    const evidenceDir = join(process.cwd(), 'evidence/xss-name-verify');
    mkdirSync(evidenceDir, { recursive: true });

    const screenshot = await page.screenshot({ fullPage: true });
    writeFileSync(join(evidenceDir, 'xss-execution.png'), screenshot);

    const htmlPath = join(evidenceDir, 'page-source.html');
    writeFileSync(htmlPath, content);

    const report = {
      vulnerability_id: 'XSS-VULN-02',
      product_id: PRODUCT_ID,
      product_url: productUrl,
      timestamp: new Date().toISOString(),
      alert_triggered: alertTriggered,
      alert_message: alertMessage,
      payload_in_html: hasPayload,
      json_ld_contexts: {
        product: hasProductJsonLd,
        breadcrumb: hasBreadcrumbJsonLd
      },
      console_messages: consoleMessages,
      evidence_directory: evidenceDir
    };

    const reportPath = join(evidenceDir, 'verification-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== EVIDENCE SAVED ===');
    console.log('Screenshot:', join(evidenceDir, 'xss-execution.png'));
    console.log('HTML Source:', htmlPath);
    console.log('Report:', reportPath);

    console.log('\n✓ VERIFICATION COMPLETE\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

verify();
