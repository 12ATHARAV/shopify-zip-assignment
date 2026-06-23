# Shopify ZIP Code-Based Product Pricing Demo

Welcome to the submission for the **Shopify ZIP Code-Based Product Pricing Demo**. This project was built to showcase the design, architecture, and deployment of a dynamic, location-based shipping and pricing engine tailored for [Sofabed](https://www.sofabed.com/) (originating heavy freight shipping from a central Texas warehouse).

---

## 1. Project Overview

This solution consists of two core components:
1.  **A Zonal Logistics Express API**: A backend Node.js microservice hosted on Railway. It accepts a destination ZIP code and product base price, applying specialized freight rules from a Texas warehouse to return a localized price.
2.  **A Storefront Liquid Widget**: A Custom Liquid + Vanilla JS container designed to be embedded directly into a Shopify product page. It matches Sofabed's premium aesthetic (Jost font, clean charcoal borders, and golden highlight elements).

---

## 2. Core Requirements Met (Test Cases)

The API strictly adheres to the requested test cases, returning the exact pricing values when queried:

| Destination ZIP | City/State | Shipping Rate | Displayed Price (Base: $1,399) | Delivery Timeline |
| :--- | :--- | :--- | :--- | :--- |
| **`75028`** | Flower Mound, TX | **$100.00** | **$1,499.00** | 1-2 business days (Local Ground) |
| **`10001`** | New York, NY | **$300.00** | **$1,699.00** | 4-6 business days (East Coast Freight) |
| **`90210`** | Beverly Hills, CA | **$400.00** | **$1,799.00** | 4-5 business days (West Coast Freight) |

---

## 3. Going the "Extra Mile" (Exceeding Expectations)

To demonstrate a production-ready mindset, this project includes several advanced features:

*   **Dynamic Prefix Routing Engine**: Instead of *only* supporting the 3 test ZIP codes, the backend analyzes the first digit of *any* US ZIP code (mapping to [US ZIP Code Regional Prefixes](https://en.wikipedia.org/wiki/ZIP_Code#/media/File:ZIP_Code_zones.svg)) to dynamically compute localized shipping costs and logistics delivery times for all 42,000+ US postal codes.
*   **Customer Session Persistence (`localStorage`)**: Once a customer enters their ZIP code on a product page, the widget caches it. When they browse to other products, the widget automatically computes and displays their local delivered price without requiring re-entry.
*   **Interactive Developer Dashboard & Live API Explorer**: Opening the backend URL in a web browser loads a gorgeous dark-mode dashboard showing a product simulator, interactive preset buttons, and a live JSON inspector, allowing rapid manual testing without setting up Shopify first.
*   **Zero Floating-Point Error Calculations**: All currency numbers are calculated in integer **cents** in the backend (e.g. $1399.00 is handled as `139900`) to completely eliminate decimal rounding errors common in javascript floating-point arithmetic.
*   **Variant-Aware Live Updates**: The storefront widget listens to the theme's variant selectors and maps selections to a Liquid-rendered variant-to-price JSON mapping. If a user changes options (e.g., switches to a different color/size sofa bed), the widget automatically triggers a silent recalculation to update the displayed local price dynamically.

---

## 4. Backend API Documentation

### Get Price Estimate
Calculates freight shipping cost and final customer price based on destination ZIP code.

*   **URL**: `/api/price-estimate`
*   **Method**: `GET`
*   **Headers**: `Content-Type: application/json`
*   **CORS**: Enabled (`*` allows cross-origin requests directly from Shopify storefronts)
*   **Query Parameters**:
    *   `zip` (Required): String representing the 5-digit US ZIP code.
    *   `basePrice` (Optional): Integer representing product base price in cents (e.g. `139900`). Defaults to `139900` ($1,399.00).

#### Sample Request
```http
GET /api/price-estimate?zip=75028&basePrice=139900 HTTP/1.1
Host: shopify-zip-pricing-production.up.railway.app
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

## 5. How to Deploy to Railway

Railway auto-detects `Dockerfile` at the root and deploys the container in seconds:

1.  **Initialize Git**: If you haven't already, push this codebase to a private/public GitHub repository:
    ```bash
    git init
    git add .
    git commit -m "feat: init shopify zip pricing demo"
    # Push to GitHub...
    ```
2.  **Deploy on Railway**:
    *   Log into [Railway](https://railway.app/).
    *   Click **New Project** -> **Deploy from GitHub repo**.
    *   Select your repository and click **Deploy Now**.
3.  **Generate a Domain**:
    *   Once deployed, click on the service card in the Railway dashboard.
    *   Go to **Settings** -> **Public Networking** -> click **Generate Domain** (or set a custom one).
    *   Copy the URL generated (e.g., `https://shopify-zip-pricing-production.up.railway.app`).

---

## 6. How to Install the Storefront Widget in Shopify

1.  **Open Shopify Theme Editor**:
    *   In your Shopify admin, navigate to **Online Store > Themes**.
    *   Find the theme you wish to edit, click the three dots (`...`), and select **Edit Code**.
2.  **Paste Liquid Widget**:
    *   Find and open the `sections/main-product.liquid` file (or `snippets/product-form.liquid`).
    *   Search for the price block (e.g., searching for `{{ product.price` or `<div class="price">`).
    *   Paste the contents of [shopify/zip-pricing-widget.liquid](shopify/zip-pricing-widget.liquid) directly below the price tag.
3.  **Link Your Railway API URL**:
    *   Inside the pasted liquid code, look for this line in the `<script>` tag:
      ```javascript
      const SF_BACKEND_API_URL = 'https://shopify-zip-pricing-production.up.railway.app';
      ```
    *   Replace `https://shopify-zip-pricing-production.up.railway.app` with the domain assigned to you by Railway in Step 5.
4.  **Save changes** and load a product page to test!
