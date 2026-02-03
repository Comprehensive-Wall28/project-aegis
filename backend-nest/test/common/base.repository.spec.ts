import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import mongoose, { Document, Model, Schema } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { BaseRepository } from '../../src/common/database/base.repository';
import { RepositoryErrorCode } from '../../src/common/database/repository.error';
import { QuerySanitizer } from '../../src/common/database/query-sanitizer';

// Load env vars manually from .env in the same directory as package.json (root of backend-nest)
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('.env file not found at:', envPath);
}

// Define Test Schema
interface TestDocument extends Document {
    name: string;
    value: number;
    email?: string; // unique field
}

const TestSchema = new Schema({
    name: { type: String, required: true },
    value: { type: Number, required: true },
    email: { type: String, unique: true, sparse: true }
});

// Concrete Repository
class TestRepository extends BaseRepository<TestDocument> {
    constructor(@InjectModel('TestEntity') model: Model<TestDocument>) {
        super(model);
    }
}

describe('BaseRepository (Integration)', () => {
    let module: TestingModule;
    let repository: TestRepository;
    let model: Model<TestDocument>;
    const testDbName = `aegis_test_base_repo_${Date.now()}`;
    let mongoUri: string;

    beforeAll(async () => {
        // Construct URI with unique DB name
        const baseUrl = process.env.MONGO_URI;
        if (!baseUrl) {
            throw new Error('MONGO_URI not found in environment');
        }

        // Handle URI parameters if present
        if (baseUrl.includes('?')) {
            const [base, params] = baseUrl.split('?');
            mongoUri = `${base}${base.endsWith('/') ? '' : '/'}${testDbName}?${params}`;
        } else {
            mongoUri = `${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}${testDbName}`;
        }

        module = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(mongoUri),
                MongooseModule.forFeature([{ name: 'TestEntity', schema: TestSchema }])
            ],
            providers: [TestRepository]
        }).compile();

        repository = module.get<TestRepository>(TestRepository);
        model = module.get<Model<TestDocument>>('TestEntityModel');
    });

    afterEach(async () => {
        if (model) {
            await model.deleteMany({});
        }
    });

    afterAll(async () => {
        if (module) {
            // Drop the test database to clean up
            // Drop database not allowed by this user role
            // if (model && model.db) {
            //     await model.db.dropDatabase();
            // }
            await module.close();
        }
    });

    describe('create', () => {
        it('should create a document', async () => {
            const data = { name: 'test', value: 1 };
            const result = await repository.create(data);
            expect(result.name).toBe(data.name);
            expect(result.value).toBe(data.value);
            expect(result._id).toBeDefined();
        });

        it('should throw DUPLICATE_KEY error', async () => {
            const data = { name: 'test', value: 1, email: 'dup@test.com' };
            await repository.create(data);

            await expect(repository.create(data)).rejects.toMatchObject({
                code: RepositoryErrorCode.DUPLICATE_KEY
            });
        });
    });

    describe('findById', () => {
        it('should find document by id', async () => {
            const created = await repository.create({ name: 'find', value: 2 });
            const found = await repository.findById(created._id.toString());
            expect(found).toBeDefined();
            expect(found?._id.toString()).toBe(created._id.toString());
        });

        it('should return null if not found', async () => {
            const id = new mongoose.Types.ObjectId().toString();
            const found = await repository.findById(id);
            expect(found).toBeNull();
        });

        it('should throw INVALID_ID for invalid id', async () => {
            await expect(repository.findById('invalid-id')).rejects.toMatchObject({
                code: RepositoryErrorCode.INVALID_ID
            });
        });
    });

    describe('findOne', () => {
        it('should find one document by filter', async () => {
            const created = await repository.create({ name: 'find-one', value: 3 });
            const found = await repository.findOne({ name: 'find-one' });
            expect(found).toBeDefined();
            expect(found?._id.toString()).toBe(created._id.toString());
        });

        it('should sanitize dangerous operators', async () => {
            await repository.create({ name: 'safe', value: 10 });
            // Should not find anything because $where is stripped
            const filter = { $where: 'this.value === 10' } as any;
            const found = await repository.findOne(filter);

            // Query becomes {} -> finds first doc (which is our doc) OR finds nothing if strictly sanitized to empty object and logic differs
            // QuerySanitizer logic: sanitizeFilter({ $where: ... }) -> {}

            await repository.create({ name: 'other', value: 20 });
            const dangerousFilter = { $where: 'this.value === 20' } as any;

            const result = await repository.findOne(dangerousFilter);

            // If sanitized to {}, it likely returns the first created doc ('safe', value=10)

            expect(result).toBeDefined();
            expect(result?.value).not.toBe(20);
            expect(result?.value).toBe(10);
        });
    });

    describe('findMany', () => {
        it('should find multiple documents', async () => {
            await repository.create({ name: 'multi', value: 1 });
            await repository.create({ name: 'multi', value: 2 });
            const found = await repository.findMany({ name: 'multi' }, { sort: { value: 1 } });
            expect(found).toHaveLength(2);
            expect(found[0].value).toBe(1);
            expect(found[1].value).toBe(2);
        });
    });

    describe('updateById', () => {
        it('should update document by id', async () => {
            const created = await repository.create({ name: 'update', value: 4 });
            const updated = await repository.updateById(created._id.toString(), { value: 5 });
            expect(updated?.value).toBe(5);
        });
    });

    describe('deleteById', () => {
        it('should delete document by id', async () => {
            const created = await repository.create({ name: 'delete', value: 6 });
            const deleted = await repository.deleteById(created._id.toString());
            expect(deleted).toBe(true);
            const found = await repository.findById(created._id.toString());
            expect(found).toBeNull();
        });
    });

    describe('withTransaction', () => {
        it('should commit transaction on success', async () => {
            await repository.withTransaction(async (session) => {
                await model.create([{ name: 'tx', value: 10 }], { session });
            });
            const found = await repository.findOne({ name: 'tx' });
            expect(found).toBeDefined();
        });

        it('should rollback transaction on error', async () => {
            try {
                await repository.withTransaction(async (session) => {
                    await model.create([{ name: 'tx-fail', value: 11 }], { session });
                    throw new Error('Rollback');
                });
            } catch (e) {
                // expected
            }
            const found = await repository.findOne({ name: 'tx-fail' });
            expect(found).toBeNull();
        });
    });
});
