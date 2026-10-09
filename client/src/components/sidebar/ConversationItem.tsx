'use client';

import { Avatar } from '@/components/ui/Avatar';
import {
  formatTimeAgo,
  getConversationMembers,
  getMemberProfile,
  getOtherMember,
} from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Users } from 'lucide-react';
import React from 'react';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  isTyping: boolean;
  onClick: () => void;
  onPrefetch?: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  isTyping,
  onClick,
  onPrefetch,
}) => {
  const isDirect = conversation.type === 'direct';

  const members = getConversationMembers(conversation);
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const otherMember = getOtherMember(conversation, currentUserId);
  const otherProfile = getMemberProfile(otherMember);

  let displayName = conversation.title || 'Conversation';
  let avatarName = displayName;
  let avatarKey: string | null = null;
  let subtitleHandle = '';

  if (isDirect) {
    if (otherProfile) {
      displayName = otherProfile.display_name || otherProfile.username || 'Student';
      avatarName = displayName;
      avatarKey = otherProfile.avatar_key;
      subtitleHandle = otherProfile.username ? `@${otherProfile.username.toUpperCase()}` : '';
    } else if (otherMember) {
      displayName = 'Student';
      avatarName = displayName;
    } else {
      displayName = 'Direct Message';
      avatarName = displayName;
    }
  } else {
    displayName = conversation.title || 'Campus Group';
    avatarName = displayName;
    subtitleHandle = `${members.filter((m) => !m.left_at).length} members`;
  }

  // Calculate unread count
  const lastReadSeq = currentMember?.last_read_seq || 0;
  const unreadCount = Math.max(0, conversation.last_seq - lastReadSeq);

  return (
    <div
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onTouchStart={onPrefetch}
      role="button"
      tabIndex={0}
      aria-label={`Open ${displayName}`}
      aria-current={isActive ? 'true' : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`conversation-item ${isActive ? 'active' : ''}`}
    >
      {isDirect ? (
        <Avatar name={avatarName} src={avatarKey} size="md" />
      ) : displayName.startsWith('#') ? (
        <div
          style={{
            width: 40,
            height: 40,
            minWidth: 40,
            borderRadius: '12px',
            background: 'var(--accent)',
            border: '1px solid var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--on-accent)',
            boxShadow: 'none',
            fontWeight: 'bold',
            fontSize: '1.067rem',
            fontFamily: 'inherit',
          }}
        >
          #
        </div>
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            minWidth: 40,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--on-accent)',
            boxShadow: 'none',
          }}
        >
          <Users size={18} />
        </div>
      )}

      <div className="conversation-content">
        <div className="conversation-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span className="conversation-name">{displayName}</span>
            {subtitleHandle && (
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {subtitleHandle}
              </span>
            )}
          </div>
          {conversation.last_activity_at && (
            <span className="conversation-time">
              {formatTimeAgo(conversation.last_activity_at)}
            </span>
          )}
        </div>

        <div className="conversation-bottom">
          {isTyping ? (
            <span className="conversation-preview typing">typing...</span>
          ) : (
            <span className="conversation-preview">
              {conversation.last_message_at
                ? 'Active discussion'
                : 'No messages yet'}
            </span>
          )}

          {unreadCount > 0 && !isActive && (
            <span className="badge-unread">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
