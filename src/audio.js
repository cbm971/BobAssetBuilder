/* BOB OKAY'S SOUND — which sound plays for a moment, and the engine that plays it.
 *
 * THIS FILE IS THE GAME'S, NOT THE STUDIO'S. The studio (App.js) is where sounds are uploaded,
 * named, filed and assigned, but the game players get will be its own front end — title, menu,
 * runs, no editor — and it has to play the very same data the very same way. So nothing here
 * knows about React, the editor, or where the bytes are stored: the engine is handed a
 * `loadClip(name)` that returns the file's bytes, and the sound records and the board to read.
 * Swap the storage and everything below still works.
 *
 * THE DATA (all of it saved by the studio as the `sounds` kind, see App.js loadSounds):
 *   a sound   { id, type: "sound", name, category, clip: "<hash>.<ext>", bytes, dur, savedAt }
 *   the board { id: SOUND_BOARD_ID, type: "soundBoard", basic: { jump: soundId, … }, music: soundId }
 *   an asset  asset.sounds = { fire: soundId, hit: soundId, … }   (only the slots it has; see ASSET_SOUND_SLOTS)
 *   a dialogue  dlg.sound = soundId   (looped while a line is said; see talkSeconds)
 * The audio itself is NOT in any record. A clip is a file named by a hash of its bytes, kept
 * beside the records (the reasons, with the measurements, are in CLAUDE-HISTORY.md under Sound).
 *
 * THE RULE (resolveSound): an asset's own sound for the moment, else the basic sound for it,
 * else silence. Nothing has to be filled in; an empty slot simply falls through.
 */

// ── The everyday moments. ONE entry here is one row of "Basic sounds" in the studio and one key
// the play loop can fire — the UI walks this list, so adding a moment is adding a line.
export const SOUND_EVENTS = [
  { key: "jump", label: "Jump", icon: "⤴️" },
  { key: "land", label: "Land", icon: "⤵️" },
  { key: "punch", label: "Punch", icon: "👊" },
  { key: "hurt", label: "Hurt", icon: "🤕" },
  { key: "death", label: "Death", icon: "💀" },
  { key: "pickup", label: "Pickup", icon: "✨" },
  { key: "door", label: "Door", icon: "🚪" },
  { key: "menuClick", label: "Menu click", icon: "🖱️" },
];
export const SOUND_EVENT_KEYS = SOUND_EVENTS.map((e) => e.key);

// ── The moments an ASSET can carry its own sound for, by what the asset is. `basic` is the
// SOUND_EVENTS key that plays when the asset leaves the slot empty (null: nothing does, because
// there is no everyday moment it stands in for — a gunshot is not a punch). A melee weapon's
// swing falls back to the punch, and an enemy's attack, hurt and death to the everyday ones, so
// a new enemy sounds like everyone else until it is given its own voice.
export const ASSET_SOUND_SLOTS = {
  melee: [{ key: "swing", label: "Swing", basic: "punch" }, { key: "hit", label: "Hit", basic: null }],
  ranged: [{ key: "fire", label: "Fire", basic: null }, { key: "hit", label: "Hit", basic: null }],
  throw: [{ key: "throw", label: "Throw", basic: null }, { key: "land", label: "Land", basic: null }],
  enemy: [{ key: "attack", label: "Attack", basic: "punch" }, { key: "hurt", label: "Hurt", basic: "hurt" }, { key: "death", label: "Death", basic: "death" }],
};
// Which of the above an asset has. A weapon by its kind (wtype), an Enemy-creator enemy as an
// enemy; everything else (props, clothes, bodies…) has no sounds of its own.
export const assetSoundSlots = (asset) => {
  if (!asset) return [];
  if (asset.type === "weapon") return ASSET_SOUND_SLOTS[asset.wtype === "ranged" ? "ranged" : asset.wtype === "throw" ? "throw" : "melee"];
  if (asset.type === "enemy") return ASSET_SOUND_SLOTS.enemy;
  return [];
};
// An asset's sounds map with one slot set or cleared. "" clears — an empty slot is the absence of
// the key, never an empty string, so the fallback sees nothing there. Returns a new object.
export const withAssetSound = (sounds, slot, soundId) => {
  const out = { ...(sounds && typeof sounds === "object" ? sounds : {}) };
  if (soundId) out[slot] = soundId; else delete out[slot];
  return out;
};

