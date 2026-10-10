'use client';

import { AuthCard } from '@/components/auth/AuthCard';
import { CampusTicketDrawer } from '@/components/campus/CampusTicketDrawer';
import { GymkhanaCalendarModal } from '@/components/campus/GymkhanaCalendarModal';
import { MessMenuDrawer } from '@/components/campus/MessMenuDrawer';
import { ResidenceOnboardingModal } from '@/components/campus/ResidenceOnboardingModal';
import { ChatArea } from '@/components/chat/ChatArea';
import { NewConversationModal } from '@/components/sidebar/NewConversationModal';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { VisualSettingsProvider } from '@/components/settings/VisualSettings';
import { ToastProvider } from '@/components/ui/Toast';
import { messRoomSlug } from '@/lib/residence';
import { AuthProvider,useAuth } from '@/context/AuthContext';
import { ChatProvider,useChat } from '@/context/ChatContext';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

function ChatAppContent() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const { activeConversationId, selectConversation } = useChat();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Campus Features Modals & Drawers State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarOrganizer, setCalendarOrganizer] = useState<string | undefined>(undefined);
  const [calendarIsAdmin, setCalendarIsAdmin] = useState<boolean | undefined>(undefined);

  const [isTicketDrawerOpen, setIsTicketDrawerOpen] = useState(false);
  const [ticketScope, setTicketScope] = useState<'hostel' | 'mess'>('hostel');
  const [ticketClusterOrMess, setTicketClusterOrMess] = useState<string>('');
  const [ticketIsAdmin, setTicketIsAdmin] = useState<boolean | undefined>(undefined);

  const [isMessDrawerOpen, setIsMessDrawerOpen] = useState(false);
  const [messSlug, setMessSlug] = useState<string>('pine-mess');

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
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.867rem' }}>
          Connecting to Kamand Chat...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <AuthCard />;
  }

  const handleOpenCalendar = (organizer?: string, isAdmin?: boolean) => {
    setCalendarOrganizer(organizer);
    setCalendarIsAdmin(isAdmin);
    setIsCalendarOpen(true);
  };

  const handleOpenTickets = (scope?: 'hostel' | 'mess', clusterOrMess?: string, isAdmin?: boolean) => {
    setTicketScope(scope || 'hostel');
    setTicketClusterOrMess(clusterOrMess || '');
    setTicketIsAdmin(isAdmin);
    setIsTicketDrawerOpen(true);
  };

  const handleOpenMessMenu = (slug?: string) => {
    setMessSlug(messRoomSlug(slug || profile?.mess));
    setIsMessDrawerOpen(true);
  };

  // Main chat workspace
  return (
    <div className="app-container">
      <Sidebar
        isMobileOpen={!activeConversationId || isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenCalendar={handleOpenCalendar}
        onOpenTickets={handleOpenTickets}
        onOpenMessMenu={handleOpenMessMenu}
      />

      <ChatArea
        onBackMobile={() => {
          selectConversation(null);
          setIsMobileSidebarOpen(true);
        }}
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
        onOpenCalendar={handleOpenCalendar}
        onOpenTickets={handleOpenTickets}
        onOpenMessMenu={handleOpenMessMenu}
      />

      {/* Modals & Drawers */}
      <ResidenceOnboardingModal
        isOpen={Boolean(isAuthenticated && profile && !profile.chat_only && (!profile.hostel || !profile.mess || !profile.branch || !profile.hostel_block))}
      />

      <NewConversationModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />

      {isCalendarOpen && <GymkhanaCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        defaultOrganizer={calendarOrganizer}
        isAdmin={calendarIsAdmin}
      />} 

      {isTicketDrawerOpen && <CampusTicketDrawer
        isOpen={isTicketDrawerOpen}
        onClose={() => setIsTicketDrawerOpen(false)}
        defaultScope={ticketScope}
        defaultClusterOrMess={ticketClusterOrMess}
        isAdmin={ticketIsAdmin}
      />} 


      {isMessDrawerOpen && <MessMenuDrawer
        isOpen={isMessDrawerOpen}
        onClose={() => setIsMessDrawerOpen(false)}
        defaultMessSlug={messSlug}
        onOpenTickets={(messName) => {
          setIsMessDrawerOpen(false);
          setTicketScope('mess');
          setTicketClusterOrMess(messName);
          setIsTicketDrawerOpen(true);
        }}
      />} 
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <AuthProvider>
        <VisualSettingsProvider>
        <ChatProvider>
          <ChatAppContent />
        </ChatProvider>
        </VisualSettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
