import fs from 'node:fs/promises';
const root='E:/chat-utkarsh';
const old=await fs.readFile(root+'/DESIGN.md','utf8');
let fm=old.slice(0,old.indexOf('\n---',4)+4);
const extra=`  learning: "#285d91"
  learning-hover: "#204b76"
  learning-light: "#eaf1f9"
  calendar: "#70509b"
  calendar-hover: "#593d80"
  calendar-light: "#f1ecf8"
  dining: "#9b4b32"
  dining-hover: "#7d3926"
  dining-light: "#fbede6"
  on-action: "#ffffff"
  on-danger: "#ffffff"
  dark-learning: "#a8cef3"
  dark-learning-hover: "#c4dff9"
  dark-learning-light: "#233449"
  dark-calendar: "#d0baf1"
  dark-calendar-hover: "#e1d2f8"
  dark-calendar-light: "#352b45"
  dark-dining: "#f2ba9c"
  dark-dining-hover: "#f8d3bf"
  dark-dining-light: "#402e25"
  dark-on-action: "#1a1a1a"
  dark-on-danger: "#301516"
`;
fm=fm.replace('typography:',extra+'typography:');
fm=fm.replace(/(  message: \s*\n    fontFamily: [^\n]+\n    fontSize:) "1rem"\s*\n    lineHeight: 1.6/,'$1 ".933rem"\n    lineHeight: 1.45');
fm=fm.replace(/(  metadata: \s*\n    fontFamily: [^\n]+\n    fontSize:) "\.8rem"/,'$1 ".733rem"');
fm=fm.replace(/(  message-(?:sent|received):[\s\S]*?    padding:) "11px 16px"/g,'$1 "7px 10px"');
const body=`

# Design System: Kamand Chat

## Overview

**Creative North Star: "Campus Paper"**

Kamand Chat is a conversation-first intracampus network for IIT Mandi's North and South campuses. Warm paper surfaces, pine ink and locally hosted DM Sans establish a calm, compact workspace. Campus tools sit beside conversations and inherit the same controls, typography and feedback. The authenticated workspace is an Operate surface; the welcome spread introduces the product without delaying account access.

This specification was refreshed on **10 October 2026** against the current working tree, including existing uncommitted changes. Sources: \`client/src/app/globals.css\` (including its later overrides), \`layout.tsx\`, \`page.tsx\`, all component areas, preferences, campus API consumers and server routes. Fresh browser captures cover authentication, chat, settings, maintenance and dining at 1440×900 and 390×844. Authenticated captures use the development-only \`/ui-review\` fixture, so they demonstrate layout rather than production data or successful backend writes. Older images in \`artifacts/\` can contain removed controls and stale menu layouts.

**Key characteristics:**

- Paper neutrals with Pine, Clay or Lake personal accents; neutral charcoal in dark mode.
- Dense conversation reading, subordinate metadata and labelled campus actions.
- Flat everyday surfaces; modal, menu and toast elevation for temporary context.
- Immediate visual preferences, explicit account configuration and device-aware reduced motion.

### Current product boundaries

Navigation is **Chats, Clubs, Hostels, Branches and Messes**. Utilities are **Calendar, Tickets and Messes**. The Courses tab, Moodle launcher and RSS connections are absent. Blue remains the academic branch/attachment action role; it does not imply a course integration. The branch “Timetable” action opens the shared calendar, not a connected academic timetable service.

Calendar events, venue conflicts, maintenance reports, votes, status history and weekday mess menus have persistent server/database implementations. Organizer, caretaker and mess-manager actions depend on permissions. Rebate selections are local visit drafts labelled “not submitted”; they are not official applications, approvals or payments. Chat-only mode hides residence/branch/mess services while retaining chat, clubs and calendar. The development simulation picker is a separate role demonstration surface, excluded from production.

## Colors

The frontmatter records shipped CSS values. Runtime equivalents use a \`--\` prefix; the stylesheet remains authoritative for cascade and state combinations.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Canvas | bg-primary | dark-bg-primary | Conversation reading and app background |
| Control surface | bg-secondary | dark-bg-secondary | Inputs, header, composer |
| Soft inset | bg-tertiary / bg-glass-card | dark equivalents | Forms and selected support regions |
| Elevated surface | bg-elevated | dark-bg-elevated | Dialogs and temporary tools |
| Primary ink | text-primary | dark-text-primary | Reading text and headings |
| Secondary / muted ink | text-secondary / text-muted | dark equivalents | Supporting copy and timestamps |
| Pine | accent / accent-hover | dark equivalents | Sending, principal action, personal selection |
| Academic blue | learning | dark-learning | Branch context and attachment actions |
| Calendar violet | calendar | dark-calendar | Calendar and club actions |
| Maintenance amber | warning | dark-warning | Ticket action and pending status |
| Dining terracotta | dining | dark-dining | Menu actions and dining context |
| Success / danger | success / danger | dark equivalents | Completed / cancelled, rejected or destructive outcomes |

Personal Clay/Lake overrides change the messaging accent, not the semantic campus roles. Root theme and accent selectors combine explicitly. Use \`on-accent\` for sent bubbles and primary filled controls; \`on-action\` for semantic filled controls; \`on-danger\` for destructive fills. Dark accent fills use dark foreground ink rather than white. Tonal controls pair each role's light surface with its role ink. Icons and visible labels reinforce meaning; status text must accompany color.

Legacy names such as \`bg-glass\` denote opaque tonal surfaces. \`accent-gradient\` and \`accent-gradient-bubble\` resolve to the solid accent. They do not authorize a glass or gradient theme. The authentication story uses fixed Pine and pale story ink across personal appearance settings.

## Typography

**Family:** DM Sans, locally bundled in 400/500/600/700 normal weights through \`next/font/local\`; fallback is Segoe UI, sans-serif. Preserve natural sentence case and avoid a separate display family.

Root type size is **15px default**, **14px small**, **17px large**, controlled by \`data-text-size\`. Most sizes are rem-based and follow this preference. Pixel dimensions such as minimum hit areas remain fixed. Frontmatter type roles are descriptive; components can use the smaller context-specific values below.

| Context | Size | Weight / leading |
| --- | --- | --- |
| Welcome story display | clamp(2.6rem, 4.1vw, 4.4rem) | 500 / 1.08; −.035em tracking |
| Authentication heading | 1.8rem | 600 / 1.2 |
| Dialog title | 1.2rem | 600 |
| Body and composer | 1rem | 400; composer 1.5 leading |
| Message text | .933rem (about 14px at default) | 1.45 leading |
| Conversation name / preview | .933rem / .867rem | name emphasis, preview secondary ink |
| Chat title / subtitle | 1rem / .75rem | truncate within flexible header |
| Field labels | .867rem | 600, sentence case |
| Navigation / sender name | .8rem | context-dependent emphasis |
| Message metadata | .733rem | 1 opacity; inherited bubble ink |
| List timestamps / supporting small text | .8rem | tabular numerals where time is shown |

Dense message type is an observed implementation choice, not a claim of optimal reading accessibility. New reading-heavy screens should start from the body role; review the current small metadata and mobile labels with users before reducing them further.

## Layout

### Workspace and navigation

The app fills the viewport. Desktop uses a **360px fixed sidebar** beside a flexible chat region with \`min-width: 0\`. Sidebar hierarchy is brand and New Chat, a three-column utility row, a three-column navigation grid, contextual filters, search, scrollable conversations, and account/settings footer. Utilities have a **56px effective minimum height** in the sidebar (the generic launcher rule is 60px). Navigation and filters use 44px targets. Search uses 12px 16px insets; the list uses 0 12px 12px. Conversation rows are 64px minimum, or 58px with compact density.

At **≤768px**, the sidebar becomes full width; selecting a conversation reveals the chat view and Back restores navigation. Desktop chat header is 56px minimum; mobile is 52px. A **620px chat-header container query** replaces inline campus tools with a labelled overflow control even on a narrow desktop chat pane. Shared sidebar/mobile breakpoints must be read after later overrides.

Desktop messages have 8px 16px container insets, 3px gaps and 5px row separation; bubbles use 7px 10px. Rows are bounded by \`min(84%, 680px)\`. Mobile uses 4px 8px insets, 2px gaps, 4px row separation and 6px 8px bubble padding, with rows up to full width. Compact mode uses 7px 12px bubbles; its higher specificity also applies on mobile. Consecutive messages remove extra row separation. The composer sits at the bottom with safe-area-aware mobile padding.

### Welcome, dialogs and forms

Authentication uses a **46% story / 54% form** spread; at ≤900px it becomes 40% / 60%, and at ≤768px it stacks. Shared dialogs use one scrolling body with fixed header/footer, \`max-height: calc(100dvh - 48px)\` and a 24px desktop overlay inset. Narrow dialogs reduce outer/internal padding according to mobile rules. Standard max widths: profile 460px, onboarding/new conversation/search 520px, group info 560px, dining 760px, calendar 840px. Component max widths are bounds, not fixed mobile widths.

Campus forms use 20px padding (16px on narrow screens). Records are vertical rows separated by subtle rules. Maintenance filters occupy one desktop row, then stack at ≤768px with equal scope buttons. Dining uses a 20px section rhythm; each meal has a 200px label/timing column and a flexible menu column with 24px gap. Mobile stacks each meal with 12px inner gap. Day controls and rebate dates wrap or stack without horizontal scrolling.

The recurring spacing vocabulary is 4, 8, 12, 16, 20, 24 and 28px; use relationship-based spacing rather than nesting additional decorative cards.

## Elevation & Depth

Conversation, sidebar and record surfaces stay flat. Surface tone and subtle borders define regions. Temporary menus, dialogs and toasts use the shipped shadows:

- Small: \`0 2px 8px #162d1710\`.
- Medium: \`0 8px 24px #162d1718\` (toasts and small overlays).
- Large: \`0 24px 70px #162d1726\` (dialogs and contextual tool menus).

Modal scrim is \`#101b1680\`. Mobile message actions use their own dimmed backdrop and bottom-sheet treatment. Preserve the hierarchy of content below overlays and controls above them; do not apply hover lifts to routine conversation rows.

## Shapes

Use 6px for small navigation/status corners, 8px for fields and compact controls, 10px for conversation selections, 12px for bubbles/composer/forms, 14–16px for larger containers, and full rounding for avatars, reactions and circular send controls. These combine CSS radius variables and component-specific rules. Keep message direction visible through alignment and asymmetric bubble corners. Borders are usually 1px subtle; editable/control boundaries can use the medium edge.

## Components

### Authentication and residence onboarding

Roll-number entry routes to sign-in or registration. Fields provide visible labels, derived institute email, password visibility, busy/disabled state, confirmation-email notice and gateway status. Registration's 8-character password constraint comes from implementation. Residence onboarding collects branch, hostel, block and mess with dependent block options; chat-only provides a lower-commitment path. Saving account details is explicit, unlike immediate visual preferences.

### Buttons, inputs and navigation

Primary fills use accent/on-accent; semantic tonal/filled controls use \`data-tone\`; neutral secondary and ghost controls serve supporting actions. Destructive actions use danger. Shared buttons and icon controls have 44px minimum targets, subject to component-specific exceptions. Disabled controls reduce opacity to .48 and remove press movement. Visible focus is a 2px accent outline with 3px offset. Fields use clean surfaces, 8px corners, 11px 14px padding and an accent-light focus ring.

Tabs expose selected/pressed state. Conversation name, preview and timestamps truncate independently. Cohort identity is a semantic badge beside a neutral outlined Change action with Pencil icon and contextual accessible label; Change opens Settings. Preserve the distinction between utility “Messes” (opens dining) and navigation “Messes” (lists assigned rooms); this duplicated label remains a discoverability issue to revisit.

### Messaging and contextual tools

Incoming messages use received surface/primary ink; outgoing use accent/on-accent. Sender, body, attachments, timestamp, read state, reactions and edit/delete affordances form a compact reading group. The composer supports text, attachment previews/removal, emoji and busy sending state. Desktop actions reveal on hover/focus; mobile exposes a labelled 44px expanded-state trigger and action sheet. Desktop mini-actions retain 28px dimensions and merit a future target-size review. Emoji and campus-tool popovers dismiss on outside pointer and Escape; Escape returns focus to the trigger.

Search, attachment history, user profile and group details stay within shared bounded dialogs. Group owner actions (rename, add/remove members) are permission-specific; leaving is visibly destructive. Direct/user profiles expose peer details and conversation context; own profile permits editing display name, username and avatar. Do not blur account editing with peer viewing.

### Calendar and maintenance

Calendar shows records, category/venue filters and permission-dependent booking/edit/status actions. Conflict is saved and displayed as a conflict, not silently accepted as a booking. Ticket filters, report creation, votes, status history and resolution details form one workspace. Pending/Reported/Under Investigation are amber; approved/completed/resolved are green; cancelled/conflict/rejected are danger. Keep status text literal. Open panels refresh on realtime hints, reconnect/focus and a 30-second fallback; loading, empty and failed requests must remain distinct.

### Dining and rebates

Dining opens today's recurring schedule in Asia/Kolkata and permits weekday browsing. Show breakfast, lunch and dinner rows, serving notes and special notice only when available. Missing menus produce an error rather than fabricated meals. Manager editing is permission-dependent. “Report Mess Issue” opens maintenance with dining context. The rebate tab calculates inclusive dates and saves a local visit draft; visible copy must continue to explain that official submission occurs through the mess office. Current minimum-day logic is app behavior, not verified institutional policy.

### Settings and feedback

Visual options are System/Light/Dark, Pine/Clay/Lake, Small/Default/Large, Comfortable/Compact and Reduce motion. Defaults are System, Pine, Default, Comfortable and motion toggle off. Tiles have 52px minimum height; most groups use three columns, density two. Choices apply immediately via root data attributes and persist under \`kamand-visual-settings\`; storage failure gives visit-only feedback. Reset restores visual defaults. Residence settings share the dialog but require Save Details.

Dialogs expose title relationships, modal semantics, Tab containment, Escape dismissal and focus restoration. Toasts and notices communicate success/failure without replacing inline validation. Reduced motion respects both OS preference and the saved override. Transitions use 160/240/280ms with \`cubic-bezier(.16,1,.3,1)\`; press feedback uses 120ms and drawer entry 240ms. Preserve readable state feedback when spatial motion is removed.

### Review findings and limits

Fresh inspected chat/dining states had no document-level overflow at 1440px or 390px. Light/dark tokens, dialog structure and mobile navigation were checked. Full authenticated production workflows, all role combinations, every empty/error state and screen-reader behavior were not exercised in this documentation refresh.

Remaining design debt: dense 11–14px text at default size; 28px desktop message mini-actions; some inline role/profile styles; legacy CSS declarations before later overrides; duplicated dining labels; and mixed “sample” terminology across old docs/fixtures. Keep these visible as follow-up work, without claiming they were fixed by updating this file.

### Presentation adaptation

Project slides inherit Campus Paper, DM Sans, Pine and semantic role colors. Use paper for explanations, fixed Pine for the cover/closing and neutral charcoal for architecture. Enlarge type for room viewing; app rem sizes are not slide sizes. Use flat editorial compositions and genuine app screenshots labelled as development fixtures, not imitation interactive dashboards. Distinguish implemented behavior, anticipated impact and future scope; do not invent adoption, performance or satisfaction metrics.

## Do's and Don'ts

### Do

- **Do** use semantic colors and correct contrasting foregrounds in every appearance/accent combination.
- **Do** inspect effective cascade values, viewport rules and container queries before extending layouts.
- **Do** keep chat as the main task and preserve contextual campus access, permissions and chat-only behavior.
- **Do** preserve keyboard dismissal/focus, selected state, busy feedback and reduced motion.
- **Do** separate backend records, fixture data and local drafts in both copy and presentations.

### Don't

- **Don't** restore Courses, Moodle or RSS controls as if they were current product features.
- **Don't** describe local rebate drafts as submitted requests or official approvals.
- **Don't** copy the old 344px sidebar, 1rem/1.6 message type, 11px 16px bubble padding or 60px sidebar utility height as the effective current design.
- **Don't** rely on color or hover alone to expose status and actions.
- **Don't** present source inspection or fixture review as production integration testing, WCAG certification or measured product impact.
`;
await fs.writeFile(root+'/DESIGN.md',fm+body);
const sidecar={schemaVersion:2,generatedAt:'2026-10-10T00:00:00+05:30',title:'Design System: Kamand Chat',extensions:{shadows:[{name:'small',value:'0 2px 8px #162d1710'},{name:'medium',value:'0 8px 24px #162d1718'},{name:'large',value:'0 24px 70px #162d1726'}],motion:[{name:'fast',value:'160ms cubic-bezier(.16,1,.3,1)'},{name:'normal',value:'240ms cubic-bezier(.16,1,.3,1)'},{name:'enter',value:'280ms cubic-bezier(.16,1,.3,1)'}],breakpoints:[{name:'auth-tablet',value:'900px'},{name:'mobile',value:'768px'},{name:'narrow-forms',value:'540px'},{name:'chat-header-container',value:'620px'}]},components:[],narrative:{northStar:'Campus Paper',overview:'Conversation-first IIT Mandi workspace with warm paper, pine ink, DM Sans and neutral charcoal dark surfaces.',keyCharacteristics:['Compact conversation reading','Stable semantic campus action colors','Immediate visual preferences and explicit account saves','Local drafts visibly distinguished from persistent records'],dos:['Use semantic foreground/background pairs','Respect effective CSS cascade and responsive context','Label sample fixtures and local drafts'],donts:['Do not restore removed course integrations','Do not claim official rebate submission','Do not represent fixture review as live production verification']}};
for(const [name,ref,bg,ink] of [['Sent message','message-sent','--accent','--on-accent'],['Received message','message-received','--bubble-received','--text-primary']]) sidecar.components.push({name,kind:'custom',refersTo:ref,description:'Current desktop message typography and padding; mobile and density overrides are documented in DESIGN.md.',html:'<div class="ds-message">See you after class.</div>',css:'.ds-message{padding:7px 10px;border-radius:12px;background:var('+bg+');color:var('+ink+');font-family:var(--font-sans);font-size:.933rem;line-height:1.45;overflow-wrap:anywhere;}'});
await fs.writeFile(root+'/.impeccable/design.json',JSON.stringify(sidecar,null,2)+'\n');
console.log('Updated DESIGN.md and design sidecar');
