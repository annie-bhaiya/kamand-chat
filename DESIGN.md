---
name: "KamandChat"
description: "Campus paper, pine ink and readable student conversations."
colors: 
  bg-primary: "#faf9f5"
  bg-secondary: "#ffffff"
  bg-tertiary: "#f0f0e8"
  bg-elevated: "#ffffff"
  bg-glass: "#f6f5ef"
  bg-glass-card: "#f0f0e8"
  bg-glass-hover: "#eaece3"
  bg-glass-active: "#e2e8df"
  text-primary: "#24372f"
  text-secondary: "#526258"
  text-muted: "#637067"
  border-subtle: "#dee3d9"
  border-medium: "#bec9bd"
  accent: "#245b49"
  accent-hover: "#194334"
  on-accent: "#ffffff"
  accent-light: "color-mix(in srgb, var(--accent) 10%, var(--bg-secondary))"
  bubble-received: "#eceee7"
  success: "#287044"
  success-light: "#e2eee2"
  warning: "#85531b"
  warning-light: "#f6ead6"
  danger: "#b13d43"
  danger-light: "#f9e5e4"
  dark-bg-primary: "#121212"
  dark-bg-secondary: "#1c1c1c"
  dark-bg-tertiary: "#262626"
  dark-bg-elevated: "#303030"
  dark-bg-glass: "#181818"
  dark-bg-glass-card: "#262626"
  dark-bg-glass-hover: "#303030"
  dark-bg-glass-active: "#383838"
  dark-text-primary: "#f2f2f2"
  dark-text-secondary: "#c5c5c5"
  dark-text-muted: "#a8a8a8"
  dark-border-subtle: "#383838"
  dark-border-medium: "#555555"
  dark-accent: "#a9d3ad"
  dark-accent-hover: "#c1e6c4"
  dark-on-accent: "#172019"
  dark-bubble-received: "#2a2a2a"
  dark-success: "#a2d7af"
  dark-success-light: "#243b2d"
  dark-warning: "#e3bf85"
  dark-warning-light: "#3b3223"
  dark-danger: "#f0aaa6"
  dark-danger-light: "#412b2b"
  clay-accent: "#8d4938"
  clay-accent-hover: "#71392b"
  lake-accent: "#2c607d"
  lake-accent-hover: "#224960"
  dark-clay-accent: "#edb09a"
  dark-clay-accent-hover: "#f2c9b8"
  dark-lake-accent: "#9fcfe6"
  dark-lake-accent-hover: "#c3e5f5"
  auth-story: "#245b49"
  auth-story-text: "#f4f5e9"
  auth-story-secondary: "#d4e3d5"
  auth-story-body: "#dce8dc"
  modal-scrim: "#101b1680"
typography: 
  display: 
    fontFamily: "DM Sans, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.6rem, 4.1vw, 4.4rem)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-.035em"
  headline: 
    fontFamily: "DM Sans, 'Segoe UI', sans-serif"
    fontSize: "1.8rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.025em"
  title: 
    fontFamily: "DM Sans, 'Segoe UI', sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
  body: 
    fontFamily: "DM Sans, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  message: 
    fontFamily: "DM Sans, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  label: 
    fontFamily: "DM Sans, 'Segoe UI', sans-serif"
    fontSize: ".867rem"
    fontWeight: 600
    letterSpacing: "0"
  metadata: 
    fontFamily: "DM Sans, 'Segoe UI', sans-serif"
    fontSize: ".8rem"
rounded: 
  sm: "6px"
  field: "8px"
  md: "10px"
  message: "12px"
  lg: "14px"
  xl: "16px"
  full: "9999px"
spacing: 
  4: "4px"
  8: "8px"
  12: "12px"
  16: "16px"
  20: "20px"
  24: "24px"
  28: "28px"
