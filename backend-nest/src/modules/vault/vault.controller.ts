import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, Res, BadRequestException, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
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

    private readonly logger = new Logger(VaultController.name);

    @Post('upload/init')
    async initUpload(
        @CurrentUser() user: any,
        @Body() body: UploadInitDto
    ) {
        return this.vaultService.initiateUpload(user._id.toString(), body);
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
            user._id.toString(),
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
        let gridFsId: string | undefined;
        let fileSaved = false;

        for await (const part of parts) {
            if (part.type === 'field') {
                if (part.fieldname === 'fileId') {
                    fileId = part.value as string;
                }
            } else if (part.type === 'file') {
                // Stream directly to GridFS immediately
                try {
                    const id = await this.gridFsService.uploadStream(part.file, part.filename);
                    gridFsId = id.toString();
                    fileSaved = true;
                } catch (error: any) {
                    this.logger.error(`Upload failed: ${error.message}`, error.stack);
                    throw error;
                }
            }
        }

        if (fileSaved && fileId && gridFsId) {
            await this.vaultService.completeGridFsUpload(user._id.toString(), fileId, new Types.ObjectId(gridFsId));
            return { success: true };
        } else if (fileSaved && !fileId) {
            // Metadata missing - strictly speaking we should delete the orphan file in GridFS here
            // but for this iteration, we just throw error.
            throw new BadRequestException('Missing fileId field');
        } else {
            throw new BadRequestException('No file uploaded');
        }
    }

    @Get('files')
    async listFiles(
        @CurrentUser() user: any,
        @Query('folderId') folderId?: string
    ) {
        return this.vaultService.listFiles(user._id.toString(), folderId);
    }

    @Get('download/:id')
    async downloadFile(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Res() res: FastifyReply
    ) {
        const { stream, mimeType, fileName } = await this.vaultService.getDownloadStream(user._id.toString(), id);

        res.header('Content-Type', mimeType);
        res.header('Content-Disposition', `attachment; filename="${fileName}"`);

        return res.send(stream);
    }

    @Delete(':id')
    async deleteFile(
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        return this.vaultService.deleteFile(user._id.toString(), id);
    }
    @Get('storage-stats')
    async getStorageStats(@CurrentUser() user: any) {
        return this.vaultService.getStorageStats(user._id.toString());
    }
}
