'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { Profile } from '@/types/chat';
import {
  Users,
  Edit2,
  Check,
  UserPlus,
  UserMinus,
  LogOut,
  Crown,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { ALL_CAMPUS_ROOMS, isCampusRoomAdmin } from '@/lib/campus-rooms';

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeConversation,
    renameGroup,
    addMemberToGroup,
    leaveOrRemoveMember,
  } = useChat();
  const { user, profile } = useAuth();
  const { success, error } = useToast();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(activeConversation?.title || '');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Add member search state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [candidateUsers, setCandidateUsers] = useState<Profile[]>([]);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState(false);



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

    return () => { active = false; clearTimeout(timer); };
  }, [memberSearchQuery, isAddingMember, activeConversation]);

  if (!activeConversation) return null;

  const currentMember = activeConversation.conversation_members?.find(
    (m) => m.user_id === user?.id
  );
  const isOwner = currentMember?.role === 'owner';

  // Identify campus room
  const normalizedTitle = (activeConversation.title || '').replace(/^#/, '').toLowerCase().trim();
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
  const isPrivileged = Boolean(isOwner || isCampusAdmin);

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
      title="Group Information"
      description={`${activeMembers.length} active participants`}
      maxWidth={480}
    >
      <div>
        {/* Title & Rename */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px',
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
                <h3 style={{ fontSize: '1.067rem', fontWeight: 700 }}>
                  {activeConversation.title || 'Group Chat'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Created on{' '}
                  {new Date(activeConversation.created_at).toLocaleDateString()}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)' }}>
                    Find user to add:
                  </span>
                  <button
                    onClick={() => setIsAddingMember(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
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

                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {isSearchingCandidates ? (
                    <div style={{ fontSize: '0.8rem', textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                      Searching...
                    </div>
                  ) : candidateUsers.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
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
                          <span style={{ fontSize: '0.833rem' }}>{u.display_name} (@{u.username})</span>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={name} src={m.profiles?.avatar_key} size="sm" />
                    <div>
                      <div style={{ fontSize: '0.867rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{name}</span>
                        {isCurrentUser && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(You)</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        @{m.profiles?.username}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isMemberOwner ? (
                      <Badge variant="warning" size="sm">
                        <Crown size={11} style={{ marginRight: '3px' }} />
                        Owner
                      </Badge>
                    ) : campusRoom && isCampusRoomAdmin(campusRoom.slug, m.profiles?.username) ? (
                      <Badge variant="primary" size="sm">
                        <ShieldCheck size={11} style={{ marginRight: '3px' }} />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Member</Badge>
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
        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
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
      </div>
    </Modal>
  );
};
