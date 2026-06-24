import '@shopify/shopify-api/adapters/node';
import {shopifyApi, ApiVersion} from '@shopify/shopify-api';

let _shopify;

function readRequiredEnv(name, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readScopes() {
  const rawScopes = process.env.SCOPES ?? process.env.SHOPIFY_SCOPES ?? '';
  return rawScopes
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

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

    const apiKey = readRequiredEnv('SHOPIFY_API_KEY', process.env.SHOPIFY_API_KEY);
    const apiSecretKey = readRequiredEnv('SHOPIFY_API_SECRET', process.env.SHOPIFY_API_SECRET);
    const scopes = readScopes();

    if (scopes.length === 0) {
      throw new Error('Missing required environment variable: SCOPES (or SHOPIFY_SCOPES)');
    }

    _shopify = shopifyApi({
      apiKey,
      apiSecretKey,
      scopes,
      hostName: host.replace(/https?:\/\//, ''),
      hostScheme: 'https',
      apiVersion: ApiVersion.January25,
      isEmbeddedApp: true,
    });
  }
  return _shopify;
}