components: 
  button-primary: 
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover: 
    backgroundColor: "{colors.accent-hover}"
  button-secondary: 
    backgroundColor: "{colors.bg-glass-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-ghost: 
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  input: 
    backgroundColor: "{colors.bg-secondary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.field}"
    padding: "11px 14px"
  nav-tab: 
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  nav-tab-selected: 
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.accent}"
  campus-status: 
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
  campus-form: 
    backgroundColor: "{colors.bg-tertiary}"
    rounded: "{rounded.message}"
    padding: "20px"
  message-sent: 
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.message}"
    padding: "11px 16px"
  message-received: 
    backgroundColor: "{colors.bubble-received}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.message}"
    padding: "11px 16px"
  setting-option: 
    backgroundColor: "{colors.bg-secondary}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.field}"
    height: "52px"
  setting-option-selected: 
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.accent}"
---

# Design System: KamandChat

## Overview

**Creative North Star: "Campus Paper"**

Campus Paper describes the implemented world: warm paper surfaces, pine ink and a locally bundled humanist sans serif. The palette gives conversations a calm reading ground. Pine anchors messaging; blue coursework, violet calendar, amber maintenance and terracotta dining provide consistent wayfinding and action cues.

The same surface and control vocabulary carries through authentication, chat and campus tools. Density and type size are adjustable; light, dark and system appearance share semantic tokens. This record describes the final code, not a pixel specification inferred from the historical mockup.

**Key Characteristics:**

- Warm paper surfaces and pine ink, with Clay and Lake accent choices.
- DM Sans throughout, with moderate headings and generous message leading.
- Flat everyday surfaces; lifted dialogs and toasts.
- Immediate visual preferences and device-aware reduced motion.

## Colors

Primary Pine anchors actions and selected state. Warm paper neutrals separate regions without glass blur. The frontmatter records the default light values, explicitly prefixed dark overrides and accent alternatives; runtime source names are the matching CSS custom properties in globals.css.

### Primary

- **Pine** (accent / accent-hover): filled actions, outgoing bubbles, focused borders and selected text.
- **Accent tint** (accent-light): a live mixture of the current accent and secondary surface, so selections adapt to every theme.
- **On accent** (on-accent): the contrasting foreground for filled controls and sent messages.

### Secondary

- **Clay** and **Lake**: optional accent replacements selected in Visual settings; each has light and dark hover values. They personalize the messaging accent. Stable learning, calendar, maintenance and dining colours remain available alongside it.
- **Success, Warning and Danger**: semantic feedback and their paired quiet surfaces.

### Neutral

- **Paper** (bg-primary): the reading canvas.
- **Clean surface** (bg-secondary / bg-elevated): fields, headers, dialogs and overlays.
- **Soft paper** (bg-tertiary / bg-glass / bg-glass-card): region and form separation; the legacy glass names now identify opaque tonal surfaces.
- **Pine ink** (text-primary), **Secondary ink** (text-secondary), and **Muted ink** (text-muted): reading, supporting copy and metadata.
- **Subtle / Medium edge** (border-subtle / border-medium): dividers and control boundaries.
- **Received surface** (bubble-received): incoming message background.
- Dark appearance uses the dark-prefixed palette while preserving these roles. The authentication story panel intentionally keeps its fixed pine and pale text palette across appearance/accent choices.

**The Semantic Accent Rule.** Use accent with on-accent for filled actions; use accent-light with accent for selection.

## Typography

**Display and Body Font:** locally bundled DM Sans, with Segoe UI and sans-serif fallbacks. The root layout loads normal weights (400, 500, 600, 700) with font-display swap.

The hierarchy is a set of observed roles, not a mathematically enforced scale. All values are rem based except the explicit root size preference and mobile input minimum. Default root size is (15px); Small is (14px), Large is (17px). Body is (1rem), while message leading is more open than general UI copy.

- **Display:** the authentication headline; balanced wrapping, medium weight. On mobile it becomes (2.4rem).
- **Headline:** authentication form title; on mobile (1.6rem).
- **Title:** shared modal headings; chat titles use (1.13rem, 700), campus record/form headings use (1.067rem, 600, 1.4 leading).
- **Body:** normal interface copy; messages use the message role, introductions and welcome descriptions use (1.7 leading).
- **Label:** sentence case, semibold, with no tracked uppercase treatment.
- **Metadata:** timestamps, helper text and supporting details; conversation time uses tabular numerals.
- The welcome heading is (2rem, 500), and the auth story body limits line length to (34ch). These are surface roles, not new global display fonts.

