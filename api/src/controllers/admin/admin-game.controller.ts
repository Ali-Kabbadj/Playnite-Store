import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminGameRepository } from '../../repositories/admin/admin-game.repo';
import { AdminJunctionsRepository } from '../../repositories/admin/admin-junctions.repo';

export class AdminGameController {
    static async list(request: FastifyRequest, reply: FastifyReply) {
        const query = request.query as any;
        const data = await AdminGameRepository.getGamesPaginated(
            query.search || '', query.status || 'all', parseInt(query.page) || 1,
            parseInt(query.per_page) || 30, query.sort_by || 'id', query.sort_dir || 'asc'
        );
        return reply.send(data);
    }

    static async getOne(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const game = await AdminGameRepository.getGameDetail(Number(id));
        if (!game) return reply.status(404).send({ error: 'not found' });
        return reply.send(game);
    }

    static async create(request: FastifyRequest, reply: FastifyReply) {
        const { name, repack_ids } = request.body as any;
        if (!name) return reply.status(400).send({ error: 'name is required' });

        const gameId = await AdminGameRepository.createGame(name.trim());
        const count = await AdminJunctionsRepository.assignRepacks(repack_ids || [], gameId);
        return reply.send({ game_id: gameId, name, linked_repacks: count });
    }

    static async updateGame(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const updated = await AdminGameRepository.updateGame(Number(id), request.body as any);
        if (!updated) return reply.status(404).send({ error: 'not found or no valid fields' });
        return reply.send({ updated: true, game_id: Number(id) });
    }

    static async deleteGame(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const deleted = await AdminGameRepository.deleteGame(Number(id));
        if (!deleted) return reply.status(404).send({ error: 'not found' });
        return reply.send({ deleted: true });
    }

    static async getRepacks(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const repacks = await AdminGameRepository.getGameRepacks(Number(id));
        return reply.send(repacks);
    }

    static async updateLinks(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        await AdminGameRepository.updateExternalLinks(Number(id), request.body as any);
        return reply.send({ updated: Object.keys(request.body as any), game_id: Number(id) });
    }

    static async addMedia(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const { type, url } = request.body as any;
        const newId = await AdminGameRepository.addMedia(Number(id), type, url);
        return reply.send({ id: newId, game_id: Number(id), type, url });
    }

    static async manageMedia(request: FastifyRequest, reply: FastifyReply) {
        const { id, mid } = request.params as any;
        const { url } = (request.body || {}) as any;
        await AdminGameRepository.manageMedia(Number(id), Number(mid), request.method as 'PUT' | 'DELETE', url);
        return reply.send({ updated: true, id: Number(mid), url });
    }
}