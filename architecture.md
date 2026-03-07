# BOPBOX Architecture

Browser-based step sequencer / groovebox. Runs offline via `file://` — no server required.

## Script Load Order

Scripts load in order via `<script>` tags (no ES modules, for offline compatibility):

1. **utils.js** — `escapeHtml`, `sanitizeColor`, `validateProjectData`, `throttle`, `debounce`, `Logger`
2. **state.js** — Constants, `state`, `makeTrack`, `getPageSteps`, `midiToNote`, `events`
3. **audio.js** — Tone.js setup, synths, samplers, playback engine, `disposeTrack`
4. **ui.js** — `renderTracks`, `renderStepNumbers`, `renderTrackRow`, `renderExpandedNoteEditor`, `rerenderTrack`, `updateCellUI`
5. **transport.js** — Play/stop/record, BPM, recording
6. **timeline.js** — Minimap canvas, `updateTimeline`
7. **editor-modes.js** — Steps / Notes mode, undo stack
8. **pages.js** — Page management (add, copy, paste, delete)
9. **context-menu.js** — Step context menu, track copy/paste
10. **grid-events.js** — Track list events, step cell clicks, track label menu
11. **note-editor.js** — Piano roll modal
12. **midi.js** — MIDI export (per-track and all-tracks), import (full and per-track), `parseMidi`, `parseMidiIntoTrack`, `exportAllTracksMidi`
13. **staff.js** — Staff notation export
14. **settings.js** — Project load/save, sample loading, Export MIDI button, More options (BPM, Swing), modals
15. **init.js** — Initialization, keyboard shortcuts, resize handler

## Key Globals

| Name | Defined in | Purpose |
|------|------------|---------|
| `state` | state.js | App state (bpm, tracks, viewPage, etc.) |
| `events` | state.js | Minimal pub/sub: `on(name, fn)`, `emit(name, data)` |
| `synths` | audio.js | `trackId → Tone.Synth` |
| `samplers` | audio.js | `trackId → Tone.Player` |
| `getPageSteps` | state.js | `(track, pageIdx) → steps[]` |
| `midiToNote` | state.js | `(midi) → "C4"` |
| `renderTracks` | ui.js | Full grid re-render |
| `disposeTrack` | audio.js | Dispose synth + sampler for a track |

## Constants (state.js)

- `MAX_PAGES` (16), `MAX_TRACKS` (32)
- `DEFAULT_STEP_COUNT` (16), `VELOCITY_MAX` (127)
- `VOL_DB_MIN`, `VOL_DB_RANGE`, `LONG_PRESS_MS`, `MAX_UNDO`

## Data Flow

- **Step data**: `track.steps` (page 0) or `track.pages[pageIdx]`
- **Step object**: `{ gate, velocity, duration, pitchOffset, swing, tie }`
- **Track object**: `{ id, name, color, synthType, muted, soloed, volume, baseNote, steps, pages, sampleBuffer, sampleName }`

## Project File Format

JSON with `bpm`, `swing`, `stepCount`, `tracks`. Loaded via `validateProjectData()` which sanitizes and validates.

## Security

- `escapeHtml()` used for user content before `innerHTML`
- `sanitizeColor()` validates hex colors
- `validateProjectData()` validates/sanitizes loaded project JSON

## Testing

- `npm test` — Vitest (unit + integration)
- `tests/core.test.js` — `midiToNote`, `getPageSteps`, `varLen`
- `tests/integration.test.js` — `validateProjectData`, `escapeHtml`, `sanitizeColor`

## Linting

- `npm run lint` — ESLint (browser env, globals for cross-file refs)
