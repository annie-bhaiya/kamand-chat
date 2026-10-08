'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useEffectEvent,
} from 'react';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { playMessageSound, playSentSound } from '@/lib/audio';
import { generateUUID } from '@/lib/utils';
import { useAuth } from './AuthContext';
import {
  Conversation,
  Message,
  TypingEvent,
  MessageReactionEvent,
  ConversationReadEvent,
} from '@/types/chat';

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
  selectConversation: (id: string | null) => Promise<void>;
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
  const [typingMap, setTypingMap] = useState<Record<string, Record<string, NodeJS.Timeout>>>({});

  const activeConvRef = useRef<string | null>(null);
  useEffect(() => { activeConvRef.current = activeConversationId; }, [activeConversationId]);

  const currentUserId = user?.id;
  const pagingRef = useRef(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingConversations(true);
    try {
      const res = await api.getConversations();
      if (res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isAuthenticated]);

  const syncAuthentication = useEffectEvent(() => {
    if (isAuthenticated) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setMessagesByConv({});
    }
  });
  // Authentication changes must clear private conversation state on logout.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { syncAuthentication(); }, [isAuthenticated, loadConversations]);

  // Load messages for a conversation
  const loadMessagesForConversation = useCallback(
    async (conversationId: string) => {
      setIsLoadingMessages(true);
      try {
        const res = await api.getMessages(conversationId, { limit: 50 });
        if (res.data) {
          // Server returns newest-first descending by seq. We reverse for ascending display.
          const sorted = [...res.data].sort((a, b) => a.seq - b.seq);
          setMessagesByConv((prev) => ({
            ...prev,
            [conversationId]: sorted,
          }));
          setHasMoreByConv((prev) => ({
            ...prev,
            [conversationId]: !!res.next_cursor,
          }));

          // Automatically mark conversation as read
          const lastMsg = sorted.at(-1);
          if (lastMsg && lastMsg.seq > 0) {
            api.markRead(conversationId, lastMsg.seq).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed to load messages for conversation:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  // Load older messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!activeConversationId || pagingRef.current) return;
    const currentList = messagesByConv[activeConversationId] || [];
    if (currentList.length === 0) return;

    const oldestSeq = currentList[0].seq;
    if (oldestSeq <= 1) return;

    pagingRef.current = true;
    setIsLoadingMessages(true);
    try {
      const res = await api.getMessages(activeConversationId, {
        before_seq: oldestSeq,
        limit: 50,
      });
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
      console.error('Failed to load older messages:', err);
    } finally { pagingRef.current = false; setIsLoadingMessages(false); }
  }, [activeConversationId, messagesByConv]);

  // Select a conversation
  const selectConversation = useCallback(
    async (id: string | null) => {
      activeConvRef.current = id;
      setActiveConversationId(id);
      if (id) {
        // If not in state, fetch immediately and ensure activeConversation is never null
        const convExists = conversations.some((c) => c.id === id);
        if (!convExists) {
          try {
            const res = await api.getConversation(id);
            if (res.data) {
              setConversations((prev) => (prev.some((c) => c.id === id) ? prev : [res.data, ...prev]));
            }
          } catch (e) {
            console.error('Failed to load conversation details:', e);
          }
        }

        if (!messagesByConv[id]) {
          await loadMessagesForConversation(id);
        } else {
          // If already in memory, update read status
          const list = messagesByConv[id];
          const lastMsg = list.at(-1);
          if (lastMsg) {
            api.markRead(id, lastMsg.seq).catch(() => {});
          }
        }
      }
    },
    [conversations, messagesByConv, loadMessagesForConversation]
  );

  // Handle Socket Events
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubs: Array<() => void> = [];

    // Connection status
    unsubs.push(
      socketManager.on('connection:status', (info: { status?: 'connected' | 'connecting' | 'disconnected' | 'error'; connected?: boolean }) => {
        setConnectionStatus(info.status || (info.connected ? 'connected' : 'disconnected'));
        if (info.connected) {
          // Catch up latest conversations
          loadConversations();
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
          return {
            ...prev,
            [convId]: [...existing, newMsg].sort((a, b) => a.seq - b.seq),
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
          return {
            ...prev,
            [convId]: list.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
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
          return {
            ...prev,
            [convId]: list.map((m) =>
              m.id === tombstone.id ? { ...m, deleted_at: tombstone.deleted_at, body: '' } : m
            ),
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
        loadConversations();
        api.getConversation(conversation_id)
          .then((res) => {
            if (res.data) {
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

        setTypingMap((prev) => {
          const convTyping = { ...(prev[conversation_id] || {}) };

          if (convTyping[user_id]) {
            clearTimeout(convTyping[user_id]);
            delete convTyping[user_id];
          }

          if (is_typing) {
            // Auto-clear typing after 2.5 seconds if no follow-up event is received
            const timer = setTimeout(() => {
              setTypingMap((latest) => {
                const currentConv = { ...(latest[conversation_id] || {}) };
                delete currentConv[user_id];
                return { ...latest, [conversation_id]: currentConv };
              });
            }, 2500);

            convTyping[user_id] = timer;
          }

          return { ...prev, [conversation_id]: convTyping };
        });
      })
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [isAuthenticated, currentUserId, loadConversations]);

  // Actions
  const sendMessage = async (body: string, attachmentIds?: string[]) => {
    if (!activeConversationId) throw new Error('No active conversation');
    const clientMessageId = generateUUID();

    playSentSound();
    const res = await api.sendMessage(activeConversationId, {
      client_message_id: clientMessageId,
      body,
      attachment_ids: attachmentIds,
    });

    if (res.data) {
      // Local immediate insert / deduplication
      setMessagesByConv((prev) => {
        const list = prev[activeConversationId] || [];
        if (list.some((m) => m.id === res.data.id)) return prev;
        return {
          ...prev,
          [activeConversationId]: [...list, res.data].sort((a, b) => a.seq - b.seq),
        };
      });

      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? { ...c, last_seq: res.data.seq, last_activity_at: res.data.created_at } : c))
      );
    }
    return res.data;
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
  };

  const sendTyping = (isTyping: boolean) => {
    if (!activeConversationId) return;
    socketManager.emitTyping(activeConversationId, isTyping);
  };

  const createDirectChat = async (userId: string) => {
    const res = await api.createDirectConversation(userId);
    if (res.data) {
      await loadConversations();
      await selectConversation(res.data.id);
      return res.data;
    }
    throw new Error('Failed to create direct chat');
  };

  const createGroupChat = async (title: string, memberIds: string[]) => {
    const res = await api.createGroupConversation(title, memberIds);
    if (res.data) {
      await loadConversations();
      await selectConversation(res.data.id);
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
