import { pool } from '../db';
import { Game, Genre, Platform, Company, Repack, RepackUri } from '../types';

export class GameRepository {
    static async getBaseGames(
        limit: number, offset: number, searchQuery?: string, hasRepacks?: boolean,
        genre?: string, platform?: string, publisher?: string, source?: string, sort?: string
    ): Promise<{ games: Game[], total: number }> {

        let sql = `SELECT id, name, slug, summary, storyline, url, rating, aggregated_rating, cover_url, franchise_id, normalized_name FROM games`;
        let countSql = `SELECT COUNT(id) FROM games`;
        const conditions: string[] = [];
        const params: any[] = [];

        if (searchQuery) {
            params.push(`%${searchQuery}%`);
            conditions.push(`name ILIKE $${params.length}`);
        }

        if (hasRepacks) {
            conditions.push(`EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.game_id = games.id)`);
        }

        if (genre) {
            params.push(genre);
            conditions.push(`EXISTS (SELECT 1 FROM game_genres gg JOIN genres g ON g.id = gg.genre_id WHERE gg.game_id = games.id AND g.name = $${params.length})`);
        }

        if (platform) {
            params.push(platform);
            conditions.push(`EXISTS (SELECT 1 FROM game_platforms gp JOIN platforms p ON p.id = gp.platform_id WHERE gp.game_id = games.id AND p.name = $${params.length})`);
        }

        if (source) {
            params.push(source);
            conditions.push(`EXISTS (SELECT 1 FROM game_repacks gr JOIN repacks r ON r.id = gr.repack_id WHERE gr.game_id = games.id AND r.source_id::text = $${params.length})`);
        }

        if (conditions.length > 0) {
            const whereClause = ` WHERE ` + conditions.join(' AND ');
            sql += whereClause;
            countSql += whereClause;
        }

        if (sort === 'title_asc') sql += ` ORDER BY name ASC`;
        else if (sort === 'title_desc') sql += ` ORDER BY name DESC`;
        else if (sort === 'date_asc') sql += ` ORDER BY (SELECT MAX(release_date) FROM game_release_dates grd WHERE grd.game_id = games.id) ASC NULLS LAST`;
        else if (sort === 'date_desc') sql += ` ORDER BY (SELECT MAX(release_date) FROM game_release_dates grd WHERE grd.game_id = games.id) DESC NULLS LAST`;
        else if (sort === 'upload_asc') sql += ` ORDER BY (SELECT MAX(r.upload_date) FROM game_repacks gr JOIN repacks r ON r.id = gr.repack_id WHERE gr.game_id = games.id) ASC NULLS LAST`;
        else if (sort === 'upload_desc') sql += ` ORDER BY (SELECT MAX(r.upload_date) FROM game_repacks gr JOIN repacks r ON r.id = gr.repack_id WHERE gr.game_id = games.id) DESC NULLS LAST`;
        else sql += ` ORDER BY id DESC`;

        params.push(limit, offset);
        sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const [gamesRes, countRes] = await Promise.all([
            pool.query(sql, params),
            pool.query(countSql, params.slice(0, -2))
        ]);

        return { games: gamesRes.rows, total: parseInt(countRes.rows[0].count, 10) };
    }

    static async getArtworksForGame(gameId: string) {
        const sql = `SELECT id, url FROM game_artworks WHERE game_id = $1`;
        const res = await pool.query(sql, [gameId]);
        return res.rows;
    }

    static async getAllSources() {
        const sql = `SELECT id, title as name FROM sources ORDER BY title ASC`;
        const res = await pool.query(sql);
        return res.rows;
    }

    static async getGenresForGames(gameIds: string[]): Promise<{ game_id: string, genre: Genre }[]> {
        if (!gameIds.length) return [];
        const sql = `
            SELECT gg.game_id, g.id, g.name
            FROM game_genres gg
            JOIN genres g ON gg.genre_id = g.id
            WHERE gg.game_id = ANY($1::bigint[])
        `;
        const res = await pool.query(sql, [gameIds]);
        return res.rows.map(row => ({
            game_id: row.game_id,
            genre: { id: row.id, name: row.name }
        }));
    }

    static async getPlatformsForGames(gameIds: string[]): Promise<{ game_id: string, platform: Platform }[]> {
        if (!gameIds.length) return [];
        const sql = `
            SELECT gp.game_id, p.id, p.name, p.abbreviation, p.generation, p.logo_url, p.platform_type_name
            FROM game_platforms gp
            JOIN platforms p ON gp.platform_id = p.id
            WHERE gp.game_id = ANY($1::bigint[])
        `;
        const res = await pool.query(sql, [gameIds]);
        return res.rows.map(row => ({
            game_id: row.game_id,
            platform: {
                id: row.id,
                name: row.name,
                abbreviation: row.abbreviation,
                generation: row.generation,
                logo_url: row.logo_url,
                platform_type_name: row.platform_type_name
            }
        }));
    }

