import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { VaultService } from './vault.service';
import { UploadInitDto } from './dto/upload-init.dto';
import { StorageProvider } from './schemas/vault-file.schema';
import { GridFsService } from './gridfs.service';

@Controller('vault')
@UseGuards(JwtAuthGuard)
export class VaultController {
    constructor(
        private readonly vaultService: VaultService,
        private readonly gridFsService: GridFsService
    ) { }

    @Post('upload/init')
    async initUpload(
        @CurrentUser() user: any,
        @Body() body: UploadInitDto
    ) {
        return this.vaultService.initiateUpload(user.userId, body);
    }

    @Post('upload/chunk')
    async uploadChunk(
        @CurrentUser() user: any,
        @Req() req: FastifyRequest
    ) {
        // Parse raw body or stream for chunk
        // We expect Content-Range, Session-ID headers or similar keys in body
        // For simplicity and matching legacy options, we normally expect multipart or raw binary with headers.

        // Check headers
        const fileId = req.headers['x-file-id'] as string;
        const chunkLength = parseInt(req.headers['content-length'] || '0', 10);
        const range = req.headers['content-range'] as string;

        if (!fileId || !range) {
            throw new BadRequestException('Missing X-File-Id or Content-Range headers');
        }

        const rangeMatch = range.match(/bytes (\d+)-(\d+)\/(\d+)/);
        if (!rangeMatch) throw new BadRequestException('Invalid Content-Range');

        const rangeStart = parseInt(rangeMatch[1], 10);
        const rangeEnd = parseInt(rangeMatch[2], 10);
        const totalSize = parseInt(rangeMatch[3], 10);

        // In Fastify, req.raw is the node request stream
        return this.vaultService.uploadChunk(
            user.userId,
            fileId,
            req.raw, // Pass readable stream
            chunkLength,
            rangeStart,
            rangeEnd,
            totalSize
        );
    }

    @Post('upload/gridfs')
    async uploadGridFs(
        @CurrentUser() user: any,
        @Req() req: FastifyRequest
    ) {
        // Handle multipart upload for GridFS
        // Cast to any to access parts() added by fastify-multipart
        const parts = (req as any).parts();
        let fileId: string | undefined;
        let fileSaved = false;

        for await (const part of parts) {
            if (part.type === 'field') {
                if (part.fieldname === 'fileId') {
                    fileId = part.value as string;
                }
            } else if (part.type === 'file') {
                if (!fileId) {
                    // We need fileId first to validate metadata
                    // Client must append fileId field BEFORE file field
                    // But strictly speaking, we might not get it in order. 
                    // Ideally we prefer 'initUpload' first.
                    throw new BadRequestException('fileId field must precede file data');
                }

                // Stream directly to GridFS
                // We don't have the fileId here for the GridFS file itself, we generate it or let GridFS do it.
                // But we need to link it to our VaultFile metadata.

                // Reuse initial logic: we need 'originalFileName' from metadata really.
                // But here we rely on the initUpload having been called.

                const buffer = await part.toBuffer(); // For small files (notes) this is fine. For large, we need stream.
                // Our GridFS service 'uploadBuffer' returns an ID.

                // TODO: Update GridFsService to accept stream for Memory efficiency on 50MB+ files
                // For now using buffer as per current GridFsService capability
                const gridFsId = await this.gridFsService.uploadBuffer(buffer, part.filename);

                await this.vaultService.completeGridFsUpload(user.userId, fileId, gridFsId);
                fileSaved = true;
            }
        }

        if (!fileSaved) throw new BadRequestException('No file uploaded');
        return { success: true };
    }

    @Get('files')
    async listFiles(
        @CurrentUser() user: any,
        @Query('folderId') folderId?: string
    ) {
        return this.vaultService.listFiles(user.userId, folderId);
    }

    @Get('download/:id')
    async downloadFile(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Res() res: FastifyReply
    ) {
        const { stream, mimeType, fileName } = await this.vaultService.getDownloadStream(user.userId, id);

        res.header('Content-Type', mimeType);
        res.header('Content-Disposition', `attachment; filename="${fileName}"`);

        return res.send(stream);
    }

    @Delete(':id')
    async deleteFile(
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        return this.vaultService.deleteFile(user.userId, id);
    }
}
