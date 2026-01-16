import mongoose, { Connection } from 'mongoose';
import logger from '../utils/logger';

/**
 * DatabaseManager handles multiple database connections
 * Designed for future scaling with read replicas, sharding, or separate audit databases
 */
export class DatabaseManager {
    private static instance: DatabaseManager;
    private connections: Map<string, Connection> = new Map();
    private connectionPromises: Map<string, Promise<Connection>> = new Map();

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    /**
     * Register a new database connection
     * @param name - Connection name (e.g., 'primary', 'replica', 'audit')
     * @param uri - MongoDB connection URI
     */
    async registerConnection(name: string, uri: string): Promise<Connection> {
        // Return existing connection if available
        if (this.connections.has(name)) {
            return this.connections.get(name)!;
        }

        // Return pending connection promise if registration is in progress
        if (this.connectionPromises.has(name)) {
            return this.connectionPromises.get(name)!;
        }

        // Create new connection
        const connectionPromise = this.createConnection(name, uri);
        this.connectionPromises.set(name, connectionPromise);

        try {
            const connection = await connectionPromise;
            this.connections.set(name, connection);
            this.connectionPromises.delete(name);
            return connection;
        } catch (error) {
            this.connectionPromises.delete(name);
            throw error;
        }
    }

    /**
     * Create a new database connection with optimal settings
     */
    private async createConnection(name: string, uri: string): Promise<Connection> {
        try {
            // For primary connection, use default mongoose connection
            if (name === 'primary') {
                await mongoose.connect(uri, {
                    // Connection pool settings for performance
                    maxPoolSize: 10,
                    minPoolSize: 2,
                    // Timeouts
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 45000,
                });

                logger.info(`MongoDB Connected (${name}): ${mongoose.connection.host}`);
                return mongoose.connection;
            }

            // For additional connections, create separate connection
            const connection = await mongoose.createConnection(uri, {
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            }).asPromise();

            logger.info(`MongoDB Connected (${name}): ${connection.host}`);
            return connection;
        } catch (error) {
            logger.error(`Failed to connect to database (${name}):`, error);
            throw error;
        }
    }

    /**
     * Get a registered connection by name
     * Defaults to 'primary' if no name specified
     */
    getConnection(name: string = 'primary'): Connection {
        const connection = this.connections.get(name);

        if (!connection) {
            throw new Error(`Database connection '${name}' not registered`);
        }

        return connection;
    }

    /**
     * Check if a connection exists and is ready
     */
    hasConnection(name: string): boolean {
        const connection = this.connections.get(name);
        return connection !== undefined && connection.readyState === 1;
    }

    /**
     * Health check for all registered connections
     */
    async healthCheck(): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();

        for (const [name, connection] of this.connections) {
            try {
                // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
                const isHealthy = connection.readyState === 1;
                results.set(name, isHealthy);
            } catch {
                results.set(name, false);
            }
        }

        return results;
    }

    /**
     * Close all connections (for graceful shutdown)
     */
    async closeAll(): Promise<void> {
        for (const [name, connection] of this.connections) {
            try {
                await connection.close();
                logger.info(`Database connection '${name}' closed`);
            } catch (error) {
                logger.error(`Error closing connection '${name}':`, error);
            }
        }
        this.connections.clear();
    }
}

export default DatabaseManager;
