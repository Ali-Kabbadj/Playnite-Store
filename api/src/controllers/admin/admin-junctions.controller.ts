import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminJunctionsRepository } from '../../repositories/admin/admin-junctions.repo';

export class AdminJunctionsController {
    static async assign(request: FastifyRequest, reply: FastifyReply) {
        const { repack_ids, game_id } = request.body as any;
        if (!repack_ids || !game_id) return reply.status(400).send({ error: 'missing data' });
        const count = await AdminJunctionsRepository.assignRepacks(repack_ids, game_id);
        return reply.send({ count });
    }

    static async unassign(request: FastifyRequest, reply: FastifyReply) {
        const { repack_ids } = request.body as any;
        const count = await AdminJunctionsRepository.unassignRepacks(repack_ids || []);
        return reply.send({ count });
    }

    static async move(request: FastifyRequest, reply: FastifyReply) {
        const { repack_ids, target_game_id } = request.body as any;
        if (!repack_ids || !target_game_id) return reply.status(400).send({ error: 'missing data' });
        const count = await AdminJunctionsRepository.moveRepacks(repack_ids, target_game_id);
        return reply.send({ count, repack_ids, target_game_id });
    }
}