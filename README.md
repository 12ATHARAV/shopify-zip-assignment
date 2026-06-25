# Shopify ZIP Code-Based Product Pricing Demo

[![Node.js Version](https://img.shields.io/badge/node-v20.x-blue.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/express-v4.19.2-lightgrey.svg)](https://expressjs.com/)
[![Railway Deployment](https://img.shields.io/badge/deployed%20on-railway-blueviolet.svg)](https://railway.app/)
[![Shopify Integration](https://img.shields.io/badge/integrated%20with-shopify-green.svg)](https://shopify.com/)

A dynamic, location-based shipping and pricing engine tailored for [Sofabed](https://www.sofabed.com/) 

This repository contains the backend Express pricing microservice and the Shopify Custom Liquid storefront integration script.

---

## 🔗 Live Demos & Access

*   **Live Shopify Storefront**: [sofabed-zip-demo.myshopify.com](https://sofabed-zip-demo.myshopify.com)
    *   **Storefront Password**: `1234`
    *   *Instructions: Enter the password, click "Shop Products" in the menu, select the Sloane Sofa Bed, and locate the shipping widget next to the retail price.*
*   **Deployed Backend Service**: [shopify-zip-assignment-production.up.railway.app](https://shopify-zip-assignment-production.up.railway.app)
    *   *Opening this link in a browser displays the live interactive developer dashboard, product simulator, and API inspector.*

---

## 🎯 Core Requirements Met (Test Cases)

The backend rules engine strictly validates the requested test cases, returning the exact pricing values when queried (assuming a base product price of `$1,399.00`):

| Destination ZIP | City/State | Shipping Rate | Displayed Price (Base: $1,399) | Delivery Timeline |
| :--- | :--- | :--- | :--- | :--- |
| **`75028`** | Flower Mound, TX | **$100.00** | **$1,499.00** | 1-2 business days (Local Ground) |
| **`10001`** | New York, NY | **$300.00** | **$1,699.00** | 4-6 business days (East Coast Freight) |
| **`90210`** | Beverly Hills, CA | **$400.00** | **$1,799.00** | 4-5 business days (West Coast Freight) |

---

## 🚀 Going the "Extra Mile" (Advanced Engineering)

To demonstrate a production-ready e-commerce integration, this solution goes beyond the basic hardcoded specs:

*   **Dynamic Prefix Routing Engine**: Instead of *only* supporting the 3 test ZIP codes, the backend analyzes the first digit of *any* US ZIP code (mapping to [US ZIP Code Regional Prefixes](https://en.wikipedia.org/wiki/ZIP_Code#/media/File:ZIP_Code_zones.svg)) to dynamically compute localized shipping costs and logistics delivery times for all 42,000+ US postal codes.
*   **Variant-Aware Live Updates**: The storefront widget dynamically listens to variant choices (e.g. changing sizes/colors of the sofa bed on the page) and triggers a silent recalculation using the newly selected variant's price.
*   **Customer Session Persistence (`localStorage`)**: Once a customer enters their ZIP code, it is stored in the browser's local storage. When they browse other products, local pricing calculations run automatically to minimize shopper friction.
*   **Zero Floating-Point Error Calculations**: All currency numbers are calculated in integer **cents** in the backend (e.g. $1399.00 is handled as `139900`) to completely eliminate decimal rounding errors common in javascript floating-point arithmetic.
*   **Interactive Developer Dashboard**: Opening the backend URL in a browser loads a dark-mode dashboard showing a product simulator, interactive preset buttons, and a live JSON inspector, allowing rapid manual testing without setting up Shopify first.
*   **Shopify Checkout ZIP Pre-population**: Redirects checkout requests using a secure Cart Permalink workflow combined with `/cart/prepare_shipping_rates.json` session caching. This automatically pre-populates the customer's calculated ZIP code on the Shopify delivery address page.
*   **Plan-Independent Shipping Total Lock**: Bypasses standard Shopify plan limitations (which restrict the `CarrierService` API to Shopify Plus/annual accounts) by dynamically syncing calculations to unlisted merchant shipping variants. Quantity locks ensure customers cannot buy multiples or end up with duplicate shipping fees.
*   **Server-Side Checkout Validation Function**: Enforces strict server-side matching of the customer's ZIP code to their cart's shipping variant during the checkout flow using a Shopify Cart Validation Function (Wasm). If a customer changes their delivery address to a different zone, checkout progress is immediately blocked, preventing billing exploits.

---

## 📦 Detailed Feature Architecture

### 1. Regional Routing & Pricing Rules Engine (`pricing.js`)
Calculations originate from the **Dallas, Texas Warehouse (ZIP 75201)**. Pricing and timeline calculations are divided into two main layers:
*   **Core Requirements (Test Cases)**:
    *   `75028` (Flower Mound, TX): `$100.00` shipping (Local Ground, 1-2 days)
    *   `10001` (New York, NY): `$300.00` shipping (East Coast Freight, 4-6 days)
    *   `90210` (Beverly Hills, CA): `$400.00` shipping (West Coast Freight, 4-5 days)
*   **Dynamic Prefix Routing Engine**:
    *   Matches the first digit of any US ZIP code.
    *   **Local Zone (Prefixes 7, 3, 6)**: `$100.00` (1-3 days)
    *   **Long-Distance Zone (Prefixes 0, 1, 2, 4, 5, 8, 9)**: `$300.00` (4-6 days)
*   **Cent-based Integer Calculations**: Avoids decimal floating-point representation bugs by performing all server-side additions, subtotals, and calculations in integer cents (e.g., `$1399.00` is represented as `139900` cents).

### 2. Storefront App Extension & Add-to-Cart Interceptor (`zip-pricing-extension`)
*   **Decoupled Block Assets**: Storefront assets (`zip-pricing.js` and `zip-pricing.css`) are loaded via Shopify CDN asset filters, separating logic from raw page templates.
*   **Merchant Customization Schema**: Implements target settings inside `pricing_widget.liquid`'s Schema to allow configuration of background color, borders, max width, and margins directly from the Shopify Admin Theme Editor.
*   **Variant Selection Listener**: Listens to storefront inputs (change events on select boxes, inputs, selectors) and dynamically updates shipping cost when a customer switches sizes or colors of the Sofa Bed.
*   **Add-to-Cart Interceptor**: Intercepts product add-to-cart clicks/submits using capturing events. If a ZIP has been calculated, it forces a single POST request to `/cart/add.js` that groups both the Sofa product variant and the calculated shipping variant (locking quantities to 1) into a single transaction, bypassing separate API roundtrips.

### 3. Cart Checkout Redirection & Session Address Caching
*   **Checkout Interceptor**: Intercepts checkouts via event capturing (listening to clicks on `a[href*="/checkout"]`, `[name="checkout"]`, and submit actions on `/cart` forms) to redirect the user through our custom checkout builder.
*   **Cart Permalink Generation**: Bypasses the Shopify checkout query parameter strip restriction (which block custom query params inside standard `/checkout` page loads) by generating a dynamic **Cart Permalink** (e.g. `/cart/variant_id:qty,shipping_variant_id:1?checkout[shipping_address][zip]=XXXXX...`) that forces Shopify to render the checkout page with the pre-configured items.
*   **Session Caching via Shopify Cart API**: Automatically translates the 5-digit ZIP to a 2-letter state code via `sfGetStateFromZip` and pushes a POST request to `/cart/prepare_shipping_rates.json` containing the address. This populates Shopify's checkout session cache, ensuring the ZIP code is pre-filled on the delivery page.

---

## 📁 Repository Structure

```text
shopify-zip-assignment/
├── shopify/
│   └── zip-pricing-widget.liquid  # Custom Liquid + Vanilla JS widget code
├── public/
│   └── index.html                 # Simulator Dashboard HTML & styling
├── pricing.js                     # Regional shipping and rules engine
├── server.js                      # Express API server & CORS configuration
├── Dockerfile                     # Container config for Railway
├── package.json                   # Project packages & start scripts
├── .gitignore                     # Git ignore rules
└── README.md                      # Documentation
```

---

## 📡 API Reference

### Get Price Estimate
Calculates freight shipping cost and final customer price based on destination ZIP code.

*   **URL**: `/api/price-estimate`
*   **Method**: `GET`
*   **CORS**: Enabled (`*` allows cross-origin requests directly from Shopify storefronts)
*   **Query Parameters**:
    *   `zip` (Required): String representing the 5-digit US ZIP code.
    *   `basePrice` (Optional): Integer representing product base price in cents (e.g. `139900`). Defaults to `139900` ($1,399.00).

#### Sample Request
```http
GET /api/price-estimate?zip=75028&basePrice=139900 HTTP/1.1
Host: shopify-zip-assignment-production.up.railway.app
```

#### Sample Response
```json
{
  "success": true,
  "zip": "75028",
  "warehouse": "Dallas, Texas Warehouse",
  "shippingMethod": "Local Express Ground",
  "note": "Special Demo Rate (Flower Mound, TX)",
  "deliveryTimeline": "1-2 business days",
  "deliveryDaysMin": 1,
  "deliveryDaysMax": 2,
  "basePriceCents": 139900,
  "shippingFeeCents": 10000,
  "totalPriceCents": 149900,
  "formattedBasePrice": "$1,399.00",
  "formattedShippingFee": "$100.00",
  "formattedTotalPrice": "$1,499.00"
}
```

---

## 🛠️ Local Development

1.  **Clone and Install Dependencies**:
    ```bash
    git clone https://github.com/12ATHARAV/shopify-zip-assignment.git
    cd shopify-zip-assignment
    npm install
    ```
2.  **Start Dev Server**:
    ```bash
    npm run dev
    ```
3.  Open `http://localhost:3000` in your browser to view the interactive dashboard.
