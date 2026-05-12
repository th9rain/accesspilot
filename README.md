# AccessPilot

AccessPilot is a Gemma competition prototype for a hybrid edge-cloud GUI agent.

It is designed for older adults, visually impaired users, and people who need help understanding complex digital interfaces. The prototype demonstrates how Gemma-style edge models, a cloud planner, an OpenClaw-style tool gateway, and a safety guard can work together to read screens, plan safe next actions, and stop before high-risk operations.

## Demo Loops

- Desktop form assistant: explains form fields, asks for missing information, and stops before submission.
- Mobile screenshot navigator: reads a phone settings screen and recommends a safe next tap.
- Fraud and high-risk guard: blocks SMS code, payment, authorization, and other risky actions.
- Family assistance mode: creates a privacy-safe summary instead of sending raw screenshots.

## Architecture Shown in the Prototype

- Edge layer: screen observation, lightweight privacy redaction, low-latency routing.
- Cloud layer: multi-step planning and action selection.
- OpenClaw layer: allowlisted GUI/tool actions such as `click`, `type_text`, `ask_user`, and `summarize_for_family`.
- Safety layer: `allow`, `require_confirmation`, and `deny` decisions for risky actions.

The current implementation is a deterministic front-end prototype. It is intentionally model-agnostic so the demo remains stable while the model backend is swapped in later.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Build

```bash
npm run build
```

## Implementation Notes

The key interfaces are represented in `src/App.tsx`:

- `ScreenObservation`
- `NextAction`
- `GuardDecision`

To connect a real backend later:

1. Replace the static `scenarios` data with an API call to an edge observation service.
2. Send the observation to a Gemma cloud planner.
3. Route the planner output through a safety guard.
4. Execute only allowlisted OpenClaw tools.
5. Persist task state without storing raw sensitive screenshots.

## Safety Defaults

- No real payment.
- No real form submission.
- No destructive action.
- High-risk actions require confirmation or are denied.
- Family summaries are redacted and do not include raw screenshots.

