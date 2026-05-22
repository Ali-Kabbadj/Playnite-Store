import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, ResourceItem } from '@/types';


export function useResourceList(resource: string, search: string, perPage: number) {
    return useInfiniteQuery({
        queryKey: ['management', resource, { search, perPage }],
        initialPageParam: 1,
        queryFn: ({ pageParam }) => {
            const params = new URLSearchParams({ page: String(pageParam), per_page: String(perPage) });
            if (search) params.set('search', search);
            return apiClient.get(`/${resource}?${params}`) as Promise<PaginatedResponse<ResourceItem>>;
        },
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.length * perPage;
            return loaded < lastPage.total ? allPages.length + 1 : undefined;
        }
    });
}

export function useResourceMutations(resource: string) {
    const queryClient = useQueryClient();

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['management', resource] });

    const create = useMutation<unknown, Error, string>({
        mutationFn: (name) => apiClient.post(`/${resource}`, { name }),
        onSuccess: invalidate,
    });

    const update = useMutation<unknown, Error, { id: number; name: string }>({
        mutationFn: ({ id, name }) => apiClient.put(`/${resource}/${id}`, { name }),
        onSuccess: invalidate,
    });

    const remove = useMutation<unknown, Error, number>({
        mutationFn: (id) => apiClient.delete(`/${resource}/${id}`),
        onSuccess: invalidate,
    });

    return { create, update, remove };
}