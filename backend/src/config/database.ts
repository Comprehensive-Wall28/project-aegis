import mongoose from 'mongoose';
import dotenv from 'dotenv';
// GridFS deprecated
// import { initGridFS } from '../services/gridfsService';

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || '');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Initialize GridFS bucket after connection
        // initGridFS();
        // console.log('GridFS bucket initialized');
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        } else {
            console.error(`Error: ${error}`);
        }
        process.exit(1);
    }
};

export default connectDB;

