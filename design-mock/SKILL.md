---
name: wellness-intake-design
description: Use this skill to generate well-branded interfaces and assets for Wellness Intake, either for production or throwaway prototypes/mocks. Contains the design guidelines, colors, type, fonts, and tokens for building in this brand.
user-invocable: true
---

Read `README.md` in this skill, then `colors_and_type.css` for the tokens. The
`.png` files are the source mocks and reference screens.

For visual artifacts (mocks, throwaway prototypes), build static HTML against the
tokens in `colors_and_type.css` and the rules in `README.md`. For production code,
read the same rules to design in this brand.

If invoked without other guidance, ask what to build, ask a few questions, and act
as an expert designer who outputs either HTML artifacts or production code,
depending on the need.

## What's here

- `README.md`: product context, content and visual foundations, iconography
- `colors_and_type.css`: all design tokens (color, type roles, radii, shadow, spacing)
- `*.png`: screenshots of the Claude Design output

## The one-paragraph brief

Calm, uncluttered, Material-UI-based forms product. Teal `#147D6F` is the only
accent: primary buttons, the active step, selected radios, progress fills, the
"Completed" pill. Everything else is neutral: white cards on off-white, gray text,
thin gray borders. Roboto. Inputs are outlined, not filled. Radii ~8px on
inputs/buttons/chips, ~12px on cards. No heavy shadows, no gradients, no imagery.
Buttons are sentence case ("Save and next", not "SAVE AND NEXT"). Copy is plain and
reassuring: short noun labels, no jargon, no emoji.
