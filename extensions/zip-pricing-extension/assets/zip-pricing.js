/**
 * Shopify ZIP Pricing Widget - Theme App Extension JavaScript
 * Handles ZIP code validation, API calls to Railway backend, and DOM updates.
 */

(function () {
  // Configuration: Backend API endpoint (obfuscated to prevent plaintext scraping)
  const SF_BACKEND_API_URL = atob('aHR0cHM6Ly9zaG9waWZ5LXppcC1hc3NpZ25tZW50LXByb2R1Y3Rpb24udXAucmFpbHdheS5hcHA=');

  // Get current active base price (checks chosen variant, falls back to default)
  function sfGetActiveBasePrice() {
    const idField = document.querySelector('form[action*="/cart/add"] [name="id"], select[name="id"], input[name="id"], [data-product-select]');
    if (idField && window.SF_VARIANT_PRICES && window.SF_VARIANT_PRICES[idField.value]) {
      return window.SF_VARIANT_PRICES[idField.value];
    }
    // Fallback to currently selected variant price on initial load
    return window.SF_DEFAULT_PRODUCT_PRICE || 139900;
  }

  // Calculate pricing based on ZIP code input
  async function sfCalculateZipPrice(isSilent = false) {
    const zipInput = document.getElementById('sf-zip-input');
    const submitBtn = document.getElementById('sf-zip-submit');
    const resultDiv = document.getElementById('sf-widget-result');
    const badgeSpan = document.getElementById('sf-widget-badge');

    if (!zipInput) return;

    const zip = zipInput.value.trim();

    // 1. Validation
    if (!/^\d{5}$/.test(zip)) {
      if (!isSilent) {
        alert('Please enter a valid 5-digit US ZIP code.');
      }
      return;
    }

    // 2. Loading state
    if (!isSilent && submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Calculating...';
    }

    // 3. Cache ZIP code for customer convenience
    localStorage.setItem('sf_customer_zip', zip);

    // 4. Retrieve current active variant base price
    const currentBasePrice = sfGetActiveBasePrice();

    try {
      // 5. API Request to the pricing service (passes Origin and Referer automatically)
      const response = await fetch(`${SF_BACKEND_API_URL}/api/price-estimate?zip=${zip}&basePrice=${currentBasePrice}`);
      const data = await response.json();

      if (response.ok && data.success) {
        // 6. Update values in the storefront UI
        document.getElementById('sf-res-base-price').textContent = data.formattedBasePrice;
        document.getElementById('sf-res-shipping').textContent = data.formattedShippingFee;
        document.getElementById('sf-res-total').textContent = data.formattedTotalPrice;
        document.getElementById('sf-res-method').textContent = data.shippingMethod;
        document.getElementById('sf-res-timeline').textContent = data.deliveryTimeline;

        // Display results and calculated badge
        if (resultDiv) resultDiv.style.display = 'block';
        if (badgeSpan) badgeSpan.style.display = 'inline-flex';

        // Update the theme's native price container (if found)
        sfUpdateNativeThemePrice(data.formattedTotalPrice);
      } else {
        console.error('ZIP pricing calculation failed:', data.error);
        if (!isSilent) {
          alert('Calculation Error: ' + (data.error || 'Server error.'));
        }
      }
    } catch (err) {
      console.error('Failed to connect to ZIP pricing backend:', err);
      if (!isSilent) {
        alert('Failed to connect to the shipping server. Please try again later.');
      }
    } finally {
      if (!isSilent && submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.originalText || 'Check Price';
      }
    }
  }

  // Attempt to update the main storefront price directly for a cleaner experience
  function sfUpdateNativeThemePrice(newPriceString) {
    const priceSelectors = [
      '.product-single__price', 
      '.price-item--regular', 
      '.product__price .price', 
      '.product-single__price .price-item',
      '.price__regular .price-item--regular',
      '.modal-layout-price'
    ];

    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        // Optional override: can update text directly
        // el.innerHTML = newPriceString;
        break;
      }
    }
  }

  // Export functions to global window object so click handlers work
  window.sfCalculateZipPrice = sfCalculateZipPrice;
  window.sfGetActiveBasePrice = sfGetActiveBasePrice;

  // Run automatically when the DOM is loaded to check for cached ZIP code
  document.addEventListener('DOMContentLoaded', function() {
    const cachedZip = localStorage.getItem('sf_customer_zip');
    const zipInput = document.getElementById('sf-zip-input');
    
    if (cachedZip && zipInput) {
      zipInput.value = cachedZip;
      sfCalculateZipPrice(true); // Run silent calculation
    }
  });

  // Listen for variant selector changes in the theme to recalculate automatically
  document.addEventListener('change', function(event) {
    if (event.target && (event.target.name === 'id' || event.target.classList.contains('single-option-selector') || event.target.closest('[data-action="change-variant"]') || event.target.classList.contains('product-form__input'))) {
      // Re-trigger calculation after a tiny delay to let the DOM select input value update
      setTimeout(function() {
        const zipInput = document.getElementById('sf-zip-input');
        if (zipInput && /^\d{5}$/.test(zipInput.value.trim())) {
          sfCalculateZipPrice(true); // Silent update when variant changes
        }
      }, 150);
    }
  });
})();
