import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import gameRoutes from './routes/game.routes';
import authRoutes from './routes/auth.routes';
import adminGameRoutes from './routes/admin/admin-game.routes';
import { redisClient } from './cache/redis';
import adminStatsRoutes from './routes/admin/admin-stats.routes';
import adminJunctionsRoutes from './routes/admin/admin-junctions.routes';
import adminRepacksRoutes from './routes/admin/admin-repacks.routes';
import adminManagementRoutes from './routes/admin/admin-management.routes';
import adminOperationsRoutes from './routes/admin/admin-operations.routes';

export async function buildApp() {
    const app = Fastify({ logger: process.env.NODE_ENV !== 'production' });

    await app.register(cors);

    await app.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || 'fallback_secret'
    });

    await redisClient.connect();

    await app.register(gameRoutes);
    await app.register(authRoutes);
    await app.register(adminGameRoutes);
    await app.register(adminStatsRoutes);
    await app.register(adminJunctionsRoutes);
    await app.register(adminRepacksRoutes);
    await app.register(adminManagementRoutes);
    await app.register(adminOperationsRoutes);

    app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

    return app;
}