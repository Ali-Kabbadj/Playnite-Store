import { FastifyInstance } from 'fastify';
import { AdminManagementController } from '../../controllers/admin/admin-management.controller';
import { verifyJwt, verifyRole } from '../../middlewares/auth.middleware';

export default async function adminManagementRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', verifyJwt);
    fastify.addHook('preValidation', verifyRole(['admin', 'moderator']));

    fastify.get('/api/v1/admin/link-source-names', AdminManagementController.getLinkSources);

    fastify.get('/api/v1/admin/:resource', AdminManagementController.list);
    fastify.post('/api/v1/admin/:resource', AdminManagementController.create);
    fastify.put('/api/v1/admin/:resource/:id', AdminManagementController.update);
    fastify.delete('/api/v1/admin/:resource/:id', AdminManagementController.remove);
}