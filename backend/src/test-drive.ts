import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { testConnection } from './services/googleDriveService';

async function runTest() {
    console.log('Testing Google Drive Connection...');
    console.log('Credentials Path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const result = await testConnection();
    if (result) {
        console.log('✅ Connection Successful!');
        process.exit(0);
    } else {
        console.log('❌ Connection Failed!');
        process.exit(1);
    }
}

runTest();
