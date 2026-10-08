'use client';

import React, { useState } from 'react';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatProvider, useChat } from '@/context/ChatContext';
import { AuthCard } from '@/components/auth/AuthCard';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { NewConversationModal } from '@/components/sidebar/NewConversationModal';
import { GymkhanaCalendarModal } from '@/components/campus/GymkhanaCalendarModal';
import { CampusTicketDrawer } from '@/components/campus/CampusTicketDrawer';
import { MoodleDrawer } from '@/components/campus/MoodleDrawer';
import { MessMenuDrawer } from '@/components/campus/MessMenuDrawer';
import { MessageSquare } from 'lucide-react';

function ChatAppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { activeConversationId, selectConversation, sendMessage } = useChat();

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

  const [isMoodleDrawerOpen, setIsMoodleDrawerOpen] = useState(false);
  const [moodleCourseCode, setMoodleCourseCode] = useState<string>('IC152');
  const [moodleIsAdmin, setMoodleIsAdmin] = useState<boolean | undefined>(undefined);

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
          Connecting to KamandChat...
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

  const handleOpenMoodle = (courseCode?: string, isAdmin?: boolean) => {
    setMoodleCourseCode(courseCode || 'IC152');
    setMoodleIsAdmin(isAdmin);
    setIsMoodleDrawerOpen(true);
  };

  const handleOpenMessMenu = (slug?: string, _isAdmin?: boolean) => {
    setMessSlug(slug || 'pine-mess');
    setIsMessDrawerOpen(true);
  };

  const handleMoodleBroadcast = async (alertText: string) => {
    if (activeConversationId) {
      try {
        await sendMessage(alertText);
      } catch (err) {
        console.error('Failed to post Moodle broadcast alert to chat:', err);
      }
    }
  };

  // Main chat workspace
  return (
    <div className="app-container">
      <Sidebar
        isMobileOpen={!activeConversationId || isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenCalendar={handleOpenCalendar}
        onOpenTickets={handleOpenTickets}
        onOpenMoodle={handleOpenMoodle}
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
        onOpenMoodle={handleOpenMoodle}
        onOpenMessMenu={handleOpenMessMenu}
      />

      {/* Modals & Drawers */}
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

      {isMoodleDrawerOpen && <MoodleDrawer
        isOpen={isMoodleDrawerOpen}
        onClose={() => setIsMoodleDrawerOpen(false)}
        defaultCourseCode={moodleCourseCode}
        isAdmin={moodleIsAdmin}
        onBroadcastAlert={handleMoodleBroadcast}
      />} 

      {isMessDrawerOpen && <MessMenuDrawer
        isOpen={isMessDrawerOpen}
        onClose={() => setIsMessDrawerOpen(false)}
        defaultMessSlug={messSlug}
        onOpenTickets={(messName) => {
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
        <ChatProvider>
          <ChatAppContent />
        </ChatProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
