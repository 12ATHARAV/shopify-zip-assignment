const express = require('express');
const cors = require('cors');
const path = require('path');
const { getPriceEstimate } = require('./pricing');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure allowed origins for CORS
const allowedOrigins = [
  'https://sofabed-zip-demo.myshopify.com',
  'https://www.sofabed.com',
  'https://sofabed.com'
];

// Helper to validate origin/referer domains
const isDomainAllowed = (urlStr) => {
  if (!urlStr) return false;
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname;
    return (
      allowedOrigins.includes(url.origin) ||
      hostname === 'sofabed-zip-demo.myshopify.com' ||
      hostname === 'sofabed.com' ||
      hostname === 'www.sofabed.com' ||
      hostname.endsWith('.sofabed.com') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.railway.app')
    );
  } catch (e) {
    return false;
  }
};

// Enable CORS with dynamic origin checking
app.use(cors({
  origin: function (origin, callback) {
    // If no origin is present (e.g. same-origin request, or direct visit of dashboard),
    // allow it if it doesn't violate server access, or handle it via referrer check.
    if (!origin || isDomainAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Verification middleware to restrict API access to authorized storefronts and developer dashboard
const verifyReferer = (req, res, next) => {
  const referer = req.headers.referer;
  const origin = req.headers.origin;

  // Log referrer/origin validation for debugging
  console.log(`[Security Check] Referer: ${referer || 'none'}, Origin: ${origin || 'none'}`);

  // Enforce that at least one valid header is present and matches the allowed domain list
  if (isDomainAllowed(referer) || isDomainAllowed(origin)) {
    return next();
  }

  // Reject unauthorized requests (e.g., curls or requests from other sites)
  return res.status(403).json({
    success: false,
    error: 'Access Forbidden. This API is restricted to authorized storefronts only.'
  });
};

/**
 * @api {get} /api/price-estimate Get Price Estimate
 * @apiDescription Calculates shipping fee and total price based on variant price and ZIP code
 * @apiParam {String} zip Destination ZIP code (5 digits)
 * @apiParam {Number} [basePrice] Base product price in cents (defaults to 139900 - $1,399.00)
 */
app.get('/api/price-estimate', verifyReferer, (req, res) => {
  const { zip, basePrice } = req.query;

  if (!zip) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "zip" is required.'
    });
  }

  // Calculate pricing
  const result = getPriceEstimate(zip, basePrice);

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// Fallback to index.html for any unhandled routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Shopify ZIP Pricing Backend is running!`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Dallas Warehouse ZIP: 75201`);
  console.log(`==================================================`);
});
