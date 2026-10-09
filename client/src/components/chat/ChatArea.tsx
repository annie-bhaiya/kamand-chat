'use client';

import { GroupInfoDrawer } from '@/components/group/GroupInfoDrawer';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { getConversationMembers, getMemberProfile, getOtherMember } from '@/lib/utils';
import { Profile } from '@/types/chat';
import {
Calendar, UtensilsCrossed, MessageSquare,
Plus,
} from 'lucide-react';
import React,{ useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageComposer } from './MessageComposer';
import { MessageList } from './MessageList';
import { MessageSearchModal } from './MessageSearchModal';

interface ChatAreaProps {
  onBackMobile: () => void;
  onOpenNewChat: () => void;
  onOpenCalendar?: (organizer?: string, isAdmin?: boolean) => void;
  onOpenTickets?: (scope?: 'hostel' | 'mess', clusterOrMess?: string, isAdmin?: boolean) => void;
  onOpenMessMenu?: (messSlug?: string, isAdmin?: boolean) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onBackMobile,
  onOpenNewChat,
  onOpenCalendar,
  onOpenTickets,
  onOpenMessMenu,
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
  const { user, profile } = useAuth();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<{
    userId: string;
    profile?: Partial<Profile> | null;
  } | null>(null);

  if (!activeConversation) {
    return (
      <main className="chat-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state campus-welcome">
          <MessageSquare size={42} strokeWidth={1.4} />
          <h2 className="empty-state-title">A conversation away.</h2>
          <p className="empty-state-desc">Find your people, share a thought, or make a plan. Choose a conversation or start something new.</p>
          <button onClick={onOpenNewChat} className="btn btn-primary"><Plus size={17} />New conversation</button>
          <div className="welcome-tools">
            <button onClick={() => onOpenCalendar?.()} className="btn btn-tonal" data-tone="calendar"><Calendar size={17} aria-hidden="true" />Campus calendar</button>
            {!profile?.chat_only && (
              <button onClick={() => onOpenMessMenu?.()} className="btn btn-tonal" data-tone="dining"><UtensilsCrossed size={17} aria-hidden="true" />Today’s mess menu</button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const members = getConversationMembers(activeConversation);
  const otherMember = getOtherMember(activeConversation, user?.id);
  const otherProfile = getMemberProfile(otherMember);

  return (
    <main className="chat-main">
      <ChatHeader
        onBackMobile={onBackMobile}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenCalendar={onOpenCalendar}
        onOpenTickets={onOpenTickets}
        onOpenMessMenu={onOpenMessMenu}
      />

      <MessageList
        key={`messages-${activeConversation.id}`}
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
        onOpenUserProfile={(userId, userProfile) =>
          setSelectedUserForModal({ userId, profile: userProfile })
        }
      />

      <MessageComposer
        key={`composer-${activeConversation.id}`}
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

      {/* Direct conversation expanded modal (with embedded chat search & attachments grid) */}
      {activeConversation.type === 'direct' && isInfoOpen && (
        <UserProfileModal
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          userId={otherMember?.user_id}
          initialProfile={otherProfile}
          conversationId={activeConversation.id}
          members={members}
          showChatContext={true}
        />
      )}

      {/* Group conversation expanded modal (with embedded chat search & attachments grid) */}
      {activeConversation.type === 'group' && isInfoOpen && (
        <GroupInfoDrawer
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          onSelectUser={(userId, userProfile) =>
            setSelectedUserForModal({ userId, profile: userProfile })
          }
        />
      )}

      {/* User profile modal triggered from clicking user profile on left side inside chat (no embedded search/attachments) */}
      {selectedUserForModal && (
        <UserProfileModal
          isOpen={!!selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
          userId={selectedUserForModal.userId}
          initialProfile={selectedUserForModal.profile}
          showChatContext={false}
        />
      )}
    </main>
  );
};
