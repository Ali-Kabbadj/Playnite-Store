import { FastifyInstance } from 'fastify';
import { GameController } from '../controllers/game.controller';

export default async function gameRoutes(fastify: FastifyInstance) {
    fastify.get('/api/v1/genres', GameController.getGenres);
    fastify.get('/api/v1/platforms', GameController.getPlatforms);
    fastify.get('/api/v1/games', GameController.getGames);
    fastify.get('/api/v1/games/:id', GameController.getGameById);
    fastify.get('/api/v1/providers', GameController.getProviders);
    fastify.get('/api/v1/sources', GameController.getSources);
}