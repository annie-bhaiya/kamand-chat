import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { MessMenuDrawer } from '../src/components/campus/MessMenuDrawer';
import { ToastProvider } from '../src/components/ui/Toast';
import { api } from '../src/lib/api';
import type { MessDayMenu } from '../src/types/chat';

const menu = (meal: string): MessDayMenu => ({ messName: meal, day: 'Sample menu', breakfast: meal, lunch: meal, snacks: meal, dinner: meal });
it('a slow menu response cannot overwrite the newly selected mess', async () => {
  const finish = new Map<string, (value: { data: MessDayMenu }) => void>();
  vi.spyOn(api, 'getMessMenu').mockImplementation(slug => new Promise(resolve => finish.set(slug, resolve)));
  render(<ToastProvider><MessMenuDrawer isOpen onClose={() => {}} /></ToastProvider>);
  await waitFor(() => expect(finish.has('pine-mess')).toBe(true));
  await userEvent.selectOptions(screen.getByLabelText('Dining Hall:'), 'oak-mess');
  await waitFor(() => expect(finish.has('oak-mess')).toBe(true));
  await act(async () => finish.get('oak-mess')!({ data: menu('Oak meal') }));
  await act(async () => finish.get('pine-mess')!({ data: menu('Pine meal') }));
  expect(screen.queryByText('Pine meal')).toBeNull();
  expect(screen.getAllByText('Oak meal')).toHaveLength(4);
});
it('a failed menu request shows recovery instead of fabricated meal information', async () => {
  vi.spyOn(api, 'getMessMenu').mockRejectedValue(new Error('Unavailable'));
  render(<ToastProvider><MessMenuDrawer isOpen onClose={() => {}} /></ToastProvider>);
  await screen.findByText('The menu could not be loaded. Choose a mess again to retry.');
  expect(screen.queryByText(/Paneer Butter Masala/)).toBeNull();
});
