import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { ClientFactory } from '../supabase.js';
import type { Events } from '../events.js';
import { ApiError, unwrap } from '../errors.js';
import {
  CAMPUS_ROOMS,
  SEED_EVENTS,
  SEED_TICKETS,
  SEED_MOODLE_DATA,
  SEED_MESS_MENUS,
  CampusEvent,
  CampusTicket,
  MoodleAssignment,
  isCampusRoomAdmin,
  canManageEvents,
  canResolveTickets,
  canBroadcastMoodle,
} from '../campus-data.js';

// Live in-memory state initialized with seeds
let liveEvents: CampusEvent[] = [...SEED_EVENTS];
let liveTickets: CampusTicket[] = [...SEED_TICKETS];
let liveMoodleData: Record<string, MoodleAssignment[]> = JSON.parse(JSON.stringify(SEED_MOODLE_DATA));

// Room to conversation mapping cache
const roomConversationMap = new Map<string, string>();

export function campusRoutes(factory: ClientFactory, events: Events) {
  const router = Router();

  // 1. Get all Campus Scoped Rooms
  router.get('/rooms', (req, res) => {
    const category = req.query.category as string | undefined;
    const campus = req.query.campus as string | undefined;

    let filtered = CAMPUS_ROOMS;
    if (category) {
      filtered = filtered.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }
    if (campus && campus !== 'Both') {
      filtered = filtered.filter(r => r.campus === campus || r.campus === 'Both');
    }

    res.json({ data: filtered });
  });

  // 2. Get specific room details
  router.get('/rooms/:slug', (req, res) => {
    const room = CAMPUS_ROOMS.find(r => r.slug === req.params.slug);
    if (!room) {
      throw new ApiError(404, 'NOT_FOUND', 'Campus room not found.');
    }
    res.json({ data: room });
  });

  // 3. Get user permissions for a specific room
  router.get('/rooms/:slug/permissions', (req, res) => {
    const room = CAMPUS_ROOMS.find(r => r.slug === req.params.slug);
    if (!room) {
      throw new ApiError(404, 'NOT_FOUND', 'Campus room not found.');
    }

    const isAdmin = isCampusRoomAdmin(room.slug, req.user);
    res.json({
      data: {
        roomSlug: room.slug,
        isAdmin,
        canBookEvents: canManageEvents(req.user, room.name, isAdmin),
        canResolveTickets: canResolveTickets(req.user, room.category === 'messes' ? 'mess' : 'hostel', room.hostelCluster || room.name, isAdmin),
        canBroadcastMoodle: canBroadcastMoodle(req.user, room.courseCode || room.name, isAdmin),
        canUpdateMenu: room.category === 'messes' && isAdmin,
      },
    });
  });

  // 4. Resolve or join conversation for a campus room (via SECURITY DEFINER RPC)
  router.post('/rooms/:slug/conversation', async (req, res) => {
    const room = CAMPUS_ROOMS.find(r => r.slug === req.params.slug);
    if (!room) {
      throw new ApiError(404, 'NOT_FOUND', 'Campus room not found.');
    }

    if (!req.user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to join campus room conversations.');
    }

    try {
      const rpcResult = await req.db.rpc('join_or_create_campus_room', {
        p_room_slug: room.slug,
        p_room_title: `#${room.name}`,
      });

      const conv = unwrap(rpcResult);
      if (!conv || !conv.id) {
        throw new ApiError(500, 'ROOM_JOIN_FAILED', 'Could not provision campus room conversation.');
      }

      roomConversationMap.set(room.slug, conv.id);

      const isOwner = conv.created_by === req.user.id;
      const isAdmin = isCampusRoomAdmin(room.slug, req.user, isOwner);

      // Notify realtime subscribers that membership or conversation was updated
      await events.safely(() =>
        events.conversation(req.db, conv.id, 'conversation:updated', { conversation_id: conv.id })
      );

      res.json({
        data: {
          conversation: conv,
          room,
          isAdmin,
        },
      });
    } catch (err: any) {
      console.error(`Failed to join or create campus room ${room.slug}:`, err);
      throw err;
    }
  });

  // 5. Gymkhana Calendar & Event Management System
  router.get('/events', (req, res) => {
    const venue = req.query.venue as string | undefined;
    const category = req.query.category as string | undefined;

    let events = [...liveEvents];
    if (venue) {
      events = events.filter(e => e.venue.toLowerCase() === venue.toLowerCase());
    }
    if (category) {
      events = events.filter(e => e.category.toLowerCase() === category.toLowerCase());
    }

    // Sort by date ascending
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ data: events });
  });

  router.post('/events', async (req, res) => {
    const schema = z.object({
      title: z.string().trim().min(3).max(120),
      description: z.string().trim().default(''),
      category: z.enum(['Club Workshop', 'Fest Event', 'Sports Tournament', 'Placement & Tech Talk', 'General']),
      organizer: z.string().trim().min(2).max(80),
      venue: z.enum(['Auditorium A1/A2', 'A13 Hall', 'South Campus Grounds', 'SCEE Seminar Hall', 'Sports Complex', 'Other']),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
      startTime: z.string().trim().min(1),
      endTime: z.string().trim().min(1),
    });

    const input = schema.parse(req.body);

    if (!req.user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to book campus events.');
    }

    // Role Enforcement: Only room admins, club coordinators, or Gymkhana Council can book venues
    if (!canManageEvents(req.user, input.organizer)) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        `Administrative privileges required: Only coordinators for "${input.organizer}" or Gymkhana Council can reserve venues and schedule events.`
      );
    }

    // Collision Detection: Check if another event is scheduled for the same venue and date
    const collision = liveEvents.find(
      e =>
        e.date === input.date &&
        e.venue === input.venue &&
        e.status === 'approved' &&
        (e.startTime === input.startTime ||
         (input.startTime >= e.startTime && input.startTime < e.endTime) ||
         (input.endTime > e.startTime && input.endTime <= e.endTime))
    );

    const newEvent: CampusEvent = {
      id: `event-${Date.now()}-${randomUUID().slice(0, 6)}`,
      ...input,
      status: collision ? 'conflict' : 'approved',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
    };

    liveEvents.unshift(newEvent);

    if (collision) {
      res.status(200).json({
        data: newEvent,
        warning: `Scheduling collision detected with "${collision.title}" at ${input.venue} (${collision.startTime} - ${collision.endTime}). Marked for Gymkhana Council resolution.`,
      });
      return;
    }

    res.status(201).json({ data: newEvent });
  });

  router.patch('/events/:id/status', (req, res) => {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to update event status.');
    }

    const { status } = z.object({ status: z.enum(['pending', 'approved', 'conflict', 'completed']) }).parse(req.body);
    const event = liveEvents.find(e => e.id === req.params.id);
    if (!event) {
      throw new ApiError(404, 'NOT_FOUND', 'Event not found.');
    }

    if (!canManageEvents(req.user, event.organizer)) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'Only Gymkhana Council or event organizers can change event approval status.'
      );
    }

    event.status = status;
    res.json({ data: event });
  });

  // 6. Hostels & Messes Problem + Solution Ticket Management
  router.get('/tickets', (req, res) => {
    const scope = req.query.scope as string | undefined;
    const campus = req.query.campus as string | undefined;
    const status = req.query.status as string | undefined;
    const cluster = req.query.cluster as string | undefined;

    let tickets = [...liveTickets];
    if (scope) {
      tickets = tickets.filter(t => t.scope === scope);
    }
    if (campus) {
      tickets = tickets.filter(t => t.campus === campus);
    }
    if (status) {
      tickets = tickets.filter(t => t.status === status);
    }
    if (cluster) {
      tickets = tickets.filter(t => t.clusterOrMess.toLowerCase().includes(cluster.toLowerCase()));
    }

    // Sort by upvotes descending (highest priority first)
    tickets.sort((a, b) => b.upvotes - a.upvotes);

    res.json({ data: tickets });
  });

  router.post('/tickets', async (req, res) => {
    const schema = z.object({
      title: z.string().trim().min(5).max(160),
      description: z.string().trim().default(''),
      scope: z.enum(['hostel', 'mess']),
      category: z.string().trim().min(2),
      campus: z.enum(['North', 'South']),
      clusterOrMess: z.string().trim().min(2),
      specificLocation: z.string().trim().min(2),
    });

    const input = schema.parse(req.body);

    if (!req.user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to submit maintenance tickets.');
    }

    // Look up creator display name
    const profile = await req.db
      .from('profiles')
      .select('display_name, username')
      .eq('id', req.user.id)
      .single();

    const creatorName = profile.data?.display_name || profile.data?.username || 'Student';

    const newTicket: CampusTicket = {
      id: `ticket-${Date.now()}-${randomUUID().slice(0, 6)}`,
      ...input,
      status: 'Reported',
      upvotes: 1,
      upvotedBy: [req.user.id],
      createdBy: req.user.id,
      creatorName,
      createdAt: new Date().toISOString(),
    };

    liveTickets.unshift(newTicket);
    res.status(201).json({ data: newTicket });
  });

  router.post('/tickets/:id/upvote', (req, res) => {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to upvote tickets.');
    }
    const ticket = liveTickets.find(t => t.id === req.params.id);
    if (!ticket) {
      throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
    }

    const userId = req.user.id;
    const alreadyUpvoted = ticket.upvotedBy.includes(userId);

    if (alreadyUpvoted) {
      ticket.upvotedBy = ticket.upvotedBy.filter(id => id !== userId);
      ticket.upvotes = Math.max(0, ticket.upvotes - 1);
    } else {
      ticket.upvotedBy.push(userId);
      ticket.upvotes += 1;
    }

    res.json({ data: { ticket, hasUpvoted: !alreadyUpvoted } });
  });

  router.patch('/tickets/:id/status', (req, res) => {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to update ticket status.');
    }

    const { status } = z.object({
      status: z.enum(['Reported', 'Under Investigation', 'Resolved by Warden/Caretaker']),
    }).parse(req.body);

    const ticket = liveTickets.find(t => t.id === req.params.id);
    if (!ticket) {
      throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
    }

    // Role Enforcement: Only Wardens, Caretakers, or Dining Committee Heads can resolve tickets
    if (!canResolveTickets(req.user, ticket.scope, ticket.clusterOrMess)) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'Only Hostel Wardens, Caretakers, or Mess Committee Heads can change ticket status.'
      );
    }

    ticket.status = status;
    if (status === 'Resolved by Warden/Caretaker') {
      ticket.resolvedAt = new Date().toISOString();
    }

    res.json({ data: ticket });
  });

  // 7. Courses & Academics (Moodle Integration)
  router.get('/moodle/:courseCode', (req, res) => {
    const code = req.params.courseCode.toUpperCase();
    const items = liveMoodleData[code] || [];
    res.json({
      data: {
        courseCode: code,
        moodleHost: 'moodle.iitmandi.ac.in',
        lastSynced: new Date().toISOString(),
        assignments: items,
      },
    });
  });

  router.post('/moodle/sync', async (req, res) => {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to trigger Moodle LMS sync.');
    }

    const { courseCode } = z.object({ courseCode: z.string().trim().min(2).max(20) }).parse(req.body);
    const code = courseCode.toUpperCase();

    // Role Enforcement: Only Course Instructors, TAs, or CRs can trigger manual Moodle sync & broadcasts
    if (!canBroadcastMoodle(req.user, code)) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        `Administrative privileges required: Only Course Instructors, TAs, or Class Representatives for ${code} can trigger Moodle synchronization.`
      );
    }

    // Generate or refresh mock academic alert from moodle.iitmandi.ac.in
    const newAlert: MoodleAssignment = {
      id: `moodle-${code.toLowerCase()}-${Date.now()}`,
      courseCode: code,
      title: `${code} New Quiz Announcement: Quiz #${Math.floor(Math.random() * 3) + 1}`,
      description: `Automated broadcast from moodle.iitmandi.ac.in. Quiz will open this Friday at 18:00 IST for 45 minutes.`,
      type: 'quiz',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      weightage: '8% of total',
      moodleUrl: `https://moodle.iitmandi.ac.in/course/view.php?name=${code}`,
      status: 'pending',
    };

    if (!liveMoodleData[code]) {
      liveMoodleData[code] = [];
    }
    liveMoodleData[code].unshift(newAlert);

    res.json({
      data: {
        success: true,
        courseCode: code,
        alert: newAlert,
        syncedAt: new Date().toISOString(),
      },
    });
  });

  // 8. Mess Menus & Operational Schedules
  router.get('/messes/:messSlug/menu', (req, res) => {
    const slug = req.params.messSlug.toLowerCase();
    const menu = SEED_MESS_MENUS[slug];
    if (!menu) {
      throw new ApiError(404, 'NOT_FOUND', 'Mess menu not found.');
    }
    res.json({ data: menu });
  });

  return router;
}
