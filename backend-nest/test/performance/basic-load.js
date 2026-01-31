const http = require('http');

const TOTAL_REQUESTS = 1000;
const CONCURRENCY = 50;

let completed = 0;
let success = 0;
let errors = 0;
let startTime = Date.now();

function makeRequest() {
    if (completed >= TOTAL_REQUESTS) return;

    const req = http.request({
        hostname: '127.0.0.1',
        port: 50000,
        path: '/api',
        method: 'GET',
        agent: false // Create new connection or manage keep-alive manually if needed
    }, (res) => {
        res.on('data', () => { });
        res.on('end', () => {
            if (res.statusCode === 200) success++;
            else errors++;
            completed++;
            checkFinished();
            makeRequest(); // Start next request
        });
    });

    req.on('error', (e) => {
        errors++;
        completed++;
        checkFinished();
        makeRequest();
    });

    req.end();
}

function checkFinished() {
    if (completed >= TOTAL_REQUESTS) {
        const duration = (Date.now() - startTime) / 1000;
        const rps = TOTAL_REQUESTS / duration;
        console.log(`Finished ${TOTAL_REQUESTS} requests in ${duration.toFixed(2)}s`);
        console.log(`RPS: ${rps.toFixed(2)}`);
        console.log(`Success: ${success}, Errors: ${errors}`);

        if (errors > 0) process.exit(1);
        if (rps < 100) process.exit(1); // Basic threshold for Fastify
        process.exit(0);
    }
}

// Start server first? No, script assumes server is running.
// We will run this script while server is up.

console.log(`Starting load test: ${TOTAL_REQUESTS} requests, ${CONCURRENCY} concurrency...`);
for (let i = 0; i < CONCURRENCY; i++) {
    makeRequest();
}
