import { pool } from '../../db';

export class AdminStatsRepository {
    static async getDashboardStats() {
        const [total, matched, games, noRepacks, noMetadata] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM repacks').then(res => parseInt(res.rows[0].count, 10)),
            pool.query('SELECT COUNT(*) FROM repacks r WHERE EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = r.id)').then(res => parseInt(res.rows[0].count, 10)),
            pool.query('SELECT COUNT(*) FROM games').then(res => parseInt(res.rows[0].count, 10)),
            pool.query('SELECT COUNT(*) FROM games WHERE NOT EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.game_id = games.id)').then(res => parseInt(res.rows[0].count, 10)),
            pool.query('SELECT COUNT(*) FROM games WHERE summary IS NULL AND cover_url IS NULL').then(res => parseInt(res.rows[0].count, 10))
        ]);

        return {
            total_repacks: total,
            matched_repacks: matched,
            orphan_repacks: total - matched,
            total_games: games,
            games_no_repacks: noRepacks,
            games_no_metadata: noMetadata,
        };
    }
}