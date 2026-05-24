import { pool } from '../../db';

export class AdminRepacksRepository {
    static async getRepacksPaginated(search: string, status: string, page: number, perPage: number, sortBy: string, sortDir: string) {
        const allowedSort: Record<string, string> = { id: 'r.id', title: 'r.title', status: 'match_status' };
        const orderCol = allowedSort[sortBy] || 'r.id';
        const orderDir = sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        const where: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (search) {
            where.push(`r.title ILIKE $${paramIdx++}`);
            params.push(`%${search}%`);
        }
        if (status === 'matched') where.push(`EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = r.id)`);
        else if (status === 'orphan') where.push(`NOT EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = r.id)`);

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const countRes = await pool.query(`SELECT COUNT(*) FROM repacks r ${whereSql}`, params);
        const total = parseInt(countRes.rows[0].count, 10);

        const offset = (page - 1) * perPage;
        params.push(perPage, offset);

        const sql = `
            SELECT r.id, r.title,
                   CASE WHEN EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = r.id) 
                   THEN 'matched' ELSE 'orphan' END as status
            FROM repacks r ${whereSql}
            ORDER BY ${orderCol} ${orderDir}, r.id LIMIT $${paramIdx++} OFFSET $${paramIdx}
        `;
        const rows = await pool.query(sql, params);

        return { rows: rows.rows, total };
    }

    static async getRepackDetail(rid: number) {
        const res = await pool.query('SELECT * FROM repacks WHERE id = $1', [rid]);
        if (!res.rows.length) return null;

        const repack = res.rows[0];
        const hasGameRes = await pool.query('SELECT 1 FROM game_repacks WHERE repack_id = $1 LIMIT 1', [rid]);
        repack.has_game = (hasGameRes.rowCount ?? 0) > 0;
        return repack;
    }

    static async getRepacksByIds(ids: number[]) {
        if (!ids.length) return [];
        const sql = `
            SELECT id, title, 
                   CASE WHEN EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = repacks.id) 
                   THEN 'matched' ELSE 'orphan' END as status 
            FROM repacks WHERE id = ANY($1::int[]) ORDER BY id
        `;
        const res = await pool.query(sql, [ids]);
        return res.rows;
    }
}