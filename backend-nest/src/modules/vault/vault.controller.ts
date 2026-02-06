import { Controller, Post, Put, Body, UseGuards, Req, Res, Ip, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { VaultService } from './vault.service';
import { UploadInitDto } from './dto/upload-init.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
        @Req() req: any,
        @Body() data: UploadInitDto,
        @Ip() ip: string,
    ) {
        const userId = req.user.id;
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
        @Req() req: any,
        @Res() res: any,
    ) {
        const userId = req.user.id;
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
}
