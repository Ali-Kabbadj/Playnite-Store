import { FastifyInstance } from 'fastify';
import { AdminJunctionsController } from '../../controllers/admin/admin-junctions.controller';
import { verifyJwt, verifyRole } from '../../middlewares/auth.middleware';

export default async function adminJunctionsRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', verifyJwt);
    fastify.addHook('preValidation', verifyRole(['admin', 'moderator']));
    fastify.post('/api/v1/admin/junction/assign', AdminJunctionsController.assign);
    fastify.post('/api/v1/admin/junction/unassign', AdminJunctionsController.unassign);
    fastify.post('/api/v1/admin/junction/move', AdminJunctionsController.move);
}