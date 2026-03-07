# BOPBOX — User Guide

## Getting Started

Open **`index.html`** in any modern browser (Chrome, Firefox, Safari, Edge). You can open it directly from the file system (`file://`) or serve the folder with any static server. No build step or installation is required. The app is driven by 14 plain script files in the `js/` folder (see **about.md** for the module architecture).

The app opens with a pre-loaded demo pattern — **Kick, Snare, HiHat, Bass, and Lead** — so you have something to hear right away.

**Click ▶ Play** in the center of the header bar to start playback. Step cells light up as the sequencer advances. Click **■ Stop** to return to step 1, or click **▶ Play** again while playing to pause mid-pattern.

---

## The Interface at a Glance

```
[ BOPBOX ]    [ ■  ▶  ● ]    [ ⋯ ]  [ ? ]  [ ⚙ ]
[ ADD   DEL   COPY   PASTE   ⧉ ⧫ (track)      P 1/1   ↩   ↪ ]
[ ‹  ══════════════ timeline minimap ═══════════════════════════  › ]
────────────────────────────────────────────────────────────────────
● Kick     │  █     █     █     █     █     █     █     █
● Snare    │        █           █           █           █
● HiHat    │  █  █  █  █  █  █  █  █  █  █  █  █  █  █  █  █
...
────────────────────────────────────────────────────────────────────
                        [ + ADD TRACK ]
                   Viewing page 1 of 1
```

| Zone | What it does |
|------|-------------|
| **Header bar** | Logo, transport, More options (⋯), Help (?), Settings (⚙) |
| **Timeline** | Minimap of all pages with ‹ › navigation arrows |
| **Toolbar** | Step actions (ADD/DEL/COPY/PASTE), track copy/paste, Page (P 1/1), Undo/Redo |
| **Track rows** | Track header (name, M/S, mode ⊞/🎹, ⚙, instrument, vol) + steps grid or notes grid per track |
| **Console bar** | Plain-language readout of the last action |

---

## Transport Controls

| Control | Where | What it does |
|---------|-------|-------------|
| **■ Stop** | Header center | Stop playback, reset to step 1 |
| **▶ Play** | Header center | Start playback (shows ⏸ while playing) |
| **⏸ Pause** | Header center | Pause at current step; click again to resume |
| **● Record** | Header center | Start/stop audio capture |
| `Space` | Keyboard | Toggle play / pause |

**BPM** — open **⋯ More options** in the header to set BPM (20–300). Applied immediately.

**Swing** — in ⋯ More options or Settings (⚙). Delays odd-numbered steps for a shuffle feel. 0% = straight 16th notes. Try 50–70% for hip-hop or jazz grooves.

---

## Working with Tracks

### Adding a Track

Click **+ ADD TRACK** at the bottom of the grid. Each new track gets a unique name, color, and synth engine automatically.

### Track Label Controls

| Control | Action |
|---------|--------|
| **Color dot** | Visual identifier — matches step cells and minimap color |
| **Name field** | Click to edit the track name inline |
| **M / S** | Mute / Solo |
| **⚙** | Track options (opens same menu as right-click on label) |
| **Synth dropdown** | Change the synthesis engine |
| **Volume slider** | Per-track output level (also in the right-click context menu) |

### Synth Engines

| Engine | Character | Best for |
|--------|-----------|---------|
| **Synth** | Sawtooth oscillator | Leads, bass lines, pads |
| **FM** | Frequency modulation | Bells, electric piano, metallic tones |
| **AM** | Amplitude modulation | Organs, tremolo textures |
| **Pluck** | Karplus-Strong model | Guitar, harp, pizzicato strings |
| **Membrane** | Drum synthesis model | Kick drums, toms |
| **Metal** | Metallic percussion model | Hi-hats, cymbals, cowbells |
| **Poly** | Polyphonic sawtooth | Chords, layered pads |

### Loading an Audio Sample

Replace any track's synth with your own sound file:

1. Right-click the track label → **Load Sample**
2. Select a `.wav`, `.mp3`, `.ogg`, or `.aiff` file
3. The track now plays the sample at each step's pitch and velocity

### Removing a Track

Right-click the track label → **Delete Track**, or right-click any step in that track → **Delete Track**.

---

## Programming Steps

### Toggling Steps On and Off

On a track in **Steps** layout with **ADD** selected (the default), click any gray cell to activate it — it lights up in the track's color. Click an active cell to turn it off. Use the **⊞ / 🎹** button in the track header to switch that track between Steps and Notes layout.

**Drag** across multiple cells to paint or erase in bulk. The direction of your first click (on→off or off→on) is applied continuously as you drag.

**Double-click** any step cell to instantly open the Step Editor popup near your cursor.

### Reading a Step Cell

| Display element | What it means |
|----------------|--------------|
| **Center text** | Note name — e.g. `C4`, `D#3`, `G2` |
| **Top-left glyph** | Duration: ♬ = 16th, ♪ = 8th, ♩ = quarter, 𝅗𝅥 = half note |
| **Bottom bar** | Velocity fill — wider = louder |
| **Top-right dot** | This step has an individual swing offset |

