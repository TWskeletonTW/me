const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

const script = readFileSync(require("node:path").join(__dirname, "../script.js"), "utf8");
const gameTimeCode = script.slice(
  script.indexOf("  const gameTimeText"),
  script.indexOf("  // Real audio playback")
);

function openCard(time) {
  let now = Date.parse(time);
  let timerId = 0;
  const timers = new Map();
  const events = new Map();
  const output = {};
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  runInNewContext(gameTimeCode, {
    Date: Clock,
    document: {
      querySelector: () => output,
      addEventListener: (event, callback) => events.set(event, callback),
    },
    setTimeout(callback, delay) {
      timers.set(++timerId, { callback, due: now + delay });
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  return {
    get days() { return parseInt(output.textContent, 10); },
    advance(time, runTimers = true) {
      now = Date.parse(time);
      if (runTimers) {
        for (const [id, timer] of [...timers]) {
          if (timer.due <= now) {
            timers.delete(id);
            timer.callback();
          }
        }
      }
    },
    resume() { events.get("visibilitychange")?.(); },
  };
}

for (const [time, expected] of [
  ["2026-09-13T03:00:00+08:00", 1],
  ["2026-11-17T02:59:59.999+08:00", 65],
  ["2026-11-17T03:00:00+08:00", 66],
  ["2026-11-18T02:59:59.999+08:00", 66],
  ["2026-11-18T03:00:00+08:00", 67],
  ["2026-12-01T03:00:00+08:00", 80],
  ["2027-01-01T03:00:00+08:00", 111],
]) {
  test(`Taiwan 03:00 boundary: ${time} is day ${expected}`, () => {
    assert.equal(openCard(time).days, expected);
  });
}

test("an open card updates at successive Taiwan 03:00 boundaries", () => {
  const card = openCard("2026-11-17T02:59:59.999+08:00");
  card.advance("2026-11-17T03:00:00+08:00");
  assert.equal(card.days, 66);
  card.advance("2026-11-18T02:59:59.999+08:00");
  assert.equal(card.days, 66);
  card.advance("2026-11-18T03:00:00+08:00");
  assert.equal(card.days, 67);
});

test("returning to a suspended tab catches up without a page reload", () => {
  const card = openCard("2026-11-17T12:00:00+08:00");
  card.advance("2026-11-20T04:00:00+08:00", false);
  card.resume();
  assert.equal(card.days, 69);
});
