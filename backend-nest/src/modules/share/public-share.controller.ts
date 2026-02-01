import { Controller, Get, Param, Res, Req, UseGuards } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PublicShareService } from './public-share.service';
import { CsrfGuard } from '../../common/guards/csrf.guard';

@Controller('public/share')
@UseGuards(CsrfGuard)
export class PublicShareController {
  constructor(private readonly publicShareService: PublicShareService) {}

  @Get(':token')
  async getLinkMetadata(
    @Param('token') token: string,
    @Req() req: FastifyRequest,
  ) {
    return this.publicShareService.getLinkMetadata(token, req);
  }

  @Get(':token/download')
  async downloadSharedFile(
    @Param('token') token: string,
    @Res() res: FastifyReply,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.publicShareService.downloadSharedFile(token, req);

    res.header('Content-Type', result.mimeType);
    res.header(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.header('Content-Length', result.fileSize.toString());

    result.stream.pipe(res.raw);
  }
}
