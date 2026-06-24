import {Session, InvalidJwtError, HttpResponseError, RequestedTokenType} from '@shopify/shopify-api';
import {getShopify} from '../shopify.js';
import {sessionStorage} from '../session-storage.js';

const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export async function authenticateRequest(request) {
  const sessionToken = extractSessionToken(request);
  if (!sessionToken) {
    throw new Response('Unauthorized', {status: 401});
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
      throw new Response('Unauthorized', {
        status: 401,
        headers: {'X-Shopify-Retry-Invalid-Session-Request': '1'},
      });
    }
    throw new Response('Internal Server Error', {status: 500});
  }
}

function extractSessionToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const url = new URL(request.url);
  return url.searchParams.get('id_token');
}

function isSessionActive(session) {
  if (!session.expires) return true;
  return session.expires.getTime() - Date.now() > EXPIRY_BUFFER_MS;
}