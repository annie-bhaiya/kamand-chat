import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileModal } from '../src/components/profile/UserProfileModal';
import { GroupInfoDrawer } from '../src/components/group/GroupInfoDrawer';
import { api } from '../src/lib/api';
import { ToastProvider } from '../src/components/ui/Toast';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'current-user-123' },
    profile: { id: 'current-user-123', display_name: 'Current User', username: 'b22001' },
  }),
}));

vi.mock('../src/context/ChatContext', () => ({
  useChat: () => ({
    activeConversation: {
      id: 'conv-group-1',
      type: 'group',
      title: 'Dev Discussion',
      created_at: new Date().toISOString(),
      conversation_members: [
        {
          user_id: 'user-1',
          role: 'owner',
          profiles: { id: 'user-1', display_name: 'Bob', username: 'b22002', avatar_key: null },
        },
        {
          user_id: 'current-user-123',
          role: 'member',
          profiles: { id: 'current-user-123', display_name: 'Current User', username: 'b22001', avatar_key: null },
        },
      ],
    },
    renameGroup: vi.fn(),
    addMemberToGroup: vi.fn(),
    leaveOrRemoveMember: vi.fn(),
    createDirectChat: vi.fn(),
  }),
}));

describe('Expanded Profile Modals', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'getUser').mockResolvedValue({
      data: {
        id: 'other-user-456',
        username: 'b22101',
        display_name: 'Alice Johnson',
        avatar_key: 'https://test.supabase.co/storage/v1/object/public/avatars/456/avatar.png',
        branch: 'Computer Science and Engineering (BTech)',
        hostel: 'Beas',
        hostel_block: 'Block B',
        mess: 'Pine Mess',
        created_at: '2026-08-01T00:00:00Z',
      },
    });
    vi.spyOn(api, 'getConversationAttachments').mockResolvedValue({
      data: [
        {
          id: 'att-1',
          message_id: 'msg-1',
          scan_status: 'clean',
          conversation_id: 'conv-direct-1',
          uploader_id: 'other-user-456',
          object_key: 'conv-direct-1/other-user-456/att-1',
          original_name: 'notes.pdf',
          mime_type: 'application/pdf',
          size_bytes: 102400,
          created_at: new Date().toISOString(),
        },
      ],
    });
    vi.spyOn(api, 'searchMessages').mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          conversation_id: 'conv-direct-1',
          seq: 1,
          sender_id: 'other-user-456',
          client_message_id: 'c-1',
          body: 'Hello project meeting tomorrow',
          kind: 'text',
          created_at: new Date().toISOString(),
          edited_at: null,
          deleted_at: null,
        },
      ],
    });
  });

  it('renders direct conversation expanded modal with tabs, embedded search, and attachments grid', async () => {
    render(
      <UserProfileModal
        isOpen={true}
        onClose={vi.fn()}
        userId="other-user-456"
        initialProfile={{
          id: 'other-user-456',
          username: 'b22101',
          display_name: 'Alice Johnson',
          branch: 'Computer Science and Engineering (BTech)',
          hostel: 'Beas',
          mess: 'Pine Mess',
        }}
        conversationId="conv-direct-1"
        showChatContext={true}
      />
    );

    // Profile overview information
    expect(screen.getByText('Alice Johnson')).toBeDefined();
    expect(screen.getByText('@B22101 • IIT Mandi')).toBeDefined();
    expect(screen.getByText('Computer Science and Engineering (BTech)')).toBeDefined();

    // Check that context navigation tabs exist
    const searchTab = screen.getByRole('button', { name: /search chat/i });
    const attachmentsTab = screen.getByRole('button', { name: /attachments/i });
    expect(searchTab).toBeDefined();
    expect(attachmentsTab).toBeDefined();

    // Switch to Search Chat tab
    fireEvent.click(searchTab);
    expect(screen.getByPlaceholderText(/search words, phrases/i)).toBeDefined();

    // Switch to Attachments tab
    fireEvent.click(attachmentsTab);
    await waitFor(() => {
      expect(screen.getByText(/All \(1\)/i)).toBeDefined();
      expect(screen.getByText('notes.pdf')).toBeDefined();
    });
  });

  it('renders user profile expanded modal without embedded search/attachments when opened from left side of chat room', () => {
    render(
      <UserProfileModal
        isOpen={true}
        onClose={vi.fn()}
        userId="other-user-456"
        initialProfile={{
          id: 'other-user-456',
          username: 'b22101',
          display_name: 'Alice Johnson',
          branch: 'Computer Science and Engineering (BTech)',
          hostel: 'Beas',
          mess: 'Pine Mess',
        }}
        showChatContext={false}
      />
    );

    // Profile information is present
    expect(screen.getByText('Alice Johnson')).toBeDefined();
    expect(screen.getByText('User Profile')).toBeDefined();
    expect(screen.getByText('Computer Science and Engineering (BTech)')).toBeDefined();
    expect(screen.getByRole('button', { name: /send direct message/i })).toBeDefined();

    // Context tabs (search & attachments) MUST NOT be present
    expect(screen.queryByRole('button', { name: /search chat/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /attachments/i })).toBeNull();
  });

  it('renders group profile expanded modal with members, embedded search, and attachments tabs', async () => {
    render(
      <ToastProvider><GroupInfoDrawer
        isOpen={true}
        onClose={vi.fn()}
      /></ToastProvider>
    );

    // Header info
    expect(screen.getByText('Group Profile & Info')).toBeDefined();
    expect(screen.getByText('Dev Discussion')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();

    // Context tabs for group
    const searchTab = screen.getByRole('button', { name: /search chat/i });
    const attachmentsTab = screen.getByRole('button', { name: /attachments/i });
    expect(searchTab).toBeDefined();
    expect(attachmentsTab).toBeDefined();

    // Switch to Search Chat tab
    fireEvent.click(searchTab);
    expect(screen.getByPlaceholderText(/search words, phrases/i)).toBeDefined();

    // Switch to Attachments tab
    fireEvent.click(attachmentsTab);
    await waitFor(() => {
      expect(screen.getByText(/All \(1\)/i)).toBeDefined();
    });
  });
});
