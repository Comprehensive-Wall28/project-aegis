import { Controller, Post, Put, Get, Body, Query, Param, UseGuards, Req, Res, Ip, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { VaultService } from './vault.service';
import { UploadInitDto } from './dto/upload-init.dto';
import { VaultListingRequestDto } from './dto/vault-listing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditStatus } from '../audit/schemas/audit-log.schema';

@Controller('api/vault')
export class VaultController {
    constructor(
        private readonly vaultService: VaultService,
        private readonly auditService: AuditService,
    ) { }

    @Post('upload-init')
    @UseGuards(JwtAuthGuard)
    async uploadInit(
        @CurrentUser() user: any,
        @Body() data: UploadInitDto,
        @Ip() ip: string,
    ) {
        const userId = user.id;
        const result = await this.vaultService.initUpload(userId, data);

        await this.auditService.log({
            userId,
            action: AuditAction.FILE_UPLOAD,
            status: AuditStatus.SUCCESS,
            ipAddress: ip,
            metadata: {
                fileName: data.originalFileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                fileId: result.fileId,
            },
        });

        return result;
    }

    @Put('upload-chunk')
    @UseGuards(JwtAuthGuard)
    async uploadChunk(
        @CurrentUser() user: any,
        @Req() req: any,
        @Res() res: any,
    ) {
        const userId = user.id;
        const fileId = req.query.fileId;
        const contentRange = req.headers['content-range'];
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);

        if (contentLength === 0) {
            throw new BadRequestException('Missing Content-Length');
        }

        const result = await this.vaultService.uploadChunk(
            userId,
            fileId,
            contentRange,
            req.raw, // Fastify raw request is a readable stream
            contentLength,
        );

        if (result.complete) {
            return res.status(200).send({
                message: 'Upload successful',
                googleDriveFileId: result.googleDriveFileId,
            });
        } else {
            if (result.receivedSize === undefined) {
                throw new InternalServerErrorException('Upload incomplete but missing received size');
            }
            // Send 308 Resume Incomplete (following Google Drive convention)
            return res
                .status(308)
                .header('Range', `bytes=0-${result.receivedSize - 1}`)
                .send();
        }
    }

    @Get('files')
    @UseGuards(JwtAuthGuard)
    async getUserFiles(
        @CurrentUser() user: any,
        @Query() query: VaultListingRequestDto,
    ) {
        return await this.vaultService.getUserFiles(user.id, query);
    }

    @Get('files/:id')
    @UseGuards(JwtAuthGuard)
    async getFile(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return await this.vaultService.getFile(user.id, id);
    }

    @Get('download/:id')
    @UseGuards(JwtAuthGuard)
    async downloadFile(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Res() res: any,
    ) {
        const { stream, file } = await this.vaultService.getDownloadStream(user.id, id);

        res.header('Content-Type', file.mimeType || 'application/octet-stream');
        res.header('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
        res.header('Content-Length', file.fileSize.toString());

        return res.send(stream);
    }
}

