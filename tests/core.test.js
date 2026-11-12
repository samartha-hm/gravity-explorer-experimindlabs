import test from 'node:test';
import assert from 'node:assert/strict';
import { Exhibit, LineParser, Protocol } from '../src/core.js';
import { equivalent, force, PLANETS } from '../src/data.js';

const feed = (engine, kg, from, to, step = 100) => {
  for (let t = from; t <= to; t += step) {
    engine.sample(typeof kg === 'function' ? kg(t) : kg, t);
    engine.tick(t);
  }
};

function started() {
  const engine = new Exhibit();
  feed(engine, 0, 0, 1500);
  engine.press(1600);
  return engine;
}

function captured() {
  const engine = started();
  feed(engine, 60, 1700, 3800);
  assert.equal(engine.state, 'journey');
  return engine;
}

test('science: 10 destinations, Earth baseline, Moon and Sun values', () => {
  assert.equal(PLANETS.length, 10);
  assert.equal(PLANETS[0].name, 'Earth');
  assert.equal(PLANETS[1].name, 'The Moon');
  assert.equal(PLANETS[2].name, 'The Sun');
  assert.equal(PLANETS[9].name, 'Neptune');

  // 60 kg visitor equivalent weights across all 10 destinations
  assert.equal(equivalent(60, 0), 60); // Earth baseline
  assert.deepEqual(
    PLANETS.map((_, i) => equivalent(60, i).toFixed(1)),
    ['60.0', '9.9', '1677.6', '22.7', '54.3', '22.7', '151.8', '63.9', '54.3', '68.3']
  );
  assert.equal(force(60, 0), 588); // Earth 60 * 9.80
  assert.equal(force(60, 1), 97.2); // Moon 60 * 1.62
  assert.equal(force(60, 2), 16440); // Sun 60 * 274.00
});

test('captures only after a stable time window', () => {
  const e = started();
  feed(e, 60, 1700, 3300);
  assert.equal(e.state, 'weighing');
  feed(e, 60, 3400, 3800);
  assert.equal(e.state, 'journey');
  assert.equal(e.mass, 60);
});

test('realistic small noise is stable', () => {
  const e = started();
  feed(e, t => 60 + Math.sin(t * 0.01) * 0.03, 1700, 4200);
  assert.equal(e.mass, 60);
});

test('movement does not capture', () => {
  const e = started();
  feed(e, t => 60 + Math.sin(t * 0.01) * 1.5, 1700, 9000);
  assert.equal(e.state, 'weighing');
  assert.equal(e.mass, null);
});

test('drifting load cannot capture just because spread is bounded', () => {
  const e = started();
  feed(e, t => 60 + (t - 1700) * 0.00016, 1700, 7000);
  assert.equal(e.mass, null);
});

test('stepping off early resets stability', () => {
  const e = started();
  feed(e, 60, 1700, 2600);
  feed(e, 0, 2700, 3000);
  feed(e, 60, 3100, 4000);
  assert.equal(e.mass, null);
  feed(e, 60, 4100, 5200);
  assert.equal(e.mass, 60);
});

test('booting occupied requires confirmed empty platform', () => {
  const e = new Exhibit();
  feed(e, 60, 0, 1500);
  e.press(1600);
  feed(e, 60, 1700, 5000);
  assert.equal(e.mass, null);
  assert.equal(e.mustClear, true);
  feed(e, 0, 5100, 6500);
  feed(e, 60, 6600, 8700);
  assert.equal(e.mass, 60);
});

test('button presses while weighing do not capture or reset', () => {
  const e = started();
  e.press(2200);
  assert.equal(e.state, 'weighing');
  assert.equal(e.mass, null);
});

test('button debounce advances once', () => {
  const e = captured();
  e.press(4000);
  e.press(4050);
  assert.equal(e.planet, 1);
  e.press(4500);
  assert.equal(e.planet, 2);
});

test('previous moves back without changing the captured mass', () => {
  const e = captured();
  assert.equal(e.planet, 0); // starts at Earth
  e.press(4000, 'next');
  assert.equal(e.planet, 1); // Moon
  e.press(4500, 'next');
  assert.equal(e.planet, 2); // Sun
  e.press(5000, 'previous');
  assert.equal(e.planet, 1); // back to Moon
  assert.equal(e.mass, 60);
  e.press(5500, 'previous');
  assert.equal(e.planet, 0); // back to Earth
  e.press(5550, 'previous');
  assert.equal(e.planet, 0); // stays at Earth
});

test('previous from results returns to Neptune; previous cannot start weighing', () => {
  const idle = new Exhibit();
  idle.press(1000, 'previous');
  assert.equal(idle.state, 'idle');

  const e = captured();
  for (let i = 0; i < 10; i++) e.press(4000 + i * 500);
  assert.equal(e.state, 'results');

  e.press(10000, 'previous');
  assert.equal(e.state, 'journey');
  assert.equal(e.planet, 9); // Neptune is index 9
  assert.equal(e.mass, 60);
});

test('protocol accepts two-button directions and the original next-button frame', () => {
  const p = new Protocol();
  p.accept({ v: 1, boot: 'board', seq: 0, type: 'hello', calibrated: true });
  for (const [seq, action] of [[1, undefined], [2, 'next'], [3, 'previous']]) {
    assert.ok(p.accept({ v: 1, boot: 'board', seq, type: 'button', action }));
  }
  assert.equal(p.accept({ v: 1, boot: 'board', seq: 4, type: 'button', action: 'reset' }), null);
});

