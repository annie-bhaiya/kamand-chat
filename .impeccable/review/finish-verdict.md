## verdict
1. Resolved — Moodle mobile status options All, Pending, Submitted, and Graded now occupy a complete separate row in moodle-mobile.png; All Types sits below without overlap. moodle-mobile-large.png retains legible controls at large text size. MoodleDrawer.tsx now says “Loading sample course data...” rather than claiming a live Moodle fetch.
2. Resolved — chat-mobile.png shows one message-actions trigger per message rather than the repeated reaction/edit/delete strips. chat-actions-mobile.png reveals a bounded, wrapped group for the selected message, with all six reactions and edit/delete visible. Source provides 44px trigger/action targets, labelled expanded state, and Escape dismissal restoring trigger focus. chat-desktop.png retains the existing restrained default conversation layout.

## remaining
Clear. No material regressions introduced by the fix batch are visible in these recaptures. This ship verdict covers the scored fixes, not a new review of the whole application.

disposition: ship
