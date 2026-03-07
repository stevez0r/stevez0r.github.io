# BOPBOX — 16-Step Sequencer

## Overview

**BOPBOX** is a browser-based, multi-track step sequencer and MIDI pattern composer delivered as a single self-contained HTML file. It requires no installation, no build step, and no server — open it in any modern browser and start making music. It combines the immediacy and tactile feel of hardware step sequencers (Roland TR-808, Elektron boxes) with workflow ideas from digital audio workstations, wrapping them in a dark, retro-inspired interface that runs entirely on the client side using Web Audio and the Tone.js scheduling engine.

Each track owns an independent 16-step grid where every cell stores pitch, velocity, duration, swing, and tie data. Multiple tracks play simultaneously through a shared transport clock. **Pages** extend any pattern into a sequential chain — up to 16 pages × 16 steps = 256 total steps — enabling evolving arrangements that grow beyond a single looping bar.

---

## Design

### Visual Language

- **Dark-room aesthetic** — layered backgrounds from `#0a0a0f` (near-black) to `#1e1e2e` (panel), with four accent colors: hot pink `#ff3864`, mint green `#38ffb4`, purple `#7038ff`, and gold `#ffd700`
- **CRT scanline overlay** — a full-viewport repeating linear gradient at 4px intervals gives a subtle phosphor-screen texture without interfering with readability
- **Typography** — Outfit (sans-serif) for labels, controls, track names, and body text
- **Information-dense step cells** — each active cell simultaneously shows the note name (e.g. `C4`, `D#3`), a duration glyph (♬♪♩𝅗𝅥), a velocity fill bar, and a swing indicator dot — the pattern's full musical content is legible at a glance without opening any menus
- **Track color system** — 10 distinct high-chroma colors are automatically assigned to new tracks and echoed in the step cells, the timeline minimap, and note editor blocks for instant visual association

### Layout Architecture

The interface stacks three fixed bars above a freely scrollable main area:

```
┌────────────────────────────────────────────────┐  z:100  HEADER
│  BOPBOX   [ ■  ▶  ● ]   [⋯]  [?]  [⚙]         │         logo · transport · more options · help · settings
├────────────────────────────────────────────────┤  z:98   TIMELINE
│  ‹  ▓▓▓░▓░▓▓░▓▓░▓░▓░▓░▓▓▓░░░░░░░░░░░░░░░░░  › │         minimap canvas · page arrows
├────────────────────────────────────────────────┤  z:99   TOOLBAR
│  STEPS | NOTES   ADD DEL COPY PASTE   P 1/1  ↩ ↪ │       mode · action buttons · page · undo/redo
├────────────────────────────────────────────────┤         SCROLLABLE MAIN
│  ● Kick    │ █   █   █   █   █   █   █   █      │
│  ● Snare   │     █       █       █       █      │
│  ● HiHat   │ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █  │
│     …      │  …                                 │
├────────────────────────────────────────────────┤
│              [ + ADD TRACK ]                    │
│           Viewing page 1 of 1                   │         CONSOLE BAR
```

All three header bars use `position: fixed` with CSS custom-property heights (`--header-h: 45px`, `--toolbar-h: 38px`, `--preview-h: 33px`), so `--top-bars-h` always calculates the correct `margin-top` for the scrollable content regardless of breakpoint.

### Responsiveness

Four breakpoints (`≤800px`, `≤599px`, `≤432px`, `≤359px`) progressively collapse the layout: track label controls hide behind a long-press context menu, header elements compress, cell and label sizes shrink. Long-press (480ms `setTimeout` on `touchstart`) replaces right-click for all context menus on touch devices.

---

## Feature Set

### Transport & Timing

- **Stop / Play / Pause** via `Tone.Transport`; pause preserves playhead position for seamless resume
- **BPM** — in ⋯ More options (header); 20–300 BPM, applied immediately to the running transport
- **Swing** — global 0–100% amount plus per-step override; odd-numbered steps are delayed by `sixteenthDuration × swingAmount × 0.5`
- **Step count** — 8, 16, or 32 steps per page (all pages change together)
- **Quantize grid** — 16th, 8th, 8th-triplet, or quarter note snap (used by the Note Editor)

### Tracks