export const SOUND_BOARD_ID = "soundboard";
export const newSoundBoard = () => ({ id: SOUND_BOARD_ID, type: "soundBoard", name: "Basic sounds", basic: {}, music: "" });
export const isSoundRecord = (r) => !!r && r.type === "sound" && !!r.id;
export const isSoundBoard = (r) => !!r && r.id === SOUND_BOARD_ID;

// THE FALLBACK RULE. `asset` + `slot`: the asset's own sound for this moment; `basic`: the
// everyday moment it falls back to; `board`: the basic sounds; `has(id)`: does that sound still
// exist? A slot pointing at a sound that was deleted falls through as though it were empty —
// deleting a sound must never silence a moment that has a basic sound to play instead.
export const resolveSound = ({ asset, slot, basic, board, has } = {}) => {
  const ok = (id) => !!id && (typeof has !== "function" || has(id));
  const own = asset && slot && asset.sounds && typeof asset.sounds === "object" ? asset.sounds[slot] : null;
  if (ok(own)) return own;
  const b = basic && board && board.basic ? board.basic[basic] : null;
  if (ok(b)) return b;
  return null;
};

// ── A clip's NAME is a hash of its bytes (cyrb53 run with two seeds, 28 hex digits) plus its
// extension. This is the browser's copy of saveKeeperCore.js clipHash — the dev server and the
// keeper are Node and require that one, and the app cannot import it (babel turns a CommonJS file in
// src/ into a module with no exports). A test feeds both the same bytes and requires the same names,
// so the two can never drift; a drift would make every copy reject every file as corrupt.
const cyrb53 = (bytes, seed) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes[i];
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
};
export const clipHash = (bytes) => cyrb53(bytes, 0) + cyrb53(bytes, bytes.length + 1);
const CLIP_NAME_RE = /^[0-9a-f]{28}\.(wav|mp3|ogg)$/;
export const clipNameOk = (name) => typeof name === "string" && CLIP_NAME_RE.test(name);
export const clipMatches = (name, bytes) => clipNameOk(name) && !!bytes && clipHash(bytes) === name.slice(0, 28);

// ── Size. Every clip ever uploaded rides the `saves` branch for good and is downloaded once by
// every copy of the game, so one file is capped. 10 MB is any sound effect and any sensibly
// encoded music track (a 3-minute mp3 at 192 kbps is 4.3 MB); it refuses a minutes-long WAV,
// which is 10 MB a minute. The answer to that is an mp3 or ogg, not a bigger cap.
export const CLIP_MAX_BYTES = 10 * 1024 * 1024;
export const CLIP_EXTS = { wav: "audio/wav", mp3: "audio/mpeg", ogg: "audio/ogg" };
// The extension a picked file is stored under, from its name first and its type second; null for
// anything that is not wav / mp3 / ogg.
export const clipExtOf = (fileName, mime) => {
  const m = /\.([a-z0-9]+)$/i.exec(fileName || "");
  const ext = m ? m[1].toLowerCase() : "";
  if (ext === "wav" || ext === "wave") return "wav";
  if (ext === "mp3") return "mp3";
  if (ext === "ogg" || ext === "oga") return "ogg";
  const t = (mime || "").toLowerCase();
  if (/wav/.test(t)) return "wav";
  if (/mpeg|mp3/.test(t)) return "mp3";
  if (/ogg/.test(t)) return "ogg";
  return null;
};
export const clipMime = (clip) => CLIP_EXTS[(/\.([a-z0-9]+)$/i.exec(clip || "") || [])[1]] || "application/octet-stream";

// ── Hearing what is on screen, not the whole level. 1 inside the view, fading to 0 by half a
// view's width (or height, whichever is larger) past its edge, so a dog barking two screens away
// is silent and one just off the edge is quiet. No view (the studio's ▶ preview, a menu click) is
// full volume.
export const soundGainAt = (x, y, view) => {
  if (!view || typeof x !== "number" || typeof y !== "number") return 1;
  const dx = Math.max(view.x0 - x, 0, x - view.x1), dy = Math.max(view.y0 - y, 0, y - view.y1);
  if (dx <= 0 && dy <= 0) return 1;
  const fade = Math.max(view.x1 - view.x0, view.y1 - view.y0, 1) * 0.5;
  return Math.max(0, 1 - Math.hypot(dx, dy) / fade);
};

