export interface User {
    id: number;
    username: string;
    password_hash: string;
    role: 'admin' | 'moderator' | 'user';
    created_at: Date;
}