import {
  Document,
  Model,
  UpdateQuery,
  ClientSession,
  MongooseBulkWriteOptions,
} from 'mongoose';
import { Logger } from '@nestjs/common';
import {
  QueryOptions,
  SafeFilter,
  BulkWriteOperation,
  BulkWriteResult,
  RepositoryError,
  RepositoryErrorCode,
} from './types';
import { QuerySanitizer } from './query-sanitizer';

/**
 * BaseRepository provides a secure, high-performance abstraction for MongoDB operations
 * All queries are automatically sanitized to prevent NoSQL injection
 */
export abstract class BaseRepository<T extends Document> {
  protected readonly logger: Logger;

  constructor(protected readonly model: Model<T>) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Validate and sanitize an ObjectId
   */
  protected validateId(id: unknown): string {
    const sanitizedId = QuerySanitizer.sanitizeObjectId(id);
    if (!sanitizedId) {
      throw new RepositoryError(
        'Invalid ID format',
        RepositoryErrorCode.INVALID_ID,
      );
    }
    return sanitizedId;
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction<R>(
    operation: (session: ClientSession) => Promise<R>,
  ): Promise<R> {
    const session = await this.model.db.startSession();

    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Transaction aborted due to error:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Find a document by ID
   */
  async findById(id: string, options: QueryOptions = {}): Promise<T | null> {
    const sanitizedId = this.validateId(id);

    try {
      let query = this.model.findById(sanitizedId);
      query = this.applyOptions(query, options);

      const result = await query.exec();
      return result;
    } catch (error) {
      this.logger.error(`Repository findById error:`, error);
      throw new RepositoryError(
        'Failed to find document by ID',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Find a single document matching the filter
   */
  async findOne(
    filter: SafeFilter<T>,
    options: QueryOptions = {},
  ): Promise<T | null> {
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter);

    try {
      let query = this.model.findOne(sanitizedFilter as any);
      query = this.applyOptions(query, options);

      return await query.exec();
    } catch (error) {
      this.logger.error(`Repository findOne error:`, error);
      throw new RepositoryError(
        'Failed to find document',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Find multiple documents matching the filter
   */
  async findMany(
    filter: SafeFilter<T>,
    options: QueryOptions = {},
  ): Promise<T[]> {
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter);

    try {
      let query = this.model.find(sanitizedFilter as any);
      query = this.applyOptions(query, options);

      return await query.exec();
    } catch (error) {
      this.logger.error(`Repository findMany error:`, error);
      throw new RepositoryError(
        'Failed to find documents',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Find documents with cursor-based pagination
   */
  async findPaginated(
    filter: SafeFilter<T>,
    options: {
      limit: number;
      cursor?: string;
      sortField?: string;
      sortOrder?: 1 | -1;
    },
  ): Promise<{ items: T[]; nextCursor: string | null }> {
    const { limit, cursor, sortField = '_id', sortOrder = 1 } = options;
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter) as any;

    try {
      if (cursor) {
        const operator = sortOrder === 1 ? '$gt' : '$lt';
        sanitizedFilter[sortField] = { [operator]: cursor };
      }

      const items = await this.model
        .find(sanitizedFilter)
        .sort({ [sortField]: sortOrder } as any)
        .limit(limit)
        .exec();

      const nextCursor =
        items.length > 0 && items.length === limit
          ? (items[items.length - 1] as any)[sortField].toString()
          : null;

      return { items, nextCursor };
    } catch (error) {
      this.logger.error(`Repository findPaginated error:`, error);
      throw new RepositoryError(
        'Failed to find paginated documents',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const document = await this.model.create(data);
      return document;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new RepositoryError(
          'Duplicate key error',
          RepositoryErrorCode.DUPLICATE_KEY,
          error,
        );
      }
      this.logger.error(`Repository create error:`, error);
      throw new RepositoryError(
        'Failed to create document',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Update a document by ID
   */
  async updateById(
    id: string,
    data: UpdateQuery<T>,
    options: { returnNew?: boolean } = {},
  ): Promise<T | null> {
    const sanitizedId = this.validateId(id);
    const sanitizedUpdate = QuerySanitizer.sanitizeUpdate(data);

    try {
      const result = await this.model
        .findByIdAndUpdate(sanitizedId, sanitizedUpdate as any, {
          new: options.returnNew ?? true,
        })
        .exec();

      return result;
    } catch (error) {
      this.logger.error(`Repository updateById error:`, error);
      throw new RepositoryError(
        'Failed to update document',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Update a single document matching the filter
   */
  async updateOne(
    filter: SafeFilter<T>,
    data: UpdateQuery<T>,
    options: { returnNew?: boolean; upsert?: boolean } = {},
  ): Promise<T | null> {
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter);
    const sanitizedUpdate = QuerySanitizer.sanitizeUpdate(data);

    try {
      const result = await this.model
        .findOneAndUpdate(sanitizedFilter as any, sanitizedUpdate as any, {
          new: options.returnNew ?? true,
          upsert: options.upsert ?? false,
        })
        .exec();

      return result;
    } catch (error) {
      this.logger.error(`Repository updateOne error:`, error);
      throw new RepositoryError(
        'Failed to update document',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Update multiple documents matching the filter
   */
  async updateMany(
    filter: SafeFilter<T>,
    data: UpdateQuery<T>,
  ): Promise<number> {
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter);
    const sanitizedUpdate = QuerySanitizer.sanitizeUpdate(data);

    try {
      const result = await this.model
        .updateMany(sanitizedFilter as any, sanitizedUpdate as any)
        .exec();

      return result.modifiedCount;
    } catch (error) {
      this.logger.error(`Repository updateMany error:`, error);
      throw new RepositoryError(
        'Failed to update documents',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Delete a document by ID
   */
  async deleteById(id: string): Promise<boolean> {
    const sanitizedId = this.validateId(id);

    try {
      const result = await this.model.findByIdAndDelete(sanitizedId).exec();
      return result !== null;
    } catch (error) {
      this.logger.error(`Repository deleteById error:`, error);
      throw new RepositoryError(
        'Failed to delete document',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Delete a single document matching the filter
   */
  async deleteOne(filter: SafeFilter<T>): Promise<boolean> {
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter);

    try {
      const result = await this.model
        .findOneAndDelete(sanitizedFilter as any)
        .exec();
      return result !== null;
    } catch (error) {
      this.logger.error(`Repository deleteOne error:`, error);
      throw new RepositoryError(
        'Failed to delete document',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Delete multiple documents matching the filter
   */
  async deleteMany(filter: SafeFilter<T>): Promise<number> {
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter);

    try {
      const result = await this.model.deleteMany(sanitizedFilter as any).exec();
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`Repository deleteMany error:`, error);
      throw new RepositoryError(
        'Failed to delete documents',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Perform bulk write operations
   */
  async bulkWrite(
    operations: BulkWriteOperation<T>[],
    options: MongooseBulkWriteOptions = {},
  ): Promise<BulkWriteResult> {
    // Sanitize all operations
    const sanitizedOps = operations.map((op) => {
      if ('insertOne' in op) {
        return op;
      }
      if ('updateOne' in op) {
        return {
          updateOne: {
            filter: QuerySanitizer.sanitizeQuery(op.updateOne.filter),
            update: QuerySanitizer.sanitizeUpdate(op.updateOne.update),
            upsert: op.updateOne.upsert,
          },
        };
      }
      if ('updateMany' in op) {
        return {
          updateMany: {
            filter: QuerySanitizer.sanitizeQuery(op.updateMany.filter),
            update: QuerySanitizer.sanitizeUpdate(op.updateMany.update),
          },
        };
      }
      if ('deleteOne' in op) {
        return {
          deleteOne: {
            filter: QuerySanitizer.sanitizeQuery(op.deleteOne.filter),
          },
        };
      }
      if ('deleteMany' in op) {
        return {
          deleteMany: {
            filter: QuerySanitizer.sanitizeQuery(op.deleteMany.filter),
          },
        };
      }
      return op;
    });

    try {
      const result = await this.model.bulkWrite(sanitizedOps as any, options);

      return {
        insertedCount: result.insertedCount,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        deletedCount: result.deletedCount,
        upsertedCount: result.upsertedCount,
      };
    } catch (error) {
      this.logger.error(`Repository bulkWrite error:`, error);
      throw new RepositoryError(
        'Failed to perform bulk write',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Run aggregation pipeline with sanitization
   */
  async aggregate<R>(pipeline: object[]): Promise<R[]> {
    // Basic sanitization of pipeline stages
    const sanitizedPipeline = pipeline.map((stage) => {
      const stageObj = stage as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(stageObj)) {
        if (key === '$match') {
          result[key] = QuerySanitizer.sanitizeQuery(value);
        } else if (key === '$sort') {
          result[key] = QuerySanitizer.sanitizeSort(value);
        } else if (key === '$project') {
          result[key] = QuerySanitizer.sanitizeProjection(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    });

    try {
      return await this.model.aggregate(sanitizedPipeline as any[]).exec();
    } catch (error) {
      this.logger.error(`Repository aggregate error:`, error);
      throw new RepositoryError(
        'Failed to run aggregation',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Count documents matching the filter
   */
  async count(filter: SafeFilter<T> = {}): Promise<number> {
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter);

    try {
      return await this.model.countDocuments(sanitizedFilter as any).exec();
    } catch (error) {
      this.logger.error(`Repository count error:`, error);
      throw new RepositoryError(
        'Failed to count documents',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Check if a document exists
   */
  async exists(filter: SafeFilter<T>): Promise<boolean> {
    const sanitizedFilter = QuerySanitizer.sanitizeQuery(filter);

    try {
      const result = await this.model.exists(sanitizedFilter as any).exec();
      return result !== null;
    } catch (error) {
      this.logger.error(`Repository exists error:`, error);
      throw new RepositoryError(
        'Failed to check document existence',
        RepositoryErrorCode.QUERY_ERROR,
        error,
      );
    }
  }

  /**
   * Apply query options to a Mongoose query
   */
  private applyOptions(query: any, options: QueryOptions): any {
    if (options.sort) {
      const sanitizedSort = QuerySanitizer.sanitizeSort(options.sort);
      query = query.sort(sanitizedSort);
    }

    if (options.limit !== undefined) {
      query = query.limit(options.limit);
    }

    if (options.skip !== undefined) {
      query = query.skip(options.skip);
    }

    if (options.select) {
      const sanitizedSelect =
        typeof options.select === 'string'
          ? QuerySanitizer.sanitizeProjection(options.select)
          : options.select;
      query = query.select(sanitizedSelect);
    }

    if (options.lean) {
      query = query.lean();
    }

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        for (const pop of options.populate) {
          query = query.populate(pop);
        }
      } else {
        query = query.populate(options.populate);
      }
    }

    return query;
  }
}