- Unlimited tracks, dynamically added or removed
- Per-track properties: name (inline editable), color, Mute, Solo, volume (0–127), synth engine, base MIDI note
- **Seven synthesis engines** powered by Tone.js: Synth (sawtooth), FM, AM, Pluck (Karplus-Strong physical model), Membrane (kick drum model), Metal (cymbal model), Poly (polyphonic)
- **Sample loading** — any track can load a `.wav`, `.mp3`, `.ogg`, or `.aiff` file decoded via the Web Audio `AudioBuffer` API; the sample is played at each step's pitch and velocity via `Tone.Player`
- **Base note** — each track has a MIDI base note (Kick/Bass default C2, others C4); step pitch offsets are measured in semitones from this value

### Step Grid

- Each step stores: `gate` (on/off), `velocity` (0–127), `duration` (1–16 sixteenth notes), `pitchOffset` (semitones from base note), `swing` (0–100%), `tie` (boolean)
- **Click** to toggle; **drag** to paint or erase in bulk; **double-click** to open the Step Editor instantly; **right-click** / long-press for the full context menu
- **Step Editor popup** — positioned near the cursor, gives precise control of velocity, duration, pitch offset (with live note name readout), and individual step swing
- Step cells simultaneously display pitch name, duration glyph, velocity bar, and swing dot

### Editor Modes

The **STEPS ▾** dropdown in the Toolbar switches between three top-level modes:

| Mode | Action Buttons | Purpose |
|------|----------------|---------|
| **Steps** (per track) | ADD · DEL · COPY · PASTE | Click a step to add, erase, copy, or paste individual step data |
| **Notes** (per track) | Copy / Paste Track | Grid shows 8 note slots per step (scale degrees); click the notes grid to open the piano roll |
| **Pages** | NEW PAGE · COPY PG · PASTE PG · CLEAR ALL · DEL PAGE | Create, duplicate, paste, clear, or remove pages |

Each track has its own layout: **Steps** (step cells) or **Notes** (scale-slot grid). The **mode button** (⊞ / 🎹) in the track header toggles that track. Sampler and Drums default to Steps; Monosynth and Polysynth default to Notes.

### Note Editor (Piano Roll)

A full-featured MIDI note editor opened by clicking a track's notes grid:

- **Range** — C1 (MIDI 24) to C8 (MIDI 108); 85 semitone rows at 14px each
- **Time axis** — 52px per 16th step, spanning all steps on the current page
- **Three tools** — ✦ Select (drag to move, Shift+click multi-select), ✏ Draw (click/drag to place and resize), ✕ Erase; keyboard shortcuts S/D/E
- **Sticky time ruler** — beat markers in accent green, step numbers scroll beneath it
- **Piano keyboard strip** — clickable white/black keys for pitch preview; scrolls in sync with the grid
- **Note blocks** — track color, opacity encodes velocity, width encodes duration; resize handle on right edge
- **Velocity strip** at the bottom — drag bars vertically per note
- **Quantization snap** — cycles 1/16 → 1/8 → 1/4 → 1/2 via SNAP button
- All edits sync back to the step sequencer in real time

### Pages & Timeline

- **1–16 pages**, each with fully independent step data per track
- Pages **chain sequentially** during playback and loop back to page 1 after the last
- **Timeline minimap** (canvas-rendered) — one colored strip per track, colored blocks per active step with velocity-weighted opacity; green frame = viewed page, red frame = currently playing page; click any region to jump to that page
- Navigation: `‹` / `›` arrow buttons, minimap click, or `←` / `→` arrow keys

### Recording & Export

- **Audio recording** — `MediaStreamDestination` + `MediaRecorder` captures the live Web Audio graph; saves as `.webm`
- **MIDI export** — per-track (context menu) or all tracks (Settings → Export MIDI); Type-0/Type-1 `.mid` with VLQ timing; no external library
- **Staff notation** — canvas-rendered musical staff visualization per track (right-click menu)
- **Project save/load** — full state (BPM, swing, step count, all tracks, all pages) serialized to JSON and downloaded as `hexbeat_project.json`

### Context Menus

**Step right-click** — volume slider · Edit Step · Toggle Tie · Clear Step · Copy/Paste/Clear Track · Import MIDI · Export MIDI · Load Sample · Staff Notation · Delete Track

