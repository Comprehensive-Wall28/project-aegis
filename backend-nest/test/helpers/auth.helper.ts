import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

export type AppTarget = INestApplication | string;

export const getRequest = (app: AppTarget) => {
    return typeof app === 'string' ? request(app) : request(app.getHttpServer());
};

export const extractCookies = (response: any): Record<string, string> => {
    const cookies: Record<string, string> = {};
    const setCookieHeader = response.headers['set-cookie'];

    if (setCookieHeader) {
        setCookieHeader.forEach((cookieStr: string) => {
            const [nameValue] = cookieStr.split(';');
            const parts = nameValue.split('=');
            const name = parts[0];
            const value = decodeURIComponent(parts.slice(1).join('='));
            cookies[name] = value;
        });
    }

    return cookies;
};

export const registerUser = async (app: AppTarget, userData: any) => {
    const payload = { ...userData };
    if (payload.password && !payload.argon2Hash) {
        payload.argon2Hash = payload.password;
        delete payload.password;
    }

    const response = await getRequest(app)
        .post('/api/auth/register')
        .send(payload);

    return {
        response,
        cookies: extractCookies(response),
    };
};

export const loginUser = async (app: AppTarget, credentials: any) => {
    const payload = { ...credentials };
    if (payload.password && !payload.argon2Hash) {
        payload.argon2Hash = payload.password;
        delete payload.password;
    }

    const response = await getRequest(app)
        .post('/api/auth/login')
        .send(payload);

    return {
        response,
        cookies: extractCookies(response),
    };
};

export const getCsrfToken = async (app: AppTarget) => {
    const response = await getRequest(app).get('/api/auth/csrf-token');
    const cookies = extractCookies(response);
    const csrfCookie = cookies['XSRF-TOKEN'];
    const csrfToken = response.body.csrfToken; // Signed token from body

    return {
        csrfCookie, // The cookie value (signed)
        csrfToken,  // The body value (signed), which should match cookie
        response,
    };
};

export const getAuthenticatedAgent = async (app: AppTarget, userData: any) => {
    // 1. Register
    await registerUser(app, userData);

    // 2. Login to get token (since register doesn't return it)
    const loginRes = await loginUser(app, {
        email: userData.email,
        password: userData.password
    });

    const cookies = loginRes.cookies;
    const token = cookies['token'];

    // 3. Get CSRF Token
    const csrfRes = await getCsrfToken(app);

    // Create an agent that has these cookies set
    const agentWithSession = request.agent(typeof app === 'string' ? app : app.getHttpServer());

    // Need to manually set cookies on the agent?
    // Supertest agents usually persist cookies if they receive them in responses.
    // So we should perform the login WITH the agent.

    await agentWithSession
        .post('/api/auth/login')
        .send({
            email: userData.email,
            argon2Hash: userData.password
        });

    // Get CSRF using the AGENT
    const csrfResAgent = await agentWithSession.get('/api/auth/csrf-token');
    const csrfToken = csrfResAgent.body.csrfToken;

    const agentCookies = extractCookies(csrfResAgent);
    const csrfCookieVal = agentCookies['XSRF-TOKEN'];

    return {
        agent: agentWithSession,
        csrfToken,
        csrfCookieVal,
        accessToken: token, // Return the token from the first login (or extract from agent login if needed)
        userId: null // We might need to get me to get ID, or parse from somewhere. Logic omitted for brevity as usually not needed for auth checks strictly unless we check ID match.
    };
};
