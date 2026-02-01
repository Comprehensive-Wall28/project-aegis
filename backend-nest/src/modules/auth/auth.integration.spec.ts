import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { connection, Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('AuthModule (Integration)', () => {
  let mongoServer: MongoMemoryServer;
  let module: TestingModule;
  let authService: AuthService;
  let dbConnection: Connection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret',
              MONGO_URI: uri,
            }),
          ],
        }),
        MongooseModule.forRoot(uri),
        AuthModule,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    dbConnection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await module.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = dbConnection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('should register a new user', async () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      pqcPublicKey: 'some-pqc-key',
      argon2Hash: 'hashedpassword123',
    };

    const result = await authService.register(registerDto);

    expect(result.user).toBeDefined();
    expect(result.user.username).toBe('testuser');
    expect(result.token).toBeDefined();
  });

  it('should not register a user with an existing email', async () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      pqcPublicKey: 'some-pqc-key',
      argon2Hash: 'hashedpassword123',
    };

    await authService.register(registerDto);

    await expect(authService.register(registerDto)).rejects.toThrow(
      'Email already in use',
    );
  });

  it('should login a user', async () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      pqcPublicKey: 'some-pqc-key',
      argon2Hash: 'hashedpassword123',
    };

    await authService.register(registerDto);

    const loginDto: LoginDto = {
      email: 'test@example.com',
      argon2Hash: 'hashedpassword123',
    };

    const result = await authService.login(loginDto);

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.token).toBeDefined();
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    const loginDto: LoginDto = {
      email: 'nonexistent@example.com',
      argon2Hash: 'wronghash',
    };

    await expect(authService.login(loginDto)).rejects.toThrow(
      'Invalid credentials',
    );
  });
});
