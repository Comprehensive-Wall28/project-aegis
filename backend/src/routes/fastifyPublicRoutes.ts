import { FastifyInstance } from 'fastify';
import {
    getLinkMetadata,
    downloadSharedFile
} from '../controllers/fastifyPublicShareController';

export async function publicRoutes(app: FastifyInstance) {
    // Public routes - no auth required
    app.get('/:token', getLinkMetadata);
    app.get('/:token/download', downloadSharedFile);
}
