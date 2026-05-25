import { FastifyInstance } from 'fastify';
import { AdminOperationsController } from '../../controllers/admin/admin-operations.controller';
import { verifyJwt, verifyRole } from '../../middlewares/auth.middleware';

export default async function adminOperationsRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', verifyJwt);
    fastify.addHook('preValidation', verifyRole(['admin', 'moderator']));
    fastify.get('/api/v1/admin/operations/run/:script', AdminOperationsController.runScript);
}