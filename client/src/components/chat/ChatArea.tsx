'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { MessageSearchModal } from './MessageSearchModal';
import { GroupInfoDrawer } from '@/components/group/GroupInfoDrawer';
import { getConversationMembers } from '@/lib/utils';
import {
  MessageSquare,
  ShieldCheck,
  Zap,
  Lock,
  Plus,
} from 'lucide-react';

interface ChatAreaProps {
  onBackMobile: () => void;
  onOpenNewChat: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onBackMobile,
  onOpenNewChat,
}) => {
  const {
    activeConversation,
    messages,
    hasMoreMessages,
    isLoadingMessages,
    typingUserIds,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    sendTyping,
  } = useChat();
  const { user } = useAuth();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  if (!activeConversation) {
    return (
      <main className="chat-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state" style={{ maxWidth: '420px', padding: '40px 24px' }}>
          <div className="empty-state-icon">
            <MessageSquare size={32} />
          </div>
          <h2 className="empty-state-title" style={{ fontSize: '20px' }}>
            Select or start a chat
          </h2>
          <p className="empty-state-desc" style={{ fontSize: '13.5px', lineHeight: 1.6 }}>
            Connect instantly with team members, participate in group discussions, and share files with real-time updates.
          </p>

          <button
            onClick={onOpenNewChat}
            className="btn btn-primary"
            style={{ marginTop: '12px', padding: '10px 20px' }}
          >
            <Plus size={16} />
            Start New Conversation
          </button>

          {/* Feature Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '36px',
              width: '100%',
            }}
          >
            <div
              style={{
                padding: '12px 8px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Zap size={18} color="#818cf8" />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Real-time</span>
            </div>

            <div
              style={{
                padding: '12px 8px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={18} color="#10b981" />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>RLS Secured</span>
            </div>

            <div
              style={{
                padding: '12px 8px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Lock size={18} color="#ec4899" />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Private Storage</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const members = getConversationMembers(activeConversation);

  return (
    <main className="chat-main">
      <ChatHeader
        onBackMobile={onBackMobile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      <MessageList
        messages={messages}
        currentUserId={user?.id || ''}
        members={members}
        typingUserIds={typingUserIds}
        hasMore={hasMoreMessages}
        isLoadingMore={isLoadingMessages}
        onLoadMore={loadMoreMessages}
        onToggleReaction={toggleReaction}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
      />

      <MessageComposer
        conversationId={activeConversation.id}
        onSendMessage={sendMessage}
        onSendTyping={sendTyping}
      />

      {/* In-chat search modal */}
      <MessageSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        conversationId={activeConversation.id}
        members={members}
      />

      {/* Group info and member drawer */}
      {activeConversation.type === 'group' && (
        <GroupInfoDrawer
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
        />
      )}
    </main>
  );
};
