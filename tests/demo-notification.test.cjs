const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(os, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/events/demoNotification.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => name === 'react-native' ? { Platform: { OS: os } } : mocks[name], ...globals });
  return exports.sendDemoNotification;
}
test('web requests permission and sends a tagged sample once', async () => {
  const pings = []; let permissions = 0;
  class Notification {
    static permission = 'default';
    static async requestPermission() { permissions++; return 'granted'; }
    constructor(title, options) { pings.push({ title, options }); }
  }
  const send = load('web', {}, { Notification, isSecureContext: true });
  assert.equal(await send('Demo', 'Sample only', () => true), 'sent');
  assert.equal(permissions, 1);
  assert.equal(pings.length, 1);
  assert.equal(pings[0].options.tag, 'evictwise-tutorial-demo');
  assert.equal(pings[0].options.body, 'Sample only');
});
test('denied and unsupported browsers use preview; leaving before permission sends nothing', async () => {
  assert.equal(await load('web')('Demo', 'Sample', () => true), 'preview');
  class Denied { static permission = 'denied'; constructor() { throw Error('must not deliver'); } }
  assert.equal(await load('web', {}, { Notification: Denied, isSecureContext: true })('Demo', 'Sample', () => true), 'denied');
  let active = true;
  class Delayed {
    static permission = 'default';
    static async requestPermission() { active = false; return 'granted'; }
    constructor() { throw Error('must not deliver'); }
  }
  assert.equal(await load('web', {}, { Notification: Delayed, isSecureContext: true })('Demo', 'Sample', () => active), 'cancelled');
});
test('native demo is immediate, audible, foreground-enabled and never clears reminders', async () => {
  const scheduled = []; let handler;
  const send = load('android', {
    './notifications': { requestNotificationPermissions: async notify => { assert.equal(notify, false); return true; } },
    'expo-notifications': {
      setNotificationHandler: value => { handler = value; },
      scheduleNotificationAsync: async value => scheduled.push(value),
      cancelAllScheduledNotificationsAsync: () => { throw Error('must not clear reminders'); },
    },
  });
  assert.equal(await send('Demo', 'Sample only', () => true), 'sent');
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].content.data.demo, true);
  assert.equal(scheduled[0].content.sound, 'default');
  assert.equal(scheduled[0].trigger.channelId, 'default');
  assert.equal((await handler.handleNotification()).shouldShowBanner, true);
  assert.equal((await handler.handleNotification()).shouldPlaySound, true);
});
test('native denied permissions and scheduling errors produce fallback status', async () => {
  const denied = load('ios', { './notifications': { requestNotificationPermissions: async () => false }, 'expo-notifications': {} });
  assert.equal(await denied('Demo', 'Sample', () => true), 'denied');
  const failed = load('ios', { './notifications': { requestNotificationPermissions: async () => true }, 'expo-notifications': { setNotificationHandler() {}, scheduleNotificationAsync: async () => { throw Error('unavailable'); } } });
  assert.equal(await failed('Demo', 'Sample', () => true), 'failed');
});
