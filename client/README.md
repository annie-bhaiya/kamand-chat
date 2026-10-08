# Pulse Chat — Next.js Frontend

A modern, elegant, and animated frontend for the chat application, built with **Next.js 16**, **TypeScript**, and **Vanilla CSS**. It interfaces with the backend server via REST APIs and real-time **Socket.IO** WebSockets.

---

## Features

- **Authentication & Profiles**:
  - Email & password registration and login with Supabase Auth integration.
  - Automatic token refresh rotation and session recovery.
  - Profile customization: update display name, username, and avatar.
  - Server liveness and readiness status indicator.

- **Real-Time Messaging**:
  - Live message delivery, edits, and soft-deletions via Socket.IO.
  - Optimistic updates and retry deduplication with UUID `client_message_id`.
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

- **Modern Glassmorphic Design**:
  - Deep space dark theme with electric violet / indigo gradients.
  - Smooth micro-animations, accessible modal dialogs, and responsive mobile sidebar drawer.

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
