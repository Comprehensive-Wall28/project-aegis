import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as argon2 from 'argon2';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { initCryptoUtils } from '../../src/common/utils/cryptoUtils';

describe('Auth Module Integration Tests (matching legacy backend)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let userId: string;

  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    pqcPublicKey: 'test-pqc-public-key-12345',
    argon2Hash: 'clientSideHashedPassword123',
  };

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          load: [
            () => ({
              JWT_SECRET: 'test-jwt-secret-key',
              COOKIE_ENCRYPTION_KEY: 'test-cookie-encryption-key',
              CSRF_SECRET: 'test-csrf-secret',
              API_RATE_LIMIT: 100,
              AUTH_RATE_LIMIT: 20,
              NODE_ENV: 'test',
            }),
          ],
        }),
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forRoot(mongoUri, { connectionName: 'secondary' }),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Initialize crypto utils
    const configService = app.get('ConfigService');
    initCryptoUtils(configService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('POST /auth/register', () => {
    it('should register a new user WITHOUT returning token (matches legacy)', async () => {
      const response = await app
        .getHttpServer()
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty(
        'pqcPublicKey',
        testUser.pqcPublicKey,
      );
      expect(response.body).toHaveProperty('preferences');
      expect(response.body).toHaveProperty('hasPassword', true);
      expect(response.body).toHaveProperty('webauthnCredentials');

      // Legacy does NOT return token in body
      expect(response.body).not.toHaveProperty('token');

      userId = response.body._id;
    });

    it('should reject registration with duplicate email', async () => {
      await app
        .getHttpServer()
        .post('/auth/register')
        .send(testUser)
        .expect(400);
    });

    it('should reject registration with missing fields', async () => {
      await app
        .getHttpServer()
        .post('/auth/register')
        .send({
          username: 'incomplete',
          email: 'incomplete@example.com',
        })
        .expect(400);
    });

    it('should normalize email to lowercase', async () => {
      const response = await app
        .getHttpServer()
        .post('/auth/register')
        .send({
          ...testUser,
          username: 'testuser2',
          email: 'TEST2@EXAMPLE.COM',
        })
        .expect(201);

      expect(response.body.email).toBe('test2@example.com');
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return user data with encrypted token in cookie', async () => {
      const response = await app
        .getHttpServer()
        .post('/auth/login')
        .send({
          email: testUser.email,
          argon2Hash: testUser.argon2Hash,
        })
        .expect(200);

      expect(response.body).toHaveProperty('_id', userId);
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('hasPassword', true);

      // Check cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.startsWith('token='))).toBe(true);

      // Extract token for later tests
      const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
      authToken = tokenCookie.split(';')[0].split('=')[1];
    });

    it('should reject login with invalid credentials', async () => {
      await app
        .getHttpServer()
        .post('/auth/login')
        .send({
          email: testUser.email,
          argon2Hash: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject login for non-existent user', async () => {
      await app
        .getHttpServer()
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          argon2Hash: 'somepassword',
        })
        .expect(401);
    });

    it('should normalize email during login', async () => {
      const response = await app
        .getHttpServer()
        .post('/auth/login')
        .send({
          email: 'TEST@EXAMPLE.COM', // Uppercase
          argon2Hash: testUser.argon2Hash,
        })
        .expect(200);

      expect(response.body._id).toBe(userId);
    });
  });

  describe('Legacy Hash Migration', () => {
    let legacyUser: any;

    beforeAll(async () => {
      // Create user with v1 password hash
      const UsersService = app.get('UsersService');
      const legacyHashInput = 'legacyClientHash';
      const hashedLegacy = await argon2.hash(legacyHashInput.toLowerCase());

      legacyUser = await UsersService.create({
        username: 'legacyuser',
        email: 'legacy@example.com',
        pqcPublicKey: 'legacy-pqc-key',
        passwordHash: hashedLegacy,
        passwordHashVersion: 1, // Version 1
      });
    });

    it('should migrate v1 hash to v2 on successful login with legacyHash', async () => {
      const UsersRepository = app.get('UsersRepository');

      // Login with legacyHash provided
      const response = await app
        .getHttpServer()
        .post('/auth/login')
        .send({
          email: 'legacy@example.com',
          argon2Hash: 'newClientHash',
          legacyHash: 'legacyClientHash',
        })
        .expect(200);

      expect(response.body._id).toBe(legacyUser._id.toString());

      // Verify user was migrated to v2
      const updatedUser = await UsersRepository.findById(legacyUser._id);
      expect(updatedUser.passwordHashVersion).toBe(2);

      // Verify new hash works
      const isValid = await argon2.verify(
        updatedUser.passwordHash,
        'newClientHash'.toLowerCase(),
      );
      expect(isValid).toBe(true);
    });

    it('should login with v2 hash after migration', async () => {
      await app
        .getHttpServer()
        .post('/auth/login')
        .send({
          email: 'legacy@example.com',
          argon2Hash: 'newClientHash',
        })
        .expect(200);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user when authenticated', async () => {
      const response = await app
        .getHttpServer()
        .get('/auth/me')
        .set('Cookie', `token=${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', userId);
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('preferences');
    });

    it('should reject unauthenticated requests', async () => {
      await app.getHttpServer().get('/auth/me').expect(401);
    });
  });

  describe('GET /auth/discover', () => {
    it('should return user public info for sharing', async () => {
      const response = await app
        .getHttpServer()
        .get('/auth/discover')
        .query({ email: testUser.email })
        .set('Cookie', `token=${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty(
        'pqcPublicKey',
        testUser.pqcPublicKey,
      );
      expect(response.body).not.toHaveProperty('email');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 400 for non-existent user', async () => {
      await app
        .getHttpServer()
        .get('/auth/discover')
        .query({ email: 'nonexistent@example.com' })
        .set('Cookie', `token=${authToken}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      await app
        .getHttpServer()
        .get('/auth/discover')
        .query({ email: testUser.email })
        .expect(401);
    });
  });

  describe('PUT /auth/profile', () => {
    it('should update username', async () => {
      const response = await app
        .getHttpServer()
        .put('/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({ username: 'updateduser' })
        .expect(200);

      expect(response.body.username).toBe('updateduser');
    });

    it('should update email', async () => {
      const response = await app
        .getHttpServer()
        .put('/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({ email: 'updated@example.com' })
        .expect(200);

      expect(response.body.email).toBe('updated@example.com');
    });

    it('should update preferences', async () => {
      const response = await app
        .getHttpServer()
        .put('/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({
          preferences: {
            sessionTimeout: 120,
            encryptionLevel: 'HIGH',
            backgroundBlur: 15,
          },
        })
        .expect(200);

      expect(response.body.preferences.sessionTimeout).toBe(120);
      expect(response.body.preferences.encryptionLevel).toBe('HIGH');
      expect(response.body.preferences.backgroundBlur).toBe(15);
    });

    it('should reject invalid username (too short)', async () => {
      await app
        .getHttpServer()
        .put('/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({ username: 'ab' })
        .expect(400);
    });

    it('should reject duplicate username', async () => {
      // Create another user
      await app.getHttpServer().post('/auth/register').send({
        username: 'anotheruser',
        email: 'another@example.com',
        pqcPublicKey: 'another-key',
        argon2Hash: 'anotherhash',
      });

      await app
        .getHttpServer()
        .put('/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({ username: 'anotheruser' })
        .expect(400);
    });

    it('should require authentication', async () => {
      await app
        .getHttpServer()
        .put('/auth/profile')
        .send({ username: 'shouldfail' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and clear cookie', async () => {
      const response = await app
        .getHttpServer()
        .post('/auth/logout')
        .set('Cookie', `token=${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(
        cookies.some(
          (c: string) => c.includes('token=') && c.includes('Max-Age=0'),
        ),
      ).toBe(true);
    });

    it('should allow logout without authentication', async () => {
      await app.getHttpServer().post('/auth/logout').expect(200);
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent user response format across all endpoints', async () => {
      // Register
      const registerRes = await app
        .getHttpServer()
        .post('/auth/register')
        .send({
          username: 'formattest',
          email: 'format@example.com',
          pqcPublicKey: 'format-key',
          argon2Hash: 'formathash',
        })
        .expect(201);

      const expectedKeys = [
        '_id',
        'username',
        'email',
        'pqcPublicKey',
        'preferences',
        'hasPassword',
        'webauthnCredentials',
      ];
      expectedKeys.forEach((key) => {
        expect(registerRes.body).toHaveProperty(key);
      });

      // Login
      const loginRes = await app
        .getHttpServer()
        .post('/auth/login')
        .send({
          email: 'format@example.com',
          argon2Hash: 'formathash',
        })
        .expect(200);

      expectedKeys.forEach((key) => {
        expect(loginRes.body).toHaveProperty(key);
      });

      // Get Me
      const tokenCookie = loginRes.headers['set-cookie'].find((c: string) =>
        c.startsWith('token='),
      );
      const token = tokenCookie.split(';')[0].split('=')[1];

      const meRes = await app
        .getHttpServer()
        .get('/auth/me')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expectedKeys.forEach((key) => {
        expect(meRes.body).toHaveProperty(key);
      });
    });
  });
});
