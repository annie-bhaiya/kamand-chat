import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ChatProvider, useChat } from '../src/context/ChatContext';
import { ToastProvider } from '../src/components/ui/Toast';
import { api } from '../src/lib/api';
import type { Conversation, Message } from '../src/types/chat';

const harness = vi.hoisted(() => ({
  auth: { user: { id: 'student' } as { id: string } | null, isAuthenticated: true },
  listeners: new Map<string, (payload: unknown) => void>(),
}));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => harness.auth }));
vi.mock('../src/lib/socket', () => ({ socketManager: {
  on: (event: string, listener: (payload: unknown) => void) => { harness.listeners.set(event, listener); return () => harness.listeners.delete(event); },
  emitTyping: vi.fn(),
} }));
vi.mock('../src/lib/audio', () => ({ playSentSound: vi.fn(), playMessageSound: vi.fn() }));
let chat: ReturnType<typeof useChat>;
function Observe() { const value = useChat(); React.useLayoutEffect(() => { chat = value; }, [value]); return <div>{value.messages.length}</div>; }
function App() { return <ToastProvider><ChatProvider><Observe /></ChatProvider></ToastProvider>; }
const conversations: Conversation[] = ['a','b'].map(id => ({ id, type: 'group', title: id, conversation_members: [], last_activity_at: new Date().toISOString(), last_seq: 0, created_by: 'student', last_message_at: null, created_at: new Date().toISOString() }));
const message = (id: string, conversation = 'a', seq = 1): Message => ({ id, conversation_id: conversation, seq, sender_id: 'other', body: id, client_message_id: id, kind: 'text', created_at: new Date().toISOString(), edited_at: null, deleted_at: null });
beforeEach(() => {
  harness.auth = { user: { id: 'student' }, isAuthenticated: true };
  harness.listeners.clear();
  vi.spyOn(api, 'getConversations').mockResolvedValue({ data: conversations });
  vi.spyOn(api, 'markRead').mockResolvedValue({ data: { last_read_seq: 1 } });
});
it('preserves messages received over realtime while initial history is loading', async () => {
  let finish!: (value: { data: Message[] }) => void;
  vi.spyOn(api, 'getMessages').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<App />);
  await waitFor(() => expect(chat.conversations).toHaveLength(2));
  let selected!: Promise<void>;
  act(() => { selected = chat.selectConversation('a'); });
  act(() => harness.listeners.get('message:new')?.(message('realtime', 'a', 2)));
  await act(async () => { finish({ data: [message('history')] }); await selected; });
  expect(chat.messages.map(item => item.id)).toEqual(['history', 'realtime']);
});
it('does not mark the new conversation loaded when the previous request finishes', async () => {
  const finishes = new Map<string, (value: { data: Message[] }) => void>();
  vi.spyOn(api, 'getMessages').mockImplementation(id => new Promise(resolve => finishes.set(id, resolve)));
  render(<App />);
  await waitFor(() => expect(chat.conversations).toHaveLength(2));
  let first!: Promise<void>, second!: Promise<void>;
  act(() => { first = chat.selectConversation('a'); });
  act(() => { second = chat.selectConversation('b'); });
  await act(async () => { finishes.get('a')!({ data: [message('a')] }); await first; });
  expect(chat.activeConversationId).toBe('b');
  expect(chat.isLoadingMessages).toBe(true);
  await act(async () => { finishes.get('b')!({ data: [message('b', 'b')] }); await second; });
  expect(chat.isLoadingMessages).toBe(false);
});
it('ignores delayed private history after logout', async () => {
  let finish!: (value: { data: Message[] }) => void;
  vi.spyOn(api, 'getMessages').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const app = render(<App />);
  await waitFor(() => expect(chat.conversations).toHaveLength(2));
  let selected!: Promise<void>;
  act(() => { selected = chat.selectConversation('a'); });
  harness.auth = { user: null, isAuthenticated: false };
  app.rerender(<App />);
  await act(async () => { finish({ data: [message('private')] }); await selected; });
  expect(chat.messages).toEqual([]);
  expect(chat.conversations).toEqual([]);
});
it('uses the same retry identifier after an ambiguous send failure', async () => {
  vi.spyOn(api, 'getMessages').mockResolvedValue({ data: [] });
  const send = vi.spyOn(api, 'sendMessage').mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({ data: message('sent') });
  render(<App />);
  await waitFor(() => expect(chat.conversations).toHaveLength(2));
  await act(async () => chat.selectConversation('a'));
  await act(async () => { await expect(chat.sendMessage('Hello')).rejects.toThrow(); });
  await act(async () => { await chat.sendMessage('Hello'); });
  expect(send.mock.calls[0][1].client_message_id).toBe(send.mock.calls[1][1].client_message_id);
});
it('refreshes active history after reconnection so offline edits do not remain stale', async () => {
  vi.spyOn(api, 'getMessages').mockResolvedValueOnce({ data: [message('old')] }).mockResolvedValueOnce({ data: [{ ...message('old'), body: 'Edited while disconnected' }, message('missed', 'a', 2)] });
  render(<App />);
  await waitFor(() => expect(chat.conversations).toHaveLength(2));
  await act(async () => chat.selectConversation('a'));
  act(() => harness.listeners.get('connection:status')?.({ connected: true }));
  await waitFor(() => expect(chat.messages).toHaveLength(2));
  expect(chat.messages[0].body).toBe('Edited while disconnected');
});
