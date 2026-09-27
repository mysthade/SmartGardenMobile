import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/api';

export function useDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
    enabled,
    staleTime: 60_000,
  });
}
