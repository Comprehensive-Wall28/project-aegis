import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res, BadRequestException, Logger } from '@nestjs/common';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Types } from 'mongoose';
import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { VaultService } from './vault.service';
import { UploadInitDto } from './dto/upload-init.dto';
import { GridFsService } from './gridfs.service';

@Controller('vault')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class VaultController {
    constructor(
        private readonly vaultService: VaultService,
        private readonly gridFsService: GridFsService
    ) { }

    private readonly logger = new Logger(VaultController.name);

    @Post('upload-init')
    async initUpload(
        @CurrentUser() user: any,
        @Body() body: UploadInitDto,
        @Req() req: FastifyRequest
    ) {
        return this.vaultService.initiateUpload(user._id.toString(), body, req);
    }

    @Put('upload-chunk')
    async uploadChunk(
        @CurrentUser() user: any,
        @Query('fileId') fileId: string,
        @Req() req: FastifyRequest
    ) {
        // Legacy uses query parameter for fileId
        const chunkLength = parseInt(req.headers['content-length'] || '0', 10);
        const range = req.headers['content-range'] as string;

        if (!fileId || !range) {
            throw new BadRequestException('Missing fileId query or Content-Range header');
        }

        const rangeMatch = range.match(/bytes (\d+)-(\d+)\/(\d+)/);
        if (!rangeMatch) throw new BadRequestException('Invalid Content-Range');

        const rangeStart = parseInt(rangeMatch[1], 10);
        const rangeEnd = parseInt(rangeMatch[2], 10);
        const totalSize = parseInt(rangeMatch[3], 10);

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
            throw new BadRequestException('Missing fileId field');
        } else {
            throw new BadRequestException('No file uploaded');
        }
    }

    @Get('files')
    async listFiles(
        @CurrentUser() user: any,
        @Query('folderId') folderId?: string,
        @Query('search') search?: string,
        @Query('limit') limit?: number,
        @Query('cursor') cursor?: string
    ) {
        return this.vaultService.listFiles(user._id.toString(), folderId, search, limit, cursor);
    }

    @Get('files/:id')
    async getFile(
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        return this.vaultService.getFile(user._id.toString(), id);
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

    @Delete('files/:id')
    async deleteFile(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Req() req: FastifyRequest
    ) {
        return this.vaultService.deleteFile(user._id.toString(), id, req);
    }

    @Get('storage-stats')
    async getStorageStats(@CurrentUser() user: any) {
        return this.vaultService.getStorageStats(user._id.toString());
    }
}
