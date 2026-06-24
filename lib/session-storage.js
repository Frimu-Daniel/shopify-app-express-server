import {Session} from '@shopify/shopify-api';

const sessions = new Map();

export const sessionStorage = {
  async storeSession(session) {
    sessions.set(session.id, session);
    return true;
  },

  async loadSession(id) {
    return sessions.get(id);
  },

  async deleteSession(id) {
    return sessions.delete(id);
  },
};