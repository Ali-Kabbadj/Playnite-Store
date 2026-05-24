import { pool } from '../../db';

export class AdminGameRepository {
    static async getGamesPaginated(search: string, status: string, page: number, perPage: number, sortBy: string, sortDir: string) {
        const allowedSort: Record<string, string> = { id: 'g.id', name: 'g.name', repack_count: 'repack_count' };
        const orderCol = allowedSort[sortBy] || 'g.id';
        const orderDir = sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        const where: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (search) {
            where.push(`g.name ILIKE $${paramIdx++}`);
            params.push(`%${search}%`);
        }
        if (status === 'no_repacks') where.push(`NOT EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.game_id = g.id)`);
        else if (status === 'no_metadata') where.push(`(g.summary IS NULL AND g.cover_url IS NULL)`);

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const countRes = await pool.query(`SELECT COUNT(*) FROM games g ${whereSql}`, params);
        const total = parseInt(countRes.rows[0].count, 10);

        const offset = (page - 1) * perPage;
        params.push(perPage, offset);

        const sql = `
            SELECT g.id, g.name, g.cover_url as poster_url, 
                   (SELECT COUNT(*) FROM game_repacks gr WHERE gr.game_id = g.id)::int as repack_count
            FROM games g ${whereSql}
            ORDER BY ${orderCol} ${orderDir}, g.id LIMIT $${paramIdx++} OFFSET $${paramIdx}
        `;
        const res = await pool.query(sql, params);
        return { rows: res.rows, total };
    }

    static async getGameDetail(gid: number) {
        const gameRes = await pool.query('SELECT * FROM games WHERE id = $1', [gid]);
        if (!gameRes.rows.length) return null;

        const result = gameRes.rows[0];
        result.poster_url = result.cover_url;

        const queries = [
            pool.query(`SELECT p.id, p.name FROM platforms p JOIN game_platforms gp ON gp.platform_id = p.id WHERE gp.game_id = $1 ORDER BY p.name`, [gid]),
            pool.query(`SELECT g.id, g.name FROM genres g JOIN game_genres gg ON gg.genre_id = g.id WHERE gg.game_id = $1 ORDER BY g.name`, [gid]),
            pool.query(`SELECT c.id, c.name FROM companies c JOIN game_companies gc ON gc.company_id = c.id WHERE gc.game_id = $1 AND gc.is_developer = true ORDER BY c.name`, [gid]),
            pool.query(`SELECT c.id, c.name FROM companies c JOIN game_companies gc ON gc.company_id = c.id WHERE gc.game_id = $1 AND gc.is_publisher = true ORDER BY c.name`, [gid]),
            pool.query(`SELECT c.id, c.name FROM collections c JOIN game_collections gc ON gc.collection_id = c.id WHERE gc.game_id = $1 ORDER BY c.name`, [gid]),
            pool.query(`SELECT t.id, t.name FROM themes t JOIN game_themes gt ON gt.theme_id = t.id WHERE gt.game_id = $1 ORDER BY t.name`, [gid]),
            pool.query(`SELECT id, 'artwork' as type, url FROM game_artworks WHERE game_id = $1 UNION ALL SELECT id, 'screenshot' as type, url FROM game_screenshots WHERE game_id = $1`, [gid]),
            pool.query(`SELECT ls.name as source_name, gel.url FROM game_external_links gel JOIN link_sources ls ON gel.link_source_id = ls.id WHERE gel.game_id = $1`, [gid])
        ];

        const [platforms, genres, developers, publishers, series, tags, media, extLinks] = await Promise.all(queries);

        result.platforms = platforms.rows;
        result.genres = genres.rows;
        result.developers = developers.rows;
        result.publishers = publishers.rows;
        result.series = series.rows;
        result.tags = tags.rows;
        result.media = media.rows;

        result.external_links = {};
        extLinks.rows.forEach(r => result.external_links[r.source_name] = r.url);

        return result;
    }

    static async createGame(name: string): Promise<number> {
        const res = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM games');
        const newId = res.rows[0].new_id;
        await pool.query('INSERT INTO games (id, name) VALUES ($1, $2)', [newId, name]);
        return newId;
    }

    static async updateGame(id: number, updates: Record<string, any>): Promise<boolean> {
        const editable = new Set(['name', 'slug', 'summary', 'storyline', 'url', 'rating', 'aggregated_rating', 'cover_url']);
        if (updates.poster_url !== undefined) { updates.cover_url = updates.poster_url; delete updates.poster_url; }
        const validUpdates = Object.entries(updates).filter(([k]) => editable.has(k));
        if (validUpdates.length === 0) return false;

        const setParts = [];
        const params: any[] = [];
        let paramIdx = 1;

        for (const [k, v] of validUpdates) {
            setParts.push(`${k} = $${paramIdx++}`);
            params.push(v !== '' ? v : null);
        }
        params.push(id);

        const sql = `UPDATE games SET ${setParts.join(', ')} WHERE id = $${paramIdx}`;
        const res = await pool.query(sql, params);
        return (res.rowCount ?? 0) > 0;
    }

    static async deleteGame(id: number): Promise<boolean> {
        const res = await pool.query('DELETE FROM games WHERE id = $1', [id]);
        return (res.rowCount ?? 0) > 0;
    }

    static async getGameRepacks(gid: number) {
        const sql = `SELECT r.id, r.title, 'matched' as status FROM repacks r JOIN game_repacks gr ON gr.repack_id = r.id WHERE gr.game_id = $1 ORDER BY r.id`;
        const res = await pool.query(sql, [gid]);
        return res.rows;
    }

    static async updateExternalLinks(gid: number, links: Record<string, string>) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM game_external_links WHERE game_id = $1', [gid]);
            for (const [sourceName, url] of Object.entries(links)) {
                if (!url) continue;
                const sourceRes = await client.query('SELECT id FROM link_sources WHERE name = $1', [sourceName]);
                if (sourceRes.rows.length) {
                    const linkSourceId = sourceRes.rows[0].id;
                    const idRes = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM game_external_links');
                    await client.query('INSERT INTO game_external_links (id, game_id, link_source_id, url) VALUES ($1, $2, $3, $4)', [idRes.rows[0].new_id, gid, linkSourceId, url]);
                }
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async manageMedia(gid: number, mid: number, method: 'DELETE' | 'PUT', url?: string) {
        if (method === 'DELETE') {
            await pool.query('DELETE FROM game_artworks WHERE id = $1 AND game_id = $2', [mid, gid]);
            await pool.query('DELETE FROM game_screenshots WHERE id = $1 AND game_id = $2', [mid, gid]);
            return true;
        }
        await pool.query('UPDATE game_artworks SET url = $1 WHERE id = $2 AND game_id = $3', [url, mid, gid]);
        await pool.query('UPDATE game_screenshots SET url = $1 WHERE id = $2 AND game_id = $3', [url, mid, gid]);
        return true;
    }

    static async addMedia(gid: number, type: string, url: string) {
        const table = type === 'artwork' ? 'game_artworks' : 'game_screenshots';
        const res = await pool.query(`SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM ${table}`);
        const newId = res.rows[0].new_id;
        await pool.query(`INSERT INTO ${table} (id, game_id, url) VALUES ($1, $2, $3)`, [newId, gid, url]);
        return newId;
    }
}