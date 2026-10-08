'use client';

import React, { useState, useMemo } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { ALL_CAMPUS_ROOMS } from '@/lib/campus-rooms';
import { CampusRoom } from '@/types/chat';
import { ConversationItem } from './ConversationItem';
import { NewConversationModal } from './NewConversationModal';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { useVisualSettings } from '@/components/settings/VisualSettings';
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
  Calendar,
  Wrench,
  UtensilsCrossed,
  Sparkles,
  Building,
  Users,
  Layers,
  Check,
  ChevronRight,
  Flame,
  BookOpen,
  Trophy,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenCalendar?: (organizer?: string) => void;
  onOpenTickets?: (scope?: 'hostel' | 'mess', clusterOrMess?: string) => void;
  onOpenMoodle?: (courseCode?: string) => void;
  onOpenMessMenu?: (messSlug?: string) => void;
}

type MainTab = 'dms' | 'clubs' | 'courses' | 'hostels' | 'branches' | 'messes';

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = true,
  onCloseMobile,
  onOpenCalendar,
  onOpenTickets,
  onOpenMoodle,
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
  } = useChat();
  const { user, profile } = useAuth();
  const { openSettings } = useVisualSettings();
  const { error: toastError, success: toastSuccess } = useToast();

  const [mainTab, setMainTab] = useState<MainTab>('dms');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group'>('all');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

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

  // Filtered Campus Scoped Rooms
  const filteredCampusRooms = useMemo(() => {
    if (mainTab === 'dms') return [];

    let rooms = ALL_CAMPUS_ROOMS.filter((r) => r.category === mainTab);

    // Apply subfilters
    if (subFilter !== 'all') {
      if (mainTab === 'clubs') {
        rooms = rooms.filter((r) =>
          r.subcategory.toLowerCase().includes(subFilter.toLowerCase())
        );
      } else if (mainTab === 'hostels') {
        if (subFilter === 'North' || subFilter === 'South') {
          rooms = rooms.filter((r) => r.campus === subFilter);
        } else if (subFilter === 'clusters') {
          rooms = rooms.filter((r) => r.slug.includes('general') || r.subcategory.includes('Cluster'));
        }
      } else if (mainTab === 'courses') {
        if (subFilter === 'core') {
          rooms = rooms.filter((r) => r.subcategory.includes('Institute Core'));
        } else if (subFilter === 'dept') {
          rooms = rooms.filter((r) => r.subcategory.includes('Department Core'));
        } else if (subFilter === 'practicum') {
          rooms = rooms.filter((r) => r.subcategory.includes('Practicum'));
        }
      } else if (mainTab === 'branches') {
        if (subFilter === 'btech') {
          rooms = rooms.filter((r) => r.subcategory.includes('B.Tech'));
        } else if (subFilter === 'dual') {
          rooms = rooms.filter((r) => r.subcategory.includes('Dual') || r.subcategory.includes('BS'));
        } else if (subFilter === 'pg') {
          rooms = rooms.filter((r) => r.subcategory.includes('M.Tech') || r.subcategory.includes('M.Sc') || r.subcategory.includes('MBA'));
        } else if (subFilter === 'research') {
          rooms = rooms.filter((r) => r.subcategory.includes('Research'));
        }
      } else if (mainTab === 'messes') {
        if (subFilter === 'North' || subFilter === 'South') {
          rooms = rooms.filter((r) => r.campus === subFilter);
        }
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
          (r.courseCode && r.courseCode.toLowerCase().includes(q)) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return rooms;
  }, [mainTab, subFilter, searchQuery]);

  const handleJoinCampusRoom = async (room: CampusRoom) => {
    if (joiningSlug) return;
    setJoiningSlug(room.slug);
    try {
      const res = await api.joinCampusRoomConversation(room.slug);
      if (res.data?.conversation) {
        await refreshConversations();
        await selectConversation(res.data.conversation.id);
        onCloseMobile?.();
        toastSuccess(`Joined #${room.name}`);
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
        return <Trophy size={16} className="text-[var(--accent)]" />;
      case 'courses':
        return <BookOpen size={16} className="text-[var(--accent)]" />;
      case 'hostels':
        return <Building size={16} className="text-[var(--accent)]" />;
      case 'branches':
        return <GraduationCap size={16} className="text-[var(--accent)]" />;
      case 'messes':
        return <UtensilsCrossed size={16} className="text-[var(--accent)]" />;
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
                background: 'var(--accent)',
                boxShadow: '0 4px 12px var(--accent-light)',
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
              background: 'var(--accent)',
            }}
          >
            <Plus size={15} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Quick Utility Launchers Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            padding: '4px 16px 10px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => onOpenCalendar?.()}
            className="btn btn-ghost"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px 4px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              gap: '4px',
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-light)',
            }}
            title="Unified Gymkhana Calendar & Venue Bookings"
          >
            <Calendar size={14} className="text-[var(--accent)]" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => onOpenTickets?.('hostel')}
            className="btn btn-ghost"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px 4px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              gap: '4px',
              background: 'var(--accent-light)',
              color: '#bae6fd',
              border: '1px solid var(--accent-light)',
            }}
            title="Hostel & Mess Maintenance Tickets"
          >
            <Wrench size={14} className="text-[var(--accent)]" />
            <span>Tickets</span>
          </button>

          <button
            onClick={() => onOpenMoodle?.()}
            className="btn btn-ghost"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px 4px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              gap: '4px',
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-light)',
            }}
            title="IIT Mandi Moodle LMS Sync"
          >
            <GraduationCap size={14} className="text-[var(--accent)]" />
            <span>Moodle</span>
          </button>

          <button
            onClick={() => onOpenMessMenu?.()}
            className="btn btn-ghost"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px 4px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              gap: '4px',
              background: 'rgba(245, 158, 11, 0.08)',
              color: '#fde68a',
              border: '1px solid rgba(245, 158, 11, 0.15)',
            }}
            title="Mess Menus & Rebate Portal"
          >
            <UtensilsCrossed size={14} className="text-[var(--accent)]" />
            <span>Messes</span>
          </button>
        </div>

        {/* 6 Category Switcher Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 14px 4px',
            gap: '4px',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => {
              setMainTab('dms');
              setSubFilter('all');
            }}
            className={`nav-pill ${mainTab === 'dms' ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
          >
            DMs ({conversations.length})
          </button>
          <button
            onClick={() => {
              setMainTab('clubs');
              setSubFilter('all');
            }}
            className={`nav-pill ${mainTab === 'clubs' ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
          >
            Clubs
          </button>
          <button
            onClick={() => {
              setMainTab('courses');
              setSubFilter('all');
            }}
            className={`nav-pill ${mainTab === 'courses' ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
          >
            Courses
          </button>
          <button
            onClick={() => {
              setMainTab('hostels');
              setSubFilter('all');
            }}
            className={`nav-pill ${mainTab === 'hostels' ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
          >
            Hostels
          </button>
          <button
            onClick={() => {
              setMainTab('branches');
              setSubFilter('all');
            }}
            className={`nav-pill ${mainTab === 'branches' ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
          >
            Branches
          </button>
          <button
            onClick={() => {
              setMainTab('messes');
              setSubFilter('all');
            }}
            className={`nav-pill ${mainTab === 'messes' ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap', padding: '5px 10px', fontSize: '0.8rem' }}
          >
            Messes
          </button>
        </div>

        {/* Sub-Filters / Pills for Selected Category */}
        <div style={{ display: 'flex', padding: '2px 16px 8px', gap: '6px', overflowX: 'auto' }}>
          {mainTab === 'dms' && (
            <>
              <button
                className={`nav-pill ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
                style={{ fontSize: '0.8rem', padding: '3px 8px' }}
              >
                All
              </button>
              <button
                className={`nav-pill ${filterType === 'direct' ? 'active' : ''}`}
                onClick={() => setFilterType('direct')}
                style={{ fontSize: '0.8rem', padding: '3px 8px' }}
              >
                Direct
              </button>
              <button
                className={`nav-pill ${filterType === 'group' ? 'active' : ''}`}
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
                  className={`nav-pill ${subFilter === f ? 'active' : ''}`}
                  onClick={() => setSubFilter(f)}
                  style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                >
                  {f === 'all' ? 'All Clubs' : f}
                </button>
              ))}
            </>
          )}

          {mainTab === 'courses' && (
            <>
              {[
                { id: 'all', label: 'All Courses' },
                { id: 'core', label: 'Institute Core' },
                { id: 'dept', label: 'Dept Core' },
                { id: 'practicum', label: 'Practicum' },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`nav-pill ${subFilter === f.id ? 'active' : ''}`}
                  onClick={() => setSubFilter(f.id)}
                  style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                >
                  {f.label}
                </button>
              ))}
            </>
          )}

          {mainTab === 'hostels' && (
            <>
              {[
                { id: 'all', label: 'All Hostels' },
                { id: 'North', label: 'North Campus' },
                { id: 'South', label: 'South Campus' },
                { id: 'clusters', label: 'General / Clusters' },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`nav-pill ${subFilter === f.id ? 'active' : ''}`}
                  onClick={() => setSubFilter(f.id)}
                  style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                >
                  {f.label}
                </button>
              ))}
            </>
          )}

          {mainTab === 'branches' && (
            <>
              {[
                { id: 'all', label: 'All Programs' },
                { id: 'btech', label: 'B.Tech' },
                { id: 'dual', label: 'Dual / BS' },
                { id: 'pg', label: 'PG / Masters' },
                { id: 'research', label: 'Research' },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`nav-pill ${subFilter === f.id ? 'active' : ''}`}
                  onClick={() => setSubFilter(f.id)}
                  style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                >
                  {f.label}
                </button>
              ))}
            </>
          )}

          {mainTab === 'messes' && (
            <>
              {[
                { id: 'all', label: 'All Dining Halls' },
                { id: 'North', label: 'North Messes' },
                { id: 'South', label: 'South Mess' },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`nav-pill ${subFilter === f.id ? 'active' : ''}`}
                  onClick={() => setSubFilter(f.id)}
                  style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                >
                  {f.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder={
                mainTab === 'dms'
                  ? 'Search students, groups, roll #...'
                  : `Search ${mainTab} (e.g. B18, IC152, SnTC)...`
              }
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content List: Either DMs or Scoped Campus Rooms */}
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
                    background: 'var(--border-subtle)',
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
                  onClick={() => {
                    selectConversation(c.id);
                    onCloseMobile?.();
                  }}
                />
              ))
            )
          ) : (
            /* Scoped Campus Rooms List */
            filteredCampusRooms.length === 0 ? (
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
                <p style={{ fontSize: '0.867rem' }}>No {mainTab} found matching filter</p>
              </div>
            ) : (
              filteredCampusRooms.map((room) => {
                const isJoining = joiningSlug === room.slug;
                // Check if user already has this room active
                const existingConv = conversations.find(
                  (c) => c.title === `#${room.name}` || c.title === room.name
                );
                const isActive = existingConv && existingConv.id === activeConversationId;

                return (
                  <div
                    key={room.id}
                    onClick={() => handleJoinCampusRoom(room)}
                    role="button" tabIndex={0} aria-disabled={!!joiningSlug} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleJoinCampusRoom(room); } }}
                    className={`conversation-item ${isActive ? 'active' : ''}`}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      marginBottom: '4px',
                      border: isActive
                        ? '1px solid var(--accent-light)'
                        : '1px solid var(--border-subtle)',
                      background: isActive
                        ? 'var(--accent-light)'
                        : 'var(--border-subtle)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'var(--border-subtle)',
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
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'var(--accent-light)',
                              color:
                                room.campus === 'North'
                                  ? 'var(--accent)'
                                  : room.campus === 'South'
                                  ? '#fcd34d'
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
                              color: '#34d399',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <Check size={11} /> Joined
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
            )
          )}
        </div>

        {/* User Profile & Settings Footer */}
        <div className="sidebar-footer">
          <div
            className="user-profile-preview"
            role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsProfileModalOpen(true); } }}
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
                style={{ fontFamily: 'monospace', color: 'var(--accent)' }}
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
      {isProfileModalOpen && <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />}
    </>
  );
};
