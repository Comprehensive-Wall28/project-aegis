import mongoose from 'mongoose';
import { QuerySanitizer } from './QuerySanitizer';

describe('QuerySanitizer', () => {
    describe('sanitizeObjectId', () => {
        it('should return valid object id string', () => {
            const id = new mongoose.Types.ObjectId().toString();
            expect(QuerySanitizer.sanitizeObjectId(id)).toBe(id);
        });

        it('should return null for invalid object id', () => {
            expect(QuerySanitizer.sanitizeObjectId('invalid')).toBeNull();
            expect(QuerySanitizer.sanitizeObjectId(123)).toBeNull();
        });
    });

    describe('sanitizeQuery', () => {
        it('should allow safe operators', () => {
            const query = { age: { $gt: 10 } };
            const result = QuerySanitizer.sanitizeQuery(query);
            expect(result).toEqual(query);
        });

        it('should strip dangerous operators', () => {
            const query = { $where: 'sleep(1000)' };
            const result = QuerySanitizer.sanitizeQuery(query);
            expect(result).toEqual({});
        });

        it('should handle special _id sanitization with $eq', () => {
            const id = new mongoose.Types.ObjectId().toString();
            const query = { _id: id };
            const result = QuerySanitizer.sanitizeQuery(query);
            expect(result._id).toEqual({ $eq: id });
        });

        it('should handle special _id sanitization with $ne', () => {
            const id = new mongoose.Types.ObjectId().toString();
            const query = { _id: { $ne: id } };
            const result = QuerySanitizer.sanitizeQuery(query);
            expect(result._id).toEqual({ $ne: id });
        });

        it('should recursive sanitize nested objects', () => {
            const query = { nested: { $where: 'drop' } };
            const result = QuerySanitizer.sanitizeQuery(query);
            expect(result.nested).toEqual({});
        });
    });

    describe('sanitizeUpdate', () => {
        it('should allow $set and $inc', () => {
            const update = { $set: { a: 1 }, $inc: { b: 1 } };
            expect(QuerySanitizer.sanitizeUpdate(update)).toEqual(update);
        });

        it('should strip $where from values', () => {
            const update = { field: { $where: 'injection' } };
            expect(QuerySanitizer.sanitizeUpdate(update)).toEqual({});
        });
    });
});