**The Reading First Rule.** Message text uses the body size with more generous leading; metadata stays smaller.

## Layout

The application is a full-height flex shell (100dvh) with an independently scrolling conversation list and message stream. Desktop sidebar width is (344px), minimum (300px). The chat region flexes with min-width zero; its header is at least (78px) high.

Messages have (20px) vertical gaps and horizontal padding that follows clamp(16px, 3.5vw, 60px), with (28px) vertical padding. Rows cap at min(78%, 680px). Compact density changes message gaps to (10px), bubble padding to (7px 12px) and conversation rows to (58px) minimum with (7px) block padding. Comfortable conversation rows have (72px) minimum height.

At the (768px) maximum-width breakpoint, navigation occupies the full width and the hidden sidebar loses visibility and pointer access. Message rows cap at (90%); header actions wrap. Composer padding includes the bottom safe-area inset. Message action targets become (44px), and the explicit per-message trigger reveals a wrapped action group.

Authentication uses a (46% / 54%) split, changes to (40% / 60%) at (900px), and stacks at (768px). The form content caps at (420px). Campus forms use two columns, collapsing to one at (540px); toolbars wrap and labels can fill the row.

Spacing is a recurring family of observed values rather than custom-property tokens: tight (4–8px), control groups (10–12px), content (16–24px), and larger auth/empty-state intervals. The frontmatter includes representative reused steps. Shared modal default width is (480px); Visual settings uses (560px). Dialog bodies scroll within the viewport, with (24px) desktop and (12px) mobile outer clearance.

## Elevation & Depth

Opaque tonal layering and quiet boundaries define everyday depth. Buttons, messages, composer and sidebar suppress glow and blur. Shared modal content uses the large shadow; toasts use the medium shadow. The small shadow is defined but is not prescribed here as a default component treatment. Exact shadow definitions and motion durations are in the sidecar.

**The Quiet Surface Rule.** Keep daily conversation surfaces flat; reserve structural shadows for dialogs and toasts.

Motion uses short ease-out settling rather than large travel: fast and normal transitions, fade entrances, scale entrances and an (8px) settle-in. The auth form settles over (360ms). Both device reduced-motion preference and the explicit setting remove animations and spatial press effects, while retaining 120ms colour, border and opacity feedback and automatic scrolling.

## Shapes

The shared radius family runs from small corners through softly rounded containers to full pills. Fields and preference tiles use the additional observed (8px) radius; message/composer and campus forms use (12px). Shared dialogs use radius-xl. Sent and received bubbles retain a small directional lower corner (4px) inside their otherwise rounded silhouette. Avatars, accent swatches and the send action are circular; this does not make all navigation pills.

## Components

### Buttons

Primary actions pair accent with on-accent, use the shared medium radius and (10px 18px) padding, with semibold (0.9rem) text. Hover moves to accent-hover; active scales to (.97). Disabled actions lower opacity to (.48) and suppress transforms. Secondary actions use a clean surface and visible medium edge. Tonal actions pair a role colour with its light or dark tinted surface; filled campus actions use the same role and an explicit contrasting foreground. Ghost actions keep their background transparent until hover. The auth submit is full width and at least (50px) high.

### Inputs / Fields

Fields use the clean surface, an (8px) radius, subtle edge and (11px 14px) padding. Hover strengthens the edge; focus uses the accent boundary and a (3px) accent tint ring. Global keyboard focus uses a (2px) outline with (3px) offset. Mobile text fields have at least (16px) type. Password visibility is an inset icon action, not a separate decorated field.

### Navigation

Sidebar tabs use compact sentence-case labels, small corners, at least (44px) height and a soft tinted selected state. Conversation rows combine an avatar, truncated name/preview and compact timestamp; the selected row uses the accent tint. Hover changes the surface without raising it.

### Chips / Status

Campus status labels use accent tint and accent text, small corners and (3px 8px) padding. Reaction pills use full rounding and a selected accent tint. Date dividers use quiet metadata against the reading canvas.

