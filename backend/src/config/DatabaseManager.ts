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
     * Register a new database connection (Synchronous/Fire-and-forget for buffering)
     * @param name - Connection name (e.g., 'primary', 'replica', 'audit')
     * @param uri - MongoDB connection URI
     */
    connect(name: string, uri: string): Connection {
        if (this.connections.has(name)) {
            return this.connections.get(name)!;
        }

        let connection: Connection;

        if (name === 'primary') {
            // Initiate primary connection
            mongoose.connect(uri, {
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            }).catch(err => logger.error(`Failed to connect to primary DB:`, err));

            connection = mongoose.connection;
        } else {
            // Create secondary connection
            connection = mongoose.createConnection(uri, {
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
        }

        connection.on('connected', () => {
            console.log(`✅ MongoDB Connected (${name}): ${connection.host}`);
        });

        connection.on('error', (err) => {
            logger.error(`MongoDB Connection Error (${name}):`, err);
        });

        this.connections.set(name, connection);
        return connection;
    }

    /**
     * @deprecated Use connect() instead for easier startup
     */
    async registerConnection(name: string, uri: string): Promise<Connection> {
        return this.connect(name, uri);
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
