'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { parseRollNumber } from '@/lib/campus';
import { ConversationMember, Profile } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { EmbeddedAttachmentsGrid } from '@/components/chat/EmbeddedAttachmentsGrid';
import { EmbeddedChatSearch } from '@/components/chat/EmbeddedChatSearch';
import {
  Building2,
  Calendar,
  GraduationCap,
  Mail,
  MessageSquare,
  Search,
  Paperclip,
  User as UserIcon,
  UtensilsCrossed,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  initialProfile?: {
    id?: string;
    username?: string;
    display_name?: string;
    avatar_key?: string | null;
    hostel?: string | null;
    hostel_block?: string | null;
    branch?: string | null;
    mess?: string | null;
    created_at?: string;
  } | null;
  conversationId?: string;
  members?: ConversationMember[];
  showChatContext?: boolean; // When true: show embedded search & attachments grid; when false: only profile details
}

export const UserProfileModal: React.FC<UserProfileModalProps> = (props) =>
  props.isOpen ? <UserProfileContent key={props.userId || props.initialProfile?.id || 'profile'} {...props} /> : null;

const UserProfileContent: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialProfile,
  conversationId,
  members = [],
  showChatContext = false,
}) => {
  const { user: currentUser } = useAuth();
  const { createDirectChat } = useChat();

  const [activeTab, setActiveTab] = useState<'profile' | 'search' | 'attachments'>('profile');
  const [profileData, setProfileData] = useState<Partial<Profile> | null>(initialProfile || null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const effectiveUserId = userId || initialProfile?.id;

  // Fetch complete profile on open if we have an ID
  useEffect(() => {
    if (!isOpen || !effectiveUserId) return;

    let active = true;

    async function fetchFullProfile() {
      try {
        const res = await api.getUser(effectiveUserId!);
        if (active && res.data) {
          setProfileData(res.data);
        }
      } catch {
        // Fallback to initialProfile
      }
    }

    void fetchFullProfile();
    return () => {
      active = false;
    };
  }, [isOpen, effectiveUserId, initialProfile]);


  if (!isOpen) return null;

  const displayName = profileData?.display_name || profileData?.username || 'Student';
  const username = profileData?.username || '';
  const avatarKey = profileData?.avatar_key || null;
  const parsedRoll = parseRollNumber(username);
  const isSelf = effectiveUserId === currentUser?.id;

  const handleStartDirectChat = async () => {
    if (!effectiveUserId || isSelf) return;
    setIsStartingChat(true);
    try {
      await createDirectChat(effectiveUserId);
      onClose();
    } catch (err) {
      console.error('Failed to open direct chat:', err);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={showChatContext ? 'Direct Chat & Profile' : 'User Profile'}
      description={username ? `@${username.toUpperCase()} • IIT Mandi` : 'Campus Member'}
      maxWidth={showChatContext ? 560 : 460}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Navigation Tabs (Only shown when showChatContext is true) */}
        {showChatContext && conversationId && (
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              aria-pressed={activeTab === 'profile'}
              className={`nav-pill ${activeTab === 'profile' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <UserIcon size={14} />
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              aria-pressed={activeTab === 'search'}
              className={`nav-pill ${activeTab === 'search' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Search size={14} />
              Search Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              aria-pressed={activeTab === 'attachments'}
              className={`nav-pill ${activeTab === 'attachments' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Paperclip size={14} />
              Attachments
            </button>
          </div>
        )}

        {/* Tab 1: Profile Details */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Identity Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Avatar name={displayName} src={avatarKey} size="xl" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    {displayName}
                  </h3>
                  {isSelf && <Badge variant="neutral" size="sm">You</Badge>}
                </div>

                <div
                  style={{
                    fontSize: '0.833rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'inherit',
                    marginTop: '2px',
                  }}
                >
                  @{username || 'unknown'}
                </div>

                {parsedRoll.isValid && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--accent-light)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent-light)',
                      }}
                    >
                      {parsedRoll.hierarchyName || 'Student'} • 20{parsedRoll.year}
                    </span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Roll #{parsedRoll.rollNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Campus Info Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                }}
              >
                Campus Residence & Studies
              </span>

              {/* Branch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GraduationCap size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Branch: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {profileData?.branch || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Hostel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hostel: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {profileData?.hostel ? `${profileData.hostel}${profileData.hostel_block ? ` (${profileData.hostel_block})` : ''}` : 'Not assigned'}
                  </span>
                </div>
              </div>

              {/* Mess */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UtensilsCrossed size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mess: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {profileData?.mess || 'Not assigned'}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                    {username ? `${username.toLowerCase()}@students.iitmandi.ac.in` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Joined */}
              {profileData?.created_at && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Member since: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {new Date(profileData.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Message button when viewing someone else's profile */}
            {!isSelf && effectiveUserId && !showChatContext && (
              <button
                type="button"
                onClick={handleStartDirectChat}
                disabled={isStartingChat}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', marginTop: '4px' }}
              >
                <MessageSquare size={16} />
                {isStartingChat ? 'Opening chat...' : 'Send Direct Message'}
              </button>
            )}
          </div>
        )}

        {/* Tab 2: Embedded Search (Only when showChatContext is true) */}
        {activeTab === 'search' && showChatContext && conversationId && (
          <EmbeddedChatSearch
            conversationId={conversationId}
            members={members}
          />
        )}

        {/* Tab 3: Embedded Attachments (Only when showChatContext is true) */}
        {activeTab === 'attachments' && showChatContext && conversationId && (
          <EmbeddedAttachmentsGrid
            conversationId={conversationId}
          />
        )}
      </div>
    </Modal>
  );
};
