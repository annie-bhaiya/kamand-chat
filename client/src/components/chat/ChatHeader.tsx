'use client';

import React from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import {
  getConversationMembers,
  getOtherMember,
  getMemberProfile,
} from '@/lib/utils';
import {
  Search,
  Info,
  ChevronLeft,
  Users,
} from 'lucide-react';

interface ChatHeaderProps {
  onBackMobile: () => void;
  onOpenSearch: () => void;
  onOpenInfo: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onBackMobile,
  onOpenSearch,
  onOpenInfo,
}) => {
  const { activeConversation, typingUserIds } = useChat();
  const { user } = useAuth();

  if (!activeConversation) return null;

  const isDirect = activeConversation.type === 'direct';
  const members = getConversationMembers(activeConversation);
  const otherMember = getOtherMember(activeConversation, user?.id);
  const otherProfile = getMemberProfile(otherMember);

  let title = activeConversation.title || 'Conversation';
  let subtitle = '';
  let avatarName = title;
  let avatarKey: string | null = null;

  if (isDirect) {
    if (otherProfile) {
      title = otherProfile.display_name || otherProfile.username || 'Student';
      avatarName = title;
      avatarKey = otherProfile.avatar_key;
      const rollTag = otherProfile.username ? `@${otherProfile.username.toUpperCase()}` : '';
      subtitle =
        typingUserIds.length > 0
          ? 'typing...'
          : `${rollTag} • IIT Mandi`;
    } else {
      title = 'Student';
      avatarName = title;
      subtitle = 'Intracampus Direct Chat';
    }
  } else {
    const activeCount = members.filter((m) => !m.left_at).length || 0;
    subtitle =
      typingUserIds.length > 0
        ? `${typingUserIds.length} member(s) typing...`
        : `${activeCount} members • Kamand Group`;
  }

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        {/* Mobile back arrow */}
        <button
          onClick={onBackMobile}
          className="btn-icon btn-ghost"
          style={{ display: 'none' }}
          id="btn-mobile-back"
          title="Back to conversation list"
        >
          <ChevronLeft size={20} />
        </button>

        {isDirect ? (
          <Avatar name={avatarName} src={avatarKey} size="md" online={true} />
        ) : (
          <div
            onClick={onOpenInfo}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Users size={18} />
          </div>
        )}

        <div
          className="chat-title-group"
          onClick={!isDirect ? onOpenInfo : undefined}
          style={{ cursor: !isDirect ? 'pointer' : 'default' }}
        >
          <h2 className="chat-title">{title}</h2>
          <span
            className="chat-subtitle"
            style={{
              color: typingUserIds.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {subtitle}
          </span>
        </div>
      </div>

      <div className="chat-header-actions">
        {/* Search messages */}
        <button
          onClick={onOpenSearch}
          className="btn-icon btn-ghost"
          title="Search in conversation"
        >
          <Search size={18} />
        </button>

        {/* Info drawer / Members */}
        {!isDirect && (
          <button
            onClick={onOpenInfo}
            className="btn-icon btn-ghost"
            title="Group info & members"
          >
            <Info size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
