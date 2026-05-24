import { pool } from '../../db';

export class AdminJunctionsRepository {
    static async assignRepacks(repackIds: number[], gameId: number): Promise<number> {
        if (!repackIds.length) return 0;
        const sql = `INSERT INTO game_repacks (game_id, repack_id) 
                     SELECT $1, unnest($2::int[]) 
                     ON CONFLICT DO NOTHING`;
        const res = await pool.query(sql, [gameId, repackIds]);
        return res.rowCount ?? 0;
    }

    static async unassignRepacks(repackIds: number[]): Promise<number> {
        if (!repackIds.length) return 0;
        const sql = `DELETE FROM game_repacks WHERE repack_id = ANY($1::int[])`;
        const res = await pool.query(sql, [repackIds]);
        return res.rowCount ?? 0;
    }

    static async moveRepacks(repackIds: number[], targetGameId: number): Promise<number> {
        if (!repackIds.length) return 0;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`DELETE FROM game_repacks WHERE repack_id = ANY($1::int[])`, [repackIds]);
            const res = await client.query(`
                INSERT INTO game_repacks (game_id, repack_id) 
                SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING
            `, [targetGameId, repackIds]);
            await client.query('COMMIT');
            return res.rowCount ?? 0;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}