// ── A room of fifteen units must not become noise. Three copies of one sound at most: a fourth
// CUTS OFF THE OLDEST copy rather than being dropped, so the newest shot is always heard — a machine
// gun with a one-second gunshot fires ten times a second, and dropping instead of cutting silenced
// seven shots in ten (and, in the first drive, the death that came right after a burst). One started
// within RETRIGGER_MS of another copy IS dropped: fifteen units taking the same blast in the same
// frame are one bang, not fifteen phased on top of each other. A ceiling on everything at once behind
// that, which cuts the oldest sound of all. `voices` is [{ id, at }] of what is still playing.
// Returns { play, steal } — steal is the voice to stop first (or null).
export const MAX_COPIES = 3;
export const MAX_VOICES = 24;
export const RETRIGGER_MS = 50;
export const voicePlan = (voices, id, now) => {
  const list = voices || [];
  let same = 0, oldestSame = null;
  for (const v of list) {
    if (v.id !== id) continue;
    if (now - v.at < RETRIGGER_MS) return { play: false, steal: null };
    same++;
    if (!oldestSame || v.at < oldestSame.at) oldestSame = v;
  }
  if (same >= MAX_COPIES) return { play: true, steal: oldestSame };
  if (list.length >= MAX_VOICES) { let oldest = null; for (const v of list) if (!oldest || v.at < oldest.at) oldest = v; return { play: true, steal: oldest }; }
  return { play: true, steal: null };
};

// ── THE QUIET BEFORE THE SOUND. "All of my audio plays a fraction of a second too late" (Blake,
// 2026-10-10). The play loop fires on the very frame the thing happens, so the late part was IN THE
// FILES: measured on his own clips, the Jump whoosh does not rise above a whisper until 55 ms in,
// the Landing 16 ms — and trimming by ear in Audacity cannot see a run of near-silence that quiet.
// So every clip is trimmed AS IT PLAYS: it starts a hair before the first sample that is really
// sound, whatever the file holds before that. The file is never changed, so nothing is lost and a
// clip trimmed by hand (his Arrow, 0 ms) plays exactly as it did.
//
// "Really sound" is the louder of an absolute floor (about -50 dB, under any room hiss worth
// hearing) and a share of the clip's OWN peak (34 dB under it), so a quiet clip is judged against
// itself and a loud one does not keep its fade-in. The pre-roll keeps the attack whole instead of
// starting mid-wave; the engine also ramps the first 3 ms in, so the cut can never click.
export const ONSET_FLOOR = 0.003;
export const ONSET_OF_PEAK = 0.02;
export const ONSET_PREROLL_S = 0.003;
// channels: the decoded Float32Arrays (an AudioBuffer's getChannelData for each channel). Returns
// the seconds to skip; 0 for a clip that starts loud, is silent throughout, or is not there at all.
export const leadingSilence = (channels, sampleRate) => {
  const chs = (channels || []).filter((d) => d && d.length);
  if (!chs.length || !(sampleRate > 0)) return 0;
  let peak = 0;
  for (const d of chs) for (let i = 0; i < d.length; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > peak) peak = v; }
  const th = Math.max(ONSET_FLOOR, peak * ONSET_OF_PEAK);
  if (peak <= th) return 0; // nothing in it rises above the floor: leave it alone
  let first = Infinity;
  for (const d of chs) for (let i = 0; i < d.length && i < first; i++) if ((d[i] < 0 ? -d[i] : d[i]) > th) { first = i; break; }
  if (first === Infinity) return 0;
  return Math.max(0, first / sampleRate - ONSET_PREROLL_S);
};