    static async getCompaniesForGames(gameIds: string[]): Promise<{ game_id: string, company: Company, is_developer: boolean, is_publisher: boolean }[]> {
        if (!gameIds.length) return [];
        const sql = `
            SELECT gc.game_id, c.id, c.name, gc.is_developer, gc.is_publisher
            FROM game_companies gc
            JOIN companies c ON gc.company_id = c.id
            WHERE gc.game_id = ANY($1::bigint[])
        `;
        const res = await pool.query(sql, [gameIds]);
        return res.rows.map(row => ({
            game_id: row.game_id,
            company: { id: row.id, name: row.name },
            is_developer: row.is_developer,
            is_publisher: row.is_publisher
        }));
    }

    static async getRepacksForGames(gameIds: string[]): Promise<{ game_id: string, repack: Repack }[]> {
        if (!gameIds.length) return [];
        const sql = `
            SELECT gr.game_id, r.*, 
                   s.id as source_id, s.title as source_title, s.url as source_url,
                   p.id as provider_id, p.name as provider_name, p.logo as provider_logo, p.url as provider_url
            FROM game_repacks gr
            JOIN repacks r ON gr.repack_id = r.id
            LEFT JOIN sources s ON r.source_id = s.id
            LEFT JOIN providers p ON s.provider_id = p.id
            WHERE gr.game_id = ANY($1::bigint[])
        `;
        const res = await pool.query(sql, [gameIds]);

        if (!res.rows.length) return [];

        const repackIds = res.rows.map(r => r.id);
        const uriSql = `SELECT repack_id, id, uri, type FROM repack_uris WHERE repack_id = ANY($1::int[])`;
        const uriRes = await pool.query(uriSql, [repackIds]);

        const urisMap: Record<number, RepackUri[]> = {};
        uriRes.rows.forEach(row => {
            if (!urisMap[row.repack_id]) urisMap[row.repack_id] = [];
            urisMap[row.repack_id].push({ id: row.id, uri: row.uri, type: row.type });
        });

        return res.rows.map(row => ({
            game_id: row.game_id,
            repack: {
                id: row.id,
                source_id: row.source_id,
                title: row.title,
                file_size: row.file_size,
                upload_date: row.upload_date,
                repack_size: row.repack_size,
                original_size: row.original_size,
                version: row.version,
                languages: row.languages,
                repack_link_source: row.repack_link_source,
                crack_by: row.crack_by,
                description: row.description,
                description_html: row.description_html,
                developer: row.developer,
                source: row.source_id ? {
                    id: row.source_id,
                    title: row.source_title,
                    url: row.source_url,
                    provider: row.provider_id ? {
                        id: row.provider_id,
                        name: row.provider_name,
                        logo: row.provider_logo,
                        url: row.provider_url
                    } : undefined
                } : undefined,
                uris: urisMap[row.id] || []
            }
        }));
    }

    static async getGameById(id: string): Promise<Game | null> {
        const sql = `SELECT id, name, slug, summary, storyline, url, rating, aggregated_rating, cover_url, franchise_id, normalized_name FROM games WHERE id = $1`;
        const res = await pool.query(sql, [id]);
        return res.rows.length ? res.rows[0] : null;
    }

    static async getScreenshotsForGame(gameId: string) {
        const sql = `SELECT id, url FROM game_screenshots WHERE game_id = $1`;
        const res = await pool.query(sql, [gameId]);
        return res.rows;
    }

    static async getVideosForGame(gameId: string) {
        const sql = `SELECT id, video_id FROM game_videos WHERE game_id = $1`;
        const res = await pool.query(sql, [gameId]);
        return res.rows;
    }

    static async getReleaseDatesForGame(gameId: string) {
        const sql = `SELECT id, platform_id, release_date, release_year, region_name FROM game_release_dates WHERE game_id = $1`;
        const res = await pool.query(sql, [gameId]);
        return res.rows;
    }

    static async getAllGenres(): Promise<Genre[]> {
        const sql = `SELECT id, name FROM genres ORDER BY name ASC`;
        const res = await pool.query(sql);
        return res.rows;
    }

    static async getAllPlatforms(): Promise<Platform[]> {
        const sql = `SELECT id, name, abbreviation, generation, logo_url, platform_type_name FROM platforms ORDER BY name ASC`;
        const res = await pool.query(sql);
        return res.rows;
    }

    static async getAllProviders() {
        const sql = `SELECT id, name, logo as logo_url FROM providers ORDER BY name ASC`;
        const res = await pool.query(sql);
        return res.rows;
    }
}