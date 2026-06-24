import {getShopify} from '../shopify.js';
import {authenticateRequest} from './token-exchange.js';

export async function authenticateAdmin(request) {
  const session = await authenticateRequest(request);
  const client = new (getShopify().clients.Graphql)({session});

  return {session, client};
}