import { FastifyRequest, FastifyReply } from 'fastify';
import { spawn } from 'child_process';
import path from 'path';

export class AdminOperationsController {
    static async runScript(request: FastifyRequest, reply: FastifyReply) {
        const { script } = request.params as { script: string };

        const allowedScripts = ['db_sync.py', 'smart_audit.py', 'analyze_titles.py', 'db_full_report.py', 'fetch_hydra_sources.py', 'db_backup.py'];
        if (!allowedScripts.includes(script)) {
            return reply.status(400).send({ error: 'Invalid script' });
        }

        // Setup SSE Headers
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.setHeader('Access-Control-Allow-Origin', '*');
        reply.raw.flushHeaders();

        // Path to your /db/scripts folder
        const scriptPath = path.join(__dirname, '../../../../db/scripts', script);

        // Spawn Python process
        const pythonProcess = spawn('python', ['-u', '-X', 'utf8', scriptPath], {
            cwd: path.dirname(scriptPath),
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1'
            }
        });

        pythonProcess.stdout.on('data', (data) => {
            reply.raw.write(`data: ${JSON.stringify({ type: 'stdout', text: data.toString() })}\n\n`);
        });

        pythonProcess.stderr.on('data', (data) => {
            reply.raw.write(`data: ${JSON.stringify({ type: 'stderr', text: data.toString() })}\n\n`);
        });

        pythonProcess.on('close', (code) => {
            reply.raw.write(`data: ${JSON.stringify({ type: 'close', code })}\n\n`);
            reply.raw.end();
        });

        // Kill python process if user closes the browser tab
        request.raw.on('close', () => {
            if (!pythonProcess.killed) pythonProcess.kill();
        });
    }
}