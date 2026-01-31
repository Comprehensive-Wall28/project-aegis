
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserDocument } from '../../users/schemas/user.schema';
import { decryptToken } from '../../../common/utils/cryptoUtils';
import { getCachedJwt, setCachedJwt } from '../../../common/utils/jwt-cache';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: any) => {
                    let encryptedToken = null;
                    
                    // Try cookie first
                    if (req && req.cookies) {
                        encryptedToken = req.cookies['token'];
                    }
                    
                    // Then try Authorization header
                    if (!encryptedToken && req.headers?.authorization) {
                        const parts = req.headers.authorization.split(' ');
                        if (parts.length === 2 && parts[0] === 'Bearer') {
                            encryptedToken = parts[1];
                        }
                    }

                    // Decrypt the token to get the actual JWT
                    if (encryptedToken) {
                        try {
                            return decryptToken(encryptedToken);
                        } catch (error) {
                            return null;
                        }
                    }
                    
                    return null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
            passReqToCallback: true,
        });
    }

    async validate(req: any, payload: any) {
        // Extract encrypted token for caching
        let encryptedToken = null;
        if (req && req.cookies) {
            encryptedToken = req.cookies['token'];
        }
        if (!encryptedToken && req.headers?.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                encryptedToken = parts[1];
            }
        }

        // Check cache first
        if (encryptedToken) {
            const cached = getCachedJwt(encryptedToken);
            if (cached && cached.id === payload.id) {
                // Return cached user lookup
                const user = await this.usersService.findById(cached.id);
                if (user) {
                    return user;
                }
            }

            // Cache the decoded token
            setCachedJwt(encryptedToken, {
                id: payload.id,
                username: payload.username,
                iat: payload.iat,
                exp: payload.exp,
            });
        }

        const user = await this.usersService.findById(payload.id);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}
