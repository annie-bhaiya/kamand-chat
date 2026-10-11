import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AssistantPanel } from '../src/components/assistant/AssistantPanel';
import { api } from '../src/lib/api';
import type { AssistantReply } from '../src/types/assistant';

const state = vi.hoisted(() => ({ refreshProfile: vi.fn(), refreshConversations: vi.fn() }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ refreshProfile: state.refreshProfile }) }));
vi.mock('../src/context/ChatContext', () => ({ useChat: () => ({ activeConversationId: 'active-chat', refreshConversations: state.refreshConversations }) }));
const pending: AssistantReply = { sessionId: 'session', status: 'confirmation_required', message: 'Review these actions before applying them.', suggestions: [], actions: [], approval: { id: 'approval', actions: [{ name: 'send_message', description: 'Send a message', args: { body: 'Hello' } }] } };
const completed: AssistantReply = { sessionId: 'session', status: 'completed', message: 'Message sent.', suggestions: [], actions: [{ name: 'post_message', ok: true, status: 200, result: { data: { body: 'Hello' } } }] };
beforeEach(() => { vi.restoreAllMocks(); state.refreshProfile.mockClear(); state.refreshConversations.mockClear(); });

it('previews writes, confirms the exact approval and refreshes app data', async () => {
  const user = userEvent.setup();
  const assistant = vi.spyOn(api, 'assistant').mockResolvedValueOnce({ data: pending }).mockResolvedValueOnce({ data: completed });
  render(<AssistantPanel />);
  await user.click(screen.getByRole('button', { name: 'Open Kamand assistant' }));
  await user.type(screen.getByRole('textbox', { name: 'Your assistant request' }), 'Send Hello');
  await user.click(screen.getByRole('button', { name: 'Send assistant request' }));
  await screen.findByRole('button', { name: 'Confirm actions' });
  expect(assistant).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Confirm actions' }));
  await screen.findByText('Message sent.');
  expect(assistant).toHaveBeenLastCalledWith({ sessionId: 'session', decision: 'confirm', approvalId: 'approval', conversationId: 'active-chat' });
  expect(state.refreshConversations).toHaveBeenCalledOnce();
  expect(state.refreshProfile).toHaveBeenCalledOnce();
});

it('cancels a pending action and resets the conversation', async () => {
  const user = userEvent.setup();
  const assistant = vi.spyOn(api, 'assistant').mockResolvedValueOnce({ data: pending }).mockResolvedValueOnce({ data: { ...completed, message: 'Cancelled.', actions: [] } });
  render(<AssistantPanel />);
  await user.click(screen.getByRole('button', { name: 'Open Kamand assistant' }));
  await user.click(screen.getByRole('button', { name: 'Show upcoming campus events' }));
  await user.click(await screen.findByRole('button', { name: /^Cancel$/ }));
  await screen.findByText('Cancelled.');
  expect(assistant).toHaveBeenLastCalledWith({ sessionId: 'session', decision: 'cancel', approvalId: 'approval', conversationId: 'active-chat' });
  expect(state.refreshConversations).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'New assistant conversation' }));
  expect(screen.queryByText('Cancelled.')).toBeNull();
  expect(screen.getByText('What can I help you do?')).toBeTruthy();
});

it('shows transport errors without retrying an action', async () => {
  const user = userEvent.setup();
  const assistant = vi.spyOn(api, 'assistant').mockRejectedValue(new Error('Connection interrupted'));
  render(<AssistantPanel />);
  await user.click(screen.getByRole('button', { name: 'Open Kamand assistant' }));
  await user.click(screen.getByRole('button', { name: 'Show upcoming campus events' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Connection interrupted'));
  expect(assistant).toHaveBeenCalledOnce();
});
