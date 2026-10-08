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
  Calendar,
  Wrench,
  GraduationCap,
  UtensilsCrossed,
  Sparkles,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { ALL_CAMPUS_ROOMS, getCategoryBadge, isCampusRoomAdmin } from '@/lib/campus-rooms';

interface ChatHeaderProps {
  onBackMobile: () => void;
  onOpenSearch: () => void;
  onOpenInfo: () => void;
  onOpenCalendar?: (organizer?: string, isAdmin?: boolean) => void;
  onOpenTickets?: (scope?: 'hostel' | 'mess', clusterOrMess?: string, isAdmin?: boolean) => void;
  onOpenMoodle?: (courseCode?: string, isAdmin?: boolean) => void;
  onOpenMessMenu?: (messSlug?: string, isAdmin?: boolean) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onBackMobile,
  onOpenSearch,
  onOpenInfo,
  onOpenCalendar,
  onOpenTickets,
  onOpenMoodle,
  onOpenMessMenu,
}) => {
  const { activeConversation, typingUserIds } = useChat();
  const { user, profile } = useAuth();

  if (!activeConversation) return null;

  const isDirect = activeConversation.type === 'direct';
  const members = getConversationMembers(activeConversation);
  const otherMember = getOtherMember(activeConversation, user?.id);
  const otherProfile = getMemberProfile(otherMember);

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isConvOwnerOrAdmin = currentMember?.role === 'owner';

  let title = activeConversation.title || 'Conversation';
  let subtitle = '';
  let avatarName = title;
  let avatarKey: string | null = null;

  // Identify if this conversation is a campus scoped room
  const normalizedTitle = title.replace(/^#/, '').toLowerCase().trim();
  const campusRoom = ALL_CAMPUS_ROOMS.find(
    (r) =>
      r.name.toLowerCase() === normalizedTitle ||
      r.slug.toLowerCase() === normalizedTitle ||
      (r.courseCode && normalizedTitle.includes(r.courseCode.toLowerCase()))
  );

  const isCampusAdmin = campusRoom
    ? isCampusRoomAdmin(campusRoom.slug, user) ||
      isCampusRoomAdmin(campusRoom.slug, profile?.username)
    : false;
  const isRoomAdmin = Boolean(isConvOwnerOrAdmin || isCampusAdmin);

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
  } else if (campusRoom) {
    title = `#${campusRoom.name}`;
    avatarName = campusRoom.name;
    const activeCount = members.filter((m) => !m.left_at).length || 0;
    subtitle =
      typingUserIds.length > 0
        ? `${typingUserIds.length} member(s) typing...`
        : `${campusRoom.subcategory} • ${campusRoom.campus || 'North/South'} Campus`;
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
          <Avatar name={avatarName} src={avatarKey} size="md" online={false} />
        ) : campusRoom ? (
          <div
            onClick={onOpenInfo}
            style={{
              width: 40,
              height: 40,
              minWidth: 40,
              borderRadius: '12px',
              background: 'var(--accent)',
              border: '1px solid var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              fontFamily: 'monospace',
              cursor: 'pointer',
              boxShadow: '0 2px 10px var(--accent-light)',
            }}
          >
            #
          </div>
        ) : (
          <div
            onClick={onOpenInfo}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 className="chat-title">{title}</h2>
            {campusRoom && (
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent-light)',
                }}
              >
                {campusRoom.category.toUpperCase()}
              </span>
            )}
            {!isDirect && isRoomAdmin && (
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  color: '#facc15',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="You have administrative privileges in this room"
              >
                <ShieldCheck size={11} /> Admin
              </span>
            )}
          </div>
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

      <div className="chat-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Contextual Action Buttons for Scoped Campus Rooms */}
        {campusRoom && (
          <>
            {/* Clubs & Branches & Fests: Calendar & Venue Booking */}
            {(campusRoom.category === 'clubs' || campusRoom.category === 'branches') && onOpenCalendar && (
              <button
                onClick={() => onOpenCalendar(campusRoom.name, isRoomAdmin)}
                className="btn btn-secondary"
                style={{
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--accent-light)',
                  borderColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                }}
                title="Unified Gymkhana Calendar & Venue Bookings"
              >
                <Calendar size={14} className="text-[var(--accent)]" />
                <span className="hidden-mobile">Gymkhana Calendar</span>
              </button>
            )}

            {/* Courses: Moodle LMS Sync & Assignments */}
            {campusRoom.category === 'courses' && onOpenMoodle && (
              <button
                onClick={() => onOpenMoodle(campusRoom.courseCode || 'IC152', isRoomAdmin)}
                className="btn btn-secondary"
                style={{
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--accent-light)',
                  borderColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                }}
                title="Moodle LMS Assignments & Webhook Sync"
              >
                <GraduationCap size={14} className="text-[var(--accent)]" />
                <span className="hidden-mobile">Moodle LMS</span>
              </button>
            )}

            {/* Hostels: Maintenance Tickets */}
            {campusRoom.category === 'hostels' && onOpenTickets && (
              <button
                onClick={() =>
                  onOpenTickets('hostel', campusRoom.hostelCluster || campusRoom.name, isRoomAdmin)
                }
                className="btn btn-secondary"
                style={{
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--accent-light)',
                  borderColor: 'var(--accent-light)',
                  color: '#bae6fd',
                }}
                title="Hostel Problem & Maintenance Tickets"
              >
                <Wrench size={14} className="text-[var(--accent)]" />
                <span className="hidden-mobile">Hostel Complaints</span>
              </button>
            )}

            {/* Messes: Menus, Rebates & Mess Tickets */}
            {campusRoom.category === 'messes' && (
              <>
                {onOpenMessMenu && (
                  <button
                    onClick={() => onOpenMessMenu(campusRoom.slug, isRoomAdmin)}
                    className="btn btn-secondary"
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      color: '#fde68a',
                    }}
                    title="Daily Mess Menu & Rebate Portal"
                  >
                    <UtensilsCrossed size={14} className="text-[var(--accent)]" />
                    <span className="hidden-mobile">Mess Menu</span>
                  </button>
                )}
                {onOpenTickets && (
                  <button
                    onClick={() => onOpenTickets('mess', campusRoom.name, isRoomAdmin)}
                    className="btn btn-secondary"
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: '#fecaca',
                    }}
                    title="Report Mess Shortage or Food Quality Issue"
                  >
                    <Wrench size={14} className="text-rose-400" />
                    <span className="hidden-mobile">Mess Issues</span>
                  </button>
                )}
              </>
            )}
          </>
        )}

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
            title="Channel info & members"
          >
            <Info size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
