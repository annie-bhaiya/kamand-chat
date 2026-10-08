import type { Server } from 'socket.io';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unwrap } from './errors.js';

export class Events {
  io?: Server;
  async conversation(db: SupabaseClient, conversationId: string, event: string, payload: unknown) {
    const members = unwrap(await db.from('conversation_members').select('user_id').eq('conversation_id', conversationId).is('left_at', null));
    if (members?.length) this.io?.to(members.map(m => `user:${m.user_id}`)).emit(event, payload);
  }
  user(userId: string, event: string, payload: unknown) { this.io?.to(`user:${userId}`).emit(event, payload); }
  logout(sessionId: string) { this.io?.in(`session:${sessionId}`).disconnectSockets(true); }
  // Events are hints. Once committed, an event failure must not turn a saved write into an HTTP failure.
  async safely(action: () => Promise<void>) {
    try { await action(); } catch { console.error(JSON.stringify({ event: 'delivery_hint_failed' })); }
  }
}
