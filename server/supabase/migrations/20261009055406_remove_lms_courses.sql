-- Remove saved integration credentials and retire canonical course rooms.
-- Conversation records and message history remain intact.
drop table if exists public.lms_connections;
delete from private.campus_rooms where category = 'courses';
