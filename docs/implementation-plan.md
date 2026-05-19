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
  - `EdgeEvent`,
  - `ScreenObservation`,
  - `RoutingDecision`,
  - `NextAction`,
  - `GuardDecision`.
- Safety-first behavior:
  - no real payment,
  - no real submission,
  - no destructive actions,
  - high-risk operations are denied or require confirmation.

## Next Backend Step

Replace static scenario data with this flow:

1. Edge trigger creates an `EdgeEvent`.
2. Edge observer creates a redacted `ScreenObservation`.
3. Privacy firewall verifies `cloud_safe=true`.
4. Local router returns a `RoutingDecision`.
5. Gemma planner returns a `NextAction` only when cloud planning is needed.
6. Safety guard returns a `GuardDecision`.
7. OpenClaw executes only allowlisted actions.
8. State store persists task state and redacted summaries.

## Edge Modes

### Always On Sentinel

- Event-driven, not continuous screen recording.
- Triggers on screen changes, notifications, SMS-like events, incoming calls, forms, payment cues, authorization cues, and risk keywords.
- Shows a lightweight floating reminder such as: "I can help you check this page."
- Does not automatically execute high-risk actions.

### Trigger Assistant

- Starts when the user taps a floating button, notification, shortcut, or voice entry.
- Uses local observation first.
- Escalates to cloud planning only for complex, ambiguous, or knowledge-heavy tasks.

## Privacy Firewall

- Raw screenshots stay on device.
- Full OCR stays on device.
- ID numbers, phone numbers, OTP codes, payment data, addresses, and medical information are redacted before any cloud call.
- Cloud receives only structured, redacted `ScreenObservation` data.
- `cloud_safe=false` must block cloud escalation.

## Cloud Planner Boundary

- Input: redacted observation, task goal, task state, and allowlisted tools.
- Output: one `NextAction` or a clarification request.
- The planner never directly executes actions.
- All planner output must pass through the safety guard.

## OpenClaw Tool Allowlist

- `observe_screen`
- `click`
- `type_text`
- `scroll`
- `ask_user`
- `summarize_for_family`
- `stop`

## Routing Rules

- Simple local navigation: `local_only`.
- Missing field or uncertain user intent: `ask_user`.
- Multi-step reasoning or knowledge-heavy task: `cloud_planner`.
- OTP, payment authorization, submission, deletion, or unsafe permission: `stop` or guard escalation.
- Unredacted sensitive field: block cloud planning.

## Demo Acceptance Criteria

- User can switch all four demo loops.
- User can switch between Always On Sentinel and Trigger Assistant.
- Desktop and mobile frames render without overlap.
- Agent timeline advances and rewinds.
- Privacy Firewall section shows what stays local and what reaches cloud.
- High-risk scenario clearly returns `deny`.
- Family mode shows redacted summary instead of raw sensitive data.

## Real Integration Order

1. Mock planner.
2. Gemma cloud planner.
3. Android edge observation and privacy firewall.
4. Gemma edge model.
5. OpenClaw action execution.
