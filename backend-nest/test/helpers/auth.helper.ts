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

    if (response.status !== 201) {
        console.error('Registration failed:', response.status, response.body);
    }

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

    if (response.status !== 200) {
        console.error('Login failed:', response.status, response.body);
    }

    return {
        response,
        cookies: extractCookies(response),
    };
};



export const getAuthenticatedAgent = async (app: AppTarget, userData: any) => {
    const agent = request.agent(typeof app === 'string' ? app : app.getHttpServer());
    const email = userData.email.toLowerCase();
    const password = userData.password.toLowerCase();

    // 1. Register
    const regRes = await agent
        .post('/api/auth/register')
        .send({
            username: userData.username,
            email: email,
            argon2Hash: password,
            pqcPublicKey: userData.pqcPublicKey || 'test_key'
        });

    if (regRes.status !== 201 && regRes.status !== 400) {
        throw new Error(`Registration failed: ${regRes.status} ${JSON.stringify(regRes.body)}`);
    }

    // 2. Login
    const loginRes = await agent
        .post('/api/auth/login')
        .send({
            email: email,
            argon2Hash: password
        });

    if (loginRes.status !== 200) {
        throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
    }

    return {
        agent,
        accessToken: extractCookies(loginRes)['token'],
        userId: loginRes.body._id
    };
};
