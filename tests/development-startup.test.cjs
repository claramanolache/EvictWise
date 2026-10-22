const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

function setup({ ready = [true], env = {} } = {}) {
  const children = [], calls = [], errors = [], signals = {};
  const proc = { env, argv: ['node', 'script', '--web'], execPath: process.execPath, once: (name, fn) => { signals[name] = fn; } };
  const module = { exports: {} };
  function mockRequire(name) {
    if (name === 'node:child_process') return { spawn(command, args, options) {
      const child = new EventEmitter();
      child.kill = signal => { child.killedWith = signal; };
      children.push({ child, command, args, options });
      return child;
    } };
    if (name === 'node:fs') return { existsSync: () => false };
    if (name === 'node:timers/promises') return { setTimeout: async () => {} };
    return require(name);
  }
  mockRequire.resolve = require.resolve;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/start-development.cjs'), 'utf8'), {
    require: mockRequire, module, __dirname: path.join(__dirname, '../scripts'), process: proc,
    AbortSignal, console: { error: message => errors.push(message) },
    fetch: async url => { calls.push(url); return { ok: true, json: async () => ({ ok: ready.length > 1 ? ready.shift() : ready[0] }) }; },
  });
  return { ...module.exports, children, calls, errors, signals, proc };
}

test('starts the missing API before Expo and stops both on Ctrl+C', async () => {
  const h = setup({ ready: [false, true] });
  await h.main();
  assert.equal(h.children.length, 2);
  assert.match(h.children[0].args[0], /server\/index.js$/);
  assert.equal(h.children[0].options.env.PORT, '3001');
  assert.equal(h.children[1].args.at(-1), '--web');
  h.signals.SIGINT();
  assert.ok(h.children.every(({ child }) => child.killedWith === 'SIGTERM'));
  assert.equal(h.proc.exitCode, 0);
});

test('reuses an existing API without managing its process', async () => {
  const h = setup();
  await h.main();
  assert.equal(h.children.length, 1);
  assert.match(h.children[0].args[0], /expo\/bin\/cli$/);
  h.children[0].child.emit('exit', 0);
  assert.equal(h.proc.exitCode, 0);
});

test('unavailable configured API prevents launching Expo with broken translation', async () => {
  const h = setup({ ready: [false], env: { EXPO_PUBLIC_TRANSLATION_API_URL: 'https://translation.example.test/' } });
  await h.main();
  assert.equal(h.children.length, 0);
  assert.equal(h.calls[0], 'https://translation.example.test/api/health');
  assert.equal(h.proc.exitCode, 1);
  assert.match(h.errors[0], /configured translation API is unavailable/);
});

test('API process failure stops Expo and preserves the failing exit status', async () => {
  const h = setup({ ready: [false, true] });
  await h.main();
  h.children[0].child.emit('exit', 1);
  assert.equal(h.children[1].child.killedWith, 'SIGTERM');
  assert.equal(h.proc.exitCode, 1);
});
