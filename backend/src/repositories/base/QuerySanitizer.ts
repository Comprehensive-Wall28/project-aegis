import mongoose from 'mongoose';

/**
 * Dangerous MongoDB operators that should never appear in user input
 */
const DANGEROUS_OPERATORS = [
    '$where',
    '$function',
    '$accumulator',
    '$expr',
    '$jsonSchema',
];

/**
 * Operators allowed in queries (safe subset)
 */
const ALLOWED_OPERATORS = new Set([
    '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
    '$in', '$nin', '$exists', '$and', '$or',
    '$set', '$unset', '$inc', '$push', '$pull',
    '$addToSet', '$pop', '$rename',
]);

/**
 * QuerySanitizer provides deep sanitization of MongoDB queries
 * to prevent NoSQL injection attacks beyond express-mongo-sanitize
 */
export class QuerySanitizer {
    /**
     * Validate and return a sanitized ObjectId string
     * Returns null if invalid
     */
    static sanitizeObjectId(id: unknown): string | null {
        if (typeof id !== 'string') {
            return null;
        }

        // Check if it's a valid ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null;
        }

        // Additional check: ensure the string represents the same ObjectId when converted
        try {
            const objectId = new mongoose.Types.ObjectId(id);
            if (objectId.toString() !== id) {
                return null;
            }
        } catch {
            return null;
        }

        return id;
    }

    /**
     * Wrap a value in $eq operator to prevent operator injection
     */
    static wrapEquality<T>(value: T): { $eq: T } {
        return { $eq: value };
    }

    /**
     * Recursively sanitize a query object
     * Removes dangerous operators and validates structure
     */
    static sanitizeQuery<T>(query: unknown): Record<string, unknown> {
        if (query === null || query === undefined) {
            return {};
        }

        if (typeof query !== 'object') {
            return {};
        }

        if (Array.isArray(query)) {
            return query.map(item => this.sanitizeQuery(item)) as unknown as Record<string, unknown>;
        }

        const sanitized: Record<string, unknown> = {};
        const queryObj = query as Record<string, unknown>;

        for (const [key, value] of Object.entries(queryObj)) {
            // Block dangerous operators
            if (DANGEROUS_OPERATORS.includes(key)) {
                continue;
            }

            // For operator keys, validate they're allowed
            if (key.startsWith('$')) {
                if (!ALLOWED_OPERATORS.has(key)) {
                    continue;
                }
            }

            // Handle _id field specially
            if (key === '_id') {
                if (typeof value === 'string') {
                    const sanitizedId = this.sanitizeObjectId(value);
                    if (sanitizedId) {
                        sanitized[key] = { $eq: sanitizedId };
                    }
                } else if (typeof value === 'object' && value !== null) {
                    const idObj = value as Record<string, unknown>;
                    if ('$eq' in idObj && typeof idObj.$eq === 'string') {
                        const sanitizedId = this.sanitizeObjectId(idObj.$eq);
                        if (sanitizedId) {
                            sanitized[key] = { $eq: sanitizedId };
                        }
                    } else if ('$in' in idObj && Array.isArray(idObj.$in)) {
                        const validIds = idObj.$in
                            .filter((id): id is string => typeof id === 'string')
                            .map(id => this.sanitizeObjectId(id))
                            .filter((id): id is string => id !== null);
                        if (validIds.length > 0) {
                            sanitized[key] = { $in: validIds };
                        }
                    }
                }
                continue;
            }

            // Recursively sanitize nested objects
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                sanitized[key] = this.sanitizeQuery(value);
            } else if (Array.isArray(value)) {
                // Handle arrays (like $and, $or, $in)
                if (key === '$and' || key === '$or') {
                    sanitized[key] = value.map(item => this.sanitizeQuery(item));
                } else if (key === '$in' || key === '$nin') {
                    // Filter out dangerous objects - allow primitives and ObjectIds
                    sanitized[key] = value.filter(item =>
                        typeof item !== 'object' ||
                        item === null ||
                        item instanceof mongoose.Types.ObjectId
                    );
                } else {
                    sanitized[key] = value;
                }
            } else {
                // Primitive values are safe
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Sanitize update operations
     */
    static sanitizeUpdate<T>(update: unknown): Record<string, unknown> {
        if (update === null || update === undefined) {
            return {};
        }

        if (typeof update !== 'object') {
            return {};
        }

        const sanitized: Record<string, unknown> = {};
        const updateObj = update as Record<string, unknown>;

        for (const [key, value] of Object.entries(updateObj)) {
            // Only allow safe update operators
            if (key.startsWith('$')) {
                if (!ALLOWED_OPERATORS.has(key)) {
                    continue;
                }
            }

            // Block dangerous operators in values
            if (typeof value === 'object' && value !== null) {
                const valueObj = value as Record<string, unknown>;
                let hasDangerous = false;
                for (const subKey of Object.keys(valueObj)) {
                    if (DANGEROUS_OPERATORS.includes(subKey)) {
                        hasDangerous = true;
                        break;
                    }
                }
                if (hasDangerous) {
                    continue;
                }
            }

            sanitized[key] = value;
        }

        return sanitized;
    }

    /**
     * Sanitize sort options
     */
    static sanitizeSort(sort: unknown): Record<string, 1 | -1> {
        if (sort === null || sort === undefined || typeof sort !== 'object') {
            return {};
        }

        const sanitized: Record<string, 1 | -1> = {};
        const sortObj = sort as Record<string, unknown>;

        for (const [key, value] of Object.entries(sortObj)) {
            // Only allow field names (no operators)
            if (key.startsWith('$')) {
                continue;
            }

            // Only allow 1 or -1 as sort values
            if (value === 1 || value === -1) {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Sanitize projection/select options
     */
    static sanitizeProjection(projection: unknown): Record<string, 0 | 1> | string {
        if (typeof projection === 'string') {
            // String projection: remove any $ operators
            return projection.split(' ')
                .filter(field => !field.includes('$'))
                .join(' ');
        }

        if (projection === null || projection === undefined || typeof projection !== 'object') {
            return {};
        }

        const sanitized: Record<string, 0 | 1> = {};
        const projObj = projection as Record<string, unknown>;

        for (const [key, value] of Object.entries(projObj)) {
            if (key.startsWith('$')) {
                continue;
            }
            if (value === 0 || value === 1) {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }
}
