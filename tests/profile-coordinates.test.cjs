const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(`src/${file}`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name), URLSearchParams, AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}
const ranking = load('utils/lawyerRecommendations.ts');
const location = { city: 'Palo Alto', state: 'CA', country: 'USA' };
const row = { lat: '37.4443293', lon: '-122.1598465', address: { city: 'Palo Alto', state: 'California', country_code: 'us' } };
const resolver = fetch => load('utils/resolveProfileLocation.ts', { './lawyerRecommendations': ranking }, { fetch }).resolveProfileLocation;
test('legacy location text resolves once, and yields distances to mapped SQL offices', async () => {
  let calls = 0;
  const resolve = resolver(async url => { calls++; assert.ok(url.includes('city=Palo+Alto')); return { ok: true, json: async () => [row] }; });
  const [a, b] = await Promise.all([resolve(location), resolve(location)]);
  assert.equal(calls, 1);
  assert.equal(a.latitude, 37.4443293);
  assert.equal(a.longitude, b.longitude);
  const ranked = ranking.rankLawyers(require('../src/data/lawyers.json'), ranking.defaultLawyerProfile, { ...location, ...a }, 'en');
  assert.ok(ranked.find(item => item.organization.id === 'law-foundation-silicon-valley').distanceMiles > 0);
  assert.equal(ranked.filter(item => item.distanceMiles !== null).length, 5);
});
test('existing GPS coordinates skip network and failed lookups can retry', async () => {
  let calls = 0;
  const resolve = resolver(async () => { calls++; return { ok: calls > 1, json: async () => [row] }; });
  assert.equal((await resolve({ ...location, latitude: 0, longitude: 0 })).latitude, 0);
  assert.equal(calls, 0);
  await assert.rejects(resolve(location));
  assert.equal((await resolve(location)).longitude, Number(row.lon));
  assert.equal(calls, 2);
});
test('wrong city, state, country and invalid coordinates are rejected', async () => {
  for (const invalid of [
    { ...row, address: { ...row.address, city: 'San Jose' } },
    { ...row, address: { ...row.address, state: 'Texas' } },
    { ...row, address: { ...row.address, country_code: 'ca' } },
    { ...row, lat: null }, { ...row, lon: '' }, { ...row, lat: '91' },
  ]) await assert.rejects(resolver(async () => ({ ok: true, json: async () => [invalid] }))(location));
});
test('coordinate migration preserves profile fields and refuses obsolete responses', () => {
  const { default: reducer, setLocation, setResolvedLocationCoordinates } = load('slice.ts', { '@/constants/assistantAI/prompt': { initialMessage: {} } });
  let state = reducer(undefined, setLocation({ ...location, county: 'Santa Clara', zipCode: '94301' }));
  const original = state.location;
  const action = setResolvedLocationCoordinates({ expected: original, coordinates: { latitude: 37.44, longitude: -122.15 } });
  state = reducer(state, action);
  assert.equal(state.location.latitude, 37.44);
  assert.equal(state.location.zipCode, '94301');
  state = reducer(state, setLocation({ ...location, city: 'San Jose' }));
  state = reducer(state, action);
  assert.equal(state.location.city, 'San Jose');
  assert.equal(state.location.latitude, undefined);
});
test('hook waits for legacy coordinates, persists success, and discards obsolete lookups', async () => {
  const slots = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, j) => d !== slots[i].deps[j])) { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; } },
  };
  const requests = [], actions = [];
  const dispatch = action => actions.push(action);
  const { useProfileCoordinates } = load('hooks/useProfileCoordinates.ts', {
    react, 'react-redux': { useDispatch: () => dispatch },
    '@/slice': { setResolvedLocationCoordinates: payload => ({ payload }) },
    '@/utils/lawyerRecommendations': ranking,
    '@/utils/resolveProfileLocation': { resolveProfileLocation: place => new Promise(resolve => requests.push({ place, resolve })) },
  });
  const render = place => { cursor = 0; return useProfileCoordinates(place); };
  assert.equal(render(location).loading, true);
  const next = { ...location, city: 'San Jose' };
  render(next);
  requests[0].resolve({ latitude: 37.44, longitude: -122.15 });
  await new Promise(setImmediate);
  assert.equal(actions.length, 0);
  requests[1].resolve({ latitude: 37.33, longitude: -121.89 });
  await new Promise(setImmediate);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].payload.expected.city, 'San Jose');
  assert.equal(render({ ...next, ...actions[0].payload.coordinates }).loading, false);
});
