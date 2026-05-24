import { FastifyInstance } from 'fastify';
import { AdminGameController } from '../../controllers/admin/admin-game.controller';
import { verifyJwt, verifyRole } from '../../middlewares/auth.middleware';

export default async function adminGameRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', verifyJwt);
    fastify.addHook('preValidation', verifyRole(['admin', 'moderator']));

    fastify.get('/api/v1/admin/games', AdminGameController.list);
    fastify.post('/api/v1/admin/games', AdminGameController.create);
    fastify.get('/api/v1/admin/games/:id', AdminGameController.getOne);
    fastify.put('/api/v1/admin/games/:id', AdminGameController.updateGame);
    fastify.delete('/api/v1/admin/games/:id', AdminGameController.deleteGame);

    fastify.get('/api/v1/admin/games/:id/repacks', AdminGameController.getRepacks);
    fastify.put('/api/v1/admin/games/:id/external-links', AdminGameController.updateLinks);

    fastify.post('/api/v1/admin/games/:id/media', AdminGameController.addMedia);
    fastify.put('/api/v1/admin/games/:id/media/:mid', AdminGameController.manageMedia);
    fastify.delete('/api/v1/admin/games/:id/media/:mid', AdminGameController.manageMedia);
}