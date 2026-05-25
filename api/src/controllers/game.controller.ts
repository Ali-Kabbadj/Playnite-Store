import { FastifyRequest, FastifyReply } from 'fastify';
import { GameService } from '../services/game.service';
import { GameRepository } from '../repositories/game.repo';

export class GameController {

    static async getGames(request: FastifyRequest, reply: FastifyReply) {
        try {
            const query = request.query as any;
            const page = Math.max(1, parseInt(query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
            const q = query.q ? String(query.q).trim() : undefined;
            const hasRepacks = query.hasRepacks === 'true';

            const genre = query.genre ? String(query.genre) : undefined;
            const platform = query.platform ? String(query.platform) : undefined;
            const publisher = query.publisher ? String(query.publisher) : undefined;
            const source = query.source ? String(query.source) : undefined;
            const sort = query.sort ? String(query.sort) : undefined;

            const response = await GameService.getGames(page, limit, q, hasRepacks, genre, platform, publisher, source, sort);
            return reply.send(response);
        } catch (error) { return reply.status(500).send({ error: 'Internal Server Error' }); }
    }


    static async getSources(request: FastifyRequest, reply: FastifyReply) {
        const res = await GameRepository.getAllSources();
        return reply.send(res);
    }


    static async getProviders(request: FastifyRequest, reply: FastifyReply) {
        const res = await GameRepository.getAllProviders();
        return reply.send(res);
    }

    static async getGameById(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const game = await GameService.getGameById(id);

            if (!game) {
                return reply.status(404).send({ error: 'Game not found' });
            }

            if (game.cover_url) {
                game.cover_url = game.cover_url.replace("t_thumb", "t_1080p");

            }


            console.log(game);

            if (game.screenshots) {
                game.screenshots = game.screenshots.map((s: any) => {
                    if (s.url) {
                        s.url = s.url.replace("t_thumb", "t_1080p");
                    }
                    return s;
                }
                );
            }

            return reply.send(game);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    }

    static async getGenres(request: FastifyRequest, reply: FastifyReply) {
        try {
            const genres = await GameService.getGenres();
            return reply.send(genres);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    }

    static async getPlatforms(request: FastifyRequest, reply: FastifyReply) {
        try {
            const platforms = await GameService.getPlatforms();
            return reply.send(platforms);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    }
}