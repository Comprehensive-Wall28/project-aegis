import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connect, connection, Connection } from 'mongoose';

let mongoServer: MongoMemoryReplSet;

export const setupTestDb = async () => {
    mongoServer = await MongoMemoryReplSet.create({
        replSet: { count: 1 }
    });
    const uri = mongoServer.getUri();
    await connect(uri);
};

export const teardownTestDb = async () => {
    if (connection) {
        await connection.close();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
};

export const clearDatabase = async () => {
    const collections = connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
};
