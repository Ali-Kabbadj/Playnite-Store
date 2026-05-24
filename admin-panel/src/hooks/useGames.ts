import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, Game, Repack, AssignResponse, CreateGameResponse, GameDetail } from '@/types';

export function useGamesList(search: string, status: string, perPage: number, sortBy: string, sortDir: string) {
    return useInfiniteQuery({
        queryKey: ['games', { search, status, perPage, sortBy, sortDir }],
        initialPageParam: 1,
        queryFn: ({ pageParam }) => {
            const params = new URLSearchParams({ status, page: String(pageParam), per_page: String(perPage), sort_by: sortBy, sort_dir: sortDir });
            if (search) params.set('search', search);
            return apiClient.get(`/games?${params}`) as Promise<PaginatedResponse<Game>>;
        },
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.length * perPage;
            return loaded < lastPage.total ? allPages.length + 1 : undefined;
        }
    });
}

export function useGameRepacks(gameId: number | null) {
    return useQuery({
        queryKey: ['games', gameId, 'repacks'],
        queryFn: () => apiClient.get(`/games/${gameId}/repacks`) as Promise<Repack[]>,
        enabled: !!gameId,
    });
}

export function useGameMutations() {
    const queryClient = useQueryClient();

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['repacks'] });
        queryClient.invalidateQueries({ queryKey: ['games'] });
    };

    const assignRepacks = useMutation<AssignResponse, Error, { repackIds: number[]; gameId: number }>({
        mutationFn: ({ repackIds, gameId }) => apiClient.post('/junction/assign', { repack_ids: repackIds, game_id: gameId }) as Promise<AssignResponse>,
        onSuccess: invalidateAll,
    });

    const unassignRepacks = useMutation<AssignResponse, Error, number[]>({
        mutationFn: (repackIds) => apiClient.post('/junction/unassign', { repack_ids: repackIds }) as Promise<AssignResponse>,
        onSuccess: invalidateAll,
    });

    const createGame = useMutation<CreateGameResponse, Error, { name: string; repackIds: number[] }>({
        mutationFn: ({ name, repackIds }) => apiClient.post('/games', { name, repack_ids: repackIds }) as Promise<CreateGameResponse>,
        onSuccess: invalidateAll,
    });

    const deleteGame = useMutation<unknown, Error, number>({
        mutationFn: (id) => apiClient.delete(`/games/${id}`),
        onSuccess: invalidateAll,
    });

    return { assignRepacks, unassignRepacks, createGame, deleteGame };
}

export function usePrefetchGame() {
    const queryClient = useQueryClient();

    return (id: number) => {
        queryClient.prefetchQuery({
            queryKey: ['games', id, 'detail'],
            queryFn: () => apiClient.get(`/games/${id}`) as Promise<GameDetail>,
            staleTime: 5 * 60 * 1000,
        });
        queryClient.prefetchQuery({
            queryKey: ['games', id, 'repacks'],
            queryFn: () => apiClient.get(`/games/${id}/repacks`) as Promise<Repack[]>,
            staleTime: 5 * 60 * 1000,
        });
    };
}

export function useGameDetail(gameId: number | null) {
    return useQuery({
        queryKey: ['games', gameId, 'detail'],
        queryFn: () => apiClient.get(`/games/${gameId}`) as Promise<GameDetail>,
        enabled: !!gameId,
    });
}