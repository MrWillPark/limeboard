import { useQuery } from '@tanstack/react-query';

import {
  getActivity,
  getCredits,
  getCurrentKey,
  listKeys,
} from '@/lib/openrouter/client';
import { useAuth } from '@/providers/auth-provider';

export function useKeyInfo() {
  const { apiKey } = useAuth();
  return useQuery({
    queryKey: ['openrouter', 'key', apiKey],
    queryFn: () => getCurrentKey(apiKey!),
    enabled: Boolean(apiKey),
  });
}

export function useCredits() {
  const { apiKey } = useAuth();
  return useQuery({
    queryKey: ['openrouter', 'credits', apiKey],
    queryFn: () => getCredits(apiKey!),
    enabled: Boolean(apiKey),
  });
}

export function useActivity() {
  const { apiKey, meta } = useAuth();
  return useQuery({
    queryKey: ['openrouter', 'activity', apiKey],
    queryFn: () => getActivity(apiKey!),
    enabled: Boolean(apiKey) && Boolean(meta?.isManagementKey),
    retry: false,
  });
}

export function useManagedKeys() {
  const { apiKey, meta } = useAuth();
  return useQuery({
    queryKey: ['openrouter', 'keys', apiKey],
    queryFn: () => listKeys(apiKey!),
    enabled: Boolean(apiKey) && Boolean(meta?.isManagementKey),
    retry: false,
  });
}
