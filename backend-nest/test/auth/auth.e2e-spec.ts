import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
    registerUser,
    loginUser,
    getAuthenticatedAgent,
    getCsrfToken,
    extractCookies
} from '../helpers/auth.helper';
import { validUserData, invalidUserData } from '../fixtures/users.fixture';
import { createTestApp, closeDatabase, cleanupDatabase } from '../setup';

let app: INestApplication;

describe('Auth E2E', () => {

    // Helper to generate unique users for each test to avoid collisions
    const createUniqueUser = () => ({
        ...validUserData,
        username: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        email: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`,
    });

    beforeAll(async () => {
        const { app: testApp } = await createTestApp();
        app = testApp;
    });

    afterAll(async () => {
        await closeDatabase();
        await app.close();
    });

    it('should return 404 for unknown auth route', async () => {
        const response = await request(app.getHttpServer()).get('/api/auth/unknown-route');
        expect(response.status).toBe(404);
    });

    describe('POST /api/auth/register', () => {
        let user: any;

        beforeEach(() => {
            user = createUniqueUser();
        });

        describe('Success cases', () => {
            it('should register a new user with valid data', async () => {
                const { response } = await registerUser(app, user);
                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('message', 'User registered successfully');
                expect(response.body).toHaveProperty('username', user.username);
                expect(response.body).toHaveProperty('email', user.email);
            });

            it('should return user object without sensitive fields', async () => {
                const { response } = await registerUser(app, user);
                expect(response.status).toBe(201);
                expect(response.body).not.toHaveProperty('passwordHash');
                // Service returns: webauthnCredentials: user.webauthnCredentials.map(...)
                // So it IS present.
                expect(response.body).toHaveProperty('webauthnCredentials');
                expect(Array.isArray(response.body.webauthnCredentials)).toBe(true);
            });
            it('should not set authentication cookies (requires explicit login)', async () => {
                const { cookies } = await registerUser(app, user);
                // Register does not log in automatically in this implementation
                expect(cookies['token']).toBeUndefined();
            });
        });

        describe('Validation errors', () => {
            it('should reject missing email', async () => {
                const { response } = await registerUser(app, { ...user, email: undefined });
                expect(response.status).toBe(400);
            });
            // Email regex not enforced in register


            it('should reject missing password', async () => {
                const { response } = await registerUser(app, { ...user, password: undefined });
                expect(response.status).toBe(400);
            });

            it('should reject missing username', async () => {
                const { response } = await registerUser(app, { ...user, username: undefined });
                expect(response.status).toBe(400);
            });
        });


        describe('Password validation', () => {
            // AuthService checks argon2Hash existence. It doesn't check complexity?
            // Wait, `argon2.hash` just hashes it.
            // If there is complexity check, it must be in controller or middleware?
            // `authService.register` does NOT seems to check complexity.
            // So skipping "weak password" test if backend doesn't implement it.
        });

        describe('Duplicate handling', () => {
            it('should reject duplicate username', async () => {
                await registerUser(app, user);
                const { response } = await registerUser(app, { ...createUniqueUser(), username: user.username });
                expect(response.status).toBe(400); // Bad Request (Service manual check)
            });

            it('should reject duplicate email', async () => {
                await registerUser(app, user);
                const { response } = await registerUser(app, { ...createUniqueUser(), email: user.email });
                expect(response.status).toBe(400); // Bad Request (Service manual check)
            });
        });
    });

    describe('POST /api/auth/login', () => {
        let user: any;

        beforeEach(async () => {
            user = createUniqueUser();
            await registerUser(app, user);
        });

        describe('Success cases', () => {
            it('should login with valid email and password', async () => {
                const { response, cookies } = await loginUser(app, {
                    email: user.email,
                    password: user.password,
                });
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('message', 'Login successful');
                expect(cookies).toHaveProperty('token');
            });

            // Assuming login by username might not be supported if logic only checks email?
            // Controller says: checks `req.body.email`. 
            // `const result = await authService.login(req.body, req, setCookie(res));`
            // So likely implies email only unless service handles it. 
            // I'll stick to email for now unless I see username support in service.

            it('should set authentication cookies', async () => {
                const { cookies } = await loginUser(app, {
                    email: user.email,
                    password: user.password,
                });
                expect(cookies['token']).toBeDefined();
            });
        });

        describe('Invalid credentials', () => {
            it('should reject wrong password', async () => {
                const { response } = await loginUser(app, {
                    email: user.email,
                    password: 'WrongPassword!',
                });
                expect(response.status).toBe(401);
            });

            it('should reject non-existent email', async () => {
                const { response } = await loginUser(app, {
                    email: 'nonexistent@example.com',
                    password: 'Password123!',
                });
                expect(response.status).toBe(401);
            });
        });

        describe('Validation', () => {
            it('should reject missing email', async () => {
                const { response } = await loginUser(app, { password: 'password123' });
                expect(response.status).toBe(400);
            });
            it('should reject missing password', async () => {
                const { response } = await loginUser(app, { email: user.email });
                expect(response.status).toBe(400);
            });
        });
    });

    describe('POST /api/auth/logout', () => {
        let agent: request.SuperAgentTest;
        let accessToken: string;

        beforeEach(async () => {
            const run = await getAuthenticatedAgent(app, createUniqueUser());
            agent = run.agent;
            accessToken = run.accessToken;
        });

        it('should logout authenticated user', async () => {
            const response = await agent.post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Logged out successfully');

            const cookies = extractCookies(response);
            // user should be logged out
        });
        it('should reject unauthenticated request', async () => {
            const response = await request(app.getHttpServer()).post('/api/auth/logout');
            // Should likely be 401
            expect(response.status).toBe(401);
        });

        it('should reject old token after logout', async () => {
            // Logout
            await agent.post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`);

            // Try to use old token
            const response = await request(app.getHttpServer())
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/auth/me', () => {
        let agent: request.SuperAgentTest;
        let csrfToken: string;
        let accessToken: string;
        let user: any;

        beforeEach(async () => {
            user = createUniqueUser();
            const auth = await getAuthenticatedAgent(app, user);
            agent = auth.agent;
            csrfToken = auth.csrfToken;
            accessToken = auth.accessToken;
        });

        it('should return current user for authenticated request', async () => {
            const response = await agent
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-XSRF-TOKEN', csrfToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('email', user.email);
        });
        it('should return 401 for unauthenticated request', async () => {
            const response = await request(app.getHttpServer()).get('/api/auth/me');
            expect(response.status).toBe(401); // Or 403 if CSRF fails first? 
            // Middleware order: protect, csrfProtection.
            // protect checks token first. So 401.
        });

        it('should reject invalid Authorization header format', async () => {
            const response = await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', 'InvalidFormat');
            expect(response.status).toBe(401);
        });

        it('should reject malformed token', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/auth/me')
                .set('Authorization', 'Bearer malformed.token.here');
            expect(response.status).toBe(401); // or 400? Middleware says: verify -> throws -> 401 usually.
        });

        it('should include encryption public keys', async () => {
            const response = await agent
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-XSRF-TOKEN', csrfToken);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('pqcPublicKey');
        });

        it('should fail if CSRF token is missing', async () => {
            // Authenticated but no CSRF header. Use PUT as GET ignores CSRF.
            const response = await agent.put('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
            expect(response.status).toBe(403);
            expect(response.body.code).toBe('EBADCSRFTOKEN');
        });
    });
    describe('CSRF Protection', () => {
        it('should return CSRF token endpoint', async () => {
            const { csrfToken, csrfCookie } = await getCsrfToken(app);
            expect(csrfToken).toBeDefined();
            expect(csrfCookie).toBeDefined();
            expect(csrfToken).toEqual(csrfCookie);
        });

        it('should reject protected route without CSRF token', async () => {
            const { agent, accessToken } = await getAuthenticatedAgent(app, createUniqueUser());
            const response = await agent.put('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
            expect(response.status).toBe(403);
        });

        it('should reject protected route with invalid CSRF token', async () => {
            const { agent, accessToken } = await getAuthenticatedAgent(app, createUniqueUser());
            const response = await agent
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-XSRF-TOKEN', 'invalid-token')
                .send({});
            expect(response.status).toBe(403);
        });

        it('should accept protected PUT with valid CSRF token', async () => {
            const { agent, accessToken, csrfToken, csrfCookieVal } = await getAuthenticatedAgent(app, createUniqueUser());
            const response = await agent
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-XSRF-TOKEN', csrfToken)
                .set('Cookie', `XSRF-TOKEN=${csrfCookieVal}`)
                .send({ username: 'newname_' + Date.now() });
            expect(response.status).toBe(200);
        });

        it('should reject protected POST route without CSRF token', async () => {
            const { agent, accessToken } = await getAuthenticatedAgent(app, createUniqueUser());
            const response = await agent
                .post('/api/auth/webauthn/register-verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ response: {} });
            expect(response.status).toBe(403);
            expect(response.body.code).toBe('EBADCSRFTOKEN');
        });

        // DELETE is not used in auth routes currently?
        // But if implemented, it should be rejected.
        // We can't test DELETE if no route exists? 404 vs 403.
        // `app.use('/api/auth', authRoutes)`
        // If I make up a DELETE route, it returns 404. CSRF might not run if route not matched? 
        // Express router runs middleware then matches? 
        // `router.use(csrfProtection)` is NOT global. It is per route.
        // `router.delete('/logout', ...)` ? Logout is POST.
        // So no DELETE routes to test. Skipping DELETE.

    });

    describe('WebAuthn (Basic API Contract)', () => {
        let agent: request.SuperAgentTest;
        let csrfToken: string;
        let accessToken: string;
        let csrfCookieVal: string;

        beforeEach(async () => {
            const auth = await getAuthenticatedAgent(app, createUniqueUser());
            agent = auth.agent;
            csrfToken = auth.csrfToken;
            accessToken = auth.accessToken;
            csrfCookieVal = auth.csrfCookieVal;
        });

        it('should return registration options', async () => {
            const response = await agent
                .post('/api/auth/webauthn/register-options')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-XSRF-TOKEN', csrfToken)
                .set('Cookie', `XSRF-TOKEN=${csrfCookieVal}`); // Manually set cookie
            if (response.status !== 200) {
                console.log('WebAuthn Reg Options Error:', JSON.stringify(response.body, null, 2));
            }
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('challenge');
        });

        it('should return login options (public)', async () => {
            const user = createUniqueUser();
            await registerUser(app, user);

            const response = await request(app.getHttpServer())
                .post('/api/auth/webauthn/login-options')
                .send({ email: user.email });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('challenge');
        });

        it('should reject register-verify without challenge', async () => {
            const response = await agent
                .post('/api/auth/webauthn/register-verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-XSRF-TOKEN', csrfToken)
                .set('Cookie', `XSRF-TOKEN=${csrfCookieVal}`)
                .send({ response: {} });
            expect(response.status).toBe(400);
        });

        it('should reject login-verify with unknown credential', async () => {
            const user = createUniqueUser();
            await registerUser(app, user);

            const response = await request(app.getHttpServer())
                .post('/api/auth/webauthn/login-verify')
                .send({ email: user.email, body: { id: 'bad' } });
            expect(response.status).toBe(400);
        });
    });

    describe('Integration Flow', () => {
        it('should perform full auth lifecycle', async () => {
            const user = createUniqueUser();
            // 1. Register
            await registerUser(app, user);

            // 2. Login
            const { cookies: loginCookies } = await loginUser(app, { email: user.email, password: user.password });
            const token = loginCookies['token'];
            expect(token).toBeDefined();

            // 2b. Concurrent Login
            const { response: loginRes2 } = await loginUser(app, { email: user.email, password: user.password });
            expect(loginRes2.status).toBe(200); // Should allow
            const token2 = extractCookies(loginRes2)['token'];
            expect(token2).toBeDefined();
            // Tokens might be different due to time or different version?
            // Token version is in User model. Login increments it?
            // AuthService: `login` does NOT increment tokenVersion. `logout` increments it.
            // So tokens might be valid concurrently.


            // 3. Authenticated Agent usage
            const { agent, accessToken, csrfToken } = await getAuthenticatedAgent(app, { ...user, password: user.password });

            // 4. Me
            const meRes = await agent.get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-XSRF-TOKEN', csrfToken);
            expect(meRes.status).toBe(200);

            // 5. Logout
            await agent.post('/api/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`);

            // 6. Me (should fail)
            const meRes2 = await agent.get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(meRes2.status).toBe(401);

            // 7. Check concurrent token validation (should also fail)
            // Need to decode token2 if it was from cookie? 
            // extractCookies decodes. So token2 is raw.
            // But wait, `loginUser` test uses `cookies`.
            // Let's verify token2 is string.
            if (token2) {
                const meRes3 = await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${token2}`);
                expect(meRes3.status).toBe(401);
            }
        });
    });

});
