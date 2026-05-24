import { FastifyRequest, FastifyReply } from 'fastify';

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as { token?: string };
        if (query.token && !request.headers.authorization) {
            request.headers.authorization = `Bearer ${query.token}`;
        }
        await request.jwtVerify();
    } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized: Invalid or missing token' });
    }
}

export function verifyRole(allowedRoles: string[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user as { role: string };
        if (!user || !allowedRoles.includes(user.role)) {
            return reply.status(403).send({ error: 'Forbidden: Insufficient permissions' });
        }
    };
}