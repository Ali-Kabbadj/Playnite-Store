import { Company } from "./company.type";
import { Genre } from "./genre.type";
import { Platform } from "./platform.type";
import { Repack } from "./repack.type";


export interface Game {
    id: string;
    name: string | null;
    slug: string | null;
    summary: string | null;
    storyline: string | null;
    url: string | null;
    rating: number | null;
    aggregated_rating: number | null;
    cover_url: string | null;
    franchise_id: string | null;
    normalized_name: string | null;
    genres?: Genre[];
    platforms?: Platform[];
    developers?: Company[];
    publishers?: Company[];
    release_dates?: ReleaseDate[];
    screenshots?: Screenshot[];
    videos?: Video[];
    repacks?: Repack[];
    logo_url?: string | null;
}

export interface ReleaseDate {
    id: string;
    platform_id: string | null;
    release_date: number | null;
    release_year: number | null;
    region_name: string | null;
}

export interface Screenshot {
    id: string;
    url: string | null;
}

export interface Video {
    id: string;
    video_id: string | null;
}