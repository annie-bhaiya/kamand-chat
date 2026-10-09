import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { GymkhanaCalendarModal } from '../src/components/campus/GymkhanaCalendarModal';
import { CampusTicketDrawer } from '../src/components/campus/CampusTicketDrawer';
import { ToastProvider } from '../src/components/ui/Toast';
import { api } from '../src/lib/api';
import type { CampusEvent, CampusTicket } from '../src/types/chat';

const harness = vi.hoisted(() => ({ listeners: new Map<string, (payload: { kind?: string }) => void>() }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'resident', app_metadata: { campus_rooms: ['kamandprompt'] } }, profile: { hostel: 'Parashar', mess: 'Pine Mess' } }) }));
vi.mock('../src/lib/socket', () => ({ socketManager: { on: (name: string, handler: (payload: { kind?: string }) => void) => { harness.listeners.set(name, handler); return () => harness.listeners.delete(name); } } }));
const event: CampusEvent = { id: 'event', title: 'Workshop', description: 'Learn together', category: 'Club Workshop', organizer: 'KamandPrompt', venue: 'A13 Hall', date: '2026-12-01', startTime: '10:00', endTime: '11:00', status: 'conflict', createdAt: '2026-10-09T10:00:00Z', canManage: true };
const ticket: CampusTicket = { id: 'ticket', title: 'Hallway light repair', description: 'Light is not working', scope: 'hostel', category: 'Electrical', campus: 'North', clusterOrMess: 'Parashar', specificLocation: 'P2 hallway', status: 'Reported', upvotes: 1, upvotedBy: ['resident'], createdBy: 'resident', creatorName: 'Resident', createdAt: '2026-10-09T10:00:00Z', canManage: false };
beforeEach(() => {
  harness.listeners.clear();
  vi.spyOn(api, 'getCampusRoomPermissions').mockResolvedValue({ data: { roomSlug: 'kamandprompt', isAdmin: true, canBookEvents: true, canResolveTickets: false, canBroadcastMoodle: false, canUpdateMenu: false } });
});

it('a conflicting approval keeps the saved status and explains why approval failed', async () => {
  vi.spyOn(api, 'getCampusEvents').mockResolvedValue({ data: [event] });
  const update = vi.spyOn(api, 'updateCampusEventStatus').mockResolvedValue({ data: event });
  render(<ToastProvider><GymkhanaCalendarModal isOpen onClose={() => {}} defaultOrganizer="KamandPrompt" /></ToastProvider>);
  const record = (await screen.findByText('Workshop')).closest('article')!;
  await userEvent.selectOptions(within(record).getByLabelText('Status'), 'approved');
  await waitFor(() => expect(update).toHaveBeenCalledWith('event', 'approved'));
  await screen.findByText('Another event occupies this venue. Reschedule before approving.');
  expect((within(record).getByLabelText('Status') as HTMLSelectElement).value).toBe('conflict');
});

it('record permissions hide status controls and a realtime hint refreshes persisted ticket data', async () => {
  const list = vi.spyOn(api, 'getCampusTickets').mockResolvedValueOnce({ data: [ticket] }).mockResolvedValue({ data: [{ ...ticket, status: 'Resolved by Warden/Caretaker', history: [{ status: 'Resolved by Warden/Caretaker', createdAt: '2026-10-09T11:00:00Z' }] }] });
  render(<ToastProvider><CampusTicketDrawer isOpen onClose={() => {}} defaultClusterOrMess="Parashar" /></ToastProvider>);
  const record = (await screen.findByText('Hallway light repair')).closest('article')!;
  expect(within(record).queryByRole('combobox')).toBeNull();
  expect(within(record).getByRole('button', { name: /Support/ }).getAttribute('aria-pressed')).toBe('true');
  await act(async () => harness.listeners.get('campus:changed')!({ kind: 'tickets' }));
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  expect(within(record).getByText('Resolved by Warden/Caretaker')).toBeTruthy();
  expect(within(record).getByText('Status history')).toBeTruthy();
});
