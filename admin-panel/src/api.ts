import { apiClient } from './lib/api-client';
import type { PaginatedResponse, GameDetail, Platform, Genre, Series, Tag } from './types';

export function fetchGameDetail(id: number): Promise<GameDetail> {
  return apiClient.get(`/games/${id}`) as Promise<GameDetail>;
}

export function updateGame(id: number, data: Record<string, unknown>): Promise<{ updated: string[]; game_id: number }> {
  return apiClient.put(`/games/${id}`, data) as Promise<{ updated: string[]; game_id: number }>;
}

export function fetchPlatforms(search?: string, page?: number, perPage?: number): Promise<PaginatedResponse<Platform>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', String(page));
  if (perPage) params.set('per_page', String(perPage));
  return apiClient.get(`/platforms?${params}`) as Promise<PaginatedResponse<Platform>>;
}

export function fetchGenresList(search?: string, page?: number, perPage?: number): Promise<PaginatedResponse<Genre>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', String(page));
  if (perPage) params.set('per_page', String(perPage));
  return apiClient.get(`/genres?${params}`) as Promise<PaginatedResponse<Genre>>;
}

export function manageJunctions(gameId: number, relation: string, add: number[], remove: number[]): Promise<{ updated: boolean }> {
  return apiClient.post(`/games/${gameId}/junctions`, { relation, add, remove }) as Promise<{ updated: boolean }>;
}

export function updateExternalLinks(gameId: number, data: Partial<Record<string, string>>): Promise<{ updated: string[]; game_id: number }> {
  return apiClient.put(`/games/${gameId}/external-links`, data) as Promise<{ updated: string[]; game_id: number }>;
}

export function fetchLinkSourceNames(): Promise<string[]> {
  return apiClient.get('/link-source-names') as Promise<string[]>;
}

export function fetchSeries(search?: string, page?: number, perPage?: number): Promise<PaginatedResponse<Series>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', String(page));
  if (perPage) params.set('per_page', String(perPage));
  return apiClient.get(`/series?${params}`) as Promise<PaginatedResponse<Series>>;
}

export function fetchTagsList(search?: string, page?: number, perPage?: number): Promise<PaginatedResponse<Tag>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', String(page));
  if (perPage) params.set('per_page', String(perPage));
  return apiClient.get(`/tags?${params}`) as Promise<PaginatedResponse<Tag>>;
}

export function addGameMedia(gameId: number, type: string, url: string): Promise<{ id: number; game_id: number; type: string; url: string }> {
  return apiClient.post(`/games/${gameId}/media`, { type, url }) as Promise<{ id: number; game_id: number; type: string; url: string }>;
}

export function updateGameMedia(gameId: number, mediaId: number, url: string, type?: string): Promise<{ updated: boolean; id: number; url: string }> {
  return apiClient.put(`/games/${gameId}/media/${mediaId}`, { url, type }) as Promise<{ updated: boolean; id: number; url: string }>;
}

export function removeGameMedia(gameId: number, mediaId: number): Promise<{ deleted: boolean }> {
  return apiClient.delete(`/games/${gameId}/media/${mediaId}`) as Promise<{ deleted: boolean }>;
}