// ── DIALOGUE. A conversation can carry a sound (`dlg.sound`, set per dialogue on the 🔊 Sounds
// screen) — a meow for the cat, gibberish for most people — that LOOPS while the line is being
// said. Lines appear whole, there is no typing-out, so "while they are talking" is how long the
// line takes to say: about 18 characters a second (a brisk speaking pace), never under 0.6 s
// ("Hi." is still somebody saying something) and never over 10 s (a paragraph is read, not
// listened to). It also stops the moment the line changes or the conversation ends.
export const TALK_CHARS_PER_S = 18;
export const TALK_MIN_S = 0.6;
export const TALK_MAX_S = 10;
export const talkSeconds = (text) => {
  const n = typeof text === "string" ? text.trim().length : 0;
  if (!n) return 0;
  return Math.min(TALK_MAX_S, Math.max(TALK_MIN_S, n / TALK_CHARS_PER_S));
};
// The sound a conversation talks with: its own, when that sound still exists. There is no
// fallback — a dialogue nobody gave a sound to is silent, the way it always was.
export const dialogueSoundId = (dlg, has) => {
  const id = dlg && typeof dlg.sound === "string" ? dlg.sound : "";
  return id && (typeof has !== "function" || has(id)) ? id : null;
};

// Seconds and bytes the way the library shows them.
export const fmtClipSize = (bytes) => (bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round((bytes || 0) / 1024)) + " KB");
export const fmtClipDur = (s) => (typeof s === "number" && s > 0 ? (s < 10 ? s.toFixed(1) : String(Math.round(s))) + " s" : "");

/* ── THE ENGINE ──────────────────────────────────────────────────────────────────────────────
 * One per page. Sound effects are decoded ONCE into Web Audio buffers and kept; playing one is a
 * buffer source and a gain node, which is what Web Audio is built for (they are one-shot by design
 * and cost next to nothing). Nothing here runs per frame: the play loop calls `moment` / `event`
 * when something HAPPENS, and `setView` once a frame with four numbers.
 *
 * Music streams through ONE <audio> element instead. Decoding a three-minute track into a buffer
 * is ~70 MB of memory for the sake of a loop the element does natively.
 *
 * Browsers keep audio locked until the first click or key. The engine listens for that itself, once,
 * and unlocks silently — there is no prompt, and a sound fired before it is simply not heard.
 */
