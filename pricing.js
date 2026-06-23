/**
 * Pricing Engine for Shopify ZIP Code-Based Pricing Demo
 * Calculates shipping fees and total prices for products based on destination ZIP code.
 * Origin: Texas Warehouse (Dallas, TX - ZIP 75201)
 */

// Helper to format currency in USD
function formatUSD(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

/**
 * Calculates price estimate based on ZIP code and product details.
 * @param {string} zip - The 5-digit destination ZIP code
 * @param {number} basePriceCents - The base product price in cents (e.g., 139900 for $1399.00)
 * @returns {object} The pricing breakdown and shipping estimate
 */
function getPriceEstimate(zip, basePriceCents = 139900) {
  // 1. Validate ZIP code format (5-digit US ZIP code)
  const cleanZip = zip.trim();
  const zipRegex = /^\d{5}$/;
  if (!zipRegex.test(cleanZip)) {
    return {
      success: false,
      error: 'Invalid ZIP code. Please enter a valid 5-digit US ZIP code (e.g., 75028).'
    };
  }

  // Ensure base price is a valid positive integer (cents)
  let parsedBase = parseInt(basePriceCents, 10);
  if (isNaN(parsedBase) || parsedBase <= 0) {
    parsedBase = 139900; // Default to $1,399.00 if invalid
  }

  let shippingFee = 0;
  let totalPrice = 0;
  let deliveryDaysMin = 1;
  let deliveryDaysMax = 3;
  let warehouse = 'Dallas, Texas Warehouse';
  let shippingMethod = 'Ground Freight';
  let note = '';

  // 2. Core Requirement: Hardcoded rates for the 3 demo ZIP codes
  // We align these exactly with the prompt:
  // - 75028: $1,499 (if base is $1,399) -> $100 shipping fee
  // - 10001: $1,699 (if base is $1,399) -> $300 shipping fee
  // - 90210: $1,799 (if base is $1,399) -> $400 shipping fee
  if (cleanZip === '75028') {
    shippingFee = 10000; // $100.00
    deliveryDaysMin = 1;
    deliveryDaysMax = 2;
    shippingMethod = 'Local Express Ground';
    note = 'Special Demo Rate (Flower Mound, TX)';
  } else if (cleanZip === '10001') {
    shippingFee = 30000; // $300.00
    deliveryDaysMin = 4;
    deliveryDaysMax = 6;
    shippingMethod = 'East Coast Standard Freight';
    note = 'Special Demo Rate (New York, NY)';
  } else if (cleanZip === '90210') {
    shippingFee = 40000; // $400.00
    deliveryDaysMin = 4;
    deliveryDaysMax = 5;
    shippingMethod = 'West Coast Standard Freight';
    note = 'Special Demo Rate (Beverly Hills, CA)';
  } else {
    // 3. Dynamic zone calculation for all other US ZIP codes based on their regional prefix (first digit)
    const firstDigit = cleanZip.charAt(0);

    switch (firstDigit) {
      case '7': // South Central (TX, AR, LA, OK) - Local Zone
        shippingFee = 9900; // $99.00
        deliveryDaysMin = 1;
        deliveryDaysMax = 3;
        shippingMethod = 'Regional Ground Shipping';
        note = 'Short-distance shipping from our Texas hub';
        break;

      case '3': // Southeast (AL, FL, GA, MS, TN)
      case '6': // Central Plains (IL, KS, NE, MO)
        shippingFee = 14900; // $149.00
        deliveryDaysMin = 3;
        deliveryDaysMax = 5;
        shippingMethod = 'Midwest & Southeast Freight';
        note = 'Medium-distance shipping from our Texas hub';
        break;

      case '2': // South Atlantic (DC, MD, NC, SC, VA, WV)
      case '4': // Great Lakes / Midwest (IN, KY, MI, OH)
      case '5': // Northern Plains (IA, MN, MT, ND, SD, WI)
      case '8': // Mountain West (AZ, CO, ID, NM, NV, UT, WY)
        shippingFee = 19900; // $199.00
        deliveryDaysMin = 4;
        deliveryDaysMax = 6;
        shippingMethod = 'Standard Freight Carrier';
        note = 'Long-distance shipping from our Texas hub';
        break;

      case '0': // New England (CT, MA, ME, NH, RI, VT, NJ)
      case '1': // Mid-Atlantic (NY, PA, DE) (non-10001)
      case '9': // West Coast (AK, CA, HI, OR, WA) (non-90210)
        shippingFee = 28900; // $289.00
        deliveryDaysMin = 5;
        deliveryDaysMax = 8;
        shippingMethod = 'Cross-Country Freight';
        note = 'Premium long-distance shipping from our Texas hub';
        break;

      default:
        shippingFee = 25000; // $250.00 flat rate fallback
        deliveryDaysMin = 4;
        deliveryDaysMax = 7;
        shippingMethod = 'Standard Freight Carrier';
        note = 'Flat rate distance shipping from our Texas hub';
    }
  }

  // Dynamic total price based on calculated shipping + provided base price
  totalPrice = parsedBase + shippingFee;

  return {
    success: true,
    zip: cleanZip,
    warehouse,
    shippingMethod,
    note,
    deliveryTimeline: `${deliveryDaysMin}-${deliveryDaysMax} business days`,
    deliveryDaysMin,
    deliveryDaysMax,
    basePriceCents: parsedBase,
    shippingFeeCents: shippingFee,
    totalPriceCents: totalPrice,
    formattedBasePrice: formatUSD(parsedBase),
    formattedShippingFee: formatUSD(shippingFee),
    formattedTotalPrice: formatUSD(totalPrice)
  };
}

module.exports = {
  getPriceEstimate
};
