import { FastifyInstance } from 'fastify';
import { AdminRepacksController } from '../../controllers/admin/admin-repacks.controller';
import { verifyJwt, verifyRole } from '../../middlewares/auth.middleware';

export default async function adminRepacksRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', verifyJwt);
    fastify.addHook('preValidation', verifyRole(['admin', 'moderator']));
    fastify.get('/api/v1/admin/repacks', AdminRepacksController.list);
    fastify.get('/api/v1/admin/repacks/:id', AdminRepacksController.getOne);
    fastify.post('/api/v1/admin/repacks/by-ids', AdminRepacksController.getByIds);
}