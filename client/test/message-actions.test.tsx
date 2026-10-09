import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/Toast';
import { ConversationMember, Message } from '@/types/chat';
import { MessageItem } from '@/components/chat/MessageItem';
import { MessageList } from '@/components/chat/MessageList';

describe('message actions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens with the trigger, closes with Escape, and restores trigger focus', () => {
    const message: Message = { id: 'm1', conversation_id: 'c1', seq: 1, sender_id: 'me', client_message_id: 'retry1', body: 'Meet after class?', kind: 'text', created_at: new Date().toISOString(), edited_at: null, deleted_at: null };
    render(<ToastProvider><MessageItem message={message} currentUserId="me" members={[]} onToggleReaction={vi.fn()} onEditMessage={vi.fn()} onDeleteMessage={vi.fn()} /></ToastProvider>);
    const trigger = screen.getByRole('button', { name: 'Message actions' });
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(screen.getByTitle('Edit message'), { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('opens the dialog menu on phone when selecting a message by holding', () => {
    const message: Message = { id: 'm1', conversation_id: 'c1', seq: 1, sender_id: 'user1', client_message_id: 'c1', body: 'Hold to select me', kind: 'text', created_at: new Date().toISOString(), edited_at: null, deleted_at: null };
    const { container } = render(<ToastProvider><MessageItem message={message} currentUserId="me" members={[]} onToggleReaction={vi.fn()} onEditMessage={vi.fn()} onDeleteMessage={vi.fn()} /></ToastProvider>);
    
    const bubble = container.querySelector('.message-bubble')!;
    const trigger = screen.getByRole('button', { name: 'Message actions' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    // Touch start
    fireEvent.touchStart(bubble, { touches: [{ clientX: 100, clientY: 200 }] });
    // Advance timer past the 450ms hold threshold
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.message-hover-actions.open')).toBeTruthy();

    // Backdrop should exist and tapping it closes the dialog menu
    const backdrop = container.querySelector('.message-actions-backdrop')!;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('cancels touch hold if user scrolls before timeout', () => {
    const message: Message = { id: 'm1', conversation_id: 'c1', seq: 1, sender_id: 'user1', client_message_id: 'c1', body: 'Scrolling past', kind: 'text', created_at: new Date().toISOString(), edited_at: null, deleted_at: null };
    const { container } = render(<ToastProvider><MessageItem message={message} currentUserId="me" members={[]} onToggleReaction={vi.fn()} onEditMessage={vi.fn()} onDeleteMessage={vi.fn()} /></ToastProvider>);
    
    const bubble = container.querySelector('.message-bubble')!;
    const trigger = screen.getByRole('button', { name: 'Message actions' });

    fireEvent.touchStart(bubble, { touches: [{ clientX: 100, clientY: 200 }] });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Move finger vertically by 30px (scrolling)
    fireEvent.touchMove(bubble, { touches: [{ clientX: 100, clientY: 230 }] });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders consecutive messages with tight spacing and without redundant sender header', () => {
    const now = Date.now();
    const members: ConversationMember[] = [
      { conversation_id: 'c1', user_id: 'other', role: 'member', joined_at: new Date().toISOString(), last_read_seq: 2, left_at: null, profiles: { id: 'other', username: 'alice', display_name: 'Alice', avatar_key: null, created_at: new Date().toISOString() } }
    ];
    const messages: Message[] = [
      { id: 'm1', conversation_id: 'c1', seq: 1, sender_id: 'other', client_message_id: '1', body: 'First message', kind: 'text', created_at: new Date(now).toISOString(), edited_at: null, deleted_at: null },
      { id: 'm2', conversation_id: 'c1', seq: 2, sender_id: 'other', client_message_id: '2', body: 'Second consecutive message', kind: 'text', created_at: new Date(now + 10000).toISOString(), edited_at: null, deleted_at: null },
    ];

    const { container } = render(
      <ToastProvider>
        <MessageList
          messages={messages}
          currentUserId="me"
          members={members}
          typingUserIds={[]}
          hasMore={false}
          isLoadingMore={false}
          onLoadMore={vi.fn()}
          onToggleReaction={vi.fn()}
          onEditMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
        />
      </ToastProvider>
    );

    const rows = container.querySelectorAll('.message-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].classList.contains('consecutive')).toBe(false);
    expect(rows[1].classList.contains('consecutive')).toBe(true);

    // First message has sender name, second does not repeat it
    const senderNames = container.querySelectorAll('.message-sender-name');
    expect(senderNames).toHaveLength(1);
    expect(senderNames[0].textContent).toBe('Alice');

    // Second message has an avatar spacer to align with first message
    expect(rows[1].querySelector('.message-avatar-spacer')).toBeTruthy();
  });

  it('renders high contrast attachment card elements for file uploads', () => {
    const message: Message = {
      id: 'm1',
      conversation_id: 'c1',
      seq: 1,
      sender_id: 'me',
      client_message_id: 'f1',
      body: 'Here is the document',
      kind: 'text',
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      attachments: [
        {
          id: 'att1',
          message_id: 'm1',
          conversation_id: 'c1',
          uploader_id: 'me',
          object_key: 'obj1',
          original_name: 'project_assignment.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1048576,
          scan_status: 'clean',
          created_at: new Date().toISOString(),
        }
      ]
    };

    const { container } = render(
      <ToastProvider>
        <MessageItem
          message={message}
          currentUserId="me"
          members={[]}
          onToggleReaction={vi.fn()}
          onEditMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
        />
      </ToastProvider>
    );

    const card = container.querySelector('.attachment-card');
    expect(card).toBeTruthy();
    const filename = container.querySelector('.attachment-filename');
    expect(filename).toBeTruthy();
    expect(filename?.textContent).toBe('project_assignment.pdf');
    const filesize = container.querySelector('.attachment-filesize');
    expect(filesize).toBeTruthy();
    expect(filesize?.textContent).toBe('1 MB');
    expect(container.querySelector('.attachment-icon')).toBeTruthy();
    expect(container.querySelector('.attachment-download-icon')).toBeTruthy();
  });
});


