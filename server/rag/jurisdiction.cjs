const normalize = value => typeof value === 'string' ? value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\./g,'').replace(/\s+/g,' ') : '';
const countryName = value => ['us','usa','united states','united states of america'].includes(normalize(value)) ? 'us' : normalize(value);
const stateName = value => ['ca','california'].includes(normalize(value)) ? 'california' : normalize(value);
const countyName = value => normalize(value).replace(/ county$/,'');
// Explicit mapping for cities covered by the current California corpus. No ZIP guesses.
const cityCounties = {
  'palo alto':'santa clara','san jose':'santa clara','milpitas':'santa clara','santa clara':'santa clara',
  'mountain view':'santa clara','sunnyvale':'santa clara','cupertino':'santa clara','los altos':'santa clara',
  'los altos hills':'santa clara','saratoga':'santa clara','campbell':'santa clara','los gatos':'santa clara',
  'monte sereno':'santa clara','morgan hill':'santa clara','gilroy':'santa clara',
  'san francisco':'san francisco','berkeley':'alameda','oakland':'alameda','fremont':'alameda',
  'east palo alto':'san mateo','redwood city':'san mateo','san mateo':'san mateo', 'los angeles':'los angeles',
};
function profileJurisdiction(context) {
  let data;
  try { data = JSON.parse(context.slice(context.indexOf('{'))); } catch { return null; }
  // Explicit rental-property location takes precedence over the user's current location.
  const location = data?.rentalLocation || data?.location;
  if (!location || typeof location !== 'object') return null;
  const country = countryName(location.country), state = stateName(location.state);
  if (!country || !state || /unknown/.test(country + state)) return null;
  const city = normalize(location.city).replace(/^city of /,'');
  let county = countyName(location.county);
  const mappedCounty = country === 'us' && state === 'california' ? cityCounties[city] : null;
  if (county && mappedCounty && county !== mappedCounty) return null;
  county ||= mappedCounty || '';
  return { country, state, city: /unknown/.test(city) ? '' : city, county, basis: data.rentalLocation ? 'rentalLocation' : 'savedLocation' };
}
function sourceJurisdiction(row) {
  const header = row.text.startsWith('Source: ') ? row.text.split('\n\n',1)[0] : '';
  return normalize(header.match(/^Jurisdiction: (.+)$/m)?.[1]);
}
function matchesJurisdiction(row, location) {
  if (!location || location.country !== 'us') return false;
  const scope = sourceJurisdiction(row);
  if (['united states','united states — federal','united states - federal','us','usa','federal'].includes(scope)) return true;
  if (location.state !== 'california') return false;
  if (scope === 'california' || scope === 'ca') return true;
  if (scope === 'san francisco bay area') return ['alameda','contra costa','marin','napa','san francisco','san mateo','santa clara','solano','sonoma'].includes(location.county);
  const local = scope.match(/^(.+), (?:california|ca)$/);
  if (!local) return false;
  if (local[1].endsWith(' county')) return !!location.county && countyName(local[1]) === location.county;
  return !!location.city && local[1] === location.city;
}
module.exports = { profileJurisdiction, sourceJurisdiction, matchesJurisdiction };
