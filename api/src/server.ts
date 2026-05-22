import { buildApp } from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
    try {
        const app = await buildApp();
        await app.listen({ port: PORT, host: HOST });
        console.log(`🚀 API is running on http://${HOST}:${PORT}`);
    } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
}

start();