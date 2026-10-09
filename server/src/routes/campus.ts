import { Router } from 'express';
import { z } from 'zod';
import { campusRecordRoutes } from './campus-records.js';
import type { ClientFactory } from '../supabase.js';
import type { Events } from '../events.js';
import { ApiError, unwrap } from '../errors.js';
import {
  CAMPUS_ROOMS,
  SEED_MOODLE_DATA,
  SEED_MESS_MENUS,
  MoodleAssignment,
  isCampusRoomAdmin,
  canBroadcastMoodle,
} from '../campus-data.js';

export function campusRoutes(factory: ClientFactory, events: Events) {
  const router = Router();
  // Moodle remains an explicit sample integration.
  const liveMoodleData: Record<string, MoodleAssignment[]> = structuredClone(SEED_MOODLE_DATA);
  const moodleRefreshes: Record<string, string> = {};
  router.use((_req, res, next) => { res.setHeader('X-Campus-Data-Mode', 'persistent'); next(); });

  // 1. Get all Campus Scoped Rooms (filtered by enrollment for restricted rooms)
  router.get('/rooms', async (req, res) => {
    const category = req.query.category as string | undefined;
    const campus = req.query.campus as string | undefined;

    let filtered = CAMPUS_ROOMS;
    if (category) {
      filtered = filtered.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }
    if (campus && campus !== 'Both') {
      filtered = filtered.filter(r => r.campus === campus || r.campus === 'Both');
    }

    if (req.user) {
      const userProfile = unwrap(
        await req.db.from('profiles').select('hostel, hostel_block, branch, mess, chat_only').eq('id', req.user.id).maybeSingle()
      );
      if (userProfile?.chat_only) {
        filtered = filtered.filter(r => r.category !== 'hostels' && r.category !== 'messes' && r.category !== 'branches');
      } else {
        if (userProfile?.hostel) {
          const uh = userProfile.hostel.toLowerCase().trim();
          const ub = (userProfile.hostel_block || '').toLowerCase().trim();
          filtered = filtered.filter(r => {
            if (isCampusRoomAdmin(r.slug, req.user)) return true;
            if (r.category !== 'hostels') return true;
            const cluster = (r.hostelCluster || '').toLowerCase().trim();
            const name = r.name.toLowerCase().trim();
            const slug = r.slug.toLowerCase().trim();
            const matchesCluster = cluster.includes(uh) || uh.includes(cluster) || name.includes(uh) || slug.includes(uh.replace(/\s+/g, '-'));
            if (!matchesCluster) return false;
            if (r.hostelBlock) {
              return ub ? r.hostelBlock.toLowerCase().trim() === ub || name.includes(ub) : false;
            }
            return true;
          });
        }
        if (userProfile?.branch) {
          const uBranch = userProfile.branch.toLowerCase().trim();
          filtered = filtered.filter(r => {
            if (r.category !== 'branches') return true;
            const name = r.name.toLowerCase().trim();
            const slug = r.slug.toLowerCase().trim();
            const id = (r.id || '').toLowerCase().trim();
            return slug === uBranch || id === uBranch || name.includes(uBranch) || uBranch.includes(slug) || uBranch.includes(name);
          });
        }
        if (userProfile?.mess) {
          const um = userProfile.mess.toLowerCase().trim();
          const keyword = um.replace(/\s*mess.*$/i, '').trim();
          filtered = filtered.filter(r => {
            if (isCampusRoomAdmin(r.slug, req.user)) return true;
            if (r.category !== 'messes') return true;
            const name = r.name.toLowerCase().trim();
            const slug = r.slug.toLowerCase().trim();
            return name.includes(um) || slug.includes(keyword) || name.includes(keyword);
          });
        }
      }
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
  router.get('/rooms/:slug/permissions', async (req, res) => {
    const room = CAMPUS_ROOMS.find(r => r.slug === req.params.slug);
    if (!room) {
      throw new ApiError(404, 'NOT_FOUND', 'Campus room not found.');
    }

    const isAdmin = isCampusRoomAdmin(room.slug, req.user);
    const persisted = req.user ? unwrap(await req.db.rpc('campus_management_permissions', { p_slug: room.slug })) : { canManage: false, canResolve: false, canAccess: false };
    res.json({
      data: {
        roomSlug: room.slug,
        isAdmin,
        canBookEvents: Boolean(persisted.canManage),
        canResolveTickets: ['hostels', 'messes'].includes(room.category) && Boolean(persisted.canResolve),
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

    if (room.category === 'hostels' || room.category === 'messes' || room.category === 'branches') {
      const userProfile = unwrap(
        await req.db.from('profiles').select('hostel, hostel_block, branch, mess, chat_only').eq('id', req.user.id).maybeSingle()
      );
      if (userProfile?.chat_only) {
        throw new ApiError(403, 'FORBIDDEN', 'Chat-only mode: hostel, mess, and branch room chats are not accessible.');
      }
      const isAdmin = isCampusRoomAdmin(room.slug, req.user);
      if (!isAdmin) {
        if (room.category === 'hostels') {
          if (!userProfile?.hostel) {
            throw new ApiError(403, 'RESIDENCE_REQUIRED', 'Please select your hostel before joining hostel chats.');
          }
          const userHostel = userProfile.hostel.toLowerCase().trim();
          const roomCluster = (room.hostelCluster || '').toLowerCase().trim();
          const roomName = room.name.toLowerCase().trim();
          if (!roomCluster.includes(userHostel) && !userHostel.includes(roomCluster) && !roomName.includes(userHostel)) {
            throw new ApiError(403, 'FORBIDDEN', 'You can only join chat rooms for your assigned hostel.');
          }
          if (room.hostelBlock) {
            if (!userProfile?.hostel_block) {
              throw new ApiError(403, 'RESIDENCE_REQUIRED', 'Please select your hostel block before joining unit block chats.');
            }
            const userBlock = userProfile.hostel_block.toLowerCase().trim();
            const roomBlock = room.hostelBlock.toLowerCase().trim();
            if (userBlock !== roomBlock && !roomName.includes(userBlock)) {
              throw new ApiError(403, 'FORBIDDEN', 'You can only join the chat room for your assigned hostel block.');
            }
          }
        } else if (room.category === 'branches') {
          if (!userProfile?.branch) {
            throw new ApiError(403, 'BRANCH_REQUIRED', 'Please select your branch before joining branch chats.');
          }
          const userBranch = userProfile.branch.toLowerCase().trim();
          const roomName = room.name.toLowerCase().trim();
          const roomSlug = room.slug.toLowerCase().trim();
          const roomId = (room.id || '').toLowerCase().trim();
          const matchesBranch =
            roomSlug === userBranch ||
            roomId === userBranch ||
            roomName.includes(userBranch) ||
            userBranch.includes(roomSlug) ||
            userBranch.includes(roomName);
          if (!matchesBranch) {
            throw new ApiError(403, 'FORBIDDEN', 'You can only join the chat room for your enrolled branch.');
          }
        } else if (room.category === 'messes') {
          if (!userProfile?.mess) {
            throw new ApiError(403, 'RESIDENCE_REQUIRED', 'Please select your mess before joining mess chats.');
          }
          const userMess = userProfile.mess.toLowerCase().trim();
          const roomName = room.name.toLowerCase().trim();
          const roomSlug = room.slug.toLowerCase().trim();
          const messKeyword = userMess.replace(/\s*mess.*$/i, '').trim();
          if (!roomName.includes(userMess) && !roomSlug.includes(messKeyword) && !roomName.includes(messKeyword)) {
            throw new ApiError(403, 'FORBIDDEN', 'You can only join the chat room for your assigned mess.');
          }
        }
      }
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

      const isAdmin = isCampusRoomAdmin(room.slug, req.user);

      events.invalidateMembers(conv.id);
      // Notify realtime subscribers that membership or conversation was updated
      void events.safely(() =>
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

  router.use(campusRecordRoutes(events));

  // 7. Courses & Academics (Moodle Integration)
  router.get('/moodle/:courseCode', (req, res) => {
    res.setHeader('X-Campus-Data-Mode', 'demo');
    const code = req.params.courseCode.toUpperCase();
    const items = liveMoodleData[code] || [];
    res.json({
      data: {
        courseCode: code,
        moodleHost: 'moodle.iitmandi.ac.in',
        lastSynced: moodleRefreshes[code] || null,
        demo: true,
        assignments: items,
      },
    });
  });

  router.post('/moodle/sync', async (req, res) => {
    res.setHeader('X-Campus-Data-Mode', 'demo');
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
      title: `${code} Sample quiz reminder`,
      description: `Sample academic reminder. This is not fetched from Moodle and is not an official course announcement.`,
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
    moodleRefreshes[code] = new Date().toISOString();

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
  router.get('/messes/:messSlug/menu', async (req, res) => {
    const slug = req.params.messSlug.toLowerCase();
    const menu = SEED_MESS_MENUS[slug];
    if (!menu) {
      throw new ApiError(404, 'NOT_FOUND', 'Mess menu not found.');
    }
    const stored = unwrap(await req.db.from('mess_menus').select('menu').eq('room_slug', slug).maybeSingle());
    res.json({ data: stored?.menu ?? menu });
  });

  router.put('/messes/:messSlug/menu', async (req, res) => {
    const slug = req.params.messSlug.toLowerCase();
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to update menus.');
    if (!SEED_MESS_MENUS[slug]) throw new ApiError(404, 'NOT_FOUND', 'Mess menu not found.');
    if (!isCampusRoomAdmin(slug, req.user)) throw new ApiError(403, 'FORBIDDEN', 'Only the assigned mess manager can update this menu.');
    const input = z.object({ day: z.string().trim().min(1).max(40), breakfast: z.string().trim().min(1).max(2000), lunch: z.string().trim().min(1).max(2000), snacks: z.string().trim().min(1).max(2000), dinner: z.string().trim().min(1).max(2000), specialNotice: z.string().trim().max(2000).optional() }).strict().parse(req.body);
    const menu = { ...input, messName: SEED_MESS_MENUS[slug].messName };
    unwrap(await req.db.from('mess_menus').upsert({ room_slug: slug, menu, updated_by: req.user.id, updated_at: new Date().toISOString() }));
    res.json({ data: menu });
  });

  return router;
}
