import type {
  CartValidationsGenerateRunInput,
  CartValidationsGenerateRunResult,
  ValidationError,
} from "../generated/api";

export function cartValidationsGenerateRun(input: CartValidationsGenerateRunInput): CartValidationsGenerateRunResult {
  const errors: ValidationError[] = [];

  // 1. Resolve shipping address zip code
  // If deliveryGroups is present, extract zip code from the first group's address
  const deliveryGroup = input.cart.deliveryGroups?.[0];
  const zip = deliveryGroup?.deliveryAddress?.zip?.trim();

  // If there is no shipping ZIP code entered yet, we don't validate (customer has not entered their address)
  if (!zip) {
    return { operations: [] };
  }

  // 2. Identify the shipping fee variants in the cart
  // Shipping variants:
  // - $100.00 variant (ID: 47998567186619)
  // - $300.00 variant (ID: 47998567219387)
  // - $400.00 variant (ID: 47998567252155)
  const shippingVariants = ['47998567186619', '47998567219387', '47998567252155'];

  // Check what shipping fee variants are present in the cart lines
  const cartShippingLines = input.cart.lines.filter(line => {
    if (line.merchandise.__typename === "ProductVariant") {
      const gid = line.merchandise.id;
      // Extract numeric part from gid://shopify/ProductVariant/XXXXXX
      const numericId = gid.split("/").pop();
      return numericId && shippingVariants.includes(numericId);
    }
    return false;
  });

  // Check if cart has a product that requires shipping (e.g. Sofa)
  const hasPhysicalProducts = input.cart.lines.some(line => {
    if (line.merchandise.__typename === "ProductVariant") {
      const gid = line.merchandise.id;
      const numericId = gid.split("/").pop();
      // If it is not one of our shipping fee variants, we assume it's a physical product (like the sofa)
      return numericId && !shippingVariants.includes(numericId);
    }
    return false;
  });

  // If there are no physical products in the cart, no validation is needed
  if (!hasPhysicalProducts) {
    return { operations: [] };
  }

  // 3. Compute expected shipping variant ID based on the destination ZIP code
  let expectedVariantId = '47998567219387'; // Default to $300 fallback

  if (zip === '75028') {
    expectedVariantId = '47998567186619'; // $100
  } else if (zip === '10001') {
    expectedVariantId = '47998567219387'; // $300
  } else if (zip === '90210') {
    expectedVariantId = '47998567252155'; // $400
  } else {
    // Prefix switch zones
    const firstDigit = zip.charAt(0);
    switch (firstDigit) {
      case '7':
      case '3':
      case '6':
        expectedVariantId = '47998567186619'; // $100 variant (closest to $99 / $149)
        break;
      case '0':
      case '1':
      case '9':
      case '2':
      case '4':
      case '5':
      case '8':
        expectedVariantId = '47998567219387'; // $300 variant (closest to $289 / $199 / $250)
        break;
      default:
        expectedVariantId = '47998567219387';
    }
  }

  // 4. Validate cart contents
  if (cartShippingLines.length === 0) {
    // Physical product exists but no shipping fee is present
    errors.push({
      message: `Shipping fee is required. Please go back to the cart or product page and calculate shipping for ZIP code ${zip}.`,
      target: "$.cart"
    });
  } else {
    // Check if the shipping fee in the cart matches the expected one for this ZIP code
    const activeLine = cartShippingLines[0];
    if (activeLine.merchandise.__typename === "ProductVariant") {
      const activeVariantId = activeLine.merchandise.id.split("/").pop();
      if (activeVariantId !== expectedVariantId) {
        const expectedPriceStr = expectedVariantId === '47998567186619' ? '$100.00' :
                                 expectedVariantId === '47998567219387' ? '$300.00' : '$400.00';
        errors.push({
          message: `The shipping fee in your cart does not match the delivery address ZIP code (${zip}). Expected shipping fee: ${expectedPriceStr}. Please recalculate on the product page.`,
          target: "$.cart"
        });
      }
    }
  }

  if (errors.length > 0) {
    return {
      operations: [
        {
          validationAdd: {
            errors
          }
        }
      ]
    };
  }

  return { operations: [] };
}