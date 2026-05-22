import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

export async function getOrSetCache<T>(key: string, ttlSeconds: number, fetchCallback: () => Promise<T>): Promise<T> {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
        return JSON.parse(cachedData) as T;
    }

    const freshData = await fetchCallback();
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(freshData));

    return freshData;
}