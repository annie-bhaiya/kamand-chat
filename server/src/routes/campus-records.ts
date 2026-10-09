import { Router } from 'express';
import { z } from 'zod';
import { ApiError, unwrap } from '../errors.js';
import { CAMPUS_ROOMS } from '../campus-data.js';
import { validDate, timeInMinutes } from '../campus-time.js';
import { uuid } from '../validation.js';
import type { Events } from '../events.js';

export const eventInput = z.object({
  title: z.string().trim().min(3).max(120), description: z.string().trim().max(10000).default(''),
  category: z.enum(['Club Workshop', 'Fest Event', 'Sports Tournament', 'Placement & Tech Talk', 'General']),
  organizer: z.string().trim().min(2).max(120),
  venue: z.enum(['Auditorium A1/A2', 'A13 Hall', 'South Campus Grounds', 'SCEE Seminar Hall', 'Sports Complex', 'Other']),
  date: z.string().refine(validDate, 'Choose a valid date.'),
  startTime: z.string().refine(value => timeInMinutes(value) !== null, 'Choose a valid start time.'),
  endTime: z.string().refine(value => timeInMinutes(value) !== null, 'Choose a valid end time.'),
}).strict().refine(input => timeInMinutes(input.endTime)! > timeInMinutes(input.startTime)!, 'End time must be after start time.');

const normalize = (value: string) => value.toLowerCase().replace(/\s*\(.*/, '').trim();
const filter = z.string().trim().min(1).max(120).optional();
function eventData(input: z.infer<typeof eventInput>) {
  const room = CAMPUS_ROOMS.find(room => room.slug === normalize(input.organizer) || normalize(room.name) === normalize(input.organizer));
  if (!room) throw new ApiError(400, 'INVALID_REQUEST', 'Choose a registered campus organizer.');
  return { ...input, roomSlug: room.slug, startMinute: timeInMinutes(input.startTime), endMinute: timeInMinutes(input.endTime) };
}

export function campusRecordRoutes(events: Events) {
  const router = Router();
  const notify = (kind: 'events' | 'tickets') => { void events.safely(async () => { events.io?.emit('campus:changed', { kind }); }); };
  router.use((_req, res, next) => { res.setHeader('X-Campus-Data-Mode', 'persistent'); next(); });
  router.get('/events', async (req, res) => {
    const query = z.object({ venue: filter, category: filter }).strict().parse(req.query);
    const data = unwrap(await req.db.rpc('list_campus_events', { p_venue: query.venue ?? null, p_category: query.category ?? null }));
    res.json({ data });
  });
  router.post('/events', async (req, res) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to plan campus events.');
    const data = unwrap(await req.db.rpc('save_campus_event', { p_input: eventData(eventInput.parse(req.body)) }));
    notify('events');
    res.status(201).json({ data, ...(data.status === 'conflict' ? { warning: 'This venue already has an overlapping reservation. The event was saved as a conflict.' } : {}) });
  });
  router.patch('/events/:id', async (req, res) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to edit events.');
    const data = unwrap(await req.db.rpc('save_campus_event', { p_id: uuid.parse(req.params.id), p_input: eventData(eventInput.parse(req.body)) }));
    notify('events');
    res.json({ data, ...(data.status === 'conflict' ? { warning: 'The updated event overlaps another reservation and was saved as a conflict.' } : {}) });
  });
  router.patch('/events/:id/status', async (req, res) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to update event status.');
    const { status } = z.object({ status: z.enum(['pending', 'approved', 'conflict', 'completed', 'cancelled']) }).strict().parse(req.body);
    const data = unwrap(await req.db.rpc('set_campus_event_status', { p_id: uuid.parse(req.params.id), p_status: status }));
    notify('events');
    res.json({ data, ...(status === 'approved' && data.status === 'conflict' ? { warning: 'This event cannot be approved while its venue overlaps an approved reservation.' } : {}) });
  });
  router.get('/tickets', async (req, res) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to view maintenance reports.');
    const query = z.object({ scope: z.enum(['hostel', 'mess']).optional(), campus: z.enum(['North', 'South']).optional(), status: filter, cluster: filter }).strict().parse(req.query);
    let cluster = query.cluster;
    if (cluster) {
      const room = CAMPUS_ROOMS.find(room => ['hostels', 'messes'].includes(room.category) && [room.slug, room.name, room.hostelCluster].some(value => value && normalize(value) === normalize(cluster!)));
      if (room) cluster = room.hostelCluster || room.name.replace(/\s*\(.*/, '');
    }
    const data = unwrap(await req.db.rpc('list_maintenance_tickets', { p_scope: query.scope ?? null, p_campus: query.campus ?? null, p_status: query.status ?? null, p_cluster: cluster ?? null }));
    res.json({ data });
  });
  router.post('/tickets', async (req, res) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to report maintenance issues.');
    const input = z.object({ title: z.string().trim().min(5).max(160), description: z.string().trim().max(10000).default(''), scope: z.enum(['hostel', 'mess']),
      category: z.string().trim().min(2).max(80), campus: z.enum(['North', 'South']), clusterOrMess: z.string().trim().min(2).max(120), specificLocation: z.string().trim().min(2).max(160) }).strict().parse(req.body);
    const room = CAMPUS_ROOMS.find(room => room.category === (input.scope === 'hostel' ? 'hostels' : 'messes') &&
      [room.slug, room.name, room.hostelCluster].some(value => value && normalize(value) === normalize(input.clusterOrMess)));
    if (!room) throw new ApiError(400, 'INVALID_REQUEST', 'Choose a registered hostel or mess.');
    const data = unwrap(await req.db.rpc('create_maintenance_ticket', { p_input: { ...input, roomSlug: room.slug, campus: room.campus === 'South' ? 'South' : 'North' } }));
    notify('tickets');
    res.status(201).json({ data });
  });
  router.post('/tickets/:id/upvote', async (req, res) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to support reports.');
    const data = unwrap(await req.db.rpc('toggle_maintenance_vote', { p_id: uuid.parse(req.params.id) }));
    notify('tickets');
    res.json({ data });
  });
  router.patch('/tickets/:id/status', async (req, res) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to update reports.');
    const { status } = z.object({ status: z.enum(['Reported', 'Under Investigation', 'Resolved by Warden/Caretaker']) }).strict().parse(req.body);
    const data = unwrap(await req.db.rpc('set_maintenance_ticket_status', { p_id: uuid.parse(req.params.id), p_status: status }));
    notify('tickets');
    res.json({ data });
  });
  return router;
}
