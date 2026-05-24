import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminStatsRepository } from '../../repositories/admin/admin-stats.repo';

export class AdminStatsController {
    static async getStats(request: FastifyRequest, reply: FastifyReply) {
        const data = await AdminStatsRepository.getDashboardStats();
        return reply.send(data);
    }
}