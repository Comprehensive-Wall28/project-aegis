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
      expect(result._id).toEqual(new mongoose.Types.ObjectId(id));
    });

    it('should handle special _id sanitization with $ne', () => {
      const id = new mongoose.Types.ObjectId().toString();
      const query = { _id: { $ne: id } };
      const result = QuerySanitizer.sanitizeQuery(query);
      expect(result._id).toEqual({ $ne: new mongoose.Types.ObjectId(id) });
    });

    it('should recursive sanitize nested objects', () => {
      const query = { nested: { $where: 'drop' } };
      const result = QuerySanitizer.sanitizeQuery(query);
      expect(result.nested).toEqual({});
    });

    it('should allow null for ID fields', () => {
      const query = { _id: null, parentId: null };
      const result = QuerySanitizer.sanitizeQuery(query);
      expect(result).toEqual({ _id: null, parentId: null });
    });

    it('should allow ObjectId instances for ID fields', () => {
      const id = new mongoose.Types.ObjectId();
      const query = { _id: id, ownerId: id };
      const result = QuerySanitizer.sanitizeQuery(query);
      expect(result).toEqual({ _id: id, ownerId: id });
    });

    it('should allow $eq: null for ID fields', () => {
      const query = { parentId: { $eq: null } };
      const result = QuerySanitizer.sanitizeQuery(query);
      expect(result).toEqual({ parentId: { $eq: null } });
    });

    it('should allow $ne: null for ID fields', () => {
      const query = { parentId: { $ne: null } };
      const result = QuerySanitizer.sanitizeQuery(query);
      expect(result).toEqual({ parentId: { $ne: null } });
    });

    it('should handle $in with mixed null and IDs', () => {
      const id = new mongoose.Types.ObjectId();
      const idStr = id.toString();
      const query = { parentId: { $in: [null, idStr] } };
      const result = QuerySanitizer.sanitizeQuery(query);
      expect(result.parentId).toBeDefined();
      const inList = (result.parentId as any).$in;
      expect(inList).toHaveLength(2);
      expect(inList[0]).toBeNull();
      expect(inList[1]).toEqual(id);
    });

    it('should recognize various ID field names', () => {
      const id = new mongoose.Types.ObjectId();
      const idStr = id.toString();
      const query = {
        folderId: idStr,
        sharedWith: idStr,
        sharedBy: idStr,
        linkId: idStr,
        inviteId: idStr,
      };
      const result = QuerySanitizer.sanitizeQuery(query);
      expect(result.folderId).toEqual(id);
      expect(result.sharedWith).toEqual(id);
      expect(result.sharedBy).toEqual(id);
      expect(result.linkId).toEqual(id);
      expect(result.inviteId).toEqual(id);
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
