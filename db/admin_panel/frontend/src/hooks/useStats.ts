import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Stats } from '@/types';

export function useStats() {
    return useQuery<Stats>({
        queryKey: ['stats'],
        queryFn: () => apiClient.get('/stats'),
    });
}