### Cards / Containers

Campus records are a vertical list with subtle top rules, (22px) block padding and supporting text. Forms use a soft paper surface, (20px) internal padding and rounded corners, reducing to (16px) on narrow screens. Shared modal containers carry the elevation rather than nesting extra lifted cards.

### Messages / Composer

Outgoing messages use the current accent and on-accent; incoming messages use received surface and primary ink. Standard bubbles have (11px 16px) padding and the message type role. Hover/focus reveal actions on desktop; touch uses a labelled expanded-state button. The composer uses the clean surface, medium boundary, accent focus tint and circular send action.

### Visual settings

Appearance, accent, type size and density use selectable tile groups, with a (52px) minimum tile height, medium edge and tinted selected state. Most groups have three columns; density has two. Selection applies instantly through root data attributes and persists under kamand-visual-settings when browser storage is available. Defaults are System / Pine / Default / Comfortable / motion toggle off. The device reduced-motion preference always applies. Reset restores these defaults; a storage failure displays the visit-only status. The preview reflects accent colour and on-accent contrast.

## Do's and Don'ts

### Do:

- **Do** use semantic CSS variables so dark appearance and accent preferences propagate.
- **Do** keep messages at the reading size and leading, with metadata visibly subordinate.
- **Do** preserve focus, selected state and reduced-motion treatments when extending controls.
- **Do** reuse the shared modal and campus record/form patterns.

### Don't:

- **Don't** replace semantic accent text with hardcoded white; use on-accent for filled actions and sent messages.
- **Don't** copy an earlier CSS declaration without checking the later cascade overrides.
- **Don't** rely on hover to expose message actions on touch screens.
- **Don't** treat sample campus records as live institutional data.


## Action palette refinement — October 9, 2026

Pine remains the main messaging colour. Stable action roles now distinguish learning (blue), calendar and clubs (violet), maintenance (amber), and dining (terracotta), including dark-mode ramps. Text labels and Lucide icons accompany colour. Personal Clay/Lake choices affect messaging without changing these roles.

Shared buttons and icon controls use 44px minimum targets; utility launchers use 60px height. Tonal buttons, filled buttons, neutral secondary buttons and destructive buttons have distinct treatments, keyboard focus, hover, pressed and disabled states. Campus statuses distinguish pending, successful and cancelled/conflicting outcomes with both text and colour.

Motion explains emoji opening, drawer arrival, form disclosure and press feedback. Sending/uploading indicators expose busy state. Emoji choices dismiss on outside pointer interaction or Escape; Escape restores trigger focus. Reduced motion keeps colour feedback while removing spatial movement.

## Dark surfaces and cohort actions — October 9, 2026

Dark appearance uses neutral charcoal surfaces (#121212 canvas through #303030 elevation), neutral gray edges and white/gray reading text. Pine remains the primary action accent, with the existing semantic action colours preserved. Incoming messages use charcoal rather than green.

Hostel, branch and mess identification rows use semantic badges with truncating text beside a neutral outlined Change action. The action has a Pencil icon, a contextual accessible label and a 44px minimum target, and continues to open Settings.


## Campus feature scope — October 9, 2026

Campus navigation includes clubs, hostels, branches and messes. Moodle, RSS connections and the Courses tab have been removed. Branch cohort channels retain their chat and calendar actions.

## Sidebar and campus modal spacing — October 9, 2026

The sidebar uses a stable three-column utility row and navigation grid. Dividers separate utilities, view filters and conversations; shared 12–16px insets align search and list content. Maintenance filters use a single desktop row and stack with equal scope buttons on mobile. Reports and the disclosure form have clear section boundaries.

Dining uses the shared 760px modal, with a fixed header/footer and one scrolling body. Meal labels and timings occupy a 200px column beside meal text on desktop, separated by horizontal rules; mobile stacks each meal with 12px inner gaps. Dining controls, meal content, notices, support and rebate drafts follow a 20px section rhythm. Rebate dates stack on small screens, and the action explicitly saves a local draft.
