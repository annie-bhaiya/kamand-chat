import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { MessMenuDrawer } from '../src/components/campus/MessMenuDrawer';
import { ToastProvider } from '../src/components/ui/Toast';
import { api } from '../src/lib/api';
import type { MessDayMenu } from '../src/types/chat';

const menu = (meal: string, weekday = 5): MessDayMenu => ({ weekday, todayWeekday: 5, messName: meal, day: 'Sample menu', breakfast: meal, lunch: meal, dinner: meal });
it.each(['Pine Mess', 'pine-mess', 'Pine Mess (North Dining 1)', '  PINE MESS  '])('normalizes the initial mess %s before fetching', async value => {
  const get = vi.spyOn(api, 'getMessMenu').mockResolvedValue({ data: menu('Pine meal') });
  render(<ToastProvider><MessMenuDrawer isOpen defaultMessSlug={value} onClose={() => {}} /></ToastProvider>);
  await waitFor(() => expect(screen.getAllByText('Pine meal')).toHaveLength(3));
  expect(get).toHaveBeenCalledWith('pine-mess', undefined);
  expect(get.mock.calls.every(([slug]) => slug === 'pine-mess')).toBe(true);
  expect((screen.getByLabelText('Dining Hall:') as HTMLSelectElement).value).toBe('pine-mess');
});
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
  expect(screen.getAllByText('Oak meal')).toHaveLength(3);
});
it('a failed menu request shows recovery instead of fabricated meal information', async () => {
  vi.spyOn(api, 'getMessMenu').mockRejectedValue(new Error('Unavailable'));
  render(<ToastProvider><MessMenuDrawer isOpen onClose={() => {}} /></ToastProvider>);
  await screen.findByText('The menu could not be loaded. Please try again.');
  expect(screen.queryByText(/Paneer Butter Masala/)).toBeNull();
});

it('opens on today, shows only the chosen day, and resets on a new visit', async () => {
  const get = vi.spyOn(api, 'getMessMenu').mockImplementation(async (_slug, weekday) => ({ data: menu(weekday === 1 ? 'Monday meal' : 'Friday meal', weekday ?? 5) }));
  const view = render(<ToastProvider><MessMenuDrawer isOpen onClose={() => {}} /></ToastProvider>);
  await screen.findByRole('heading', { name: 'Today · Friday' });
  expect(get).toHaveBeenLastCalledWith('pine-mess', undefined);
  await userEvent.selectOptions(screen.getByLabelText('View day'), '1');
  await waitFor(() => expect(screen.getAllByText('Monday meal')).toHaveLength(3));
  expect(screen.queryByText('Friday meal')).toBeNull();
  expect(get).toHaveBeenLastCalledWith('pine-mess', 1);
  await userEvent.click(screen.getByRole('button', { name: 'Back to today' }));
  await waitFor(() => expect(screen.getAllByText('Friday meal')).toHaveLength(3));
  await userEvent.selectOptions(screen.getByLabelText('View day'), '1');
  await screen.findByRole('button', { name: 'Back to today' });
  view.rerender(<ToastProvider><MessMenuDrawer isOpen={false} onClose={() => {}} /></ToastProvider>);
  view.rerender(<ToastProvider><MessMenuDrawer isOpen onClose={() => {}} /></ToastProvider>);
  await waitFor(() => expect(screen.getAllByText('Friday meal')).toHaveLength(3));
  expect((screen.getByLabelText('View day') as HTMLSelectElement).value).toBe('today');
});

it('a late weekday response cannot replace the newer selected day', async () => {
  const pending = new Map<number | undefined, (response: { data: MessDayMenu }) => void>();
  vi.spyOn(api, 'getMessMenu').mockImplementation((_slug, weekday) => new Promise(resolve => pending.set(weekday, resolve)));
  render(<ToastProvider><MessMenuDrawer isOpen onClose={() => {}} /></ToastProvider>);
  await waitFor(() => expect(pending.has(undefined)).toBe(true));
  await userEvent.selectOptions(screen.getByLabelText('View day'), '1');
  await waitFor(() => expect(pending.has(1)).toBe(true));
  await act(async () => pending.get(1)!({ data: menu('Monday meal', 1) }));
  await act(async () => pending.get(undefined)!({ data: menu('Friday meal') }));
  expect(screen.queryByText('Friday meal')).toBeNull();
  expect(screen.getAllByText('Monday meal')).toHaveLength(3);
});

it('the dining modal keeps rebate drafts local and updates the duration from date inputs', async () => {
  vi.spyOn(api, 'getMessMenu').mockResolvedValue({ data: menu('Sample meal') });
  render(<ToastProvider><MessMenuDrawer isOpen onClose={() => {}} /></ToastProvider>);
  await userEvent.click(screen.getByRole('button', { name: 'Rebate draft' }));
  fireEvent.change(screen.getByLabelText('From Date'), { target: { value: '2026-10-12' } });
  fireEvent.change(screen.getByLabelText('To Date'), { target: { value: '2026-10-15' } });
  expect(screen.getByText('4 days')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Save rebate draft' }));
  expect(screen.getByText('Local draft — not submitted')).toBeTruthy();
  expect(screen.getByText('2026-10-12 → 2026-10-15')).toBeTruthy();
  expect((screen.getByLabelText('From Date') as HTMLInputElement).value).toBe('');
});
