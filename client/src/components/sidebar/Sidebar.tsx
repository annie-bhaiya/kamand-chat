'use client';

import { ProfileModal } from '@/components/profile/ProfileModal';
import { useVisualSettings } from '@/components/settings/VisualSettings';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { api } from '@/lib/api';
import { ALL_CAMPUS_ROOMS } from '@/lib/campus-rooms';
import {
  BRANCH_OPTIONS,
  isUserBranchRoom,
  isUserHostelRoom,
  isUserMessRoom,
} from '@/lib/residence';
import {
  getMemberProfile,
  getOtherMember,
} from '@/lib/utils';
import { CampusRoom } from '@/types/chat';
import {
  Building,
  Calendar,
  Check,
  GraduationCap,
  Lock,
  MessageSquare,
  Plus,
  Pencil,
  Search,
  Settings,
  Trophy,
  UtensilsCrossed,
  WifiOff,
  Wrench,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { ConversationItem } from './ConversationItem';
import { NewConversationModal } from './NewConversationModal';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenCalendar?: (organizer?: string) => void;
  onOpenTickets?: (scope?: 'hostel' | 'mess', clusterOrMess?: string) => void;
  onOpenMessMenu?: (messSlug?: string) => void;
}

type MainTab = 'dms' | 'clubs' | 'hostels' | 'branches' | 'messes';

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = true,
  onCloseMobile,
  onOpenCalendar,
  onOpenTickets,
  onOpenMessMenu,
}) => {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    refreshConversations,
    isLoadingConversations,
    connectionStatus,
    typingUserIds,
    prefetchConversation,
  } = useChat();
  const { user, profile } = useAuth();
  const { openSettings } = useVisualSettings();
  const { error: toastError, success: toastSuccess } = useToast();

  const [selectedTab, setMainTab] = useState<MainTab>('dms');
  const mainTab = profile?.chat_only && ['hostels', 'messes', 'branches'].includes(selectedTab) ? 'dms' : selectedTab;


  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group'>('all');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

  // Look up user's enrolled branch info
  const userBranchInfo = useMemo(() => {
    if (!profile?.branch) return null;
    return (
      BRANCH_OPTIONS.find((b) => b.id === profile.branch || b.name === profile.branch) || {
        id: profile.branch,
        name: profile.branch,
        degree: 'Academic Program',
      }
    );
  }, [profile]);

  // Filtered DMs & Custom Groups
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (filterType !== 'all' && c.type !== filterType) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (c.title?.toLowerCase().includes(query)) return true;
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

  // Filtered Campus Scoped Rooms:
  // Restricted rooms for hostels, branches, and messes are STRICTLY NOT LISTED AT ALL!
  const filteredCampusRooms = useMemo(() => {
    if (mainTab === 'dms') return [];

    let rooms = ALL_CAMPUS_ROOMS.filter((r) => r.category === mainTab);

    // RESTRICTION: Only show the enrolled rooms for hostels, branches, and messes!
    if (mainTab === 'hostels') {
      if (!profile?.hostel) return [];
      rooms = rooms.filter((r) => user?.app_metadata?.campus_rooms?.includes(r.slug) || isUserHostelRoom(r, profile.hostel, profile.hostel_block));
    } else if (mainTab === 'branches') {
      if (!profile?.branch) return [];
      rooms = rooms.filter((r) => isUserBranchRoom(r, profile.branch));
    } else if (mainTab === 'messes') {
      if (!profile?.mess) return [];
      rooms = rooms.filter((r) => user?.app_metadata?.campus_rooms?.includes(r.slug) || isUserMessRoom(r, profile.mess));
    }

    // Apply subfilters for clubs
    if (subFilter !== 'all') {
      if (mainTab === 'clubs') {
        rooms = rooms.filter((r) =>
          r.subcategory.toLowerCase().includes(subFilter.toLowerCase())
        );
      }
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rooms = rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.subcategory.toLowerCase().includes(q) ||
                    r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return rooms;
  }, [
    mainTab,
    subFilter,
    searchQuery,
    profile,
    user,
  ]);

  const handleJoinCampusRoom = async (room: CampusRoom) => {
    if (joiningSlug) return;

    if (profile?.chat_only && (room.category === 'hostels' || room.category === 'messes' || room.category === 'branches')) {
      toastError('Chat-only mode is active. Residential and branch rooms are disabled.');
      return;
    }

    if (room.category === 'hostels' && !user?.app_metadata?.campus_rooms?.includes(room.slug)) {
      if (!profile?.hostel) {
        toastError('Please select your hostel first in Settings.');
        return;
      }
      if (!isUserHostelRoom(room, profile.hostel, profile.hostel_block)) {
        toastError(`You are assigned to ${profile.hostel} ${profile.hostel_block || ''}. You can only join your assigned hostel chat.`);
        return;
      }
    }
    if (room.category === 'branches') {
      if (!profile?.branch) {
        toastError('Please select your branch first in Settings.');
        return;
      }
      if (!isUserBranchRoom(room, profile.branch)) {
        toastError(`You are enrolled in ${userBranchInfo?.name || profile.branch}. You can only join your enrolled branch chat.`);
        return;
      }
    }
    if (room.category === 'messes' && !user?.app_metadata?.campus_rooms?.includes(room.slug)) {
      if (!profile?.mess) {
        toastError('Please select your mess first in Settings.');
        return;
      }
      if (!isUserMessRoom(room, profile.mess)) {
        toastError(`You are assigned to ${profile.mess}. You can only join your assigned mess chat.`);
        return;
      }
    }

    // Fast-path: if conversation already exists in user's conversations, switch instantly!
    const existingConv = conversations.find(
      (c) => c.title === `#${room.name}` || c.title === room.name
    );
    if (existingConv) {
      onCloseMobile?.();
      void selectConversation(existingConv.id, existingConv);
      return;
    }

      setJoiningSlug(room.slug);
      try {
        const res = await api.joinCampusRoomConversation(room.slug);
        const conv = res.data?.conversation;
        if (conv) {
          onCloseMobile?.();
          toastSuccess(`Joined #${room.name}`);
          void selectConversation(conv.id, conv);
          void refreshConversations();
        }
      } catch (err: unknown) {
        console.error('Failed to join room:', err);
        toastError((err instanceof Error ? err.message : '') || `Could not join #${room.name}`);
      } finally {
        setJoiningSlug(null);
      }
    };

    const rollNumberDisplay = profile?.username
      ? `@${profile.username.toUpperCase()}`
      : '';

    const getRoomIcon = (cat: CampusRoom['category']) => {
      switch (cat) {
        case 'clubs':
          return <Trophy size={16} className="tone-icon" data-tone="calendar" />;
        case 'hostels':
          return <Building size={16} className="tone-icon" data-tone="maintenance" />;
        case 'branches':
          return <GraduationCap size={16} className="tone-icon" data-tone="learning" />;
        case 'messes':
          return <UtensilsCrossed size={16} className="tone-icon" data-tone="dining" />;
      }
    };

    return (
      <>
        <aside className={`sidebar ${!isMobileOpen ? 'hidden-mobile' : ''}`}>
          {/* Brand & Action Header */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div
                className="brand-icon"
                style={{
                    boxShadow: '0 4px 12px var(--accent-light)',
                }}
              >
                <GraduationCap size={19} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="brand-title">Kamand Chat</span>
                  {connectionStatus === 'connected' ? (
                    <span title="Intranet Connected" style={{ display: 'flex' }}>
                      <span className="status-dot online pulsing" />
                    </span>
                  ) : connectionStatus === 'connecting' ? (
                    <span title="Connecting to Kamand gateway..." style={{ display: 'flex' }}>
                      <span className="status-dot pulsing" style={{ backgroundColor: 'var(--warning)' }} />
                    </span>
                  ) : (
                    <span title="Gateway Offline" style={{ display: 'flex', color: 'var(--danger)' }}>
                      <WifiOff size={13} />
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                  IIT Mandi &bull; North &amp; South
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="btn btn-primary"
              style={{
                padding: '7px 12px',
                fontSize: '0.833rem',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <Plus size={15} />
              <span>New Chat</span>
            </button>
          </div>

          {/* Quick Utility Launchers Bar */}
          <div className="sidebar-utilities" data-chat-only={profile?.chat_only || undefined}>
            <button
              onClick={() => onOpenCalendar?.()}
              className="btn btn-tonal sidebar-tool"
              data-tone="calendar"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '6px 4px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                gap: '4px',
              }}
              title="Unified Gymkhana Calendar & Venue Bookings"
            >
              <Calendar size={18} aria-hidden="true" />
              <span>Calendar</span>
            </button>

            {!profile?.chat_only && (
              <button
                onClick={() => {
                  if (!profile?.hostel && !profile?.mess) {
                    toastError('Please select your hostel & mess in Settings first.');
                    return;
                  }
                  onOpenTickets?.('hostel', profile?.hostel || undefined);
                }}
                className="btn btn-tonal sidebar-tool"
              data-tone="maintenance"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 4px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  gap: '4px',
                }}
                title="Hostel & Mess Maintenance Tickets"
              >
                <Wrench size={18} aria-hidden="true" />
                <span>Tickets</span>
              </button>
            )}



            {!profile?.chat_only && (
              <button
                onClick={() => onOpenMessMenu?.(profile?.mess || undefined)}
                className="btn btn-tonal sidebar-tool"
              data-tone="dining"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 4px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  gap: '4px',
                }}
                title="Mess Menus & Rebate Portal"
              >
                <UtensilsCrossed size={18} aria-hidden="true" />
                <span>Messes</span>
              </button>
            )}
          </div>

          {/* Category Switcher Navigation Tabs */}
          <nav className="sidebar-sections" aria-label="Campus navigation">
            <button
              onClick={() => {
                setMainTab('dms');
                setSubFilter('all');
              }}
              className={`nav-pill ${mainTab === 'dms' ? 'active' : ''}`}
                  data-tone="primary"
                  aria-pressed={mainTab === 'dms'}
              style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
            >
              <MessageSquare size={15} aria-hidden="true" />Chats ({conversations.length})
            </button>
            <button
              onClick={() => {
                setMainTab('clubs');
                setSubFilter('all');
              }}
              className={`nav-pill ${mainTab === 'clubs' ? 'active' : ''}`}
                  data-tone="calendar"
                  aria-pressed={mainTab === 'clubs'}
              style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
            >
              <Trophy size={15} aria-hidden="true" />Clubs
            </button>


            {/* When Chat-Only mode is enabled, Hostels, Branches, and Messes are hidden */}
            {!profile?.chat_only && (
              <>
                <button
                  onClick={() => {
                    setMainTab('hostels');
                    setSubFilter('all');
                  }}
                  className={`nav-pill ${mainTab === 'hostels' ? 'active' : ''}`}
                  data-tone="maintenance"
                  aria-pressed={mainTab === 'hostels'}
                  style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
                >
                  <Building size={15} aria-hidden="true" />Hostels
                </button>
                <button
                  onClick={() => {
                    setMainTab('branches');
                    setSubFilter('all');
                  }}
                  className={`nav-pill ${mainTab === 'branches' ? 'active' : ''}`}
                  data-tone="learning"
                  aria-pressed={mainTab === 'branches'}
                  style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
                >
                  <GraduationCap size={15} aria-hidden="true" />Branches
                </button>
                <button
                  onClick={() => {
                    setMainTab('messes');
                    setSubFilter('all');
                  }}
                  className={`nav-pill ${mainTab === 'messes' ? 'active' : ''}`}
                  data-tone="dining"
                  aria-pressed={mainTab === 'messes'}
                  style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
                >
                  <UtensilsCrossed size={15} aria-hidden="true" />Messes
                </button>
              </>
            )}
          </nav>

          {/* Sub-Filters / Status Badges for Selected Category */}
          <div className="sidebar-filters" aria-label="Current view filters">
            {mainTab === 'dms' && (
              <>
                <button
                  className={`nav-pill ${filterType === 'all' ? 'active' : ''}`}
                  aria-pressed={filterType === 'all'}
                  onClick={() => setFilterType('all')}
                  style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                >
                  All
                </button>
                <button
                  className={`nav-pill ${filterType === 'direct' ? 'active' : ''}`}
                  aria-pressed={filterType === 'direct'}
                  onClick={() => setFilterType('direct')}
                  style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                >
                  Direct
                </button>
                <button
                  className={`nav-pill ${filterType === 'group' ? 'active' : ''}`}
                  aria-pressed={filterType === 'group'}
                  onClick={() => setFilterType('group')}
                  style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                >
                  Groups
                </button>
              </>
            )}

            {mainTab === 'clubs' && (
              <>
                {['all', 'SnTC', 'SAC', 'Sports', 'Fest'].map((f) => (
                  <button
                    key={f}
                    className={`nav-pill ${subFilter === f ? 'active' : ''}`} aria-pressed={subFilter === f}
                    onClick={() => setSubFilter(f)}
                    style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                  >
                    {f === 'all' ? 'All Clubs' : f}
                  </button>
                ))}
              </>
            )}

            {/* For Hostels, Branches, and Messes: show enrolled identification badge */}
            {mainTab === 'hostels' && (
              <div className="cohort-selection">
                <span className="cohort-selection-badge" data-tone="maintenance">
                  <Building size={12} />
                  <span>{profile?.hostel ? `${profile.hostel}${profile.hostel_block ? ` (${profile.hostel_block})` : ''}` : 'Unassigned'}</span>
                </span>
                <button type="button" onClick={openSettings} className="btn btn-secondary cohort-change" aria-label="Change hostel">
                  <Pencil size={14} aria-hidden="true" />Change
                </button>
              </div>
            )}

            {mainTab === 'branches' && (
              <div className="cohort-selection">
                <span className="cohort-selection-badge" data-tone="learning">
                  <GraduationCap size={12} />
                  <span>{userBranchInfo?.name || profile?.branch || 'Unassigned'}</span>
                </span>
                <button type="button" onClick={openSettings} className="btn btn-secondary cohort-change" aria-label="Change branch">
                  <Pencil size={14} aria-hidden="true" />Change
                </button>
              </div>
            )}

            {mainTab === 'messes' && (
              <div className="cohort-selection">
                <span className="cohort-selection-badge" data-tone="dining">
                  <UtensilsCrossed size={12} />
                  <span>{profile?.mess || 'Unassigned'}</span>
                </span>
                <button type="button" onClick={openSettings} className="btn btn-secondary cohort-change" aria-label="Change mess">
                  <Pencil size={14} aria-hidden="true" />Change
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="sidebar-search">
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input
                type="search"
                aria-label="Search conversations and campus rooms"
                placeholder={
                  mainTab === 'dms'
                    ? 'Search students, groups, roll #...'
                    : `Search enrolled ${mainTab}...`
                }
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Content List: Either DMs or Scoped Campus Rooms with Enrolled Feature Highlights */}
          <div className="conversation-list">
            {mainTab === 'dms' ? (
              /* DMs List */
              isLoadingConversations && conversations.length === 0 ? (
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
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <MessageSquare size={20} />
                  </div>
                  <p style={{ fontSize: '0.867rem' }}>
                    {searchQuery ? 'No conversations matching search' : 'No direct conversations yet'}
                  </p>
                  <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
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
                    onPrefetch={() => prefetchConversation(c.id)}
                    onClick={() => {
                      selectConversation(c.id);
                      onCloseMobile?.();
                    }}
                  />
                ))
              )
            ) : (
              /* Scoped Campus Views */
              <>
                {/* 1. Hostels Tab: Options & Features Header */}
                {mainTab === 'hostels' && (
                  !profile?.hostel ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '14px', margin: '8px 12px' }}>
                      <Building size={32} style={{ color: 'var(--accent)', margin: '0 auto 10px' }} />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Hostel Not Configured</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                        Set your hostel and block in Settings to access your residential chats and maintenance ticketing.
                      </p>
                      <button onClick={openSettings} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}>
                        Configure in Settings
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '12px 14px',
                        margin: '4px 8px 12px',
                        borderRadius: '14px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', fontWeight: 700 }}>
                              Enrolled Residence
                            </span>
                            {profile.hostel_block && (
                              <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 600 }}>
                                Block {profile.hostel_block}
                              </span>
                            )}
                          </div>
                          <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {profile.hostel}
                          </h3>
                        </div>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: 'var(--accent-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)',
                          }}
                        >
                          <Building size={18} />
                        </div>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                        Verified block communication, warden contact desk, and maintenance ticketing for {profile.hostel} residents.
                      </p>

                      {/* Quick Options */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          onClick={() => onOpenTickets?.('hostel', profile.hostel || undefined)}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '8px',
                            justifyContent: 'center',
                          }}
                          title="Raise maintenance or facility issue"
                        >
                          <Wrench size={13} className="text-[var(--accent)]" />
                          <span>Raise Ticket</span>
                        </button>
                        <button
                          onClick={() => onOpenCalendar?.(profile.hostel || undefined)}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '8px',
                            justifyContent: 'center',
                          }}
                          title="View hostel meetings and events"
                        >
                          <Calendar size={13} className="text-[var(--accent)]" />
                          <span>Events</span>
                        </button>
                      </div>
                    </div>
                  )
                )}

                {/* 2. Branches Tab: Options & Features Header */}
                {mainTab === 'branches' && (
                  !profile?.branch ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '14px', margin: '8px 12px' }}>
                      <GraduationCap size={32} style={{ color: 'var(--accent)', margin: '0 auto 10px' }} />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Branch Not Configured</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                        Set your enrolled academic branch in Settings to view your cohort room.
                      </p>
                      <button onClick={openSettings} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}>
                        Configure in Settings
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '12px 14px',
                        margin: '4px 8px 12px',
                        borderRadius: '14px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', fontWeight: 700 }}>
                              Enrolled Department
                            </span>
                            <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent)', fontWeight: 600 }}>
                              {userBranchInfo?.degree || 'Academic'}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '0.93rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {userBranchInfo?.name || profile.branch}
                          </h3>
                        </div>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)',
                          }}
                        >
                          <GraduationCap size={18} />
                        </div>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                        Official student cohort channel for CR coordination, and the academic calendar.
                      </p>

                      {/* Quick Options */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>

                        <button
                          onClick={() => onOpenCalendar?.()}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '8px',
                            justifyContent: 'center',
                          }}
                          title="View academic calendar & exam schedule"
                        >
                          <Calendar size={13} className="text-[var(--accent)]" />
                          <span>Timetable</span>
                        </button>
                      </div>
                    </div>
                  )
                )}

                {/* 3. Messes Tab: Options & Features Header */}
                {mainTab === 'messes' && (
                  !profile?.mess ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '14px', margin: '8px 12px' }}>
                      <UtensilsCrossed size={32} style={{ color: 'var(--warning)', margin: '0 auto 10px' }} />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Mess Not Configured</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                        Set your assigned dining hall in Settings to view daily meal menus and rebate applications.
                      </p>
                      <button onClick={openSettings} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}>
                        Configure in Settings
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '12px 14px',
                        margin: '4px 8px 12px',
                        borderRadius: '14px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--warning)', fontWeight: 700 }}>
                              Assigned Dining Hall
                            </span>
                          </div>
                          <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {profile.mess}
                          </h3>
                        </div>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: 'var(--warning-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--warning)',
                          }}
                        >
                          <UtensilsCrossed size={18} />
                        </div>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                        Daily meals, food committee feedback, and leaves/rebates for {profile.mess}.
                      </p>

                      {/* Quick Options */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          onClick={() => onOpenMessMenu?.(profile.mess || undefined)}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '8px',
                            justifyContent: 'center',
                          }}
                          title="View today's dining menu"
                        >
                          <UtensilsCrossed size={13} className="text-[var(--warning)]" />
                          <span>Daily Menu</span>
                        </button>
                        <button
                          onClick={() => onOpenTickets?.('mess', profile.mess || undefined)}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 10px',
                            fontSize: '0.78rem',
                            borderRadius: '8px',
                            justifyContent: 'center',
                          }}
                          title="Report food quality or catering issue"
                        >
                          <Wrench size={13} className="text-[var(--warning)]" />
                          <span>Mess Ticket</span>
                        </button>
                      </div>
                    </div>
                  )
                )}

                {/* Enrolled Rooms Section Header for scoped tabs */}
                {(mainTab === 'hostels' || mainTab === 'branches' || mainTab === 'messes') && filteredCampusRooms.length > 0 && (
                  <div style={{ padding: '0 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {mainTab === 'hostels'
                        ? `Enrolled Hostel Rooms (${filteredCampusRooms.length})`
                        : mainTab === 'branches'
                          ? `Enrolled Branch Room (${filteredCampusRooms.length})`
                          : `Enrolled Mess Room (${filteredCampusRooms.length})`}
                    </span>
                  </div>
                )}

                {/* Scoped Campus Rooms List */}
                {filteredCampusRooms.length === 0 ? (
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
                    <Building size={32} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ fontSize: '0.867rem' }}>
                      {searchQuery
                        ? `No enrolled ${mainTab} matching search`
                        : (mainTab === 'hostels' && !profile?.hostel) ||
                          (mainTab === 'branches' && !profile?.branch) ||
                          (mainTab === 'messes' && !profile?.mess)
                          ? `Configure your ${mainTab === 'hostels' ? 'hostel' : mainTab === 'branches' ? 'branch' : 'mess'} in Settings to view enrolled chats.`
                          : `No enrolled ${mainTab} found.`}
                    </p>
                  </div>
                ) : (
                  filteredCampusRooms.map((room) => {
                    const isJoining = joiningSlug === room.slug;
                    // Check if user already has this room active
                    const existingConv = conversations.find(
                      (c) => c.title === `#${room.name}` || c.title === room.name
                    );
                    const isActive = existingConv && existingConv.id === activeConversationId;
                    const isRestricted = (
                      (room.category === 'hostels' && (!profile?.hostel || !isUserHostelRoom(room, profile.hostel, profile.hostel_block))) ||
                      (room.category === 'branches' && (!profile?.branch || !isUserBranchRoom(room, profile.branch))) ||
                      (room.category === 'messes' && (!profile?.mess || !isUserMessRoom(room, profile.mess)))
                    );

                    return (
                      <div
                        key={room.id}
                        onClick={() => handleJoinCampusRoom(room)}
                        onMouseEnter={() => {
                          if (existingConv) {
                            prefetchConversation(existingConv.id);
                          }
                        }}
                        onTouchStart={() => {
                          if (existingConv) {
                            prefetchConversation(existingConv.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-disabled={!!joiningSlug}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleJoinCampusRoom(room);
                          }
                        }}
                        className={`conversation-item ${isActive ? 'active' : ''}`}
                        style={{
                          cursor: isRestricted && !existingConv ? 'not-allowed' : 'pointer',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          marginBottom: '4px',
                          opacity: isRestricted && !existingConv ? 0.68 : 1,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getRoomIcon(room.category)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.867rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              #{room.name}
                            </span>

                            {room.campus && (
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background:
                                    room.campus === 'North'
                                      ? 'var(--accent-light)'
                                      : room.campus === 'South'
                                        ? 'var(--warning-light)'
                                        : 'var(--accent-light)',
                                  color:
                                    room.campus === 'North'
                                      ? 'var(--accent)'
                                      : room.campus === 'South'
                                        ? 'var(--warning)'
                                        : 'var(--accent)',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {room.campus}
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: '2px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {room.subcategory}
                            </span>

                            {isJoining ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Joining...</span>
                            ) : existingConv ? (
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--success)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <Check size={11} /> Joined
                              </span>
                            ) : isRestricted ? (
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Lock size={11} /> Restricted
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                Join &rarr;
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* User Profile & Settings Footer */}
          <div className="sidebar-footer">
            <div
              className="user-profile-preview"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsProfileModalOpen(true);
                }
              }}
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
                  style={{ fontFamily: 'inherit', color: 'var(--accent)' }}
                >
                  {rollNumberDisplay || '@student'}
                </span>
              </div>
            </div>

            <button
              onClick={openSettings}
              className="btn-icon btn-ghost"
              aria-label="Visual settings"
              title="Visual settings"
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
        {isProfileModalOpen && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />
        )}
      </>
    );
  };
