import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { AppModule } from '../src/app.module';

dotenv.config();

let mongod: MongoMemoryServer;

export async function createTestingModule(): Promise<TestingModule> {
    return Test.createTestingModule({
        imports: [AppModule],
    }).compile();
}

export async function getTestDatabase(): Promise<MongoMemoryServer | null> {
    if (!mongod) {
        try {
            mongod = await MongoMemoryServer.create({
                binary: {
                    version: '7.0.2',
                },
            });
        } catch (error) {
            console.warn('MongoMemoryServer failed to start, falling back to local MongoDB from .env:', error.message);
            return null;
        }
    }
    return mongod;
}

export async function cleanupDatabase() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
}

export async function closeDatabase() {
    await mongoose.disconnect();
    if (mongod) {
        await mongod.stop();
    }
}

export async function createTestApp(): Promise<{ app: NestFastifyApplication; module: TestingModule }> {
    const db = await getTestDatabase();

    if (db) {
        const uri = db.getUri();
        process.env.MONGO_URI = uri;
    } else {
        // Fallback to .env or default if memory server failed
        if (!process.env.MONGO_URI) {
            console.warn('No MONGO_URI in .env, falling back to localhost default');
            process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/aegis_test';
        } else {
            console.log('Using MONGO_URI from .env:', process.env.MONGO_URI);
        }
    }

    process.env.NODE_ENV = 'test';
    // Only set these if not already present, to allow .env override
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
    process.env.COOKIE_ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY || 'test_key_12345678901234567890123456789012'; // 32 chars
    process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test_csrf_secret';
    process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    process.env.WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
    process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

    const moduleFixture = await createTestingModule();

    const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
    );

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
        }),
    );

    app.setGlobalPrefix('api');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return { app, module: moduleFixture };
}