export const createAudioEngine = ({ loadClip } = {}) => {
  const W = typeof window !== "undefined" ? window : null;
  let ctx = null, master = null;
  const sounds = new Map();      // id -> sound record
  let board = null;
  const buffers = new Map();     // clip -> AudioBuffer, decoded once
  const starts = new Map();      // clip -> seconds of quiet to skip (leadingSilence), measured once at decode
  const pending = new Map();     // clip -> Promise<AudioBuffer|null>
  const failed = new Set();      // clips that would not load or decode — not asked for again this session
  let voices = [];               // [{ id, at, src }]
  let view = null;
  const trace = [];              // the last plays, for anyone checking what fired (see `trace` below)
  const music = { el: null, url: null, clip: null, on: false, playing: false };
  const prev = { el: null, url: null, id: null };   // the studio's ▶ for a long sound (see preview)
  const LONG_PREVIEW_S = 20;
  const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

  // latencyHint "interactive" is the default, written out so nobody "tunes" it: it is the smallest
  // output buffer the device allows (measured on Blake's PC: 10 ms base + 40 ms out). "playback"
  // or "balanced" would trade that away for battery.
  const ensureCtx = () => {
    if (ctx || !W) return ctx;
    const AC = W.AudioContext || W.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC({ latencyHint: "interactive" }); master = ctx.createGain(); master.connect(ctx.destination); } catch { ctx = null; }
    if (ctx) syncAwake();
    return ctx;
  };
  // KEEP THE SOUND CARD AWAKE WHILE A RUN IS GOING. Chrome parks a Web Audio context's output after
  // about half a minute of pure silence (to save power), and the first sound after that has to wait
  // for the output to be opened again — so a jump after a quiet stretch of walking is the one heard
  // late. During play the context is fed a constant one part in a million (-120 dB: below anything
  // a speaker can reproduce, and DC besides), which is not silence as far as Chrome is concerned.
  // ONLY during play: an open audio stream also keeps Windows from sleeping, which is exactly what
  // the parking is for when nobody is playing.
  let awake = null;
  const AWAKE_LEVEL = 1e-6;
  const syncAwake = () => {
    const want = !!(ctx && music.playing);
    if (want && !awake) {
      try {
        if (typeof ctx.createConstantSource !== "function") return;
        const src = ctx.createConstantSource();
        src.offset.value = AWAKE_LEVEL;
        src.connect(ctx.destination); // not through `master`: nothing should ever turn this up
        src.start();
        awake = src;
      } catch { awake = null; }
    } else if (!want && awake) {
      try { awake.stop(); awake.disconnect(); } catch { /* already gone */ }
      awake = null;
    }
  };
  const unlock = () => {
    const c = ensureCtx();
    if (c && c.state === "suspended") { try { c.resume().catch(() => {}); } catch { /* not allowed yet */ } }
    if (music.playing && music.el && music.el.paused) { try { const p = music.el.play(); if (p && p.catch) p.catch(() => {}); } catch { /* still locked */ } }
  };
  if (W && W.addEventListener) {
    for (const ev of ["pointerdown", "keydown", "touchstart"]) W.addEventListener(ev, unlock, { capture: true, passive: true });
  }

  const decode = (clip) => {
    if (!clip || buffers.has(clip) || failed.has(clip)) return Promise.resolve(buffers.get(clip) || null);
    if (pending.has(clip)) return pending.get(clip);
    const p = (async () => {
      try {
        const bytes = loadClip ? await loadClip(clip) : null;
        const c = ensureCtx();
        if (!bytes || !c) { failed.add(clip); return null; }
        // decodeAudioData takes ownership of (detaches) the buffer it is given — hand it a copy so
        // the caller's bytes stay usable.
        const ab = bytes instanceof ArrayBuffer ? bytes.slice(0) : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const buf = await new Promise((res, rej) => { const r = c.decodeAudioData(ab, res, rej); if (r && r.then) r.then(res, rej); });
        let skip = 0;
        try { const chs = []; for (let i = 0; i < buf.numberOfChannels; i++) chs.push(buf.getChannelData(i)); skip = leadingSilence(chs, buf.sampleRate); } catch { skip = 0; }
        starts.set(clip, skip);
        buffers.set(clip, buf);
        return buf;
      } catch (e) {
        failed.add(clip);
        if (typeof console !== "undefined") console.warn("[Bob] sound file " + clip + " could not be played: " + (e && e.message));
        return null;
      } finally { pending.delete(clip); }
    })();
    pending.set(clip, p);
    return p;
  };

  const note = (row) => { trace.push(row); if (trace.length > 200) trace.shift(); };
  const startVoice = (id, gain, info) => {
    const s = sounds.get(id);
    if (!s || !s.clip) return false;
    const t = now();
    // A voice is over when its buffer has run out, read off the clock as well as onended: a
    // source that never reports back (a context that stalled) must not hold its slot for ever,
    // or the copy cap would silence that sound for the rest of the session.
    voices = voices.filter((v) => !v.done && t < v.until);
    const plan = voicePlan(voices, id, t);
    if (!plan.play) { note({ at: t, id, clip: s.clip, gain, heard: false, why: "retrigger", ...info }); return false; }
    const buf = buffers.get(s.clip);
    // Not decoded yet: start the decode and skip THIS play. A sound that arrives late is worse
    // than one that does not play — a jump heard a quarter-second after the jump.
    if (!buf) { decode(s.clip); note({ at: t, id, clip: s.clip, gain, heard: false, why: "decoding", ...info }); return false; }
    const c = ensureCtx();
    if (!c) return false;
    // STILL LOCKED (no click or key yet): nothing is started. A source started on a suspended
    // context is not dropped, it is QUEUED, and every one of them would go off together the moment
    // the first click unlocks it.
    if (c.state !== "running") { note({ at: t, id, clip: s.clip, gain, heard: false, why: "locked", ...info }); return false; }
    if (plan.steal) {
      try { plan.steal.src.stop(); } catch { /* already ended */ }
      plan.steal.done = true;
      voices = voices.filter((v) => v !== plan.steal);
    }
    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      // Start where the sound starts (leadingSilence), with a 3 ms ramp in so the cut is never a click.
      const skip = Math.min(starts.get(s.clip) || 0, Math.max(0, buf.duration - 0.01));
      if (skip > 0) { g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.003); }
      else g.gain.value = gain;
      src.connect(g); g.connect(master);
      const v = { id, at: t, until: t + (buf.duration - skip) * 1000 + 30, done: false, src };
      src.onended = () => { v.done = true; try { g.disconnect(); } catch { /* gone */ } };
      src.start(0, skip);
      voices.push(v);
      note({ at: t, id, clip: s.clip, gain, heard: true, cut: !!plan.steal, skip, ...info });
      return true;
    } catch { return false; }
  };
  // THE TALK LOOP (see talkSeconds): one voice of its own, outside the copy cap — it is a single
  // line being said, not a moment that can stack. It loops the clip from where the sound starts,
  // and its end is scheduled on the audio clock with an 80 ms fade, so nothing has to come back
  // and stop it; a new line or the end of the conversation stops it early (talk(null)).
  const talkVoice = { src: null, g: null, token: 0 };
  const stopTalk = () => {
    talkVoice.token++;
    const { src, g } = talkVoice;
    talkVoice.src = null; talkVoice.g = null;
    if (!src) return;
    try {
      const t0 = ctx.currentTime;
      g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(g.gain.value, t0); g.gain.linearRampToValueAtTime(0, t0 + 0.04);
      src.stop(t0 + 0.05);
    } catch { try { src.stop(); } catch { /* already stopped */ } }
  };
  const startTalk = (id, secs, token) => {
    const s = sounds.get(id);
    const buf = s && buffers.get(s.clip);
    const c = ctx;
    if (!buf || !c || c.state !== "running" || token !== talkVoice.token || !(secs > 0)) return false;
    const skip = Math.min(starts.get(s.clip) || 0, Math.max(0, buf.duration - 0.01));
    const src = c.createBufferSource();
    src.buffer = buf; src.loop = true; src.loopStart = skip; src.loopEnd = buf.duration;
    const g = c.createGain();
    const t0 = c.currentTime, end = t0 + secs, fade = Math.min(0.08, secs / 4);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + 0.003);
    g.gain.setValueAtTime(1, end - fade); g.gain.linearRampToValueAtTime(0, end);
    src.connect(g); g.connect(master);
    src.onended = () => { try { g.disconnect(); } catch { /* gone */ } if (talkVoice.src === src) { talkVoice.src = null; talkVoice.g = null; } };
    src.start(0, skip); src.stop(end);
    talkVoice.src = src; talkVoice.g = g;
    note({ at: now(), id, clip: s.clip, gain: 1, heard: true, talk: true, secs, skip });
    return true;
  };

  const engine = {
    // The library: every sound record (the board is picked out of the same list).
    setLibrary: (records, boardRec) => {
      sounds.clear();
      for (const r of records || []) if (isSoundRecord(r)) sounds.set(r.id, r);
      board = boardRec || (records || []).find(isSoundBoard) || null;
      engine.syncMusic();
    },
    has: (id) => sounds.has(id),
    board: () => board,
    // Decode ahead of need, so the first jump of a run is heard. Takes sound ids.
    preload: (ids) => { for (const id of ids || []) { const s = sounds.get(id); if (s && s.clip) decode(s.clip); } },
    // The camera's rectangle in level pixels, once a frame during play; null outside play.
    setView: (v) => { view = v; },
    // ONE MOMENT: the asset's own sound for `slot`, else the basic one, else nothing (resolveSound).
    // x/y place it in the level for the off-screen fade; leave them out for full volume.
    moment: ({ asset, slot, basic, x, y } = {}) => {
      const id = resolveSound({ asset, slot, basic, board, has: engine.has });
      if (!id) return false;
      const gain = soundGainAt(x, y, view);
      if (gain <= 0.02) return false;
      return startVoice(id, gain, { slot: slot || null, basic: basic || null, asset: asset ? asset.id || null : null });
    },
    // An everyday moment with no asset behind it (a door, a pickup, a menu click).
    event: (key, x, y) => engine.moment({ basic: key, x, y }),
    // The studio's ▶: one sound, full volume, decoded first if it has to be. A LONG one (a music
    // track) is streamed through its own element instead — decoding it would keep tens of MB in
    // memory for the rest of the session just to hear it once — and pressing ▶ on it again stops it.
    preview: async (id) => {
      const s = sounds.get(id);
      if (!s) return false;
      unlock();
      if (prev.el && !prev.el.paused) { try { prev.el.pause(); } catch { /* gone */ } if (prev.id === id) { prev.id = null; return false; } }
      if ((s.dur || 0) > LONG_PREVIEW_S && W && typeof W.Audio === "function") {
        const bytes = loadClip ? await loadClip(s.clip) : null;
        if (!bytes) return false;
        if (!prev.el) prev.el = new W.Audio();
        if (prev.url) { try { URL.revokeObjectURL(prev.url); } catch { /* gone */ } }
        prev.url = URL.createObjectURL(new Blob([bytes], { type: clipMime(s.clip) }));
        prev.el.src = prev.url; prev.id = id;
        try { await prev.el.play(); } catch { return false; }
        note({ at: now(), id, clip: s.clip, gain: 1, heard: true, preview: true, streamed: true });
        return true;
      }
      await decode(s.clip);
      if (ctx && ctx.state === "suspended") { try { await ctx.resume(); } catch { /* still locked */ } }
      return startVoice(id, 1, { preview: true });
    },
    // Play raw bytes once (the uploader's check that a file is really audio), without keeping them.
    decodeBytes: async (bytes) => {
      const c = ensureCtx();
      if (!c) return null;
      const ab = bytes.buffer ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes.slice(0);
      return new Promise((res) => { try { const r = c.decodeAudioData(ab, res, () => res(null)); if (r && r.then) r.then(res, () => res(null)); } catch { res(null); } });
    },
    // MUSIC. `on` is the player's toggle, `playing` is "a run or Playtest is going". The track is
    // the board's `music`. Any change to the three goes through syncMusic, which is the only thing
    // that starts, swaps or stops the element.
    setMusicOn: (on) => { music.on = !!on; engine.syncMusic(); },
    setPlaying: (playing) => { music.playing = !!playing; if (!playing) stopTalk(); syncAwake(); engine.syncMusic(); },
    // A LINE OF DIALOGUE BEING SAID: loop sound `id` for `secs` (talkSeconds), replacing whatever
    // line was talking. talk(null) stops it. A sound not decoded yet starts when it is, provided
    // the same line is still up — a talk loop a beat late is fine, unlike a jump.
    talk: (id, secs) => {
      stopTalk();
      if (!id || !(secs > 0) || !sounds.has(id)) return false;
      const token = talkVoice.token;
      const s = sounds.get(id);
      if (buffers.has(s.clip)) return startTalk(id, secs, token);
      decode(s.clip).then(() => startTalk(id, secs, token));
      return false;
    },
    syncMusic: async () => {
      const s = board && board.music ? sounds.get(board.music) : null;
      const want = music.on && music.playing && s && s.clip ? s.clip : null;
      if (!want) { if (music.el && !music.el.paused) { try { music.el.pause(); } catch { /* gone */ } } return; }
      if (!W || typeof W.Audio !== "function") return;
      if (!music.el) { music.el = new W.Audio(); music.el.loop = true; music.el.preload = "auto"; }
      if (music.clip !== want) {
        const bytes = loadClip ? await loadClip(want) : null;
        if (!bytes) return;
        // The toggle or the track may have changed while the file was being fetched.
        const s2 = board && board.music ? sounds.get(board.music) : null;
        if (!(music.on && music.playing && s2 && s2.clip === want)) return;
        if (music.url) { try { URL.revokeObjectURL(music.url); } catch { /* gone */ } }
        music.url = URL.createObjectURL(new Blob([bytes], { type: clipMime(want) }));
        music.clip = want;
        music.el.src = music.url;
      }
      if (music.el.paused) { try { const p = music.el.play(); if (p && p.catch) p.catch(() => {}); } catch { /* locked until the first input */ } }
    },
    musicState: () => ({ on: music.on, playing: music.playing, clip: music.clip, paused: music.el ? music.el.paused : true }),
    stopAll: () => { voices = []; },
    unlock,
    // What has played, newest last: [{ at, id, clip, gain, slot, basic, asset }]. Read by tests and
    // by anyone checking that a moment fired the clip it should.
    trace: () => trace.slice(),
    state: () => ({ context: ctx ? ctx.state : "none", decoded: [...buffers.keys()], voices: voices.filter((v) => !v.done).length, skips: Object.fromEntries(starts), awake: !!awake, talking: !!talkVoice.src }),
  };
  return engine;
};
