'use client';

import { useCampusPermissions } from '@/components/campus/useCampusPermissions';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { ALL_CAMPUS_ROOMS } from '@/lib/campus-rooms';
import {
getConversationMembers,
getMemberProfile,
getOtherMember,
} from '@/lib/utils';
import {
Calendar,
ChevronLeft,
GraduationCap,
Info,
Search,
ShieldCheck,
Users,
UtensilsCrossed,
Wrench
} from 'lucide-react';
import React from 'react';

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
  const room = ALL_CAMPUS_ROOMS.find(item => item.slug === activeConversation?.campus_room_slug);
  const permissions = useCampusPermissions(room?.slug);

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
  const campusRoom = room;
  const isRoomAdmin = campusRoom ? !!permissions?.isAdmin : isConvOwnerOrAdmin;

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
    title = activeConversation.title || `#${campusRoom.name}`;
    avatarName = campusRoom.name;
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
          aria-label="Back to conversation list"
          title="Back to conversation list"
        >
          <ChevronLeft size={20} />
        </button>

        {isDirect ? (
          <div
            onClick={onOpenInfo}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenInfo(); }
            }}
            style={{ cursor: 'pointer' }}
            title="View user profile, search & attachments"
          >
            <Avatar name={avatarName} src={avatarKey} size="md" />
          </div>
        ) : campusRoom ? (
          <div
            onClick={onOpenInfo}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenInfo(); }
            }}
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
              color: 'var(--on-accent)',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              boxShadow: '0 2px 10px var(--accent-light)',
            }}
          >
            #
          </div>
        ) : (
          <div
            onClick={onOpenInfo}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenInfo(); }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--on-accent)',
              cursor: 'pointer',
            }}
          >
            <Users size={18} />
          </div>
        )}

        <div
          className="chat-title-group"
          onClick={onOpenInfo}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenInfo(); }
            }}
          style={{ cursor: 'pointer' }}
          title={isDirect ? "View user profile, search & attachments" : "View group profile, search & attachments"}
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
                  backgroundColor: 'var(--warning-light)',
                  color: 'var(--warning)',
                  border: '1px solid var(--warning-light)',
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
                title="Moodle LMS Assignments & Webhook Sync"
              >
                <GraduationCap size={14} className="text-[var(--accent)]" />
                <span className="hidden-mobile">Moodle LMS</span>
              </button>
            )}

            {/* Hostels: Maintenance Tickets */}
            {!profile?.chat_only && campusRoom.category === 'hostels' && onOpenTickets && (
              <button
                onClick={() =>
                  onOpenTickets('hostel', campusRoom.hostelCluster || campusRoom.name, isRoomAdmin)
                }
                className="btn btn-secondary"
                title="Hostel Problem & Maintenance Tickets"
              >
                <Wrench size={14} className="text-[var(--accent)]" />
                <span className="hidden-mobile">Hostel Complaints</span>
              </button>
            )}

            {/* Messes: Menus, Rebates & Mess Tickets */}
            {!profile?.chat_only && campusRoom.category === 'messes' && (
              <>
                {onOpenMessMenu && (
                  <button
                    onClick={() => onOpenMessMenu(campusRoom.slug, isRoomAdmin)}
                    className="btn btn-secondary"
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
                    title="Report Mess Shortage or Food Quality Issue"
                  >
                    <Wrench size={14} className="text-[var(--accent)]" />
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

        {/* Info drawer / Profile */}
        <button
          onClick={onOpenInfo}
          className="btn-icon btn-ghost"
          title={isDirect ? "User profile, search & attachments" : "Group info, search & attachments"}
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
};
