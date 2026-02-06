import { Controller, Post, Body, UseGuards, Req, Ip } from '@nestjs/common';
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
}
