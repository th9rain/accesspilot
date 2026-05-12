# AccessPilot Implementation Plan

This prototype implements the first competition demo loop for AccessPilot.

## Current Version

- Front-end deterministic demo app.
- Four stable scenarios:
  - desktop form assistant,
  - mobile screenshot navigator,
  - fraud / high-risk guard,
  - family assistance mode.
- Type-level representations of:
  - `ScreenObservation`,
  - `NextAction`,
  - `GuardDecision`.
- Safety-first behavior:
  - no real payment,
  - no real submission,
  - no destructive actions,
  - high-risk operations are denied or require confirmation.

## Next Backend Step

Replace static scenario data with this flow:

1. Edge observer creates a `ScreenObservation`.
2. Gemma planner returns a `NextAction`.
3. Safety guard returns a `GuardDecision`.
4. OpenClaw executes only allowlisted actions.
5. State store persists task state and redacted summaries.

## OpenClaw Tool Allowlist

- `observe_screen`
- `click`
- `type_text`
- `scroll`
- `ask_user`
- `summarize_for_family`
- `stop`

## Demo Acceptance Criteria

- User can switch all four demo loops.
- Desktop and mobile frames render without overlap.
- Agent timeline advances and rewinds.
- High-risk scenario clearly returns `deny`.
- Family mode shows redacted summary instead of raw sensitive data.

