# Wellness Intake: Design System

A small, focused design system for Wellness Intake, a configurable multi-step form
for a mental-health web app. People move through short staged forms (Personal
Details, Wellness Preferences, Availability), save halfway as a draft, and come
back later to finish. It's a single responsive web app: no landing pages, no
marketing. Just a list of submissions and the form itself.

The aesthetic is calm and uncluttered, the kind of clean a health app needs
without tipping into cold or clinical. It's built on Material UI with the defaults
softened: sentence-case buttons, no heavy shadows, generous breathing room, and a
single centered form card instead of an edge-to-edge layout.

---

## How this was made

This design system came out of Claude Design (Anthropic's prototyping tool). I gave
it the assessment's mock images plus context on what I was building, and exported the
result into this folder. `colors_and_type.css` holds the exported tokens; the PNGs
are screenshots of the Claude Design output, covering the three steps and a few states
the original mocks didn't show. The original assessment mocks aren't committed here.

Screens captured:

- `form-step-1.png`: Step 1, Personal Details (Full name, Age, Gender)
- `form-step-2.png`: Step 2, Wellness Preferences (Primary goals, Support type, Notes)
- `form-step-3.png`: Step 3, Availability (Preferred time, Contact method, Details)
- `home.png`: the submissions list
- `dropdown-gender.png`: the Gender select, open
- `dropdown-step-2-multiselect.png`: the Primary Goals multi-select, open
- `input-field-step-1.png`: a single input field, close up
- `form-close-warning.png`: the unsaved-changes dialog

Component structure follows the Claude Design output and Material UI conventions.

---

## What's in this folder

| Path                  | What it is                                                      |
| --------------------- | --------------------------------------------------------------- |
| `README.md`           | This file: context, content and visual foundations, iconography |
| `colors_and_type.css` | All design tokens: color, type roles, radii, shadow, spacing    |
| `SKILL.md`            | Agent Skill manifest (for use in Claude Code)                   |
| `*.png`               | The mocks and reference screens listed above                    |

---

## Content fundamentals

The voice is plain, brief, and reassuring. Never clinical, never chatty.

- **Person.** Addresses the user as "you" implicitly; labels are plain nouns
  ("Full name", "Age", "Notes"), not sentences. No first-person "I" voice.
- **Casing.** Sentence case everywhere, including buttons. Buttons read "Save",
  "Save and next", "Back", "Submit", never `SAVE AND NEXT`. This is the single most
  important softening of the MUI default.
- **Field labels.** Short noun phrases. Required fields get a trailing ` *`
  ("Full name \*", "Gender \*", "Preferred support type \*").
- **Step names.** Two words max, sentence-case phrases: "Personal Details",
  "Wellness Preferences", "Availability".
- **Status words.** Single words: Draft, Completed.
- **Helper / placeholder copy.** Plain and literal. Placeholders restate the label
  ("Full Name", "Notes", "Preferred Time"). A real example value from the mocks:
  "Available mostly after 6 PM.", short, lowercase-bodied, human.
- **No jargon, no emoji, no exclamation marks.** Tone is steady and unhurried.
- **Reassurance through restraint.** The calm comes from what's left out. No
  progress nagging, no urgency, no marketing language.

Examples pulled straight from the mocks: `Full Name *`, `Age *`, `Gender *`,
`Primary Goals`, `Preferred Support Type *`, `Self-Guided / Coach Support / Not Sure`,
`Notes`, `Preferred Time`, `Preferred Contact Method *`, `Email / Phone / SMS`,
`Additional Details`, `Save`, `Save and Next`, `Back`, `Submit`.

---

## Visual foundations

**Overall vibe.** White cards floating on a soft off-white ground, thin gray
borders, lots of whitespace, one teal accent. Quiet and medical-clean but warm
enough not to feel like a hospital form.

- **Color.** Neutral-dominant. A single accent, teal `#147D6F`, carries all
  emphasis: primary buttons, the active step (text and underline), selected radios,
  progress fills, and the "Completed" status pill. Everything else is grayscale:
  near-black headings (`#1F2937`), gray secondary text (`#6B7280`), placeholder
  gray (`#9098A1`), thin gray borders (`#D7DBDE`). The app background is off-white
  (`#F7F8F8`); cards and inputs are pure white. Never introduce a second accent hue.
- **Type.** Roboto (Material default), weights 400 / 500 / 700. Dialog title is
  20px/700; subtitle 13px/400 gray; step labels 14px/500; field labels 12px; input
  text 16px; buttons 14px/500 sentence case. Tracking near zero, slightly tight on
  the title.
- **Spacing.** 8pt rhythm. Generous: around 24px card padding, 16 to 20px between
  fields, the form card centered with comfortable margins rather than stretched full
  width. Breathing room is a feature, not wasted space.
- **Backgrounds.** Flat color only. No gradients, images, illustrations, textures,
  or patterns anywhere. The off-white app ground plus white card is the whole story.
- **Corner radii.** Inputs, buttons, and chips around 8px; cards around 12px; status
  pills fully rounded (999px). Consistent and gentle, nothing sharp, nothing overly
  round.
- **Cards.** White, 12px radius, a thin `1px` gray border (`#E4E7E9`) and an
  optional whisper of shadow (`0 1px 2px rgba(31,41,55,.04)`). No heavy elevation;
  depth comes from the border, not a drop shadow.
- **Inputs.** Outlined, never filled. White interior, 1px gray border, 8px radius.
  On focus the border goes teal (around 1.5 to 2px). Floating labels sit in the
  border gap (MUI outlined style); placeholders are gray. Dropdowns show a small
  chevron on the right.
- **Buttons.**
  - *Primary* (Save and next, Submit): teal fill `#147D6F`, white text, 8px radius,
    minimal shadow. Hover lightens slightly (`#1B8E7E`), press darkens (`#0F6055`).
  - *Low-emphasis* (Save): teal text button, no fill, light teal when inactive
    (`#8FC4BC`).
  - *Secondary* (Back): outlined, gray border, dark text, transparent fill.
- **Selection controls.** Radios are MUI circles that fill teal when selected;
  labels are 15px/500. Multi-select goals render as soft-rect gray chips (`#ECEEEF`
  fill, 8px radius) inside the outlined select.
- **Stepper.** Three labels in a row, each over a thin 2px underline. Active is teal
  text plus teal underline; completed is teal underline with gray text; upcoming is
  gray text with light-gray underline. The underline doubles as the progress
  indicator.
- **Status pills.** Small rounded pills. Draft is neutral gray (`#6B7280` on
  `#ECEEEF`); Completed is teal (`#147D6F` on `#D6E9E5`).
- **Progress.** A thin teal bar (around 4px, fully rounded) on a light-gray track.
- **Motion.** Subtle and functional. Short fades, 150 to 200ms ease on hover,
  focus, and step changes. No bounces, no decorative loops, nothing flashy. Calm
  means restrained motion.
- **Hover / press states.** Buttons: hover lightens the teal, press darkens it, no
  scale jump. Rows: hover to `#F2F4F4`. Inputs: border darkens on hover, goes teal
  on focus.
- **Transparency / blur.** Essentially none. The dialog scrim is a light black wash;
  otherwise everything is opaque flat color.
- **Imagery.** None. This is a forms product. Its warmth comes from color, type, and
  space, not pictures.

---

## Iconography

This product uses almost no iconography, deliberately. Material UI ships Material
Symbols / Material Icons, and the few glyphs in the mocks come from that set:

- **Close (`×`):** top-right dialog dismiss. Material `close`.
- **Dropdown chevron (`⌄`):** right edge of every select. Material
  `arrow_drop_down` / `expand_more`.
- **Radio circles:** Material `radio_button_unchecked` / `radio_button_checked`
  (teal when checked), rendered by MUI's `<Radio>`.

That's the entire visible icon set. No custom icon font, no decorative SVG
illustration, no emoji or unicode characters used as icons. Iconography is purely
functional and monochrome: gray (`#6B7280`) by default, teal only when it expresses
selection or a primary action.

- **System:** Material Symbols (outlined), the MUI default. Loaded from the Google
  Fonts CDN (`fonts.googleapis.com/css2?family=Material+Symbols+Outlined`).
- **Style:** outlined, around 24px, 1.5 to 2px optical stroke, no fill except
  selected radios.
- **Substitution note:** the components reference Material Symbols from CDN, an
  exact match for an MUI product. If the app ships its own icon export, swap it in
  for the CDN reference.

There's no formal logo in the mocks. The product identifies itself with the
"Wellness Intake" wordmark (Roboto) in the dialog header. It's a plain text
treatment, nothing more.
