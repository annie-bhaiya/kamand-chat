import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canManageEvents, canResolveTickets, isCampusRoomAdmin } from '../src/campus-data.js';
import { overlaps, timeInMinutes, validDate } from '../src/campus-time.js';
import { indiaWeekday, menuInputSchema, menuQuerySchema } from '../src/mess-menu.js';

test('mess menu today follows India midnight and weekdays are validated', () => {
  assert.equal(indiaWeekday(new Date('2026-10-08T18:29:59Z')), 4);
  assert.equal(indiaWeekday(new Date('2026-10-08T18:30:00Z')), 5);
  assert.equal(indiaWeekday(new Date('2026-10-11T18:30:00Z')), 1);
  assert.deepEqual(menuQuerySchema.parse({}), {});
  assert.equal(menuQuerySchema.parse({ weekday: '7' }).weekday, 7);
  for (const weekday of ['0', '8', '1.5', 'Friday', ['1', '2']]) assert.throws(() => menuQuerySchema.parse({ weekday }));
  assert.throws(() => menuInputSchema.parse({ weekday: 5, breakfast: 'A', lunch: 'B', dinner: 'C', day: 'All week' }));
});

test('campus privileges require a verified institute email, never editable usernames', () => {
  assert.equal(isCampusRoomAdmin('kamandprompt', { email: 'admin@example.com', username: 'admin', email_confirmed_at: 'now' }), false);
  assert.equal(isCampusRoomAdmin('kamandprompt', { email: 'b23419@students.iitmandi.ac.in', username: 'admin' }), false);
  assert.equal(isCampusRoomAdmin('kamandprompt', { email: 'b23999@students.iitmandi.ac.in', username: 'admin', email_confirmed_at: 'now' }), false);
  const coordinator = { email: 'b23419@students.iitmandi.ac.in', email_confirmed_at: 'now' };
  assert.equal(isCampusRoomAdmin('kamandprompt', coordinator), true);
  assert.equal(isCampusRoomAdmin('robotronics', coordinator), false);
  assert.equal(canManageEvents(coordinator, 'KamandPrompt'), true);
  assert.equal(canResolveTickets({ email: 'warden_fake@iitmandi.ac.in', email_confirmed_at: 'now' }, 'hostel', 'Parashar'), false);
});
test('campus dates and clock times reject impossible values', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(timeInMinutes('12:00 AM'), 0);
  assert.equal(timeInMinutes('12:00 PM'), 720);
  assert.equal(timeInMinutes('17:30'), 1050);
  assert.equal(timeInMinutes('05:30 PM'), 1050);
  for (const time of ['24:00', '13:00 PM', '10:60', 'yesterday']) assert.equal(timeInMinutes(time), null);
});

test('demo managers are authorized by trusted metadata only and stay within their room scopes', () => {
  const manager = { app_metadata: { campus_rooms: ['kamandprompt', 'pine-mess', 'p2-chat'] } };
  assert.equal(isCampusRoomAdmin('kamandprompt', manager), true);
  assert.equal(isCampusRoomAdmin('robotronics', manager), false);
  assert.equal(canManageEvents(manager, 'KamandPrompt'), true);
  assert.equal(canManageEvents(manager, 'Robotronics'), false);
  assert.equal(canResolveTickets(manager, 'mess', 'Pine Mess (North Dining 1)'), true);
  assert.equal(canResolveTickets(manager, 'mess', 'Pine Mess'), true);
  assert.equal(canResolveTickets(manager, 'mess', 'Oak Mess'), false);
  assert.equal(canResolveTickets(manager, 'hostel', 'Parashar'), true);
});
test('venue collisions cover containment, mixed time formats and adjacent reservations', () => {
  assert.equal(overlaps('09:00', '18:00', '10:00 AM', '12:00 PM'), true);
  assert.equal(overlaps('11:00 AM', '01:00 PM', '12:00', '14:00'), true);
  assert.equal(overlaps('09:00', '10:00', '10:00', '11:00'), false);
  assert.equal(overlaps('garbage', '10:00', '09:00', '11:00'), false);
});

test('profileSchema validates hostel, hostel_block, branch, mess, and chat_only preferences', async () => {
  const { profileSchema } = await import('../src/validation.js');
  const valid1 = profileSchema.parse({
    hostel: 'Suvalsar',
    hostel_block: 'B11',
    branch: 'btech-cse',
    mess: 'Oak Mess',
    chat_only: false,
  });
  assert.equal(valid1.hostel, 'Suvalsar');
  assert.equal(valid1.hostel_block, 'B11');
  assert.equal(valid1.branch, 'btech-cse');
  assert.equal(valid1.mess, 'Oak Mess');
  assert.equal(valid1.chat_only, false);

  const validChatOnly = profileSchema.parse({
    chat_only: true,
    hostel: null,
    hostel_block: null,
    branch: null,
    mess: null,
  });
  assert.equal(validChatOnly.chat_only, true);
  assert.equal(validChatOnly.hostel, null);
  assert.equal(validChatOnly.hostel_block, null);
  assert.equal(validChatOnly.branch, null);
  assert.equal(validChatOnly.mess, null);

  assert.throws(() => profileSchema.parse({ hostel: 123 }));
  assert.throws(() => profileSchema.parse({ hostel_block: 456 }));
  assert.throws(() => profileSchema.parse({ branch: 789 }));
  assert.throws(() => profileSchema.parse({ chat_only: 'yes' }));
  assert.throws(() => profileSchema.parse({}));
});
