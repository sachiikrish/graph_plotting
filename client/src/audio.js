// ---- Text-to-Speech ----
export function speak(msg) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel(); // interrupt old speech on rapid key presses

  const utterance = new SpeechSynthesisUtterance(msg);
  utterance.rate = 0.85; // Slightly slower speech pace

  window.speechSynthesis.speak(utterance);
}

// ---- Sonification ----
let ctx = null;
export function unlockAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
}

export function quadrantOf(x, y) {
  if (x > 0 && y > 0) return 1;
  if (x < 0 && y > 0) return 2;
  if (x < 0 && y < 0) return 3;
  if (x > 0 && y < 0) return 4;
  return 0; // on an axis
}

const QUADRANT_SOUND = {
  1: { type: "sine", freq: 440, gain: 0.25 },     // smooth, clean
  2: { type: "triangle", freq: 330, gain: 0.25 }, // mellow
  3: { type: "sawtooth", freq: 220, gain: 0.08 }, // bright, sharp (quieter: harsh wave)
  4: { type: "square", freq: 262, gain: 0.08 },   // hollow, retro
};

function tone(type, freq, gain, duration = 0.25, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

// Plays the right cue for a coordinate: origin, axis, or quadrant timbre.
export function playPointTone(x, y) {
  unlockAudio();
  if (x === 0 && y === 0) {
    tone("sine", 1047, 0.3, 0.15);        // origin: distinct high double-beep
    tone("sine", 1047, 0.3, 0.15, 0.2);
    return;
  }
  const q = quadrantOf(x, y);
  if (q === 0) return tone("sine", 600, 0.2, 0.12); // on an axis line
  const s = QUADRANT_SOUND[q];
  tone(s.type, s.freq, s.gain);
}
