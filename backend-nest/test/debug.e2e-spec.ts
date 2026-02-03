import * as request from 'supertest';

const APP_URL = 'http://localhost:5000';

describe('Debug Auth', () => {
    it('should register and login', async () => {
        const email = `debug_${Date.now()}@example.com`;
        const user = {
            username: `debug_${Date.now()}`,
            email: email,
            argon2Hash: 'password123!',
            pqcPublicKey: 'test_key'
        };

        console.log('Registering...');
        const regRes = await request(APP_URL)
            .post('/api/auth/register')
            .send(user);

        console.log('Reg Response:', regRes.status, regRes.body);
        expect(regRes.status).toBe(201);

        console.log('Logging in...');
        const loginRes = await request(APP_URL)
            .post('/api/auth/login')
            .send({
                email: email,
                argon2Hash: 'password123!'
            });

        console.log('Login Response:', loginRes.status, loginRes.body);
        expect(loginRes.status).toBe(200);

        const cookies = loginRes.header['set-cookie'];
        const tokenCookie = Array.isArray(cookies) ? cookies.find((c: string) => c.startsWith('token=')) : (cookies?.startsWith('token=') ? cookies : undefined);
        expect(tokenCookie).toBeDefined();

        console.log('Getting Me...');
        const meRes = await request(APP_URL)
            .get('/api/auth/me')
            .set('Cookie', tokenCookie);

        console.log('Me Response:', meRes.status, meRes.body);
        // GET /me requires CSRF too!
        // router.get('/me', protect, csrfProtection, getMe);
    });
});
