const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(granted = true) {
  const scheduled = [];
  let cancelled = false;
  const notifications = {
    SchedulableTriggerInputTypes: { DATE: 'date' },
    requestPermissionsAsync: async () => ({ status: granted ? 'granted' : 'denied' }),
    cancelAllScheduledNotificationsAsync: async () => { cancelled = true; },
    scheduleNotificationAsync: async request => { scheduled.push(request); },
  };
  const output = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/events/notifications.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: output,
    require: name => name === 'expo-notifications' ? notifications : { Platform: { OS: 'ios' } },
    console: { log() {} }, alert() {},
  });
  return { output, scheduled, cancelled: () => cancelled };
}

test('uses calendar date tuples, names, IDs, and supported date triggers', async () => {
  const h = load();
  await h.output.scheduleAllEventNotifications([{ id: 'event-1', name: 'Hearing', date: [2099, 0, 15], type: 'court', document: 'eviction' }]);
  assert.equal(h.cancelled(), true);
  assert.equal(h.scheduled.length, 2);
  assert.equal(h.scheduled[0].content.title, 'Tomorrow: Hearing');
  assert.equal(h.scheduled[0].content.data.eventId, 'event-1');
  for (const request of h.scheduled) {
    assert.equal(request.trigger.type, 'date');
    assert.equal(request.trigger.date.getFullYear(), 2099);
    assert.equal(request.trigger.date.getMonth(), 0);
  }
  assert.equal(h.scheduled[0].trigger.date.getDate(), 14);
  assert.equal(h.scheduled[1].trigger.date.getDate(), 8);
});

test('permission denial leaves existing scheduled notifications unchanged', async () => {
  const h = load(false);
  await h.output.scheduleAllEventNotifications([]);
  assert.equal(h.cancelled(), false);
  assert.equal(h.scheduled.length, 0);
});
