/**
 * One-shot procedural audio sting played when an entity catches the player.
 * No assets, no loops — a short noise burst plus a descending tone. The
 * AudioContext must be created/resumed from a user gesture (the click-to-enter),
 * so the caller passes one in.
 */

export function playSting(ctx: AudioContext): void {
  const t = ctx.currentTime;

  // Noise burst with a fast decay.
  const len = Math.floor(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = (1 - i / len) ** 2;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const ng = ctx.createGain();
  ng.gain.value = 0.45;
  noise.connect(ng).connect(ctx.destination);
  noise.start(t);

  // Descending saw tone — the "lunge".
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.5);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(og).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.6);
}
