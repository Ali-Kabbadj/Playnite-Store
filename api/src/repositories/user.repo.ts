import { pool } from '../db';
import { User } from '../types/user.type';

export class UserRepository {
    static async getUserByUsername(username: string): Promise<User | null> {
        const sql = `SELECT * FROM users WHERE username = $1`;
        const res = await pool.query(sql, [username]);
        return res.rows.length ? res.rows[0] : null;
    }
}