
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/auth';

async function verifyRateLimit() {
    console.log('Starting rate limit verification...');

    // We will make 6 requests. The limit is 5.
    // The 6th request should fail with 429.

    for (let i = 1; i <= 6; i++) {
        try {
            console.log(`Sending request ${i}...`);
            await axios.post(`${BASE_URL}/login`, {
                email: 'test@example.com',
                password: 'password123'
            });
            console.log(`Request ${i} succeeded (unexpected if > 5)`);
        } catch (error: any) {
            if (error.response) {
                console.log(`Request ${i} failed with status: ${error.response.status}`);
                if (i === 6 && error.response.status === 429) {
                    console.log('SUCCESS: Rate limit applied correctly on 6th request.');
                    process.exit(0);
                } else if (i < 6 && error.response.status === 429) {
                    console.log('FAILURE: Rate limit applied too early.');
                    process.exit(1);
                }
            } else {
                console.log(`Request ${i} failed with error: ${error.message}`);
            }
        }
    }

    console.log('FAILURE: 6th request did not receive 429.');
    process.exit(1);
}

verifyRateLimit();
