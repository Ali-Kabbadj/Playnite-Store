import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';

export default async function authRoutes(fastify: FastifyInstance) {
    fastify.post('/api/v1/auth/login', AuthController.login);
}