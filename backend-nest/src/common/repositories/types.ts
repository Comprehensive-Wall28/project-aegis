import mongoose, { UpdateQuery } from 'mongoose';

/**
 * Helper to allow string IDs where ObjectIds are expected in queries
 */
type WithStringId<V> = V extends mongoose.Types.ObjectId | undefined | null
  ? V | string
  : V;

/**
 * Query options for repository find operations
 */
export interface QueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  select?: string | string[] | Record<string, 0 | 1>;
  lean?: boolean;
  populate?: string | PopulateOptions | (string | PopulateOptions)[];
}

export interface PopulateOptions {
  path: string;
  select?: string;
  model?: string;
  match?: Record<string, unknown>;
}

/**
 * Safe filter type that enforces query patterns resistant to injection
 * All values should be wrapped in $eq or use safe operators
 */
export type SafeFilter<T> = {
  [K in keyof Partial<T>]?:
    | WithStringId<T[K]>
    | null
    | { $eq: WithStringId<T[K]> | null }
    | { $ne: WithStringId<T[K]> | null }
    | { $in: (WithStringId<T[K]> | null)[] }
    | { $nin: (WithStringId<T[K]> | null)[] }
    | { $gt: WithStringId<T[K]> }
    | { $gte: WithStringId<T[K]> }
    | { $lt: WithStringId<T[K]> }
    | { $lte: WithStringId<T[K]> }
    | { $exists: boolean };
} & {
  _id?: string | { $eq: string } | { $in: string[] };
  $and?: SafeFilter<T>[];
  $or?: SafeFilter<T>[];
};

/**
 * Bulk write operation types for batch operations
 */
export interface BulkInsertOne<T> {
  insertOne: {
    document: Partial<T>;
  };
}

export interface BulkUpdateOne<T> {
  updateOne: {
    filter: SafeFilter<T>;
    update: UpdateQuery<T>;
    upsert?: boolean;
  };
}

export interface BulkUpdateMany<T> {
  updateMany: {
    filter: SafeFilter<T>;
    update: UpdateQuery<T>;
  };
}

export interface BulkDeleteOne<T> {
  deleteOne: {
    filter: SafeFilter<T>;
  };
}

export interface BulkDeleteMany<T> {
  deleteMany: {
    filter: SafeFilter<T>;
  };
}

export type BulkWriteOperation<T> =
  | BulkInsertOne<T>
  | BulkUpdateOne<T>
  | BulkUpdateMany<T>
  | BulkDeleteOne<T>
  | BulkDeleteMany<T>;

/**
 * Result of bulk write operations
 */
export interface BulkWriteResult {
  insertedCount: number;
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
}

/**
 * Repository error types for consistent error handling
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: RepositoryErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export enum RepositoryErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  INVALID_ID = 'INVALID_ID',
  QUERY_ERROR = 'QUERY_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
}
