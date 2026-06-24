import {shopifyApi, ApiVersion} from '@shopify/shopify-api';

let _shopify;

export function getShopify() {
  if (!_shopify) {
    const host =
      process.env.HOST ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined) ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://localhost:3000');

    _shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET,
      scopes: process.env.SCOPES.split(','),
      hostName: host.replace(/https?:\/\//, ''),
      hostScheme: 'https',
      apiVersion: ApiVersion.January25,
      isEmbeddedApp: true,
    });
  }
  return _shopify;
}