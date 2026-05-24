import { FastifyInstance } from 'fastify';
import { AdminStatsController } from '../../controllers/admin/admin-stats.controller';
import { verifyJwt, verifyRole } from '../../middlewares/auth.middleware';

export default async function adminStatsRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', verifyJwt);
    fastify.addHook('preValidation', verifyRole(['admin', 'moderator']));
    fastify.get('/api/v1/admin/stats', AdminStatsController.getStats);
}