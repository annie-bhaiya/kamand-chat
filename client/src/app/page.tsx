'use client';

import React, { useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatProvider, useChat } from '@/context/ChatContext';
import { AuthCard } from '@/components/auth/AuthCard';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { NewConversationModal } from '@/components/sidebar/NewConversationModal';
import { MessageSquare } from 'lucide-react';

function ChatAppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { activeConversationId, selectConversation } = useChat();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // If initial auth check is ongoing
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: 'var(--glow-accent)',
            animation: 'pulseGlow 1.6s infinite ease-in-out',
          }}
        >
          <MessageSquare size={24} />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Connecting to KamandChat...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <AuthCard />;
  }

  // Main chat workspace
  return (
    <div className="app-container">
      <Sidebar isMobileOpen={!activeConversationId || isMobileSidebarOpen} />

      <ChatArea
        onBackMobile={() => {
          selectConversation(null);
          setIsMobileSidebarOpen(true);
        }}
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
      />

      <NewConversationModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ChatProvider>
          <ChatAppContent />
        </ChatProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
