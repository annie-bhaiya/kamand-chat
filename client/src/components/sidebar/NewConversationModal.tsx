'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { useChat } from '@/context/ChatContext';
import { useToast } from '@/components/ui/Toast';
import { Profile } from '@/types/chat';
import { searchCampusDirectory } from '@/lib/campus';
import {
  Search,
  Check,
  Users,
  MessageSquarePlus,
  GraduationCap,
  Building2,
} from 'lucide-react';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createDirectChat, createGroupChat } = useChat();
  const { error, success } = useToast();

  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Group creation state
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Search registered users by Name or Enrollment Number
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchUsers(searchQuery.trim());
        if (active && res.data) {
          setSearchResults(res.data);
        }
      } catch (err: unknown) {
        console.error('Failed to search users:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 200);

    return () => { active = false; clearTimeout(timer); };
  }, [searchQuery, isOpen]);

  // Also query campus directory to give hints
  const directoryMatches = searchQuery.trim().length >= 2
    ? searchCampusDirectory(searchQuery.trim(), 8)
    : [];

  const handleStartDirect = async (user: Profile) => {
    setIsCreating(true);
    try {
      await createDirectChat(user.id);
      success(`Chat started with ${user.display_name || user.username}`);
      onClose();
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to start direct chat');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim()) {
      error('Please enter a group title');
      return;
    }
    if (selectedMemberIds.length === 0) {
      error('Please select at least one registered student');
      return;
    }

    setIsCreating(true);
    try {
      await createGroupChat(groupTitle.trim(), selectedMemberIds);
      success(`Group "${groupTitle}" created!`);
      setGroupTitle('');
      setSelectedMemberIds([]);
      onClose();
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start Campus Conversation"
      description="Connect across North & South Campuses by name or enrollment number"
      maxWidth={520}
    >
      <div>
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            marginBottom: '18px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.867rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'direct' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'direct' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            Direct Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('group')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.867rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'group' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'group' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            Create Campus Group
          </button>
        </div>

        {/* Group Title input if on group tab */}
        {activeTab === 'group' && (
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="input-label">Group Title</label>
            <input
              type="text"
              placeholder="e.g. North Campus Hostel 7, CS202 Study Group"
              className="input-control"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              maxLength={120}
            />
          </div>
        )}

        {/* Search Users Input */}
        <div className="search-box" style={{ marginBottom: '14px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by student name or roll number (e.g. B26001, Aarti)..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Results Container */}
        <div
          style={{
            maxHeight: '290px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {isSearching ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Searching campus records...
            </div>
          ) : searchResults.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <div>
                {searchQuery
                  ? `No registered students matching "${searchQuery}".`
                  : 'Type a student name or enrollment number to search.'}
              </div>

              {/* Show directory hints if matching directory but not yet signed in */}
              {directoryMatches.length > 0 && (
                <div style={{ marginTop: '10px', width: '100%', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>
                    Matching Campus Directory Records:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {directoryMatches.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--accent-light)',
                          fontSize: '0.8rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#f8fafc' }}>{d.name}</span>
                        <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{d.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            searchResults.map((user) => {
              const isSelected = selectedMemberIds.includes(user.id);
              const rollTag = user.username ? `@${user.username.toUpperCase()}` : '';

              return (
                <div
                  key={user.id}
                  onClick={() => {
                    if (activeTab === 'direct') {
                      handleStartDirect(user);
                    } else {
                      handleToggleMember(user.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--accent-light)' : 'var(--border-subtle)',
                    border: `1px solid ${isSelected ? 'var(--accent-light)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={user.display_name || user.username} src={user.avatar_key} size="sm" />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {user.display_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'monospace' }}>
                        {rollTag}
                      </div>
                    </div>
                  </div>

                  {activeTab === 'direct' ? (
                    <button
                      type="button"
                      className="btn-icon btn-ghost"
                      style={{ color: 'var(--accent)' }}
                      title="Chat"
                    >
                      <MessageSquarePlus size={18} />
                    </button>
                  ) : (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '6px',
                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border-medium)'}`,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      {isSelected && <Check size={14} />}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Group creation submit button */}
        {activeTab === 'group' && (
          <div style={{ marginTop: '18px' }}>
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={isCreating || selectedMemberIds.length === 0 || !groupTitle.trim()}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              {isCreating
                ? 'Creating Group...'
                : `Create Campus Group (${selectedMemberIds.length} members)`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
