'use client';

import React, { useState, useMemo } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { ConversationItem } from './ConversationItem';
import { NewConversationModal } from './NewConversationModal';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { Avatar } from '@/components/ui/Avatar';
import {
  getOtherMember,
  getMemberProfile,
} from '@/lib/utils';
import {
  Plus,
  Search,
  Settings,
  WifiOff,
  GraduationCap,
  MessageSquare,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = true }) => {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    isLoadingConversations,
    connectionStatus,
    typingUserIds,
  } = useChat();
  const { user, profile } = useAuth();

  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Filter by type
      if (filterType !== 'all' && c.type !== filterType) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (c.title?.toLowerCase().includes(query)) return true;
        // Search member names for direct chats
        const otherMember = getOtherMember(c, user?.id);
        const otherProfile = getMemberProfile(otherMember);
        const name = otherProfile?.display_name?.toLowerCase();
        const username = otherProfile?.username?.toLowerCase();
        if (name?.includes(query) || username?.includes(query)) return true;
        return false;
      }
      return true;
    });
  }, [conversations, filterType, searchQuery, user?.id]);

  const rollNumberDisplay = profile?.username
    ? `@${profile.username.toUpperCase()}`
    : '';

  return (
    <>
      <aside className={`sidebar ${!isMobileOpen ? 'hidden-mobile' : ''}`}>
        {/* Brand & Action Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div
              className="brand-icon"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              }}
            >
              <GraduationCap size={19} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="brand-title">KamandChat</span>
                {connectionStatus === 'connected' ? (
                  <span title="Intranet Connected" style={{ display: 'flex' }}>
                    <span className="status-dot online pulsing" />
                  </span>
                ) : connectionStatus === 'connecting' ? (
                  <span title="Connecting to Kamand gateway..." style={{ display: 'flex' }}>
                    <span className="status-dot pulsing" style={{ backgroundColor: '#f59e0b' }} />
                  </span>
                ) : (
                  <span title="Gateway Offline" style={{ display: 'flex', color: 'var(--danger)' }}>
                    <WifiOff size={13} />
                  </span>
                )}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                IIT Mandi
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="btn btn-primary"
            style={{
              padding: '7px 12px',
              fontSize: '12.5px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
            }}
          >
            <Plus size={15} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search students, groups, roll #..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="sidebar-nav-tabs">
          <button
            className={`nav-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({conversations.length})
          </button>
          <button
            className={`nav-pill ${filterType === 'direct' ? 'active' : ''}`}
            onClick={() => setFilterType('direct')}
          >
            Direct
          </button>
          <button
            className={`nav-pill ${filterType === 'group' ? 'active' : ''}`}
            onClick={() => setFilterType('group')}
          >
            Groups
          </button>
        </div>

        {/* Conversation List */}
        <div className="conversation-list">
          {isLoadingConversations && conversations.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading campus chats...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <MessageSquare size={20} />
              </div>
              <p style={{ fontSize: '13px' }}>
                {searchQuery ? 'No conversations matching search' : 'No campus conversations yet'}
              </p>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Message a student
              </button>
            </div>
          ) : (
            filteredConversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isActive={c.id === activeConversationId}
                currentUserId={user?.id || ''}
                isTyping={c.id === activeConversationId && typingUserIds.length > 0}
                onClick={() => selectConversation(c.id)}
              />
            ))
          )}
        </div>

        {/* User Profile & Settings Footer */}
        <div className="sidebar-footer">
          <div
            className="user-profile-preview"
            onClick={() => setIsProfileModalOpen(true)}
            title="Click to view campus profile"
          >
            <Avatar
              name={profile?.display_name || profile?.username}
              src={profile?.avatar_key}
              size="sm"
              online={true}
            />
            <div className="user-profile-info">
              <span className="user-profile-name">
                {profile?.display_name || 'Student'}
              </span>
              <span
                className="user-profile-handle"
                style={{ fontFamily: 'monospace', color: '#38bdf8' }}
              >
                {rollNumberDisplay || '@student'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="btn-icon btn-ghost"
            title="Profile & Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {/* Modals */}
      <NewConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
