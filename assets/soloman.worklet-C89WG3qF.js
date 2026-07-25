// soloman.worklet.js — AudioWorkletProcessor hosting the WASM build of the SolomanAudio C++ core.
//
// This is the webapp's equivalent of the iOS AVAudioSourceNode render closure (ADR-0014): it owns
// the engine instance and does exactly one thing per render quantum — call soloman_render and copy
// the stereo result out. The audio-thread contract holds:
//   - process() never allocates wasm memory, never fetches, never decodes, never blocks. The only
//     JS-side heap activity is the small throttled snapshot postMessage (the standard worklet →
//     main channel; SharedArrayBuffer would need cross-origin isolation the dev server doesn't have).
//   - Commands and sample data arrive via port.onmessage, which the AudioWorkletGlobalScope runs
//     between render quanta — the same "control side" position the iOS control thread occupies.
//     Sample copies (which allocate inside the engine) happen only there, mirroring
//     soloman_load_sample's contract.
//
// The metronome and one-bar count-in are *webapp product features* the C++ core intentionally does
// not implement (they don't exist in the C ABI). They are host-side here, like any host would add
// monitoring: precomputed click buffers mixed into the output after the engine render, aligned to
// engine steps read from the snapshot (block-granular, ≤ one quantum of jitter).
//
// The precompiled WebAssembly.Module arrives via processorOptions (structured clone), so
// instantiation in the constructor is synchronous and the module bytes are fetched/compiled on the
// main thread, never here.
'use strict';

// Must mirror SolomanCommandType in soloman_audio.h (checked against the ABI version at init).
const CMD_TRANSPORT_PLAY = 0;
const CMD_TRANSPORT_STOP = 1;

const EXPECTED_ABI = 4;
const SNAPSHOT_INTERVAL_BLOCKS = 3; // ~8 ms at 128 frames / 48 kHz when idle-polling peak

class SolomanEngineProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._ok = false;
    this._failed = false;

    // Snapshot change tracking (post to main thread only when something moved).
    this._lastPlaying = -1;
    this._lastStep = -1;
    this._lastLoop = -1;
    this._blockCounter = 0;

    // Metronome / count-in click state (all preallocated in the constructor).
    this._metronome = false;
    this._clicks = [];           // fixed pool of {buf, pos}
    this._countIn = null;        // {framesPerBeat, beats, frame, clicked}

    // .wav export (variant F): when armed, copy the final stereo block out to the host each quantum.
    // This is a plain memcpy of the already-rendered output — no DSP, no engine allocation.
    this._capturing = false;

    this.port.onmessage = (event) => this._onMessage(event.data);

    try {
      const opts = (options && options.processorOptions) || {};
      this._instantiate(opts.module, opts.maxFrames || 2048);
      this._buildClicks();
      this._ok = true;
      this.port.postMessage({ t: 'ready', abi: this._abi, sampleRate });
    } catch (error) {
      this._fail(error);
    }
  }

  _instantiate(module, maxFrames) {
    if (!module) throw new Error('processorOptions.module (WebAssembly.Module) is required');

    // Standalone wasm imports only trivial WASI shims (abort paths); stub whatever it declares.
    const imports = {};
    for (const im of WebAssembly.Module.imports(module)) {
      if (im.kind !== 'function') {
        throw new Error(`Unexpected non-function wasm import ${im.module}.${im.name}`);
      }
      (imports[im.module] || (imports[im.module] = {}))[im.name] = () => 0;
    }

    const instance = new WebAssembly.Instance(module, imports);
    const e = (this._e = instance.exports);
    if (typeof e._initialize === 'function') e._initialize(); // WASI reactor init (static ctors)

    this._abi = e.soloman_web_abi_version();
    if (this._abi !== EXPECTED_ABI) {
      throw new Error(`SolomanAudio ABI mismatch: wasm reports ${this._abi}, worklet expects ${EXPECTED_ABI}`);
    }
    if (!e.soloman_web_init(sampleRate, maxFrames)) {
      throw new Error('soloman_web_init failed');
    }
    this._maxFrames = maxFrames;
    this._leftPtr = e.soloman_web_left();
    this._rightPtr = e.soloman_web_right();
    this._refreshHeap();
  }

  // Memory growth (sample loads) detaches old views; re-derive them when the buffer changes.
  _refreshHeap() {
    const buffer = this._e.memory.buffer;
    if (this._memBuffer !== buffer) {
      this._memBuffer = buffer;
      this._heapF32 = new Float32Array(buffer);
    }
  }

  _buildClicks() {
    const mkClick = (freq, gain) => {
      const n = Math.max(1, Math.round(sampleRate * 0.05));
      const buf = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const env = Math.exp(-i / (sampleRate * 0.012));
        buf[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * env * gain;
      }
      return buf;
    };
    this._clickAccent = mkClick(1860, 0.5);
    this._clickNormal = mkClick(1240, 0.3);
    for (let i = 0; i < 8; i++) this._clicks.push({ buf: null, pos: 0 });
  }

  _startClick(accent) {
    for (const c of this._clicks) {
      if (c.buf === null) {
        c.buf = accent ? this._clickAccent : this._clickNormal;
        c.pos = 0;
        return;
      }
    }
  }

  _mixClicks(left, right, frames) {
    for (const c of this._clicks) {
      if (c.buf === null) continue;
      const n = Math.min(frames, c.buf.length - c.pos);
      for (let i = 0; i < n; i++) {
        const s = c.buf[c.pos + i];
        left[i] += s;
        if (right) right[i] += s;
      }
      c.pos += n;
      if (c.pos >= c.buf.length) c.buf = null;
    }
  }

  _onMessage(msg) {
    if (this._failed || !msg) return;
    try {
      switch (msg.t) {
        case 'cmds': {
          // Flat array: 9 slots per command [type, i0..i3, f0..f3].
          const a = msg.a;
          for (let k = 0; k + 8 < a.length; k += 9) {
            this._e.soloman_web_push(a[k], a[k + 1], a[k + 2], a[k + 3], a[k + 4],
                                     a[k + 5], a[k + 6], a[k + 7], a[k + 8]);
          }
          break;
        }
        case 'play': {
          const beats = msg.countInBeats | 0;
          if (beats > 0 && msg.bpm > 0) {
            // Hold TRANSPORT_PLAY until the count-in elapses; clicks render meanwhile.
            this._countIn = {
              framesPerBeat: Math.max(1, Math.round((sampleRate * 60) / msg.bpm)),
              beats,
              frame: 0,
              clicked: 0,
            };
          } else {
            this._countIn = null;
            this._e.soloman_web_push(CMD_TRANSPORT_PLAY, 0, 0, 0, 0, 0, 0, 0, 0);
          }
          break;
        }
        case 'stop':
          this._countIn = null;
          for (const c of this._clicks) { c.buf = null; c.pos = 0; }
          this._e.soloman_web_push(CMD_TRANSPORT_STOP, 0, 0, 0, 0, 0, 0, 0, 0);
          break;
        case 'metronome':
          this._metronome = !!msg.on;
          break;
        case 'capture':
          this._capturing = !!msg.on;
          break;
        case 'tone':
          this._e.soloman_web_set_test_tone(msg.on ? 1 : 0, msg.freq || 440);
          break;
        case 'sample': {
          // Decoded mono frames at the context rate; copy into the engine slot. Runs between
          // render quanta (control side) — the engine allocates here, render never does.
          const data = new Float32Array(msg.buf);
          const ptr = this._e.soloman_web_sample_stage(data.length);
          if (!ptr) throw new Error(`Could not stage sample for slot ${msg.slot} (${data.length} frames)`);
          this._refreshHeap();
          this._heapF32.set(data, ptr >> 2);
          this._e.soloman_web_load_staged_sample(msg.slot, data.length, sampleRate);
          this._refreshHeap();
          break;
        }
      }
    } catch (error) {
      this._fail(error);
    }
  }

  _fail(error) {
    if (this._failed) return;
    this._failed = true;
    this._ok = false;
    try {
      this.port.postMessage({
        t: 'error',
        message: (error && error.message) || String(error),
        stack: (error && error.stack) || null,
      });
    } catch (_) { /* port gone — nothing left to report to */ }
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const left = out[0];
    const right = out.length > 1 ? out[1] : null;
    if (!this._ok) return true; // failed or not ready: emit silence, stay alive

    try {
      const frames = Math.min(left.length, this._maxFrames);

      // Count-in: engine stays silent while beat clicks play; push TRANSPORT_PLAY on completion
      // so the downbeat lands at the first block after the count (≤ one quantum early).
      if (this._countIn) {
        const ci = this._countIn;
        while (ci.clicked < ci.beats && ci.clicked * ci.framesPerBeat < ci.frame + frames) {
          this._startClick(ci.clicked === 0);
          ci.clicked++;
        }
        ci.frame += frames;
        if (ci.frame >= ci.beats * ci.framesPerBeat) {
          this._countIn = null;
          this._e.soloman_web_push(CMD_TRANSPORT_PLAY, 0, 0, 0, 0, 0, 0, 0, 0);
        }
      }

      this._e.soloman_web_render(frames);
      this._refreshHeap();
      const l = this._leftPtr >> 2;
      const r = this._rightPtr >> 2;
      left.set(this._heapF32.subarray(l, l + frames));
      if (right) right.set(this._heapF32.subarray(r, r + frames));
      for (let ch = 2; ch < out.length; ch++) out[ch].fill(0);

      // Snapshot: read once per block; forward to the UI only on movement (or a slow peak tick).
      this._e.soloman_web_snapshot();
      const playing = this._e.soloman_web_snap_playing();
      const step = this._e.soloman_web_snap_step();
      const loop = this._e.soloman_web_snap_loop();

      // Metronome: click on quarter-note steps (block-granular, follows engine swing/BPM).
      if (this._metronome && playing) {
        if (step !== this._lastStep && step % 4 === 0) this._startClick(step === 0);
      }
      this._mixClicks(left, right, frames);

      // .wav capture: transfer a copy of the final block (post-mix) to the host for RIFF assembly.
      if (this._capturing) {
        const l = left.slice(0, frames);
        const r = right ? right.slice(0, frames) : l.slice();
        this.port.postMessage({ t: 'pcm', l: l.buffer, r: r.buffer }, [l.buffer, r.buffer]);
      }

      this._blockCounter++;
      const moved = playing !== this._lastPlaying || step !== this._lastStep || loop !== this._lastLoop;
      if (moved || this._blockCounter >= SNAPSHOT_INTERVAL_BLOCKS) {
        this._blockCounter = 0;
        this._lastPlaying = playing;
        this._lastStep = step;
        this._lastLoop = loop;
        this.port.postMessage({
          t: 'snapshot',
          playing,
          step,
          loop,
          peak: this._e.soloman_web_snap_peak(),
          countingIn: this._countIn !== null,
          // AudioContext time for the rendered block. The main-thread host maps this through
          // getOutputTimestamp() so UI snapshots land when the block reaches the speaker.
          audioTime: currentTime,
        });
      }
    } catch (error) {
      left.fill(0);
      if (right) right.fill(0);
      this._fail(error);
    }
    return true;
  }
}

registerProcessor('soloman-engine', SolomanEngineProcessor);