test('each planet waits indefinitely until the button is pressed', () => {
  const e = captured();
  let now = 4000;
  for (let i = 0; i < 10; i++) {
    feed(e, 0, now, now + 60000);
    assert.equal(e.state, 'journey');
    assert.equal(e.planet, i);
    now += 60100;
    e.press(now);
    now += 500;
  }
  assert.equal(e.state, 'results');
  assert.equal(e.mass, 60);
});

test('captured mass stays locked when someone else steps on', () => {
  const e = captured();
  feed(e, 90, 3900, 5000);
  assert.equal(e.mass, 60);
});

test('a captured journey can finish after disconnect', () => {
  const e = captured();
  e.tick(8000);
  assert.ok(e.fault);
  assert.equal(e.mass, 60);
  assert.equal(e.state, 'journey');
});

test('results wait for the button before erasing the measurement', () => {
  const e = captured();
  for (let i = 0; i < 10; i++) e.press(e.phaseAt + 1000);
  e.tick(e.phaseAt + 600000);
  assert.equal(e.state, 'results');
  assert.equal(e.mass, 60);
  e.press(e.phaseAt + 601000);
  assert.equal(e.mass, null);
  assert.equal(e.state, 'clearing');
});

test('cannot hand over until platform has been empty long enough', () => {
  const e = captured();
  e.finish(4000);
  feed(e, 60, 4100, 6000);
  assert.equal(e.state, 'clearing');
  feed(e, 0, 6100, 7000);
  assert.equal(e.state, 'clearing');
  feed(e, 0, 7100, 7500);
  assert.equal(e.state, 'idle');
});

test('low transient load never counts as clear or occupied', () => {
  const e = started();
  feed(e, 3, 1700, 6000);
  assert.equal(e.empty, false);
  assert.equal(e.mass, null);
});

test('overload and invalid numeric readings cannot capture', () => {
  for (const kg of [201, NaN, Infinity, -4]) {
    const e = started();
    feed(e, kg, 1700, 5000);
    assert.equal(e.mass, null);
    assert.ok(e.fault);
  }
});

test('invalid sensor status cannot capture', () => {
  const e = started();
  e.sample(60, 1700, false);
  assert.ok(e.fault);
  assert.equal(e.mustClear, true);
});

test('stale samples discard partial capture and require clear', () => {
  const e = started();
  feed(e, 60, 1700, 2600);
  e.tick(5400);
  assert.ok(e.fault);
  feed(e, 60, 5500, 9000);
  assert.equal(e.mass, null);
});

test('a sample gap cannot bridge a stability window', () => {
  const e = started();
  feed(e, 60, 1700, 2600);
  feed(e, 60, 3700, 4400);
  assert.equal(e.mass, null);
});

test('occupancy timeout returns to clearing without a measurement', () => {
  const e = started();
  feed(e, 0, 1700, 47000);
  assert.equal(e.mass, null);
  assert.ok(['clearing', 'idle'].includes(e.state));
});

test('parser handles split frames, CRLF and multiple lines', () => {
  const messages = [];
  const p = new LineParser(m => messages.push(m));
  p.push('{"v":');
  p.push('1}\r\n{"v":2}\n');
  assert.deepEqual(messages, [{ v: 1 }, { v: 2 }]);
});

test('parser drops oversized lines and recovers at newline', () => {
  const messages = [], errors = [];
  const p = new LineParser(m => messages.push(m), e => errors.push(e));
  p.push('x'.repeat(1000));
  p.push('\n{"ok":true}\n');
  assert.equal(errors.length, 1);
  assert.deepEqual(messages, [{ ok: true }]);
});

test('malformed JSON does not break following messages', () => {
  const messages = [];
  const p = new LineParser(m => messages.push(m));
  p.push('{bad}\nnull\n');
  assert.deepEqual(messages, [null]);
});

const msg = (type, seq, extra = {}) => ({ v: 1, boot: 'board-1', seq, type, ...extra });

test('protocol requires a calibrated handshake before measurements', () => {
  const p = new Protocol();
  assert.equal(p.accept(msg('measurement', 1, { kg: 60, valid: true })), null);
  p.accept(msg('hello', 2, { calibrated: false }));
  assert.equal(p.accept(msg('measurement', 3, { kg: 60, valid: true })), null);
  p.accept(msg('hello', 4, { calibrated: true }));
  assert.ok(p.accept(msg('measurement', 5, { kg: 60, valid: true })));
});

test('protocol rejects duplicates, out-of-order, bad versions and numbers', () => {
  const p = new Protocol();
  p.accept(msg('hello', 0, { calibrated: true }));
  assert.ok(p.accept(msg('button', 2)));
  for (const bad of [
    msg('button', 2),
    msg('button', 1),
    { ...msg('button', 3), v: 2 },
    msg('measurement', 4, { kg: '60', valid: true }),
    msg('measurement', 4, { kg: Infinity, valid: true }),
    null
  ]) {
    assert.equal(p.accept(bad), null);
  }
});

test('a new device boot needs a new hello', () => {
  const p = new Protocol();
  p.accept(msg('hello', 10, { calibrated: true }));
  assert.equal(p.accept({ ...msg('button', 0), boot: 'board-2' }), null);
  assert.ok(p.accept({ ...msg('hello', 0, { calibrated: true }), boot: 'board-2' }));
  assert.ok(p.accept({ ...msg('measurement', 1, { kg: 40, valid: true }), boot: 'board-2' }));
});
