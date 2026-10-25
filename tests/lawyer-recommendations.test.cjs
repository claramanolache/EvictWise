const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/lawyerRecommendations.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { rankLawyers, defaultLawyerProfile, normalizeLawyerProfile } = exportsObject;
const organizations = require('../src/data/lawyers.json');
const location = { country: 'USA', state: 'CA', city: 'Palo Alto' };
const rank = (profile = defaultLawyerProfile, place = location, language = 'es') => rankLawyers(organizations, profile, place, language);
test('SQL-exported organizations recommend a documented county, service and language match', () => {
  const results = rank();
  assert.equal(results[0].organization.id, 'law-foundation-silicon-valley');
  assert.equal(results[0].score, 83);
  assert.equal(results[0].distanceMiles, null);
  assert.equal(rank(defaultLawyerProfile, { ...location, city: 'East Palo Alto' }).find(x => x.organization.id === 'legal-aid-san-mateo').coverage, 'match');
});
test('changing specialization and language weights changes ordering immediately', () => {
  const profile = { ...defaultLawyerProfile, needs: ['fair housing'], weights: { ...defaultLawyerProfile.weights, lawyerPriorityLanguage: 1, lawyerPrioritySpecialization: 10 } };
  assert.equal(rank(profile, location, 'vi')[0].organization.id, 'project-sentinel');
  assert.equal(rank({ ...profile, weights: { ...profile.weights, lawyerPriorityLanguage: 10, lawyerPrioritySpecialization: 1 } }, location, 'vi')[0].organization.id, 'law-foundation-silicon-valley');
});
test('unknown languages earn no matches and explicit test prices affect scores', () => {
  assert.ok(rank(defaultLawyerProfile, location, 'fr').every(x => !x.languageMatch));
  assert.notEqual(rank()[0].score, rank({ ...defaultLawyerProfile, weights: { ...defaultLawyerProfile.weights, lawyerPriorityAffordability: 10 } })[0].score);
  assert.equal(rank().find(x => x.organization.id === 'bay-area-legal-aid').languageMatch, false);
});
test('missing or conflicting geography is unconfirmed; non-California locations never match', () => {
  assert.ok(rank(defaultLawyerProfile, null).every(x => x.coverage === 'unknown'));
  assert.ok(rank(defaultLawyerProfile, { ...location, county: 'San Mateo' }).every(x => x.coverage === 'unknown'));
  assert.ok(rank(defaultLawyerProfile, { ...location, state: 'Texas' }).every(x => x.coverage === 'outside'));
  assert.ok(rank(defaultLawyerProfile, { ...location, country: 'Canada' }).every(x => x.coverage === 'outside'));
});
test('old or malformed preferences use safe defaults and bounded integer weights', () => {
  assert.equal(normalizeLawyerProfile().needs.join(','), 'eviction defense');
  const value = normalizeLawyerProfile({ need: 'invalid', weights: { lawyerPriorityLanguage: NaN, lawyerPriorityProximity: 20 } });
  assert.equal(value.weights.lawyerPriorityLanguage, 5);
  assert.equal(value.weights.lawyerPriorityProximity, 10);
  assert.ok(rank(value).every(x => Number.isFinite(x.score)));
});

