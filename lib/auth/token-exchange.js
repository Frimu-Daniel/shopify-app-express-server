import {Session, InvalidJwtError, HttpResponseError, RequestedTokenType} from '@shopify/shopify-api';
import {getShopify} from '../shopify.js';
import {sessionStorage} from '../session-storage.js';

const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export class HttpError extends Error {
  constructor(message, status, headers = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.headers = headers;
  }
}

export async function authenticateRequest(request) {
  const sessionToken = extractSessionToken(request);
  if (!sessionToken) {
    throw new HttpError('Unauthorized', 401, {
      'X-Shopify-Retry-Invalid-Session-Request': '1',
    });
  }

  const shopify = getShopify();
  const payload = await shopify.session.decodeSessionToken(sessionToken);
  const shop = new URL(payload.dest).hostname;

  // Use online session for user-scoped requests.
  const onlineSessionId = shopify.session.getJwtSessionId(shop, payload.sub);

  const existingSession = await sessionStorage.loadSession(onlineSessionId);

  if (existingSession?.accessToken && isSessionActive(existingSession)) {
    return existingSession;
  }

  return await performTokenExchange(shop, sessionToken);
}

async function performTokenExchange(
  shop,
  sessionToken,
) {
  try {
    const shopify = getShopify();
    // Get offline token first (for webhooks, background jobs)
    const {session: offlineSession} = await shopify.auth.tokenExchange({
      sessionToken,
      shop,
      requestedTokenType: RequestedTokenType.OfflineAccessToken,
    });
    await sessionStorage.storeSession(offlineSession);

    // Get online token for user-scoped operations
    const {session: onlineSession} = await shopify.auth.tokenExchange({
      sessionToken,
      shop,
      requestedTokenType: RequestedTokenType.OnlineAccessToken,
    });
    await sessionStorage.storeSession(onlineSession);

    return onlineSession;
  } catch (error) {
    if (
      error instanceof InvalidJwtError ||
      (error instanceof HttpResponseError &&
        error.response.code === 400 &&
        error.response.body?.error === 'invalid_subject_token')
    ) {
      throw new HttpError('Unauthorized', 401, {
        'X-Shopify-Retry-Invalid-Session-Request': '1',
      });
    }
    throw new HttpError('Internal Server Error', 500);
  }
}

function extractSessionToken(request) {
  const authHeader = getAuthorizationHeader(request);
  if (typeof authHeader === 'string') {
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) {
      return token;
    }
  }

  if (typeof request.query?.id_token === 'string') {
    return request.query.id_token;
  }

  const rawUrl = request.originalUrl ?? request.url;
  if (!rawUrl) return null;

  const url = new URL(rawUrl, 'http://localhost');
  return url.searchParams.get('id_token');
}

function getAuthorizationHeader(request) {
  if (typeof request.headers?.get === 'function') {
    return request.headers.get('Authorization');
  }

  const authHeader = request.headers?.authorization;
  if (Array.isArray(authHeader)) {
    return authHeader[0] ?? null;
  }

  return authHeader ?? null;
}

function isSessionActive(session) {
  if (!session.expires) return true;
  return session.expires.getTime() - Date.now() > EXPIRY_BUFFER_MS;
}