**Track label right-click or ⚙** — Copy/Paste track · Import MIDI · Export MIDI · Synth · Mute · Solo · Load Sample · Staff Notation · Delete Track

### Console Bar

Single-line status bar below the track grid displaying the most recent action in plain language (e.g. `Added step 5 on Kick`, `Viewing page 2 of 4`). Updated on every meaningful user interaction.

### Keyboard Shortcuts

`Space` Play/Pause · `R` Record toggle · `← →` Page navigation · `S D E` Note Editor tools · `Delete / Backspace` Remove selected notes

---

## Architecture

### Runtime Environment

- **Single HTML file** — `index.html` plus external CSS (`css/styles.css`) and JavaScript modules in `/js`; no build step
- **Zero build step** — no bundler, transpiler, or package manager required at runtime
- **Client-only** — all state in JavaScript memory; no network calls after the initial page load
- **Offline / file://** — plain `<script>` tags (no ES modules); runs from `file://` or any static server

### JavaScript module architecture

Logic is split into 14 scripts in `/js`, loaded in dependency order via plain `<script>` tags (no `type="module"`), so the app works offline and on `file://`:

| Order | Module | Role |
|-------|--------|------|
| 1 | **state.js** | `state` object, `NOTES`/`COLORS`, `makeTrack`, `getPageSteps`, `midiToNote`, `durLabel`, `setStatus`, `logConsole`, `trackLabelMenuTi` |
| 2 | **audio.js** | Tone.js graph (`synths`, `samplers`, `masterVol`, `compressor`, `reverb`), `getSynth`, `getPlayer`, `disposeSynth`, playback engine (`sequence`, `triggerStep`, `startPlayback`, `pausePlayback`, `stopPlayback`, `updatePlayhead`, `updatePlayBtn`) |
| 3 | **ui.js** | Grid UI: `renderStepNumbers`, `renderTracks`, `renderTrackRow`, `renderExpandedNoteEditor`, `updateCellUI`, `rerenderTrack`, `handleStepCellClick` |
| 4 | **transport.js** | Play/Stop/Record button handlers, recording (MediaRecorder), BPM and step-count inputs |
| 5 | **timeline.js** | `updateTimeline`, timeline canvas click → page navigation |
| 6 | **editor-modes.js** | Undo/redo (`pushUndo`, `doUndo`, `doRedo`, `restoreState`, `updateUndoRedoUI`, `updateConsoleHistory`, `renderConsoleHistory`), step copy/paste, notes copy/paste, console history panel |
| 7 | **pages.js** | `navigateToPage`, `addPage`, `removePage`, page arrows, page dropdown (P 1/1 label, New/Copy/Paste/Clear/Delete) |
| 8 | **context-menu.js** | `showDimOverlay`, `closeAllMenus`, `showContextMenu`, step/track context menus, Copy/Paste/Import MIDI, cell popup, ctx volume slider, Load Sample |
| 9 | **grid-events.js** | Track grid: mousedown/mouseover/mouseup, contextmenu, dblclick, touch long-press, track label click/change, `openTrackLabelMenu`, Add track button |
| 10 | **note-editor.js** | Piano roll: `openNoteEditor`, `neLoadTrack`, `neSaveToTrack`, `neFullRedraw`, tools (Select/Draw/Erase), quantize, velocity strip, keyboard S/D/E and Delete |
| 11 | **midi.js** | `exportTrackMidi`, `parseMidi`, MIDI import button and file input |
| 12 | **staff.js** | `showStaffNotation`, `drawStaff`, staff modal close and download PNG |
| 13 | **settings.js** | Project save/load, sample file input, mobile track label menu (tlm*), dim overlay click, mobile overflow panel, swing sync (header/mobile/settings), Settings modal, Help modal |
| 14 | **init.js** | `init()` (default tracks, initial render), global keyboard shortcuts (Space, R, ←→, Ctrl+Z/Y), resize → `updateTimeline` |

Load order is fixed: later modules depend on globals from earlier ones (e.g. `pages.js` uses `pushUndo` from `editor-modes.js`, so editor-modes is loaded before pages).

### File structure

