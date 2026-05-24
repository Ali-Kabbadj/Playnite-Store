import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminManagementRepository } from '../../repositories/admin/admin-management.repo';

export class AdminManagementController {
    static async getLinkSources(request: FastifyRequest, reply: FastifyReply) {
        const data = await AdminManagementRepository.getLinkSourceNames();
        return reply.send(data);
    }

    static async list(request: FastifyRequest, reply: FastifyReply) {
        const { resource } = request.params as any;
        const query = request.query as any;
        const data = await AdminManagementRepository.getList(resource, query.search || '', parseInt(query.page) || 1, parseInt(query.per_page) || 50);
        if (!data) return reply.status(404).send({ error: 'invalid resource' });
        return reply.send(data);
    }

    static async create(request: FastifyRequest, reply: FastifyReply) {
        const { resource } = request.params as any;
        const { name } = request.body as any;
        if (!name) return reply.status(400).send({ error: 'name required' });

        const newId = await AdminManagementRepository.createRecord(resource, name.trim());
        if (!newId) return reply.status(400).send({ error: 'could not create' });
        return reply.send({ id: newId, name: name.trim() });
    }

    static async update(request: FastifyRequest, reply: FastifyReply) {
        const { resource, id } = request.params as any;
        const { name } = request.body as any;
        if (!name) return reply.status(400).send({ error: 'name required' });

        const updated = await AdminManagementRepository.updateRecord(resource, Number(id), name.trim());
        if (!updated) return reply.status(400).send({ error: 'update failed' });
        return reply.send({ updated: true });
    }

    static async remove(request: FastifyRequest, reply: FastifyReply) {
        const { resource, id } = request.params as any;
        const deleted = await AdminManagementRepository.deleteRecord(resource, Number(id));
        if (!deleted) return reply.status(400).send({ error: 'cannot delete resource' });
        return reply.send({ deleted: true });
    }
}