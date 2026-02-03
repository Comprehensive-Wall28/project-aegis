import { QuerySanitizer } from '../../src/common/database/query-sanitizer';
import mongoose from 'mongoose';

describe('QuerySanitizer', () => {
    describe('sanitizeObjectId', () => {
        it('should return valid ObjectId string', () => {
            const validId = '507f1f77bcf86cd799439011';
            expect(QuerySanitizer.sanitizeObjectId(validId)).toBe(validId);
        });

        it('should return null for invalid string', () => {
            expect(QuerySanitizer.sanitizeObjectId('invalid')).toBeNull();
        });

        it('should return null for non-string input', () => {
            expect(QuerySanitizer.sanitizeObjectId(123)).toBeNull();
            expect(QuerySanitizer.sanitizeObjectId({})).toBeNull();
            expect(QuerySanitizer.sanitizeObjectId(null)).toBeNull();
        });

        it('should return null for valid hex string of wrong length', () => {
            expect(QuerySanitizer.sanitizeObjectId('507f1f77bcf86cd79943901')).toBeNull(); // 23 chars
        });
    });

    describe('wrapEquality', () => {
        it('should wrap value in $eq', () => {
            expect(QuerySanitizer.wrapEquality('test')).toEqual({ $eq: 'test' });
        });
    });

    describe('sanitizeFilter', () => {
        it('should return empty object for null/undefined', () => {
            expect(QuerySanitizer.sanitizeFilter(null)).toEqual({});
            expect(QuerySanitizer.sanitizeFilter(undefined)).toEqual({});
        });

        it('should sanitize regular fields', () => {
            const filter = { name: 'test', age: 25 };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual(filter);
        });

        it('should block dangerous operators', () => {
            const filter = {
                $where: 'sleep(1000)',
                active: true,
            };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({ active: true });
        });

        it('should allow safe operators', () => {
            const filter = {
                age: { $gt: 18 },
                status: { $in: ['active', 'pending'] },
            };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual(filter);
        });

        it('should sanitize nested objects', () => {
            const filter = {
                meta: {
                    $where: 'bad',
                    valid: true,
                },
            };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({
                meta: { valid: true },
            });
        });

        it('should sanitize arrays (OR/AND)', () => {
            const filter = {
                $or: [
                    { $where: 'bad' },
                    { name: 'test' },
                ],
            };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({
                $or: [
                    {},
                    { name: 'test' },
                ],
            });
        });

        it('should sanitize _id field with string', () => {
            const validId = '507f1f77bcf86cd799439011';
            const filter = { _id: validId };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({
                _id: { $eq: validId },
            });
        });

        it('should ignore invalid _id string', () => {
            const filter = { _id: 'invalid' };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({});
        });

        it('should sanitize _id with $eq object', () => {
            const validId = '507f1f77bcf86cd799439011';
            const filter = { _id: { $eq: validId } };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({
                _id: { $eq: validId },
            });

            const invalidFilter = { _id: { $eq: 'invalid' } };
            expect(QuerySanitizer.sanitizeFilter(invalidFilter)).toEqual({});
        });

        it('should sanitize _id with $in array', () => {
            const validId1 = '507f1f77bcf86cd799439011';
            const validId2 = '507f1f77bcf86cd799439012';
            const filter = {
                _id: { $in: [validId1, 'invalid', validId2] },
            };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({
                _id: { $in: [validId1, validId2] },
            });
        });

        it('should preserve Date objects', () => {
            const date = new Date();
            const filter = { createdAt: { $gt: date } };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({
                createdAt: { $gt: date }
            });
        });

        it('should preserve ObjectId objects', () => {
            const id = new mongoose.Types.ObjectId();
            const filter = { otherId: id };
            expect(QuerySanitizer.sanitizeFilter(filter)).toEqual({
                otherId: id
            });
        });
    });

    describe('sanitizeUpdate', () => {
        it('should allow safe update operators', () => {
            const update = {
                $set: { name: 'new' },
                $inc: { count: 1 },
            };
            expect(QuerySanitizer.sanitizeUpdate(update)).toEqual(update);
        });

        it('should block dangerous operators at top level', () => {
            const update = {
                $where: 'bad',
                $set: { name: 'safe' },
            };
            expect(QuerySanitizer.sanitizeUpdate(update)).toEqual({
                $set: { name: 'safe' },
            });
        });

        it('should block dangerous operators in values (immediate keys)', () => {
            const update = {
                $set: {
                    $where: 'bad'
                }
            };
            // The implementation blocks the entire key if the value contains dangerous operators as immediate keys
            expect(QuerySanitizer.sanitizeUpdate(update)).toEqual({});
        });

        it('should NOT block deep nested dangerous operators (shallow check limitation)', () => {
            const update = {
                $set: {
                    field: { $where: 'bad' }
                }
            };
            expect(QuerySanitizer.sanitizeUpdate(update)).toEqual(update);
        });
    });

    describe('sanitizeSort', () => {
        it('should allow 1 and -1', () => {
            const sort = { field1: 1, field2: -1 };
            expect(QuerySanitizer.sanitizeSort(sort)).toEqual(sort);
        });

        it('should filter out non 1/-1 values', () => {
            const sort = { field1: 1, field2: 2, field3: 'asc' };
            expect(QuerySanitizer.sanitizeSort(sort)).toEqual({ field1: 1 });
        });

        it('should block operator keys', () => {
            const sort = { $where: 1, field: 1 };
            expect(QuerySanitizer.sanitizeSort(sort)).toEqual({ field: 1 });
        });
    });

    describe('sanitizeProjection', () => {
        it('should sanitize string projection', () => {
            const proj = 'field1 field2 $where';
            expect(QuerySanitizer.sanitizeProjection(proj)).toBe('field1 field2');
        });

        it('should sanitize object projection', () => {
            const proj = { field1: 1, field2: 0, $where: 1, field3: 2 };
            expect(QuerySanitizer.sanitizeProjection(proj)).toEqual({ field1: 1, field2: 0 });
        });
    });
});
