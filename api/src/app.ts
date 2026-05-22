import Fastify from 'fastify';
import cors from '@fastify/cors';
import gameRoutes from './routes/game.routes';
import { redisClient } from './cache/redis';

export async function buildApp() {
    const app = Fastify({ logger: process.env.NODE_ENV !== 'production' });
    await app.register(cors);
    await redisClient.connect();
    await app.register(gameRoutes);
    app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));
    return app;
}