test('proximity ranks by distance even across county lines', () => {
  const near = { id: 'near', name: 'Near', counties: ['San Francisco'], services: ['eviction defense'], languages: ['English'], latitude: 37.45, longitude: -122.15 };
  const far = { ...near, id: 'far', name: 'Far', counties: ['Santa Clara'], latitude: 38.45 };
  const place = { ...location, latitude: 37.45, longitude: -122.15 };
  const result = rankLawyers([far, near], defaultLawyerProfile, place, 'en');
  assert.equal(result[0].organization.id, 'near');
  assert.equal(result[0].distanceMiles, 0);
  assert.equal(result[0].coverage, 'outside');
  assert.ok(result[1].distanceMiles > 69 && result[1].distanceMiles < 70);
  assert.ok(result[0].score > result[1].score);
});
test('missing, invalid and zero coordinates are handled without invented distances', () => {
  const { hasCoordinates, distanceMiles } = exportsObject;
  assert.equal(hasCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(hasCoordinates({ latitude: NaN, longitude: 10 }), false);
  assert.equal(hasCoordinates({ latitude: 91, longitude: 10 }), false);
  assert.equal(hasCoordinates({ latitude: null, longitude: null }), false);
  const results = rank(defaultLawyerProfile, { ...location, latitude: 37.45, longitude: -122.15 });
  assert.equal(results.find(x => x.organization.id === 'bay-area-legal-aid').distanceMiles, null);
  assert.ok(results.filter(x => x.distanceMiles !== null).length === 5);
  assert.ok(Number.isFinite(distanceMiles({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 })));
});
test('increasing proximity weight can prefer a nearer office over a language match', () => {
  const near = { id: 'near', name: 'Near', counties: [], services: ['eviction defense'], languages: [], latitude: 0, longitude: 0 };
  const far = { ...near, id: 'far', name: 'Far', languages: ['English'], latitude: 10 };
  const place = { ...location, latitude: 0, longitude: 0 };
  const profile = { ...defaultLawyerProfile, weights: { ...defaultLawyerProfile.weights, lawyerPriorityProximity: 10, lawyerPriorityLanguage: 1 } };
  assert.equal(rankLawyers([far, near], profile, place, 'en')[0].organization.id, 'near');
  profile.weights.lawyerPriorityProximity = 1;
  profile.weights.lawyerPriorityLanguage = 10;
  assert.equal(rankLawyers([far, near], profile, place, 'en')[0].organization.id, 'far');
});
test('affordability weight can change recommendations using explicitly fictional prices', () => {
  const cheap = { id: 'cheap', name: 'Cheap', counties: [], services: ['eviction defense'], languages: [], testPriceUsd: 25, priceFabricatedForTesting: true };
  const costly = { ...cheap, id: 'costly', name: 'Costly', languages: ['English'], testPriceUsd: 150 };
  const profile = { ...defaultLawyerProfile, weights: { ...defaultLawyerProfile.weights, lawyerPriorityAffordability: 10, lawyerPriorityLanguage: 1 } };
  assert.equal(rankLawyers([costly, cheap], profile, null, 'en')[0].organization.id, 'cheap');
  profile.weights.lawyerPriorityAffordability = 1;
  profile.weights.lawyerPriorityLanguage = 10;
  assert.equal(rankLawyers([costly, cheap], profile, null, 'en')[0].organization.id, 'costly');
});
test('test prices must be valid and explicitly marked; all supplied prices carry the flag', () => {
  const { hasTestPrice } = exportsObject;
  for (const organization of organizations) assert.equal(hasTestPrice(organization), true);
  for (const price of [null, undefined, -1, NaN, Infinity]) {
    assert.equal(hasTestPrice({ testPriceUsd: price, priceFabricatedForTesting: true }), false);
  }
  assert.equal(hasTestPrice({ testPriceUsd: 25 }), false);
  assert.equal(hasTestPrice({ testPriceUsd: 0, priceFabricatedForTesting: true }), true);
});
test('multiple services award proportional specialization credit without duplicate points', () => {
  const base = { id: 'partial', name: 'Partial', counties: [], services: ['eviction defense'], languages: [] };
  const full = { ...base, id: 'full', name: 'Full', services: ['eviction defense', 'mediation'] };
  const profile = { ...defaultLawyerProfile, needs: ['eviction defense', 'mediation', 'mediation'] };
  const result = rankLawyers([base, full], profile, null, '');
  assert.equal(result[0].organization.id, 'full');
  assert.equal(result[0].score, 100);
  assert.equal(result[1].score, 50);
  assert.equal(result[1].matchedServices.join(','), 'eviction defense');
});
test('legacy selections migrate and empty or unsupported selections never invent a service match', () => {
  assert.equal(normalizeLawyerProfile({ weights: defaultLawyerProfile.weights, need: 'mediation' }).needs.join(','), 'mediation');
  const profile = { ...defaultLawyerProfile, needs: [] };
  assert.equal(normalizeLawyerProfile(profile).needs.length, 0);
  assert.ok(rank(profile).every(item => !item.serviceMatch && Number.isFinite(item.score)));
  assert.equal(normalizeLawyerProfile({ ...profile, needs: ['invalid', 'fair housing', 'fair housing'] }).needs.join(','), 'fair housing');
});
