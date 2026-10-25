import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setResolvedLocationCoordinates, type LocationData } from '@/slice';
import { hasCoordinates } from '@/utils/lawyerRecommendations';
import { resolveProfileLocation } from '@/utils/resolveProfileLocation';

export function useProfileCoordinates(location: LocationData | null) {
  const dispatch = useDispatch();
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const key = JSON.stringify(location);
  const needsLookup = !!location && !hasCoordinates(location);
  useEffect(() => {
    if (!needsLookup || !location) return;
    let cancelled = false;
    resolveProfileLocation(location).then(coordinates => {
      if (!cancelled) dispatch(setResolvedLocationCoordinates({ expected: location, coordinates }));
    }).catch(() => { if (!cancelled) setFailure(key); });
    return () => { cancelled = true; };
  }, [key, needsLookup, attempt, dispatch]); // key includes every saved location field
  return {
    loading: needsLookup && failure !== key,
    failed: needsLookup && failure === key,
    retry: () => { setFailure(null); setAttempt(value => value + 1); },
  };
}
