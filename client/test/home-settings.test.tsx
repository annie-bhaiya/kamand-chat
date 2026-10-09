import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Home from '@/app/page';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';

vi.mock('@/context/ChatContext', () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => children,
  useChat: () => ({ activeConversationId: null }),
}));
vi.mock('@/components/chat/ChatArea', () => ({ ChatArea: () => null }));
vi.mock('@/components/sidebar/Sidebar', async () => {
  const { useVisualSettings } = await import('@/components/settings/VisualSettings');
  return { Sidebar: function Sidebar() {
    const { openSettings } = useVisualSettings();
    return <button onClick={openSettings}>Open settings</button>;
  } };
});

afterEach(() => vi.restoreAllMocks());

it('shows campus residence controls inside the authenticated application settings', async () => {
  vi.spyOn(api, 'getAccessToken').mockReturnValue('local-test-token');
  vi.spyOn(api, 'getMe').mockResolvedValue({ data: {
    user: { id: 'student', email: 'student@example.com' },
    profile: { id: 'student', username: 'b24001', display_name: 'Student', avatar_key: null,
      created_at: '2026-01-01', branch: 'btech-cse', hostel: 'Suvalsar', hostel_block: 'B11', mess: 'pine-mess' },
  } });
  vi.spyOn(socketManager, 'connect').mockImplementation(() => {});
  vi.spyOn(socketManager, 'disconnect').mockImplementation(() => {});
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open settings' }));
  expect((screen.getByLabelText('Academic Branch') as HTMLSelectElement).value).toBe('btech-cse');
  expect((screen.getByLabelText('Hostel') as HTMLSelectElement).value).toBe('Suvalsar');
  expect(screen.getByRole('button', { name: 'Dark' })).toBeTruthy();
});
