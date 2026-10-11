'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { api } from '@/lib/api';
import { Profile } from '@/types/chat';
import { useCampusPermissions } from '@/components/campus/useCampusPermissions';
import { EmbeddedAttachmentsGrid } from '@/components/chat/EmbeddedAttachmentsGrid';
import { EmbeddedChatSearch } from '@/components/chat/EmbeddedChatSearch';
import {
  Check,
  Crown,
  Edit2,
  LogOut,
  Paperclip,
  Search,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser?: (userId: string, profile?: Profile | null) => void;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = (props) => {
  const { activeConversation } = useChat();
  return props.isOpen ? <GroupInfoContent key={activeConversation?.id} {...props} /> : null;
};

const GroupInfoContent: React.FC<GroupInfoDrawerProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const {
    activeConversation,
    renameGroup,
    addMemberToGroup,
    leaveOrRemoveMember,
  } = useChat();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'attachments'>('overview');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(activeConversation?.title || '');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Add member search state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [candidateUsers, setCandidateUsers] = useState<Profile[]>([]);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState(false);
  const campusPermissions = useCampusPermissions(activeConversation?.campus_room_slug || undefined);


  // Search candidate users to add
  useEffect(() => {
    if (!isAddingMember) return;

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearchingCandidates(true);
      try {
        const res = await api.searchUsers(memberSearchQuery);
        if (active && res.data) {
          // Filter out users already in active members
          const existingIds = new Set(
            activeConversation?.conversation_members
              ?.filter((m) => !m.left_at)
              .map((m) => m.user_id) || []
          );
          setCandidateUsers(res.data.filter((u) => !existingIds.has(u.id)));
        }
      } catch (err: unknown) {
        console.error('Candidate search failed:', err);
      } finally {
        if (active) setIsSearchingCandidates(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [memberSearchQuery, isAddingMember, activeConversation]);

  if (!activeConversation) return null;

  const currentMember = activeConversation.conversation_members?.find(
    (m) => m.user_id === user?.id
  );
  const isOwner = currentMember?.role === 'owner';

  // Identify campus room
  const isCampusAdmin = Boolean(campusPermissions?.isAdmin);
  const isPrivileged = activeConversation.campus_room_slug ? isCampusAdmin : isOwner;

  const activeMembers =
    activeConversation.conversation_members?.filter((m) => !m.left_at) || [];

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) {
      error('Title cannot be empty');
      return;
    }
    try {
      await renameGroup(newTitle.trim());
      setIsEditingTitle(false);
      success('Group renamed');
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to rename group');
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await addMemberToGroup(userId);
      success('Member added to group');
      setIsAddingMember(false);
      setMemberSearchQuery('');
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    const isSelf = userId === user?.id;
    const confirmMsg = isSelf
      ? 'Are you sure you want to leave this group?'
      : `Remove ${memberName} from this group?`;

    if (confirm(confirmMsg)) {
      try {
        await leaveOrRemoveMember(userId);
        success(isSelf ? 'You left the group' : `${memberName} removed`);
        if (isSelf) {
          onClose();
        }
      } catch (err: unknown) {
        error((err instanceof Error ? err.message : '') || 'Action failed');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Group Profile & Info"
      description={`${activeMembers.length} active participants • ${activeConversation.campus_room_slug ? 'Campus Room' : 'Group Chat'}`}
      maxWidth={560}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Navigation Tabs */}
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
            onClick={() => setActiveTab('overview')}
            aria-pressed={activeTab === 'overview'}
            className={`nav-pill ${activeTab === 'overview' ? 'active' : ''}`}
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
            <Users size={14} />
            Members
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

        {/* Tab 1: Overview & Members */}
        {activeTab === 'overview' && (
          <div>
            {/* Title & Rename Card */}
            <div
              style={{
                padding: '16px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              {isEditingTitle ? (
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <input
                    type="text"
                    className="input-control"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={120}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="btn btn-primary"
                    style={{ padding: '8px 12px' }}
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 style={{ fontSize: '1.067rem', fontWeight: 700, margin: 0 }}>
                      {activeConversation.title || 'Group Chat'}
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Created on {new Date(activeConversation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {isPrivileged && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="btn-icon btn-ghost"
                      title="Rename Group"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Member Action: Add Member button (Owner/Admin) */}
            {isPrivileged && (
              <div style={{ marginBottom: '16px' }}>
                {!isAddingMember ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(true)}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '9px' }}
                  >
                    <UserPlus size={16} />
                    Add Member
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '12px',
                      background: 'var(--accent-light)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--accent-light)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)' }}>
                        Find user to add:
                      </span>
                      <button
                        onClick={() => setIsAddingMember(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="search-box" style={{ marginBottom: '8px' }}>
                      <Search size={14} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search by username..."
                        className="search-input"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div
                      style={{
                        maxHeight: '160px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {isSearchingCandidates ? (
                        <div
                          style={{
                            fontSize: '0.8rem',
                            textAlign: 'center',
                            padding: '12px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          Searching...
                        </div>
                      ) : candidateUsers.length === 0 ? (
                        <div
                          style={{
                            fontSize: '0.8rem',
                            textAlign: 'center',
                            padding: '12px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          No available users found.
                        </div>
                      ) : (
                        candidateUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleAddMember(u.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--border-subtle)',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Avatar name={u.display_name} src={u.avatar_key} size="xs" />
                              <span style={{ fontSize: '0.833rem' }}>
                                {u.display_name} (@{u.username})
                              </span>
                            </div>
                            <UserPlus size={14} color="var(--accent)" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Member List */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '10px',
                }}
              >
                Members ({activeMembers.length})
              </h4>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '230px',
                  overflowY: 'auto',
                }}
              >
                {activeMembers.map((m) => {
                  const isMemberOwner = m.role === 'owner';
                  const isCurrentUser = m.user_id === user?.id;
                  const name = m.profiles?.display_name || m.profiles?.username || 'User';

                  return (
                    <div
                      key={m.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--border-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: onSelectUser ? 'pointer' : 'default',
                          flex: 1,
                          minWidth: 0,
                        }}
                        onClick={() => onSelectUser?.(m.user_id, m.profiles)}
                        title={onSelectUser ? `View ${name}'s profile` : undefined}
                      >
                        <Avatar name={name} src={m.profiles?.avatar_key} size="sm" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '0.867rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {name}
                            </span>
                            {isCurrentUser && (
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>(You)</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            @{m.profiles?.username}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {isMemberOwner ? (
                          <Badge variant="warning" size="sm">
                            <Crown size={11} style={{ marginRight: '3px' }} />
                            {activeConversation.campus_room_slug ? 'Manager' : 'Owner'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Member
                          </Badge>
                        )}

                        {/* Owner/Admin can remove non-owners */}
                        {isPrivileged && !isMemberOwner && !isCurrentUser && (
                          <button
                            onClick={() => handleRemoveMember(m.user_id, name)}
                            className="action-btn-mini"
                            style={{ color: 'var(--danger)' }}
                            title="Remove member"
                          >
                            <UserMinus size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Group Button */}
            {!isOwner && (
              <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(user?.id || '', 'You')}
                  className="btn btn-danger"
                  style={{ width: '100%', padding: '10px' }}
                >
                  <LogOut size={16} />
                  Leave Group
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Embedded Chat Search */}
        {activeTab === 'search' && (
          <EmbeddedChatSearch
            conversationId={activeConversation.id}
            members={activeMembers}
          />
        )}

        {/* Tab 3: Embedded Attachments in Grid Form */}
        {activeTab === 'attachments' && (
          <EmbeddedAttachmentsGrid
            conversationId={activeConversation.id}
          />
        )}
      </div>
    </Modal>
  );
};
