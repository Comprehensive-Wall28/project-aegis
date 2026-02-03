import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
    Logger
} from '@nestjs/common';
import { CsrfService } from '../csrf.service';

@Injectable()
export class CsrfGuard implements CanActivate {
    private readonly IGNORED_METHODS = ['GET', 'HEAD', 'OPTIONS'];
    private readonly COOKIE_NAME = 'XSRF-TOKEN';
    private readonly HEADER_NAME = 'X-XSRF-TOKEN';

    constructor(private csrfService: CsrfService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        if (this.IGNORED_METHODS.includes(request.method)) {
            return true;
        }

        const signedCookieToken = request.cookies?.[this.COOKIE_NAME];

        // Fastify headers are lowercase by default, but let's check carefully
        const headerToken = request.headers[this.HEADER_NAME] || request.headers[this.HEADER_NAME.toLowerCase()];

        if (!this.csrfService.verifyCsrf(signedCookieToken, headerToken as string)) {
            throw new ForbiddenException({ code: 'EBADCSRFTOKEN', message: 'Invalid or missing CSRF token' });
        }

        return true;
    }
}
