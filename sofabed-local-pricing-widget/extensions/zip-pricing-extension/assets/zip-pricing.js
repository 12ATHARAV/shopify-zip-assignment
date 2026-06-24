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
        
        // Cache shipping fee in cents for cart checkout sync
        localStorage.setItem('sf_shipping_fee_cents', data.shippingFeeCents);

        // If cart has items, sync shipping variant immediately
        try {
          const shippingVariantId = sfGetClosestShippingVariant(data.shippingFeeCents);
          if (shippingVariantId) {
            const cartRes = await fetch('/cart.js');
            const cart = await cartRes.json();
            if (cart && cart.items && cart.items.length > 0) {
              await sfAddShippingToCart(shippingVariantId);
            }
          }
        } catch (e) {
          console.warn('Failed to sync shipping variant on price calculation:', e);
        }

        // Silently prepare shipping rates in session to pre-fill ZIP code at checkout
        try {
          const province = sfGetStateFromZip(zip);
          fetch('/cart/prepare_shipping_rates.json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              shipping_address: {
                zip: zip,
                country: 'US',
                province: province
              }
            })
          });
        } catch (e) {
          console.warn('Failed to pre-estimate shipping rates silently:', e);
        }
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

  // Utility mapping function to get 2-letter state code based on US ZIP code
  function sfGetStateFromZip(zipString) {
    const zip = parseInt(zipString, 10);
    if (isNaN(zip)) return '';
    
    if (zip >= 35000 && zip <= 36999) return 'AL';
    if (zip >= 99500 && zip <= 99999) return 'AK';
    if (zip >= 85000 && zip <= 86999) return 'AZ';
    if (zip >= 71600 && zip <= 72999) return 'AR';
    if (zip >= 90000 && zip <= 96199) return 'CA';
    if (zip >= 80000 && zip <= 81699) return 'CO';
    if (zip >= 6000 && zip <= 6999) return 'CT';
    if (zip >= 19700 && zip <= 19999) return 'DE';
    if (zip === 20001 || (zip >= 20001 && zip <= 20039) || (zip >= 20042 && zip <= 20599)) return 'DC';
    if (zip >= 32000 && zip <= 34999) return 'FL';
    if (zip >= 30000 && zip <= 31999) return 'GA';
    if (zip >= 96700 && zip <= 96899) return 'HI';
    if (zip >= 83200 && zip <= 83899) return 'ID';
    if (zip >= 60000 && zip <= 62999) return 'IL';
    if (zip >= 46000 && zip <= 47999) return 'IN';
    if (zip >= 50000 && zip <= 52899) return 'IA';
    if (zip >= 66000 && zip <= 67999) return 'KS';
    if (zip >= 40000 && zip <= 42799) return 'KY';
    if (zip >= 70000 && zip <= 71499) return 'LA';
    if (zip >= 3900 && zip <= 4999) return 'ME';
    if (zip >= 20600 && zip <= 21999) return 'MD';
    if (zip >= 1000 && zip <= 2799) return 'MA';
    if (zip >= 48000 && zip <= 49999) return 'MI';
    if (zip >= 55000 && zip <= 56799) return 'MN';
    if (zip >= 38600 && zip <= 39799) return 'MS';
    if (zip >= 63000 && zip <= 65899) return 'MO';
    if (zip >= 59000 && zip <= 59999) return 'MT';
    if (zip >= 68000 && zip <= 69399) return 'NE';
    if (zip >= 89000 && zip <= 89899) return 'NV';
    if (zip >= 3000 && zip <= 3899) return 'NH';
    if (zip >= 7000 && zip <= 8999) return 'NJ';
    if (zip >= 87000 && zip <= 88499) return 'NM';
    if (zip >= 10000 && zip <= 14999) return 'NY';
    if (zip >= 27000 && zip <= 28999) return 'NC';
    if (zip >= 58000 && zip <= 58899) return 'ND';
    if (zip >= 43000 && zip <= 45999) return 'OH';
    if (zip >= 73000 && zip <= 74999) return 'OK';
    if (zip >= 97000 && zip <= 97999) return 'OR';
    if (zip >= 15000 && zip <= 19699) return 'PA';
    if (zip >= 2800 && zip <= 2999) return 'RI';
    if (zip >= 29000 && zip <= 29999) return 'SC';
    if (zip >= 57000 && zip <= 57799) return 'SD';
    if (zip >= 37000 && zip <= 38599) return 'TN';
    if (zip >= 75000 && zip <= 79999) return 'TX';
    if (zip >= 84000 && zip <= 84799) return 'UT';
    if (zip >= 500 && zip <= 599) return 'VT';
    if (zip >= 22000 && zip <= 24699) return 'VA';
    if (zip >= 98000 && zip <= 99499) return 'WA';
    if (zip >= 24700 && zip <= 26899) return 'WV';
    if (zip >= 53000 && zip <= 54999) return 'WI';
    if (zip >= 82000 && zip <= 83199) return 'WY';
    
    return '';
  }

  // Helper to map calculated shipping fees in cents to closest available Shopify variant ID
  function sfGetClosestShippingVariant(feeCents) {
    const fee = parseInt(feeCents, 10);
    if (isNaN(fee) || fee <= 0) return null;

    if (fee <= 15000) {
      return '47998567186619'; // $100.00 variant
    } else if (fee <= 35000) {
      return '47998567219387'; // $300.00 variant
    } else {
      return '47998567252155'; // $400.00 variant
    }
  }

  // Export functions to global window object so click handlers work
  window.sfCalculateZipPrice = sfCalculateZipPrice;
  window.sfGetActiveBasePrice = sfGetActiveBasePrice;

  // Dynamic mapping of shipping fee prices (cents) to their corresponding Shopify variant IDs
  const SHIPPING_VARIANT_MAPPING = {
    10000: '47998567186619', // $100.00 shipping fee
    30000: '47998567219387', // $300.00 shipping fee
    40000: '47998567252155', // $400.00 shipping fee
    9900: '47998567186619',  // $99.00 regional rate -> fallback to $100 variant
    28900: '47998567219387'  // $289.00 regional rate -> fallback to $300 variant
  };

  // Add the correct shipping rate product variant to the cart and clean up any old ones
  async function sfAddShippingToCart(variantId) {
    try {
      const cartRes = await fetch('/cart.js');
      const cart = await cartRes.json();
      
      const shippingVariantIds = Object.values(SHIPPING_VARIANT_MAPPING);
      const targetVariantIdInt = parseInt(variantId);
      
      // Check what shipping variants we have in the cart
      const existingTargetItem = cart.items.find(item => item.variant_id === targetVariantIdInt);
      const otherShippingItems = cart.items.filter(item => 
        shippingVariantIds.includes(item.variant_id.toString()) && item.variant_id !== targetVariantIdInt
      );

      // If other shipping variants exist, we must remove them
      if (otherShippingItems.length > 0) {
        const updates = {};
        otherShippingItems.forEach(item => {
          updates[item.variant_id] = 0;
        });
        
        // If the target item is already in the cart, ensure its quantity is 1 in this update call
        if (existingTargetItem) {
          updates[targetVariantIdInt] = 1;
        }

        await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });
      }

      // Re-fetch cart state to verify target item presence
      let finalTargetItemExists = false;
      if (otherShippingItems.length > 0) {
        const checkRes = await fetch('/cart.js');
        const checkCart = await checkRes.json();
        finalTargetItemExists = checkCart.items.some(item => item.variant_id === targetVariantIdInt && item.quantity === 1);
      } else {
        finalTargetItemExists = existingTargetItem && existingTargetItem.quantity === 1;
      }

      // If the target item is not in the cart with quantity 1, add/set it
      if (!finalTargetItemExists) {
        if (existingTargetItem && existingTargetItem.quantity !== 1) {
          // Wrong quantity, force to exactly 1
          const updates = {};
          updates[targetVariantIdInt] = 1;
          await fetch('/cart/update.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
          });
        } else {
          // Not in cart at all, add it
          await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: [{ id: variantId, quantity: 1 }]
            })
          });
        }
      }
    } catch (err) {
      console.error('Failed to sync shipping variant to cart:', err);
    }
  }

  // Intercept checkout actions using event capturing to prevent theme race conditions
  function sfSetupCheckoutInterceptor() {
    let isProcessing = false;

    // Helper function to handle async checkout redirect using Cart Permalinks
    async function handleCheckout(event, checkoutUrl) {
      const cachedZip = localStorage.getItem('sf_customer_zip');
      if (!cachedZip) return; // Let default checkout happen if no ZIP

      if (isProcessing) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      isProcessing = true;
      event.preventDefault();
      event.stopPropagation();

      // Disable target elements during cart sync to show loading
      const target = event.target.closest('a, button, input[type="submit"]');
      if (target) {
        target.style.opacity = '0.6';
        target.style.pointerEvents = 'none';
      }

      try {
        // 1. Fetch current cart to construct the permalink
        const cartRes = await fetch('/cart.js');
        const cart = await cartRes.json();

        const shippingVariantIds = Object.values(SHIPPING_VARIANT_MAPPING);
        const shippingFee = localStorage.getItem('sf_shipping_fee_cents');
        const correctVariantId = sfGetClosestShippingVariant(shippingFee);

        // Build permalink items
        const permalinkItems = [];
        
        cart.items.forEach(item => {
          const itemVarIdStr = item.variant_id.toString();
          // Skip any existing shipping variants in the cart to avoid duplicates
          if (!shippingVariantIds.includes(itemVarIdStr)) {
            permalinkItems.push(`${item.variant_id}:${item.quantity}`);
          }
        });

        // Add the correct shipping fee variant
        if (correctVariantId) {
          permalinkItems.push(`${correctVariantId}:1`);
        }

        if (permalinkItems.length === 0) {
          window.location.href = '/checkout';
          return;
        }

        // 2. Pre-fill address in session via Shopify Cart API (prepare_shipping_rates) just in case
        const province = sfGetStateFromZip(cachedZip);
        try {
          await fetch('/cart/prepare_shipping_rates.json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              shipping_address: {
                zip: cachedZip,
                country: 'US',
                province: province
              }
            })
          });
        } catch (err) {
          console.warn('Failed to prepare shipping rates in session:', err);
        }

        // 3. Build permalink URL
        const itemsString = permalinkItems.join(',');
        const permalinkUrl = `/cart/${itemsString}?checkout[shipping_address][zip]=${cachedZip}&checkout[shipping_address][country]=US&checkout[shipping_address][province]=${province}`;
        
        console.log('Redirecting to permalink:', permalinkUrl);
        window.location.href = permalinkUrl;
      } catch (e) {
        console.error('Error during checkout redirection:', e);
        // Fallback to standard checkout if anything fails
        window.location.href = '/checkout';
      }
    }

    // 1. Intercept clicks on links redirecting to checkout (using Capture phase)
    document.addEventListener('click', function(event) {
      const target = event.target.closest('a[href*="/checkout"], [name="checkout"]');
      if (!target) return;

      // Handle standard link clicks or checkout buttons
      if (target.tagName === 'A') {
        handleCheckout(event, target.href);
      } else {
        const form = target.closest('form');
        if (!form || !form.action.includes('/cart/add')) {
          handleCheckout(event, '/checkout');
        }
      }
    }, true); // Use event capturing to run before theme scripts!

    // 2. Intercept cart form submit events (excluding add to cart, using Capture phase)
    document.addEventListener('submit', function(event) {
      const form = event.target;
      const action = form.getAttribute('action') || '';
      
      // Target only checkout/cart form submissions, specifically ignoring '/cart/add'
      if (action === '/cart' || action === '/checkout' || action.includes('/checkouts') || form.querySelector('[name="checkout"]')) {
        // Skip intercepting add to cart actions
        if (action.includes('/cart/add')) {
          return;
        }
        handleCheckout(event, action || '/checkout');
      }
    }, true); // Use event capturing to run before theme scripts!
  }

  // Intercept Add to Cart to add both product and shipping variant
  function sfSetupAddToCartInterceptor() {
    document.addEventListener('submit', async function(event) {
      const form = event.target;
      const action = form.getAttribute('action') || '';
      
      if (action.includes('/cart/add')) {
        const cachedZip = localStorage.getItem('sf_customer_zip');
        const shippingFee = localStorage.getItem('sf_shipping_fee_cents');
        const shippingVariantId = sfGetClosestShippingVariant(shippingFee);

        if (!cachedZip || !shippingVariantId) {
          return; // Let default add-to-cart happen
        }

        // Prevent theme default ajax
        event.preventDefault();
        event.stopPropagation();

        const submitBtn = form.querySelector('[type="submit"], .product-form__submit');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset.originalText = submitBtn.innerHTML;
          submitBtn.innerHTML = 'Adding to cart...';
        }

        try {
          const variantIdInput = form.querySelector('[name="id"]');
          const variantId = variantIdInput ? variantIdInput.value : null;

          if (!variantId) {
            form.submit();
            return;
          }

          // Add both variants
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: [
                { id: parseInt(variantId), quantity: 1 },
                { id: parseInt(shippingVariantId), quantity: 1 }
              ]
            })
          });

          if (response.ok) {
            // Redirect to cart to show updated items and subtotal
            window.location.href = '/cart';
          } else {
            form.submit();
          }
        } catch (err) {
          console.error('Failed to intercept add-to-cart:', err);
          form.submit();
        }
      }
    }, true); // Use capturing phase to run before theme scripts!
  }

  // Export functions to global window object so click handlers work
  window.sfCalculateZipPrice = sfCalculateZipPrice;
  window.sfGetActiveBasePrice = sfGetActiveBasePrice;

  // Run automatically when the DOM is loaded to check for cached ZIP code and register interceptors
  document.addEventListener('DOMContentLoaded', function() {
    const cachedZip = localStorage.getItem('sf_customer_zip');
    const zipInput = document.getElementById('sf-zip-input');
    
    if (cachedZip && zipInput) {
      zipInput.value = cachedZip;
      sfCalculateZipPrice(true); // Run silent calculation
    }

    sfSetupCheckoutInterceptor();
    sfSetupAddToCartInterceptor();
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
