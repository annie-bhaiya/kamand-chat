# Pulse Chat — Next.js Frontend

A modern, elegant, and animated frontend for the chat application, built with **Next.js 16**, **TypeScript**, and **semantic CSS and Tailwind utilities**. It interfaces with the backend server via REST APIs and real-time **Socket.IO** WebSockets.

---

## Features

- **Authentication & Profiles**:
  - Roll-number entry leading to account sign-in or registration through Supabase Auth.
  - Automatic token refresh rotation and session recovery.
  - Profile customization: update display name, username, and avatar.
  - Server liveness and readiness status indicator.

- **Real-Time Messaging**:
  - Live message delivery, edits, and soft-deletions via Socket.IO.
  - Persisted message updates and retry deduplication with a stable UUID `client_message_id`.
  - Date dividers, read receipts (sent vs read by members), and smooth scrolling.
  - Web Audio API synthesized soft chimes on incoming and sent messages.

- **Interactive Reactions**:
  - Emoji reactions on any message with real-time tally and toggle state.

- **Drafts & Attachments**:
  - Upload images, audio, documents, and media (up to 10 MB).
  - Draft management: preview and cancel uploads before sending.
  - Temporary 60-second secure signed download URLs from private storage.

- **Conversations & Groups**:
  - Direct 1-on-1 messaging with registered user search.
  - Group chats with custom title, member list, and owner badge.
  - Owner tools: add members, remove members, rename group.
  - Member tools: leave group.

- **Real-time Typing Indicators**:
  - Throttled typing broadcast with animated multi-dot pulse indicators.

- **In-Conversation Full-Text Search**:
  - Fast search through message history within active conversations.

- **Visual settings and campus theme**:
  - Warm paper and pine surfaces with locally hosted DM Sans typography.
  - Light, dark, and system appearance; pine, clay, and lake accents; text size and message density.
  - Saved device preferences, reduced-motion support, keyboard-accessible dialogs, and responsive mobile chat actions.

- **Campus tools**:
  - Course, club, hostel, branch, and mess conversations.
  - Calendar, tickets, Moodle reminders, and mess menus are explicitly labelled sample workflows; they are not connected to official campus services. Rebate selections are a local visit draft.

---

## Getting Started

### 1. Install dependencies

```powershell
Set-Location E:\chat-utkarsh\client
npm.cmd install
```

### 2. Configure environment

Ensure `.env.local` points to your backend server (defaults to port 4000):

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Run development server

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production

```powershell
npm.cmd run build
npm.cmd start
```

## Verification

The campus calendar and maintenance panels use Supabase-backed records. Organizers can edit, reschedule, cancel and update their own events; assigned caretakers and mess managers can update ticket status. Ticket votes, progress history and resolution timestamps persist. Open panels refresh on realtime change hints, reconnect and focus, with a 30-second fallback. Apply the server's calendar/maintenance migration before using these features; Moodle remains a separate sample integration.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. The design system is recorded in `../DESIGN.md`, with review captures in `../.impeccable/review`.
