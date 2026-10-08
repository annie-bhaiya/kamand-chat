'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Message, ConversationMember } from '@/types/chat';
import { MessageItem } from './MessageItem';
import { formatDateDivider } from '@/lib/utils';
import { ArrowDown, MessageSquare } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  members: ConversationMember[];
  typingUserIds: string[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, body: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAutoScrollPaused = useRef(false);

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
    bottomRef.current?.scrollIntoView({ behavior });
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
      onLoadMore();
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
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: 'var(--radius-full)' }}
          >
            {isLoadingMore ? 'Loading older messages...' : 'Load older messages'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <MessageSquare size={28} />
          </div>
          <h3 className="empty-state-title">No messages yet</h3>
          <p className="empty-state-desc">
            Send a message to start this conversation. New messages appear here in real time.
          </p>
        </div>
      ) : (
        groupedMessages.map((group) => (
          <React.Fragment key={group.date}>
            <div className="date-divider">
              <span className="date-divider-text">{group.date}</span>
            </div>

            {group.items.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                currentUserId={currentUserId}
                members={members}
                onToggleReaction={onToggleReaction}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
              />
            ))}
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
