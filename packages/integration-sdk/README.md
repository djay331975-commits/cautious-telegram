# @autostream/integration-sdk

This package provides robust adapters for external e-commerce and fulfillment platforms.

## Supported Integrations

- **Shopify:** Product and order management.
- **Printful:** Print-on-demand fulfillment.

## Features

- **Standardized Types:** Unified interfaces for `BaseProduct` and `BaseOrder`.
- **Consistent Error Handling:** Custom error classes (`RateLimitError`, `AuthenticationError`, etc.).
- **Rate Limiting:** Interceptors to handle and signal rate limit exceeded status.
- **TypeScript First:** Full type safety for all API interactions.

## Usage

```typescript
import { ShopifyAdapter } from '@autostream/integration-sdk';

const shopify = new ShopifyAdapter({
  shopName: 'my-store',
  accessToken: 'shpat_...',
});

const products = await shopify.getProducts();
```
