import type { Server } from 'socket.io';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unwrap } from './errors.js';

interface MemberCacheEntry {
  userIds: string[];
  cachedAt: number;
}

export class Events {
  io?: Server;
  private memberCache = new Map<string, MemberCacheEntry>();
  private readonly memberCacheTtlMs = 60_000;

  invalidateMembers(conversationId: string) {
    this.memberCache.delete(conversationId);
  }

  setMembers(conversationId: string, userIds: string[]) {
    this.memberCache.set(conversationId, { userIds, cachedAt: Date.now() });
  }

  async conversation(db: SupabaseClient, conversationId: string, event: string, payload: unknown) {
    let userIds: string[] | undefined;
    const cached = this.memberCache.get(conversationId);
    if (cached && Date.now() - cached.cachedAt < this.memberCacheTtlMs) {
      userIds = cached.userIds;
    } else {
      const members = unwrap(await db.from('conversation_members').select('user_id').eq('conversation_id', conversationId).is('left_at', null));
      if (members) {
        userIds = members.map(m => m.user_id);
        this.memberCache.set(conversationId, { userIds, cachedAt: Date.now() });
      }
    }
    if (userIds?.length) {
      this.io?.to(userIds.map(id => `user:${id}`)).emit(event, payload);
    }
  }
  user(userId: string, event: string, payload: unknown) { this.io?.to(`user:${userId}`).emit(event, payload); }
  logout(sessionId: string) { this.io?.in(`session:${sessionId}`).disconnectSockets(true); }
  // Events are hints. Once committed, an event failure must not turn a saved write into an HTTP failure.
  async safely(action: () => Promise<void>) {
    try { await action(); } catch { console.error(JSON.stringify({ event: 'delivery_hint_failed' })); }
  }
}
