import type { LocationData } from '../slice';
import { hasCoordinates } from './lawyerRecommendations';

const pending = new Map<string, Promise<{ latitude: number; longitude: number }>>();
const normalize = (value: string) => value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f.]/g, '').replace(/^city of /, '');
const stateName = (value: string) => normalize(value) === 'ca' ? 'california' : normalize(value);
const usNames = ['us', 'usa', 'united states', 'united states of america'];

export async function resolveProfileLocation(location: LocationData): Promise<{ latitude: number; longitude: number }> {
  if (hasCoordinates(location)) return { latitude: location.latitude, longitude: location.longitude };
  if (![location.city, location.state, location.country].every(value => value?.trim() && !/unknown/i.test(value))) {
    throw new Error('Incomplete profile location');
  }
  const query = new URLSearchParams({ city: location.city, state: location.state, country: location.country,
    format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'en' });
  const us = usNames.includes(normalize(location.country));
  if (us) query.set('countrycodes', 'us');
  const key = query.toString();
  const cached = pending.get(key);
  if (cached) return cached;
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${key}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Location lookup failed');
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid location response');
      const matches = rows.filter(row => {
        const address = row?.address;
        if (!address || row.lat == null || row.lon == null || row.lat === '' || row.lon === '') return false;
        const coordinates = { latitude: Number(row.lat), longitude: Number(row.lon) };
        const city = address.city || address.town || address.village || address.municipality || row.name || '';
        return hasCoordinates(coordinates) && normalize(city) === normalize(location.city)
          && stateName(address.state || '') === stateName(location.state)
          && (us ? address.country_code === 'us' : normalize(address.country || '') === normalize(location.country));
      });
      if (!matches.length) throw new Error('No matching city coordinates');
      return { latitude: Number(matches[0].lat), longitude: Number(matches[0].lon) };
    } finally { clearTimeout(timeout); }
  })();
  pending.set(key, request);
  // Share in-flight/successful lookups (including Strict Mode remounts); allow explicit retries after failures.
  void request.catch(() => { if (pending.get(key) === request) pending.delete(key); });
  if (pending.size > 100) pending.delete(pending.keys().next().value!);
  return request;
}
