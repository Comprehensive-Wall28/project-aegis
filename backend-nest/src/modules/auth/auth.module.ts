
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuditService } from '../../common/services/audit.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '365d' },
            }),
        }),
        MongooseModule.forRoot(
            process.env.SECONDARY_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/aegis',
            { connectionName: 'secondary' }
        ),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, AuditService],
    exports: [AuthService]
})
export class AuthModule { }