| Path | Purpose |
|------|---------|
| `index.html` | Single entry point; markup and script tags in load order |
| `css/styles.css` | All styles (no inline CSS) |
| `js/*.js` | 14 scripts above; no ES modules, no `app.js` in the load list |
| `about.md` | Project overview, feature set, architecture, and module roles |
| `instructions.md` | User-facing guide (getting started, transport, tracks, steps, export) |

### Technology Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Audio engine | **Tone.js 14.8.49** (CDN) | Synthesis, transport scheduling, effects chain |
| Typography | **Outfit** (Google Fonts) | Sans-serif for UI and text |
| Rendering | **HTML5 Canvas 2D** | Timeline minimap, Note Editor (grid/ruler/velocity), staff notation |
| File I/O | JS `Blob` download / `<input type="file">` | Project save (JSON), audio save (.webm), MIDI export (.mid) |
| Audio I/O | **Web Audio API** | `AudioBuffer` sample decoding, `MediaStreamDestination` recording |
| MIDI encoder | Vanilla JS (`Uint8Array`) | Binary MIDI file writer, ~70 lines, no library |

### State Model

All mutable state lives in a single top-level `state` object:

```javascript
{
  bpm, swing, stepCount, quantize,
  playing, paused, recording,
  currentStep,   // playhead step during playback
  currentPage,   // page currently playing
  viewPage,      // page shown in the grid UI
  pageCount,     // 1–16
  tracks: [{
    id, name, color, synthType,
    muted, soloed, volume, baseNote,
    steps: [{ gate, velocity, duration, pitchOffset, swing, tie }],  // page 0 data
    pages: [null, [{…step}], [{…step}], …]                          // pages 1–N
  }],
  clipBoard, ctxTrackIdx, ctxStepIdx
}
```

`getPageSteps(track, pageIdx)` abstracts page access: returns `track.steps` for index 0 and lazily initializes `track.pages[pageIdx]` (deep-copied from page 0) for any higher index.

### Audio Pipeline

```
Tone.Sequence (16th-note clock)
  └─▶ triggerStep(track, stepIdx, time)
        ├─▶ getSynth(track) → Tone.[Synth|FMSynth|AMSynth|PluckSynth|MembraneSynth|MetalSynth|PolySynth]
        │                         └─▶ reverb / compressor → masterVol → AudioContext.destination
        └─▶ getPlayer(track) → Tone.Player (sample tracks only)
                                   └─▶ compressor → masterVol
                                                      └─▶ (tapped) MediaStreamDestination → MediaRecorder → .webm
```

Synths are lazily instantiated per `track.id` and cached in a `synths` map. Swing time offsets are injected as microsecond deltas at the Tone.js scheduling level. UI updates during playback use `Tone.getDraw().schedule()` to remain synchronized with the audio clock rather than `requestAnimationFrame`.

### Rendering Strategy

- **Track grid** — DOM-based; `updateCellUI()` surgically patches a single cell's class list and child text nodes without re-rendering the full grid, keeping interactive frame rates smooth even with many tracks
- **Timeline** — pure Canvas 2D; redraws every playback tick via `Tone.getDraw()` and on any state mutation affecting step data or page layout
- **Note Editor** — two-canvas layout: a `position: sticky` ruler canvas atop a scrollable grid canvas; piano keys are DOM `<div>` elements for reliable touch and click hit-testing; mouse coordinates are resolved from `getBoundingClientRect()` plus scroll offsets

### Event Architecture

- **Delegation pattern** — `mousedown`, `mouseover`, `contextmenu`, `touchstart`, `touchend`, and `dblclick` attach to the `#trackList` container and resolve targets via `.closest()`, avoiding per-cell listener overhead
- **Long-press** — 480ms `setTimeout` on `touchstart`, cancelled on `touchend` or `touchmove`
- **Context menus** — `showContextMenu(x, y)` clamps the menu position to viewport edges before rendering to prevent overflow

### MIDI Encoder

Exports a Type-0 Standard MIDI File with 480 ticks-per-quarter-note resolution. Each active step generates a note-on / note-off pair encoded with VLQ (variable-length quantity) delta times. A tempo meta-event encodes BPM as microseconds per beat. The complete encoder is implemented in ~70 lines of vanilla JavaScript using `Uint8Array`, with no external MIDI library.
