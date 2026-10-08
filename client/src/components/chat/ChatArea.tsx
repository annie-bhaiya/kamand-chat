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

  Plus,

} from 'lucide-react';



interface ChatAreaProps {

  onBackMobile: () => void;

  onOpenNewChat: () => void;

  onOpenCalendar?: (organizer?: string, isAdmin?: boolean) => void;

  onOpenTickets?: (scope?: 'hostel' | 'mess', clusterOrMess?: string, isAdmin?: boolean) => void;

  onOpenMoodle?: (courseCode?: string, isAdmin?: boolean) => void;

  onOpenMessMenu?: (messSlug?: string, isAdmin?: boolean) => void;

}



export const ChatArea: React.FC<ChatAreaProps> = ({

  onBackMobile,

  onOpenNewChat,

  onOpenCalendar,

  onOpenTickets,

  onOpenMoodle,

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

  const { user } = useAuth();



  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isInfoOpen, setIsInfoOpen] = useState(false);



  if (!activeConversation) {

    return (

      <main className="chat-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        <div className="empty-state campus-welcome">

          <MessageSquare size={42} strokeWidth={1.4} />

          <h2 className="empty-state-title">A conversation away.</h2>

          <p className="empty-state-desc">Find your people, share a thought, or make a plan. Choose a conversation or start something new.</p>

          <button onClick={onOpenNewChat} className="btn btn-primary"><Plus size={17} />New conversation</button>

          <div className="welcome-tools">

            <button onClick={() => onOpenCalendar?.()} className="btn btn-ghost">Campus calendar</button>

            <button onClick={() => onOpenMessMenu?.()} className="btn btn-ghost">Today’s mess menu</button>

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

        onOpenCalendar={onOpenCalendar}

        onOpenTickets={onOpenTickets}

        onOpenMoodle={onOpenMoodle}

        onOpenMessMenu={onOpenMessMenu}

      />



      <MessageList

        key={activeConversation.id}

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

        key={activeConversation.id}

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

      {activeConversation.type === 'group' && isInfoOpen && (

        <GroupInfoDrawer

          isOpen={isInfoOpen}

          onClose={() => setIsInfoOpen(false)}

        />

      )}

    </main>

  );

};

