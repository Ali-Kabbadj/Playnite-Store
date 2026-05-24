import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, Repack } from '@/types';

export function useRepacksList(search: string, status: string, perPage: number, sortBy: string, sortDir: string) {
    return useInfiniteQuery({
        queryKey: ['repacks', { search, status, perPage, sortBy, sortDir }],
        initialPageParam: 1,
        queryFn: ({ pageParam }) => {
            const params = new URLSearchParams({ status, page: String(pageParam), per_page: String(perPage), sort_by: sortBy, sort_dir: sortDir });
            if (search) params.set('search', search);
            return apiClient.get(`/repacks?${params}`) as Promise<PaginatedResponse<Repack>>;
        },
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.length * perPage;
            return loaded < lastPage.total ? allPages.length + 1 : undefined;
        }
    });
}