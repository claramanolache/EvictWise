import type { LocationData } from '../slice';

export const preferenceKeys = ['lawyerPriorityProximity', 'lawyerPrioritySpecialization', 'lawyerPriorityLanguage', 'lawyerPriorityAffordability'] as const;
export type PreferenceKey = typeof preferenceKeys[number];
export type LawyerWeights = Record<PreferenceKey, number>;
export const defaultLawyerWeights: LawyerWeights = Object.fromEntries(preferenceKeys.map(key => [key, 5])) as LawyerWeights;
export const lawyerNeeds = ['eviction defense', 'tenant counseling', 'fair housing', 'mediation'] as const;
export type LawyerNeed = typeof lawyerNeeds[number];
export interface LawyerProfile { weights: LawyerWeights; needs?: LawyerNeed[]; /** Legacy single selection. */ need?: LawyerNeed }
export const defaultLawyerProfile: LawyerProfile = { weights: defaultLawyerWeights, needs: ['eviction defense'] };
export interface Organization {
  testPriceUsd?: number | null; priceFabricatedForTesting?: boolean;
  latitude?: number | null; longitude?: number | null;
  id: string; name: string; counties: string[]; services: string[]; languages: string[];
}
const normalize = (value = '') => value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f.]/g, '').replace(/\s+/g, ' ');
const cityCounties: Record<string, string> = {
  'palo alto': 'santa clara', 'san jose': 'santa clara', 'santa clara': 'santa clara',
  'mountain view': 'santa clara', sunnyvale: 'santa clara', cupertino: 'santa clara',
  milpitas: 'santa clara', 'los altos': 'santa clara', 'los altos hills': 'santa clara',
  saratoga: 'santa clara', campbell: 'santa clara', 'los gatos': 'santa clara',
  'monte sereno': 'santa clara', 'morgan hill': 'santa clara', gilroy: 'santa clara',
  'east palo alto': 'san mateo', 'redwood city': 'san mateo', 'san mateo': 'san mateo',
  'san francisco': 'san francisco', oakland: 'alameda', berkeley: 'alameda', fremont: 'alameda',
};
export function normalizeLawyerProfile(profile?: LawyerProfile): LawyerProfile & { needs: LawyerNeed[] } {
  return {
    weights: Object.fromEntries(preferenceKeys.map(key => {
      const value = profile?.weights?.[key];
      return [key, typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(10, Math.round(value))) : 5];
    })) as LawyerWeights,
    needs: Array.isArray(profile?.needs)
      ? [...new Set(profile.needs.filter(need => lawyerNeeds.includes(need)))]
      : [lawyerNeeds.includes(profile?.need as LawyerNeed) ? profile!.need! : 'eviction defense'],
  };
}

export function hasCoordinates(point: { latitude?: number | null; longitude?: number | null } | null | undefined): point is { latitude: number; longitude: number } {
  return typeof point?.latitude === 'number' && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && typeof point.longitude === 'number' && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

export function distanceMiles(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude))
    * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}

export function hasTestPrice(organization: Organization): boolean {
  return organization.priceFabricatedForTesting === true && typeof organization.testPriceUsd === 'number'
    && Number.isFinite(organization.testPriceUsd) && organization.testPriceUsd >= 0;
}

// Demo scores combine documented matches with explicitly fabricated test prices.
// Unknown fees are never treated as free.
export function rankLawyers<T extends Organization>(organizations: T[], profile: LawyerProfile, location: LocationData | null, language: string) {
  const { weights, needs } = normalizeLawyerProfile(profile);
  const usesTestPrices = organizations.some(hasTestPrice);
  const country = normalize(location?.country), state = normalize(location?.state);
  const knownCountry = !!country && country !== 'unknown';
  const us = ['us', 'usa', 'united states', 'united states of america'].includes(country);
  const california = us && ['ca', 'california'].includes(state);
  const outside = knownCountry && (!us || (!!state && state !== 'unknown' && !california));
  const mapped = california ? cityCounties[normalize(location?.city).replace(/^city of /, '')] : undefined;
  const explicit = normalize(location?.county).replace(/ county$/, '');
  const conflict = !!(mapped && explicit && mapped !== explicit);
  const county = california && !conflict ? explicit || mapped : undefined;
  const languageNames: Record<string, string> = { en: 'english', es: 'spanish', vi: 'vietnamese' };
  const requested = normalize(language).split(/[-_]/)[0]!;
  const languageName = languageNames[requested] || normalize(language);
  return organizations.map(organization => {
    const coverage: 'match' | 'outside' | 'unknown' = outside ? 'outside' : county
      ? organization.counties.some(value => normalize(value) === county) ? 'match' : 'outside' : 'unknown';
    const matchedServices = needs.filter(need => organization.services.some(value => normalize(value) === need));
    const serviceMatch = matchedServices.length > 0;
    const serviceFraction = needs.length ? matchedServices.length / needs.length : 0;
    const languageMatch = organization.languages.some(value => normalize(value) === languageName);
    const miles = hasCoordinates(location) && hasCoordinates(organization) ? distanceMiles(location, organization) : null;
    // Continuous distance score: 100% at zero miles, 50% at 25, 25% at 75.
    // Unknown office locations earn no distance points; missing user location disables this factor for everyone.
    const proximity = miles === null ? 0 : 1 / (1 + miles / 25);
    // Use the same denominator for every provider; missing language data earns no documented-match points.
    const denominator = (needs.length ? weights.lawyerPrioritySpecialization : 0) + (language ? weights.lawyerPriorityLanguage : 0)
      + (hasCoordinates(location) ? weights.lawyerPriorityProximity : 0)
      + (usesTestPrices ? weights.lawyerPriorityAffordability : 0);
    const points = serviceFraction * weights.lawyerPrioritySpecialization
      + (languageMatch ? weights.lawyerPriorityLanguage : 0)
      + proximity * weights.lawyerPriorityProximity
      + (hasTestPrice(organization) ? weights.lawyerPriorityAffordability / (1 + organization.testPriceUsd! / 100) : 0);
    return { organization, coverage, serviceMatch, matchedServices, languageMatch, distanceMiles: miles, rawScore: denominator ? 100 * points / denominator : 0, score: denominator ? Math.round(100 * points / denominator) : 0 };
  }).sort((a, b) => b.rawScore - a.rawScore || a.organization.name.localeCompare(b.organization.name));
}
