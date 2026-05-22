export interface Repack {
  id: number;
  title: string;
  status: 'matched' | 'orphan';
}

export interface RepackDetail extends Repack {
  source_id: number;
  file_size: string | null;
  upload_date: string | null;
  repack_link_source: string | null;
  cover: string | null;
  crack_by: string | null;
  description: string | null;
  description_html: string | null;
  developer: string | null;
  dlc_info: string | null;
  dubbing: string | null;
  has_multiplayer: number | null;
  has_online: number | null;
  languages: string | null;
  original_size: string | null;
  repack_size: string | null;
  slug: string | null;
  updates: string | null;
  version: string | null;
  view_count: number | null;
  year: number | null;
  youtube_trailer: string | null;
  gamedrive_link: string | null;
  os_requirement: string | null;
  processor_requirement: string | null;
  graphics_requirement: string | null;
  directx_requirement: string | null;
  storage_requirement: string | null;
  has_game: boolean;
}

export interface Game {
  id: number;
  name: string;
  repack_count: number;
  poster_url?: string | null;
}

export interface GameDetail {
  id: number;
  name: string;
  summary: string | null;
  storyline: string | null;
  url: string | null;
  rating: number | null;
  aggregated_rating: number | null;
  cover_url: string | null;
  poster_url: string | null;

  platforms?: Platform[];
  genres?: Genre[];
  developers?: Company[];
  publishers?: Company[];
  series?: Series[];
  tags?: Tag[];
  media?: GameMedia[];
  external_links?: Record<string, string>;

  [key: string]: unknown;
}

export interface Platform { id: number; name: string; }
export interface Genre { id: number; name: string; }
export interface Series { id: number; name: string; slug?: string; }
export interface Tag { id: number; name: string; }
export interface GameMedia { id: number; type: string; url: string; }
export interface ExternalLinks { game_id: number;[source: string]: string | number | null | undefined; }

export interface Stats {
  total_repacks: number;
  matched_repacks: number;
  orphan_repacks: number;
  total_games: number;
  games_no_repacks: number;
  games_no_metadata: number;
}

export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
}

export interface Company { id: number; name: string; game_count?: number; }
export interface CompanyDetail {
  id: number;
  name: string;
  logo: string | null;
  games: { id: number; name: string }[];
}

export interface ResourceItem {
  id: number;
  name: string;
  game_count?: number;
  source_count?: number;
  repack_count?: number;
  provider_name?: string;
}

export type Theme = "dark" | "light";

export interface Provider { id: number; name: string; source_count: number; }
export interface Source { id: number; name: string; provider_name: string; repack_count: number; }

export interface AssignResponse { count: number; }
export interface CreateGameResponse { game_id: number; name: string; linked_repacks: number; }
export interface MoveResponse { count: number; repack_ids: number[]; target_game_id: number; }