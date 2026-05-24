import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminRepacksRepository } from '../../repositories/admin/admin-repacks.repo';

export class AdminRepacksController {
    static async list(request: FastifyRequest, reply: FastifyReply) {
        const query = request.query as any;
        const search = query.search || '';
        const status = query.status || 'all';
        const page = parseInt(query.page) || 1;
        const perPage = parseInt(query.per_page) || 50;
        const sortBy = query.sort_by || 'id';
        const sortDir = query.sort_dir || 'asc';

        const data = await AdminRepacksRepository.getRepacksPaginated(search, status, page, perPage, sortBy, sortDir);
        return reply.send(data);
    }

    static async getOne(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const data = await AdminRepacksRepository.getRepackDetail(Number(id));
        if (!data) return reply.status(404).send({ error: 'not found' });
        return reply.send(data);
    }

    static async getByIds(request: FastifyRequest, reply: FastifyReply) {
        const { ids } = request.body as { ids: number[] };
        const data = await AdminRepacksRepository.getRepacksByIds(ids || []);
        return reply.send(data);
    }
}