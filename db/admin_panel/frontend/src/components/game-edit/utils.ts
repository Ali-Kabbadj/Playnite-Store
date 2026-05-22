export const SYSTEM = new Set(["id", "has_repacks", "has_metadata", "has_game", "external_links", "normalized_name", "cover_id", "franchise_id"]);
export const JUNCTION = new Set(["platforms", "genres", "developers", "publishers", "series", "tags"]);
export const LIST = new Set(["media", "files", "mame"]);
export const TEXTAREA = new Set(["description", "description_html", "overview", "summary", "storyline"]);
export const POSTER_COVER = new Set(["poster_url", "cover", "cover_url"]);
export const NUMERIC = new Set(["release_year", "metacritic", "community_rating", "rating", "aggregated_rating", "developer_id", "publisher_id"]);

export function fmt(v: unknown): string {
    if (v === null || v === undefined) return "";
    return String(v);
}

export function label(key: string): string {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}