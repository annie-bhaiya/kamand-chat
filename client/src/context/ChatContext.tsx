'use client';

import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { playMessageSound,playSentSound } from '@/lib/audio';
import { socketManager } from '@/lib/socket';
import { generateUUID } from '@/lib/utils';
import { getCachedMessages, setCachedMessages, clearMessageCache } from '@/lib/message-cache';
import {
Conversation,
ConversationReadEvent,
Message,
MessageReactionEvent,
TypingEvent,
} from '@/types/chat';
import React,{
createContext,
useCallback,
useContext,
useEffect,
useEffectEvent,
useRef,
useState,
} from 'react';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  messages: Message[];
  hasMoreMessages: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  typingUserIds: string[];
  selectConversation: (id: string | null, preloadedConversation?: Conversation) => Promise<void>;
  prefetchConversation: (id: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (body: string, attachmentIds?: string[]) => Promise<Message>;
  editMessage: (messageId: string, body: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  createDirectChat: (userId: string) => Promise<Conversation>;
  createGroupChat: (title: string, memberIds: string[]) => Promise<Conversation>;
  renameGroup: (title: string) => Promise<void>;
  addMemberToGroup: (userId: string) => Promise<void>;
  leaveOrRemoveMember: (userId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { error: notifyError } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [hasMoreByConv, setHasMoreByConv] = useState<Record<string, boolean>>({});
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected' | 'error'
  >('disconnected');

  // Typing tracking: conversationId -> Map of userId -> timeout
  const [typingMap, setTypingMap] = useState<Record<string, Record<string, boolean>>>({});
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const activeConvRef = useRef<string | null>(null);
  useEffect(() => { activeConvRef.current = activeConversationId; }, [activeConversationId]);

  const currentUserId = user?.id;
  const pagingRef = useRef(false);
  const sessionEpoch = useRef(0);
  const pendingSendIds = useRef(new Map<string, string>());
  useEffect(() => { sessionEpoch.current += 1; pendingSendIds.current.clear(); }, [currentUserId]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    const epoch = sessionEpoch.current;
    setIsLoadingConversations(true);
    try {
      const res = await api.getConversations();
      if (res.data && epoch === sessionEpoch.current) {
        setConversations(res.data);
      }
    } catch (err) {
      if (epoch === sessionEpoch.current) notifyError(err instanceof Error ? err.message : 'Could not load conversations.');
    } finally {
      if (epoch === sessionEpoch.current) setIsLoadingConversations(false);
    }
  }, [isAuthenticated, notifyError]);

  const syncAuthentication = useEffectEvent(() => {
    if (isAuthenticated) {
      loadConversations();
    } else {
      clearMessageCache();
      setConversations([]);
      setActiveConversationId(null);
      setMessagesByConv({});
      setHasMoreByConv({});
      setTypingMap({});
      setIsLoadingConversations(false);
      setIsLoadingMessages(false);
    }
  });
  // Authentication changes must clear private conversation state on logout.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { syncAuthentication(); }, [isAuthenticated, loadConversations]);

  // Load messages for a conversation with background option to prevent loading flashes
  const loadMessagesForConversation = useCallback(
    async (conversationId: string, options?: { background?: boolean }) => {
      const epoch = sessionEpoch.current;
      const isBackground = options?.background;
      if (!isBackground && activeConvRef.current === conversationId) {
        setIsLoadingMessages(true);
      }
      try {
        const res = await api.getMessages(conversationId, { limit: 50 });
        if (res.data && epoch === sessionEpoch.current) {
          // Server returns newest-first descending by seq. We reverse for ascending display.
          const sorted = [...res.data].sort((a, b) => a.seq - b.seq);
          setCachedMessages(conversationId, sorted, currentUserId);
          setMessagesByConv((prev) => ({
            ...prev,
            [conversationId]: [...new Map([...(prev[conversationId] || []), ...sorted].map((message) => [message.id, message])).values()].sort((a, b) => a.seq - b.seq),
          }));
          setHasMoreByConv((prev) => ({
            ...prev,
            [conversationId]: !!res.next_cursor,
          }));

          // Automatically mark conversation as read
          const lastMsg = sorted.at(-1);
          if (lastMsg && lastMsg.seq > 0 && activeConvRef.current === conversationId) {
            api.markRead(conversationId, lastMsg.seq).catch(() => {});
          }
        }
      } catch (err) {
        if (!isBackground && epoch === sessionEpoch.current && activeConvRef.current === conversationId) {
          notifyError(err instanceof Error ? err.message : 'Could not load messages.');
        }
      } finally {
        if (!isBackground && epoch === sessionEpoch.current && activeConvRef.current === conversationId) {
          setIsLoadingMessages(false);
        }
      }
    },
    [currentUserId, notifyError]
  );

  // In-flight tracking to avoid redundant parallel network requests
  const inFlightPrefetches = useRef(new Set<string>());

  // Prefetch conversation messages on hover/idle for 0ms transition
  const prefetchConversation = useCallback(
    async (conversationId: string) => {
      if (!conversationId || inFlightPrefetches.current.has(conversationId)) return;
      // Skip if messages already loaded in state or memory cache
      if (
        (messagesByConv[conversationId] && messagesByConv[conversationId].length > 0) ||
        (getCachedMessages(conversationId, currentUserId)?.length ?? 0) > 0
      ) {
        return;
      }
      inFlightPrefetches.current.add(conversationId);
      try {
        const res = await api.getMessages(conversationId, { limit: 50 });
        if (res.data && res.data.length > 0) {
          const sorted = [...res.data].sort((a, b) => a.seq - b.seq);
          setCachedMessages(conversationId, sorted, currentUserId);
          setMessagesByConv((prev) => ({
            ...prev,
            [conversationId]: prev[conversationId] || sorted,
          }));
          setHasMoreByConv((prev) => ({
            ...prev,
            [conversationId]: !!res.next_cursor,
          }));
        }
      } catch {
        // Silently ignore prefetch errors
      } finally {
        inFlightPrefetches.current.delete(conversationId);
      }
    },
    [currentUserId, messagesByConv]
  );

  // Load older messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!activeConversationId || pagingRef.current) return;
    const currentList = messagesByConv[activeConversationId] || [];
    if (currentList.length === 0) return;

    const oldestSeq = currentList[0].seq;
    if (oldestSeq <= 1) return;

    const epoch = sessionEpoch.current;
    pagingRef.current = true;
    setIsLoadingMessages(true);
    try {
      const res = await api.getMessages(activeConversationId, {
        before_seq: oldestSeq,
        limit: 50,
      });
      if (epoch !== sessionEpoch.current) return;
      if (res.data && res.data.length > 0) {
        const sortedOlder = [...res.data].sort((a, b) => a.seq - b.seq);
        setMessagesByConv((prev) => ({
          ...prev,
          [activeConversationId]: [...new Map([...sortedOlder, ...(prev[activeConversationId] || [])].map(message => [message.id, message])).values()].sort((a, b) => a.seq - b.seq),
        }));
        setHasMoreByConv((prev) => ({
          ...prev,
          [activeConversationId]: !!res.next_cursor,
        }));
      } else {
        setHasMoreByConv((prev) => ({
          ...prev,
          [activeConversationId]: false,
        }));
      }
    } catch (err) {
      if (epoch === sessionEpoch.current) notifyError(err instanceof Error ? err.message : 'Could not load older messages.');
    } finally { pagingRef.current = false; if (epoch === sessionEpoch.current && activeConvRef.current === activeConversationId) setIsLoadingMessages(false); }
  }, [activeConversationId, messagesByConv, notifyError]);

  // Select a conversation: Instant display from memory or persistent cache
  const selectConversation = useCallback(
    async (id: string | null, preloadedConversation?: Conversation) => {
      const epoch = sessionEpoch.current;
      activeConvRef.current = id;
      setActiveConversationId(id);

      if (id) {
        // INSTANT DISPLAY: Check memory state or persistent message cache
        const inMemory = messagesByConv[id];
        const cached = inMemory && inMemory.length > 0 ? inMemory : getCachedMessages(id, currentUserId);

        if (cached && cached.length > 0) {
          // Messages exist in cache! Render IMMEDIATELY (0ms wait, no loading screen)
          if (!inMemory || inMemory.length === 0) {
            setMessagesByConv((prev) => ({ ...prev, [id]: cached }));
          }
          setIsLoadingMessages(false);
          const lastMsg = cached.at(-1);
          if (lastMsg && lastMsg.seq > 0) {
            api.markRead(id, lastMsg.seq).catch(() => {});
          }
          // Revalidate in background without blocking UI
          void loadMessagesForConversation(id, { background: true });
        } else {
          // Fresh conversation with no cached messages
          setIsLoadingMessages(true);
          void loadMessagesForConversation(id);
        }

        // Fetch conversation details if not present, in parallel
        if (preloadedConversation) {
          setConversations((prev) => (prev.some((c) => c.id === id) ? prev : [preloadedConversation, ...prev]));
        } else {
          const convExists = conversations.some((c) => c.id === id);
          if (!convExists) {
            void api.getConversation(id).then((res) => {
              if (res.data && epoch === sessionEpoch.current) {
                setConversations((prev) => (prev.some((c) => c.id === id) ? prev : [res.data, ...prev]));
              }
            }).catch((e) => console.error('Failed to load conversation details:', e));
          }
        }
      } else {
        setIsLoadingMessages(false);
      }
    },
    [conversations, currentUserId, messagesByConv, loadMessagesForConversation]
  );

  // Handle Socket Events
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubs: Array<() => void> = [];
    const timers = typingTimers.current;

    // Connection status
    unsubs.push(
      socketManager.on('connection:status', (info: { status?: 'connected' | 'connecting' | 'disconnected' | 'error'; connected?: boolean }) => {
        setConnectionStatus(info.status || (info.connected ? 'connected' : 'disconnected'));
        if (info.connected) {
          // Revalidate conversation list and active conversation without clearing memory cache
          loadConversations();
          if (activeConvRef.current) void loadMessagesForConversation(activeConvRef.current);
        }
      })
    );

    // New Message
    unsubs.push(
      socketManager.on('message:new', (newMsg: Message) => {
        const convId = newMsg.conversation_id;

        // Sound effect
        if (newMsg.sender_id !== currentUserId) {
          playMessageSound();
        }

        setMessagesByConv((prev) => {
          const existing = prev[convId] || [];
          if (existing.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          const replaced = existing.map((m) =>
            newMsg.client_message_id && (m.client_message_id === newMsg.client_message_id || m.id === newMsg.client_message_id)
              ? newMsg
              : m
          );
          if (!replaced.some((m) => m.id === newMsg.id)) {
            replaced.push(newMsg);
          }
          const deduped = [...new Map(replaced.map((m) => [m.id, m])).values()];
          const sorted = deduped.sort((a, b) => a.seq - b.seq);
          setCachedMessages(convId, sorted, currentUserId);
          return {
            ...prev,
            [convId]: sorted,
          };
        });

        // Update conversation summary in list
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              return {
                ...c,
                last_seq: newMsg.seq,
                last_message_at: newMsg.created_at,
                last_activity_at: newMsg.created_at,
              };
            }
            return c;
          }).sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
        );

        // Mark as read immediately if current active conversation
        if (activeConvRef.current === convId) {
          api.markRead(convId, newMsg.seq).catch(() => {});
        }
      })
    );

    // Message Updated
    unsubs.push(
      socketManager.on('message:updated', (updatedMsg: Message) => {
        const convId = updatedMsg.conversation_id;
        setMessagesByConv((prev) => {
          const list = prev[convId] || [];
          const updated = list.map((m) => (m.id === updatedMsg.id ? updatedMsg : m));
          setCachedMessages(convId, updated, currentUserId);
          return {
            ...prev,
            [convId]: updated,
          };
        });
      })
    );

    // Message Deleted
    unsubs.push(
      socketManager.on('message:deleted', (tombstone: { id: string; conversation_id: string; deleted_at: string; seq: number }) => {
        const convId = tombstone.conversation_id;
        setMessagesByConv((prev) => {
          const list = prev[convId] || [];
          const updated = list.map((m) =>
            m.id === tombstone.id ? { ...m, deleted_at: tombstone.deleted_at, body: '' } : m
          );
          setCachedMessages(convId, updated, currentUserId);
          return {
            ...prev,
            [convId]: updated,
          };
        });
      })
    );

    // Message Reaction
    unsubs.push(
      socketManager.on('message:reaction', (reactionEvent: MessageReactionEvent) => {
        setMessagesByConv((prev) => {
          const updated = { ...prev };
          for (const convId in updated) {
            const list = updated[convId];
            const msgIndex = list.findIndex((m) => m.id === reactionEvent.message_id);
            if (msgIndex !== -1) {
              const msg = list[msgIndex];
              const reactions = msg.message_reactions || [];
              let newReactions = [...reactions];

              if (reactionEvent.removed) {
                newReactions = newReactions.filter(
                  (r) => !(r.user_id === reactionEvent.user_id && r.emoji === reactionEvent.emoji)
                );
              } else {
                if (!newReactions.some((r) => r.user_id === reactionEvent.user_id && r.emoji === reactionEvent.emoji)) {
                  newReactions.push({
                    message_id: reactionEvent.message_id,
                    user_id: reactionEvent.user_id,
                    emoji: reactionEvent.emoji,
                    created_at: new Date().toISOString(),
                  });
                }
              }

              const newList = [...list];
              newList[msgIndex] = { ...msg, message_reactions: newReactions };
              updated[convId] = newList;
              break;
            }
          }
          return updated;
        });
      })
    );

    // Conversation Updated
    unsubs.push(
      socketManager.on('conversation:updated', ({ conversation_id }: { conversation_id: string }) => {
        const epoch = sessionEpoch.current;
        loadConversations();
        api.getConversation(conversation_id)
          .then((res) => {
            if (res.data && epoch === sessionEpoch.current) {
              const members = res.data.conversation_members || [];
              const convData = { ...res.data, conversation_members: members };
              setConversations((prev) => {
                const index = prev.findIndex((c) => c.id === conversation_id);
                if (index !== -1) {
                  const updated = [...prev];
                  updated[index] = { ...updated[index], ...convData };
                  return updated.sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());
                }
                return [convData, ...prev];
              });
            }
          })
          .catch(() => loadConversations());
      })
    );

    // Conversation Removed
    unsubs.push(
      socketManager.on('conversation:removed', ({ conversation_id }: { conversation_id: string }) => {
        setConversations((prev) => prev.filter((c) => c.id !== conversation_id));
        if (activeConvRef.current === conversation_id) {
          setActiveConversationId(null);
        }
      })
    );

    // Conversation Read Receipt
    unsubs.push(
      socketManager.on('conversation:read', (payload: ConversationReadEvent) => {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === payload.conversation_id && c.conversation_members) {
              return {
                ...c,
                conversation_members: c.conversation_members.map((m) =>
                  m.user_id === payload.user_id ? { ...m, last_read_seq: payload.last_read_seq } : m
                ),
              };
            }
            return c;
          })
        );
      })
    );

    // Typing Event
    unsubs.push(
      socketManager.on('typing', (event: TypingEvent) => {
        const { conversation_id, user_id, is_typing } = event;
        if (user_id === currentUserId) return;

        const key = `${conversation_id}:${user_id}`;
        clearTimeout(typingTimers.current.get(key));
        typingTimers.current.delete(key);
        if (is_typing) {
          typingTimers.current.set(key, setTimeout(() => {
            typingTimers.current.delete(key);
            setTypingMap(prev => {
              const users = { ...prev[conversation_id] };
              delete users[user_id];
              return { ...prev, [conversation_id]: users };
            });
          }, 2500));
        }
        setTypingMap(prev => {
          const users = { ...prev[conversation_id] };
          if (is_typing) users[user_id] = true;
          else delete users[user_id];
          return { ...prev, [conversation_id]: users };
        });
      })
    );

    return () => {
      for (const unsub of unsubs) unsub();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [isAuthenticated, currentUserId, loadConversations, loadMessagesForConversation]);

  // Actions
  const sendMessage = async (body: string, attachmentIds?: string[]) => {
    if (!activeConversationId) throw new Error('No active conversation');
    const epoch = sessionEpoch.current;
    const retryKey = JSON.stringify([activeConversationId, body, attachmentIds || []]);
    const clientMessageId = pendingSendIds.current.get(retryKey) || generateUUID();
    pendingSendIds.current.set(retryKey, clientMessageId);

    // Optimistically insert message into UI immediately
    const currentList = messagesByConv[activeConversationId] || [];
    const highestSeq = currentList.length > 0 ? Math.max(...currentList.map((m) => m.seq)) : 0;
    const optimisticMessage: Message = {
      id: clientMessageId,
      conversation_id: activeConversationId,
      seq: highestSeq + 1,
      sender_id: currentUserId || '',
      client_message_id: clientMessageId,
      body,
      kind: 'text',
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      attachments: (attachmentIds || []).map((attId) => ({
        id: attId,
        message_id: clientMessageId,
        conversation_id: activeConversationId,
        uploader_id: currentUserId || '',
        object_key: '',
        original_name: 'Attachment',
        mime_type: 'application/octet-stream',
        size_bytes: 0,
        scan_status: 'clean' as const,
        created_at: new Date().toISOString(),
      })),
      message_reactions: [],
    };

    setMessagesByConv((prev) => {
      const list = prev[activeConversationId] || [];
      if (list.some((m) => m.client_message_id === clientMessageId || m.id === clientMessageId)) return prev;
      return {
        ...prev,
        [activeConversationId]: [...list, optimisticMessage].sort((a, b) => a.seq - b.seq),
      };
    });

    setConversations((prev) =>
      prev
        .map((c) =>
          c.id === activeConversationId
            ? { ...c, last_seq: optimisticMessage.seq, last_activity_at: optimisticMessage.created_at }
            : c
        )
        .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
    );

    playSentSound();

    try {
      const res = await api.sendMessage(activeConversationId, {
        client_message_id: clientMessageId,
        body,
        attachment_ids: attachmentIds,
      });

      if (res.data && epoch === sessionEpoch.current) {
        pendingSendIds.current.delete(retryKey);
        // Seamlessly reconcile optimistic message with real server message
        setMessagesByConv((prev) => {
          const list = prev[activeConversationId] || [];
          const replaced = list.map((m) =>
            m.client_message_id === clientMessageId || m.id === clientMessageId ? res.data : m
          );
          if (!replaced.some((m) => m.id === res.data.id)) {
            replaced.push(res.data);
          }
          const deduped = [...new Map(replaced.map((m) => [m.id, m])).values()];
          const sorted = deduped.sort((a, b) => a.seq - b.seq);
          setCachedMessages(activeConversationId, sorted, currentUserId);
          return {
            ...prev,
            [activeConversationId]: sorted,
          };
        });

        setConversations((prev) =>
          prev
            .map((c) =>
              c.id === activeConversationId
                ? { ...c, last_seq: res.data.seq, last_activity_at: res.data.created_at }
                : c
            )
            .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
        );
      }
      return res.data;
    } catch (err) {
      if (epoch === sessionEpoch.current) {
        setMessagesByConv((prev) => {
          const list = prev[activeConversationId] || [];
          return {
            ...prev,
            [activeConversationId]: list.filter(
              (m) => m.client_message_id !== clientMessageId && m.id !== clientMessageId
            ),
          };
        });
      }
      throw err;
    }
  };

  const editMessage = async (messageId: string, body: string) => {
    const res = await api.editMessage(messageId, body);
    if (res.data && activeConversationId) {
      setMessagesByConv((prev) => {
        const list = prev[activeConversationId] || [];
        return {
          ...prev,
          [activeConversationId]: list.map((m) => (m.id === messageId ? res.data : m)),
        };
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    const res = await api.deleteMessage(messageId);
    if (res.data && activeConversationId) {
      setMessagesByConv((prev) => {
        const list = prev[activeConversationId] || [];
        return {
          ...prev,
          [activeConversationId]: list.map((m) =>
            m.id === messageId ? { ...m, deleted_at: res.data.deleted_at, body: '' } : m
          ),
        };
      });
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId || !activeConversationId) return;
    const msg = (messagesByConv[activeConversationId] || []).find((m) => m.id === messageId);
    const existing = msg?.message_reactions?.find(
      (r) => r.user_id === currentUserId && r.emoji === emoji
    );

    if (existing) {
      await api.removeReaction(messageId, emoji);
    } else {
      await api.addReaction(messageId, emoji);
    }
    setMessagesByConv(previous => ({ ...previous, [activeConversationId]: (previous[activeConversationId] || []).map(message => {
      if (message.id !== messageId) return message;
      const reactions = (message.message_reactions || []).filter(reaction => !(reaction.user_id === currentUserId && reaction.emoji === emoji));
      if (!existing) reactions.push({ message_id: messageId, user_id: currentUserId, emoji, created_at: new Date().toISOString() });
      return { ...message, message_reactions: reactions };
    }) }));
  };

  const sendTyping = (isTyping: boolean) => {
    if (!activeConversationId) return;
    socketManager.emitTyping(activeConversationId, isTyping);
  };

  const createDirectChat = async (userId: string) => {
    const res = await api.createDirectConversation(userId);
    if (res.data) {
      setConversations((prev) => (prev.some((c) => c.id === res.data.id) ? prev : [res.data, ...prev]));
      void selectConversation(res.data.id, res.data);
      void loadConversations();
      return res.data;
    }
    throw new Error('Failed to create direct chat');
  };

  const createGroupChat = async (title: string, memberIds: string[]) => {
    const res = await api.createGroupConversation(title, memberIds);
    if (res.data) {
      setConversations((prev) => (prev.some((c) => c.id === res.data.id) ? prev : [res.data, ...prev]));
      void selectConversation(res.data.id, res.data);
      void loadConversations();
      return res.data;
    }
    throw new Error('Failed to create group');
  };

  const renameGroup = async (title: string) => {
    if (!activeConversationId) return;
    const res = await api.renameGroup(activeConversationId, title);
    if (res.data) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? { ...c, title } : c))
      );
    }
  };

  const addMemberToGroup = async (userId: string) => {
    if (!activeConversationId) return;
    await api.addGroupMember(activeConversationId, userId);
    // Refetch conversation details
    const res = await api.getConversation(activeConversationId);
    if (res.data) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? res.data : c))
      );
    }
  };

  const leaveOrRemoveMember = async (userId: string) => {
    if (!activeConversationId) return;
    await api.removeGroupMember(activeConversationId, userId);
    if (userId === currentUserId) {
      setConversations((prev) => prev.filter((c) => c.id !== activeConversationId));
      setActiveConversationId(null);
    } else {
      const res = await api.getConversation(activeConversationId);
      if (res.data) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversationId ? res.data : c))
        );
      }
    }
  };

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || null;
  const activeMessages = activeConversationId
    ? messagesByConv[activeConversationId] || []
    : [];
  const hasMoreMessages = activeConversationId
    ? !!hasMoreByConv[activeConversationId]
    : false;
  const typingUserIds = activeConversationId && typingMap[activeConversationId]
    ? Object.keys(typingMap[activeConversationId])
    : [];

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        messages: activeMessages,
        hasMoreMessages,
        isLoadingConversations,
        isLoadingMessages,
        connectionStatus,
        typingUserIds,
        selectConversation,
        prefetchConversation,
        loadMoreMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        sendTyping,
        createDirectChat,
        createGroupChat,
        renameGroup,
        addMemberToGroup,
        leaveOrRemoveMember,
        refreshConversations: loadConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
