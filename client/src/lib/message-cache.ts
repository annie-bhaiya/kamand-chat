import { Message } from '@/types/chat';

/**
 * High-performance client-side message cache.
 * Provides instant (0ms) access to recent conversation messages via in-memory Map
 * backed by sessionStorage for instant rendering across page navigations.
 */

const memoryCache = new Map<string, Message[]>();
const MAX_CACHED_CONVERSATIONS = 20;
const MAX_MESSAGES_PER_CONV = 50;

function getStorageKey(convId: string, userId?: string): string {
  return `kamand_mc_${userId || 'anon'}_${convId}`;
}

export function getCachedMessages(convId: string, userId?: string): Message[] | null {
  // 1. Fast in-memory lookup (0ms)
  const mem = memoryCache.get(convId);
  if (mem && mem.length > 0) {
    return mem;
  }

  // 2. Fallback to sessionStorage
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getStorageKey(convId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Message[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryCache.set(convId, parsed);
      return parsed;
    }
  } catch {
    // Graceful fallback if storage disabled or corrupted
  }

  return null;
}

export function setCachedMessages(convId: string, messages: Message[], userId?: string): void {
  if (!messages || messages.length === 0) return;

  // Keep most recent messages up to limit
  const trimmed = messages.slice(-MAX_MESSAGES_PER_CONV);

  // 1. Store in fast memory
  memoryCache.set(convId, trimmed);

  // Maintain memory cache size
  if (memoryCache.size > MAX_CACHED_CONVERSATIONS) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }

  // 2. Persist to sessionStorage in idle/next frame
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getStorageKey(convId, userId), JSON.stringify(trimmed));
  } catch {
    // If quota exceeded, clear older cached keys
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('kamand_mc_') && key !== getStorageKey(convId, userId)) {
          sessionStorage.removeItem(key);
        }
      }
      sessionStorage.setItem(getStorageKey(convId, userId), JSON.stringify(trimmed));
    } catch {
      // Storage unavailable or disabled
    }
  }
}

export function clearMessageCache(): void {
  memoryCache.clear();
  if (typeof window === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('kamand_mc_')) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignored
  }
}
