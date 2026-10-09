'use client';

import { formatDateDivider } from '@/lib/utils';
import { ConversationMember,Message,Profile } from '@/types/chat';
import { ArrowDown,MessageSquare } from 'lucide-react';
import React,{ useEffect,useLayoutEffect,useRef,useState } from 'react';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  members: ConversationMember[];
  typingUserIds: string[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onEditMessage: (messageId: string, body: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onOpenUserProfile?: (userId: string, profile?: Partial<Profile> | null) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  members,
  typingUserIds,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onOpenUserProfile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAutoScrollPaused = useRef(false);
  const olderScroll = useRef<{ height: number; top: number } | null>(null);
  const olderLoading = useRef(false);
  const loadOlder = async () => {
    if (olderLoading.current || isLoadingMore) return;
    const container = containerRef.current;
    if (container) olderScroll.current = { height: container.scrollHeight, top: container.scrollTop };
    olderLoading.current = true;
    isAutoScrollPaused.current = true;
    try { await onLoadMore(); }
    finally { olderLoading.current = false; }
  };
  useLayoutEffect(() => {
    const container = containerRef.current;
    const position = olderScroll.current;
    if (container && position && !isLoadingMore) {
      container.scrollTop = position.top + container.scrollHeight - position.height;
      olderScroll.current = null;
    }
  }, [messages, isLoadingMore]);

  // Group messages by date
  const groupedMessages: { date: string; items: Message[] }[] = [];
  let currentDate = '';
  let currentGroup: Message[] = [];

  for (const msg of messages) {
    const dateLabel = formatDateDivider(msg.created_at);
    if (dateLabel !== currentDate) {
      if (currentGroup.length > 0) {
        groupedMessages.push({ date: currentDate, items: currentGroup });
      }
      currentDate = dateLabel;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  }
  if (currentGroup.length > 0) {
    groupedMessages.push({ date: currentDate, items: currentGroup });
  }

  // Scroll to bottom on load / message add
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const reduced = document.documentElement.dataset.reduceMotion === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    bottomRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : behavior, block: 'end' });
  };

  useEffect(() => {
    if (!isAutoScrollPaused.current) {
      scrollToBottom('smooth');
    }
  }, [messages.length, typingUserIds.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    setShowScrollBottom(distanceFromBottom > 150);
    isAutoScrollPaused.current = distanceFromBottom > 150;

    // Trigger load more when near top
    if (scrollTop < 50 && hasMore && !isLoadingMore) {
      void loadOlder();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="messages-container"
    >
      {/* Load older messages button if available */}
      {hasMore && (
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <button
            onClick={loadOlder}
            disabled={isLoadingMore}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: 'var(--radius-full)' }}
          >
            {isLoadingMore ? 'Loading older messages...' : 'Load older messages'}
          </button>
        </div>
      )}

      {/* Empty / Loading State */}
      {messages.length === 0 ? (
        isLoadingMore ? (
          <div className="message-skeleton-container" aria-label="Loading messages" role="status">
            {[
              { align: 'left', width: '52%', lines: 2 },
              { align: 'right', width: '38%', lines: 1 },
              { align: 'left', width: '68%', lines: 3 },
              { align: 'right', width: '46%', lines: 1 },
              { align: 'left', width: '34%', lines: 1 },
            ].map((s, idx) => (
              <div
                key={idx}
                className={`message-skeleton-row ${s.align === 'right' ? 'skeleton-sent' : 'skeleton-received'}`}
              >
                {s.align === 'left' && <div className="message-skeleton-avatar shimmer-box" />}
                <div
                  className="message-skeleton-bubble"
                  style={{ width: s.width }}
                >
                  <div className="shimmer-box skeleton-line-title" />
                  {s.lines >= 2 && <div className="shimmer-box skeleton-line-body" />}
                  {s.lines >= 3 && <div className="shimmer-box skeleton-line-body short" />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <MessageSquare size={28} />
            </div>
            <h3 className="empty-state-title">No messages yet</h3>
            <p className="empty-state-desc">
              Send a message to start this conversation. New messages appear here in real time.
            </p>
          </div>
        )
      ) : (
        groupedMessages.map((group) => (
          <React.Fragment key={group.date}>
            <div className="date-divider">
              <span className="date-divider-text">{group.date}</span>
            </div>

            {group.items.map((msg, index) => {
              const prevMsg = index > 0 ? group.items[index - 1] : null;
              const isConsecutive = Boolean(
                prevMsg &&
                prevMsg.sender_id === msg.sender_id &&
                Math.abs(new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) < 5 * 60 * 1000
              );
              return (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  members={members}
                  isConsecutive={isConsecutive}
                  onToggleReaction={onToggleReaction}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onOpenUserProfile={onOpenUserProfile}
                />
              );
            })}
          </React.Fragment>
        ))
      )}

      {/* Typing Indicator */}
      {typingUserIds.length > 0 && (
        <div className="typing-bubble">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
          <span className="typing-text">Someone is typing...</span>
        </div>
      )}

      <div ref={bottomRef} style={{ height: 1 }} />

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="btn-icon btn-primary"
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            borderRadius: '50%',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10,
          }}
          title="Scroll to bottom"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
};