### Step Editor — Precise Per-Step Control

Right-click or double-click any step to open the Step Editor popup:

| Parameter | Range | What it controls |
|-----------|-------|-----------------|
| **Velocity** | 0–127 | Note loudness and brightness |
| **Duration** | 1–16 (sixteenths) | How long the note sustains after the step fires |
| **Pitch offset** | Semitones | Raises/lowers the note relative to the track's base pitch; note name shown live |
| **Swing** | 0–100% | Delays this individual step, independent of global swing |

Click anywhere outside the popup to close and save.

### Beat Markers

Steps 1, 5, 9, and 13 are highlighted in green — these are the four quarter-note beats of a 4/4 bar. Use them as anchor points when placing kick drums, snare hits, or chord stabs.

### Ties

A **tie** links a step to the previous note, holding it across both steps for a longer sustained note. Right-click a step → **Toggle Tie**. Tied steps show a distinct color tint.

---

## Editor Modes

The **STEPS ▾** dropdown in the Toolbar switches between three top-level editing modes. Each mode reveals a different set of action buttons.

### Steps layout (per track)

Click cells to apply the selected action:

| Button | Click a step to… |
|--------|-----------------|
| **ADD** | Turn the step on |
| **DEL** | Turn the step off / clear it |
| **COPY** | Copy this step's data to the clipboard |
| **PASTE** | Paste the clipboard data onto this step |

### Notes layout (per track)

Shows each step as a **column of 8 rectangles** (scale degrees 1–8). **Click the notes grid** to open the full piano roll Note Editor for that track. Use Copy Track / Paste Track from the Toolbar or context menu. Sampler and Drums default to Steps; Monosynth and Polysynth default to Notes.

### Pages Mode

Reveals page-management action buttons:

| Button | Action |
|--------|--------|
| **NEW PAGE** | Create a new page after the current one (pre-filled with current page's content) |
| **COPY PG** | Copy all step data from this page to the clipboard |
| **PASTE PG** | Paste the clipboard page data onto the current page |
| **CLEAR ALL** | Erase every step on the current page across all tracks |
| **DEL PAGE** | Remove the current page (minimum 1 page always remains) |

---

## Pages — Building Longer Arrangements

Pages let you chain multiple patterns together. During playback, BOPBOX plays Page 1 → Page 2 → Page 3 → … → loop back to Page 1. Maximum **16 pages × up to 32 steps = 512 steps** of total pattern data.

### Navigating Pages

- **‹ / ›** arrows in the Timeline — previous / next page
- **Click the minimap** — jump directly to any page
- **`←` / `→` arrow keys** — navigate from the keyboard
- **›** on the last page — automatically creates a new page copied from the current one

### Page indicator

The Toolbar shows **P 1/1**. Click it to open the Page menu (New, Copy, Paste, Clear, Delete).

### Reading the Timeline Minimap

| Visual element | Meaning |
|---------------|---------|
| Horizontal strip | One track |
| Colored blocks | Active steps (brightness = velocity) |
| Vertical dividers | Page boundaries |
| **Green outline frame** | Page you're currently viewing/editing |
| **Red outline frame** | Page currently playing (visible when play position ≠ view position) |

**Click anywhere on the minimap** to jump to that page.

---

## The Note Editor (Piano Roll)

The Note Editor is a full piano roll for melodic and harmonic editing. Open it by clicking a track's **notes grid** (tracks in Notes layout show the 8-slot scale grid; use the ⊞/🎹 button in the track header to switch layout).

### Layout

| Area | What it shows |
|------|--------------|
| **Piano strip** (left) | Keyboard from C1 to C8; click any key to preview that pitch |
| **Time ruler** (sticky top) | Step numbers with green beat markers |
| **Note grid** | Semitone rows × step columns; black-key rows slightly darker |
| **Note blocks** | Track color; opacity = velocity; width = duration |
| **Velocity strip** (bottom) | Bar chart of note velocities per step |

### Tools

| Tool | Key | How to use |
|------|-----|-----------|
| **✦ Select** | `S` | Click a note to select (turns gold); drag to move; Shift+click for multi-select |
| **✏ Draw** | `D` | Click an empty row to place a note; drag right to set duration; drag the right edge to resize |
| **✕ Erase** | `E` | Click any note to delete it |

### Quantization Snap

Click **SNAP 1/16** in the toolbar to cycle: **1/16 → 1/8 → 1/4 → 1/2**. Notes snap to the nearest division when placed or moved.

### Adjusting Velocity

In the Velocity strip at the bottom, click and drag any bar upward to increase velocity, downward to decrease it.

### Deleting Notes

Select notes with the Select tool, then press `Delete` or `Backspace`. Or use the Erase tool and click directly on any note.

### Track Selector

The dropdown in the Note Editor header lets you switch to a different track without closing the editor.

### Closing

Click **✕ CLOSE** in the toolbar, or click outside the modal. All changes save automatically and sync back to the step sequencer grid.

---

## Pitch and Tuning

Every track has a **base note** (Kick/Bass: C2, all others: C4). Pitch offsets in the Step Editor and Note Editor are semitones relative to this base:

- `0` = base note (e.g. C4)
- `+7` = perfect fifth above (e.g. G4)
- `-12` = one octave below (e.g. C3)

The Note Editor handles absolute MIDI pitches (C1–C8) and converts to/from offsets automatically.

---

## Recording Audio

1. Click **● Record** (or press `R`) — the button pulses red
2. Click **▶ Play** to start the sequencer
3. Click **● Record** again to stop — a save dialog appears
4. Click **↓ SAVE AUDIO** to download as `.webm`, or **DISCARD** to cancel

> The recording captures exactly what you hear — the live Web Audio engine output.

---

## Saving and Loading Projects

### Save Project

Open **⚙ Settings** → click **SAVE PROJECT**. Downloads `hexbeat_project.json` containing BPM, swing, all tracks, all steps, and all pages.

### Load Project

Open **⚙ Settings** → click **LOAD PROJECT** and select a `.json` file. The current session is fully replaced.

> **Note:** Audio samples are not saved in the project file — only their filenames. Re-load WAV files manually after opening a saved project.

---

## Settings Panel (⚙)

| Setting | Options | Effect |
|---------|---------|--------|
| **STEPS** | 8, 16, 32 | Steps per page across all tracks |
| **QUANTIZE** | 16th · 8th · 8th triplet · Quarter | Snap grid for the Note Editor |
| **SWING** | 0–100% | Global shuffle amount on odd steps |

---

## Exporting

### MIDI Export

- **All tracks:** Open **⚙ Settings** → **EXPORT MIDI**. Downloads one `.mid` file with all tracks.
- **Single track:** Right-click the track label or a step → **Export MIDI**. Downloads a `.mid` for that track’s current page. Import into any DAW (Ableton, Logic, GarageBand, FL Studio, etc.).

### MIDI Import

- **Replace all:** **⚙ Settings** → **MIDI IMPORT** — replaces all tracks with the first track from the file.
- **One track:** Right-click the track label or a step → **Import MIDI** — loads the MIDI into that track only (current page).

### Staff Notation

Right-click any track → **Export Staff Notation**. Opens a canvas popup showing a basic musical staff for that track's pitch sequence.

---

## Context Menus

### Right-click a Step Cell (or long-press on mobile)

- **Volume slider** — adjust this track's level live
- **Edit Step…** — open the Step Editor popup
- **Toggle Tie** — connect this note to the previous step
- **Clear Step** — turn this step off
- **Copy Track / Paste Track / Clear Track** — bulk operations on the whole track
- **Import MIDI** — load a MIDI file into this track only
- **Export Track MIDI** — download MIDI for this track
- **Load Sample** — load an audio file (.wav, .mp3, .ogg, .aiff) as the instrument
- **Export Staff Notation** — view musical notation
- **Delete Track** — permanently remove the track

### Right-click a Track Label or click ⚙ (or long-press on mobile)

- Copy track / Paste track · Import MIDI / Export MIDI
- Synth type selector · Mute · Solo
- Load Sample · Staff Notation · Delete Track

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `R` | Start / Stop recording |
| `←` | Previous page |
| `→` | Next page (creates new page if on last) |
| `S` | Note Editor: Select tool |
| `D` | Note Editor: Draw tool |
| `E` | Note Editor: Erase tool |
| `Delete` / `Backspace` | Note Editor: Delete selected notes |

---

## Workflow Tips

**Building a beat from scratch:**
1. Add a track, select Membrane, click steps 1 · 5 · 9 · 13 — four-on-the-floor kick
2. Add a Snare track, steps 5 and 13
3. Add a HiHat (Metal), activate all 16 steps, then lower velocity on even steps for a two-feel

**Creating a bassline with the Note Editor:**
1. Add a track, set synth to FM or Synth
2. Put the track in Notes layout (🎹) if needed, then click its notes grid
3. Draw notes in the piano roll — try C2, G2, A2 patterns across the 16 steps
4. Use the velocity strip to accent beat 1 of each bar

**Building a multi-page arrangement:**
1. Build your verse pattern on page 1
2. Press `→` to create page 2 (automatically copied from page 1)
3. Modify page 2 — add a lead melody or change the rhythm
4. Press `→` again for a chorus or bridge variation
5. Hit Play — pages chain together seamlessly in order

**Auditioning pitches:**
Open the Note Editor and click any key on the piano strip to preview that pitch using the track's actual synth engine — useful for finding the right notes before committing them to the grid.

**Using swing creatively:**
Set global swing to 60–70% in Settings for a classic hip-hop feel. Then override individual steps (via Step Editor → Swing) to create push-and-pull rhythmic tension within the groove.
