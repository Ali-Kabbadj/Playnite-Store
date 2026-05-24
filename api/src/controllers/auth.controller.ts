import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repo';

export class AuthController {
    static async login(request: FastifyRequest, reply: FastifyReply) {
        const { username, password } = request.body as any;

        if (!username || !password) {
            return reply.status(400).send({ error: 'Username and password are required' });
        }

        const user = await UserRepository.getUserByUsername(username);
        if (!user) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Generate the JWT Token (fastify-jwt attaches .jwtSign to the reply object)
        const token = await reply.jwtSign({
            id: user.id,
            username: user.username,
            role: user.role
        });

        return reply.send({ token, role: user.role });
    }
}