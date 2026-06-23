const express = require('express');
const cors = require('cors');
const path = require('path');
const { getPriceEstimate } = require('./pricing');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all storefront origins
app.use(cors({
  origin: '*',
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

/**
 * @api {get} /api/price-estimate Get Price Estimate
 * @apiDescription Calculates shipping fee and total price based on variant price and ZIP code
 * @apiParam {String} zip Destination ZIP code (5 digits)
 * @apiParam {Number} [basePrice] Base product price in cents (defaults to 139900 - $1,399.00)
 */
app.get('/api/price-estimate', (req, res) => {
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
