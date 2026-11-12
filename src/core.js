import { PLANETS } from './data.js';

export const DEFAULTS = Object.freeze({ capacity: 200, occupiedKg: 5, emptyKg: 2, stableMs: 1800, spreadKg: 0.3, driftKg: 0.15, emptyMs: 1200, staleMs: 2500, waitMs: 45000 });

/** Pure measurement and journey controller. Time must be monotonic milliseconds. */
export class Exhibit {
  constructor(config = {}) {
    this.config = { ...DEFAULTS, ...config };
    this.state = 'idle'; this.mass = null; this.planet = 0;
    this.samples = []; this.lastAt = null; this.reading = null;
    this.emptySince = null; this.empty = false; this.phaseAt = 0;
    this.progress = 0; this.fault = ''; this.lastButtonAt = -Infinity;
    this.mustClear = false;
  }
  press(now, direction = 'next') {
    if (now - this.lastButtonAt < 450) return;
    this.lastButtonAt = now;
    if (direction === 'previous') {
      if (this.state === 'journey' && this.planet > 0) { this.planet--; this.phaseAt = now; }
      else if (this.state === 'results') { this.state = 'journey'; this.planet = PLANETS.length - 1; this.phaseAt = now; }
      return;
    }
    if (this.state === 'idle' && !this.fault) {
      this.state = 'weighing'; this.phaseAt = now; this.samples = []; this.progress = 0;
      // A new visitor must always begin on an empty, checked platform.
      this.mustClear = !this.empty;
    } else if (this.state === 'journey') this.next(now);
    else if (this.state === 'results') this.finish(now);
  }
  next(now) {
    if (this.state !== 'journey') return;
    if (this.planet < PLANETS.length - 1) this.planet++;
    else this.state = 'results';
    this.phaseAt = now;
  }
  finish(now) {
    this.state = 'clearing'; this.mass = null; this.samples = []; this.progress = 0; this.phaseAt = now;
  }
  invalidate(reason) {
    this.fault = reason; this.samples = []; this.progress = 0; this.empty = false; this.emptySince = null;
    if (this.state === 'weighing') this.mustClear = true;
  }
  sample(kg, now, valid = true) {
    if (!valid || !Number.isFinite(kg) || kg < -1 || kg > this.config.capacity) {
      this.invalidate(kg > this.config.capacity ? 'Scale capacity exceeded. Please step off.' : 'Scale reading unavailable. Please ask a teacher.'); return;
    }
    const gap = this.lastAt !== null && now - this.lastAt > 350;
    if (gap) { this.samples = []; this.emptySince = null; this.empty = false; }
    this.lastAt = now; this.reading = Math.max(0, kg); this.fault = '';
    if (kg < this.config.emptyKg) {
      this.emptySince ??= now;
      this.empty = now - this.emptySince >= this.config.emptyMs;
      if (this.empty) this.mustClear = false;
    } else if (kg >= this.config.occupiedKg) { this.empty = false; this.emptySince = null; }
    else { this.empty = false; this.emptySince = null; }
    if (this.state === 'clearing' && this.empty) { this.state = 'idle'; this.phaseAt = now; }
    if (this.state !== 'weighing') return;
    if (this.mustClear || kg < this.config.occupiedKg) { this.samples = []; this.progress = 0; return; }
    this.samples.push({ kg, at: now });
    while (this.samples.length && now - this.samples[0].at > this.config.stableMs + 150) this.samples.shift();
    const span = now - this.samples[0].at;
    const values = this.samples.map(s => s.kg);
    const spread = Math.max(...values) - Math.min(...values);
    const half = Math.floor(values.length / 2);
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const drift = half > 0 ? Math.abs(mean(values.slice(0, half)) - mean(values.slice(half))) : Infinity;
    const stable = spread <= this.config.spreadKg && drift <= this.config.driftKg;
    this.progress = stable ? Math.min(1, span / this.config.stableMs) : 0;
    if (!stable) { this.samples = [{ kg, at: now }]; return; }
    if (span >= this.config.stableMs && values.length >= 10) {
      this.mass = Math.round(mean(values) * 10) / 10;
      this.state = 'journey'; this.planet = 0; this.phaseAt = now; this.samples = []; this.progress = 1;
    }
  }
  tick(now) {
    if (this.lastAt === null || now - this.lastAt > this.config.staleMs) this.invalidate('Waiting for the scale connection. Please ask a teacher.');
    // Captured planets and results wait indefinitely for the visitor's button.
    if (this.state === 'weighing' && now - this.phaseAt >= this.config.waitMs) this.finish(now);
  }
}

/** Bounded NDJSON parser; oversized lines are discarded until the next newline. */
export class LineParser {
  constructor(onMessage, onError = () => {}) { this.onMessage = onMessage; this.onError = onError; this.buffer = ''; this.dropping = false; }
  push(chunk) {
    for (const char of chunk) {
      if (char === '\n') {
        if (!this.dropping && this.buffer.trim()) {
          try { this.onMessage(JSON.parse(this.buffer)); } catch { this.onError('Invalid JSON'); }
        }
        this.buffer = ''; this.dropping = false;
      } else if (!this.dropping) {
        this.buffer += char;
        if (this.buffer.length > 512) { this.buffer = ''; this.dropping = true; this.onError('Oversized frame'); }
      }
    }
  }
}

/** Validates framing identity, sequence and measurement payload before use. */
export class Protocol {
  constructor() { this.boot = null; this.seq = -1; this.ready = false; }
  accept(message) {
    if (!message || message.v !== 1 || typeof message.boot !== 'string' || !/^[\w-]{1,40}$/.test(message.boot) || !Number.isSafeInteger(message.seq) || message.seq < 0) return null;
    if (message.boot !== this.boot) {
      if (message.type !== 'hello') return null;
      this.boot = message.boot; this.seq = -1; this.ready = false;
    }
    if (message.seq <= this.seq) return null;
    if (message.type === 'hello') {
      if (typeof message.calibrated !== 'boolean') return null;
      this.ready = message.calibrated;
    } else if (message.type === 'measurement') {
      if (!this.ready || typeof message.valid !== 'boolean' || !Number.isFinite(message.kg)) return null;
    } else if (message.type === 'button') {
      if (message.action !== undefined && !['next', 'previous'].includes(message.action)) return null;
    } else if (!['button', 'fault', 'ack'].includes(message.type)) return null;
    this.seq = message.seq;
    return message;
  }
}
