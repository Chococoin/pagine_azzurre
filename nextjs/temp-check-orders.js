// Quick script to check orders in database
const fetch = require('node-fetch');

async function checkOrders() {
  // Try to access the API endpoint to see what's there
  const baseUrl = 'http://localhost:3000';
  
  console.log('Checking for existing orders in the system...');
  
  // We'll need to login first to get a session
  const loginResponse = await fetch(`${baseUrl}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'pentest@shannon.local',
      password: 'PentestPass123!'
    })
  });
  
  console.log('Login response:', loginResponse.status);
}

checkOrders();
