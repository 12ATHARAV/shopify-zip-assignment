/**
 * Shopify CarrierService Registration Script
 * Run this script to register your deployed Railway backend shipping-rates endpoint with Shopify.
 * 
 * Usage:
 *   node scripts/register-carrier.js <shop-domain> <access-token> <backend-url>
 * 
 * Example:
 *   node scripts/register-carrier.js sofabed-zip-demo.myshopify.com shpat_xxxxx https://shopify-zip-assignment-production.up.railway.app
 */

const https = require('https');

const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Error: Missing arguments.');
  console.log('Usage: node scripts/register-carrier.js <shop-domain> <access-token> <backend-url>');
  process.exit(1);
}

const [shopDomain, accessToken, backendUrl] = args;

// Validate inputs
const cleanShopDomain = shopDomain.replace(/^https?:\/\//, '').trim();
const cleanBackendUrl = backendUrl.trim().replace(/\/$/, '');

// Set up callback URL with safety token
const callbackUrl = `${cleanBackendUrl}/api/shipping-rates?token=sofabed_secret_token_2026`;

const payload = JSON.stringify({
  carrier_service: {
    name: 'Sofabed Freight Shipping',
    callback_url: callbackUrl,
    service_discovery: true
  }
});

const options = {
  hostname: cleanShopDomain,
  port: 443,
  path: '/admin/api/2024-04/carrier_services.json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': accessToken,
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log(`Registering CarrierService for store: ${cleanShopDomain}...`);
console.log(`Callback URL: ${callbackUrl}`);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    const data = JSON.parse(body);
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log('==================================================');
      console.log('  SUCCESS! Shopify CarrierService registered!');
      console.log('  ID:', data.carrier_service.id);
      console.log('  Name:', data.carrier_service.name);
      console.log('  Callback:', data.carrier_service.callback_url);
      console.log('==================================================');
    } else {
      console.error('==================================================');
      console.error(`  FAILED! Status Code: ${res.statusCode}`);
      console.error('  Response Error:', data.errors || data);
      console.error('==================================================');
    }
  });
});

req.on('error', (e) => {
  console.error(`Request Error: ${e.message}`);
});

req.write(payload);
req.end();
