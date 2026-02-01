import { FastifyInstance } from 'fastify';
import {
    getLinkMetadata,
    downloadSharedFile
} from '../controllers/fastifyPublicShareController';

export async function publicRoutes(app: FastifyInstance) {
    // Public routes - no auth required
    app.get('/share/:token', getLinkMetadata);
    app.get('/share/:token/download', downloadSharedFile);
}
