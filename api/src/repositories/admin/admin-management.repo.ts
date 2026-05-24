import { pool } from '../../db';

export class AdminManagementRepository {
    private static dbTableMap: Record<string, string> = {
        'series': 'collections', 'tags': 'themes', 'platforms': 'platforms',
        'genres': 'genres', 'link_sources': 'link_sources', 'companies': 'companies',
        'providers': 'providers', 'sources': 'sources'
    };

    static async getLinkSourceNames() {
        const res = await pool.query('SELECT name FROM link_sources ORDER BY name');
        const rows = res.rows.map(r => r.name);
        const defaults = ['steam', 'epic', 'gog', 'itch', 'xbox', 'psn', 'nintendo', 'amazon', 'twitch', 'youtube', 'official', 'wikipedia'];
        return Array.from(new Set([...defaults, ...rows]));
    }

    static async getList(resource: string, search: string, page: number, perPage: number) {
        const table = this.dbTableMap[resource];
        if (!table) return null;

        const where: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (search) {
            where.push(`name ILIKE $${paramIdx++}`);
            params.push(`%${search}%`);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        // For Sources table, column is 'title' instead of 'name'
        const nameCol = table === 'sources' ? 'title as name' : 'name';

        const countRes = await pool.query(`SELECT COUNT(*) FROM ${table} ${whereSql}`, params);
        const total = parseInt(countRes.rows[0].count, 10);

        params.push(perPage, (page - 1) * perPage);
        const sql = `SELECT id, ${nameCol} FROM ${table} ${whereSql} ORDER BY ${table === 'sources' ? 'title' : 'name'} LIMIT $${paramIdx++} OFFSET $${paramIdx}`;

        const res = await pool.query(sql, params);
        return { rows: res.rows, total };
    }

    static async createRecord(resource: string, name: string) {
        const table = this.dbTableMap[resource];
        if (!table) return null;
        const col = table === 'sources' ? 'title' : 'name';
        const res = await pool.query(`SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM ${table}`);
        const newId = res.rows[0].new_id;
        await pool.query(`INSERT INTO ${table} (id, ${col}) VALUES ($1, $2)`, [newId, name]);
        return newId;
    }

    static async updateRecord(resource: string, id: number, name: string) {
        const table = this.dbTableMap[resource];
        if (!table) return false;
        const col = table === 'sources' ? 'title' : 'name';
        const res = await pool.query(`UPDATE ${table} SET ${col} = $1 WHERE id = $2`, [name, id]);
        return (res.rowCount ?? 0) > 0;
    }

    static async deleteRecord(resource: string, id: number) {
        const table = this.dbTableMap[resource];
        if (!table) return false;

        try {
            await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
            return true;
        } catch {
            return false; // usually fails due to foreign key constraints
        }
    }
}