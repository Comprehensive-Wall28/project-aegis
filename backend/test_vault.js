const http = require('http');

let sessionCookie = '';

const registerData = JSON.stringify({
    email: 'vault_test_' + Date.now() + '@example.com',
    pqcPublicKey: 'some_pqc_key_12345',
    argon2Hash: 'hash'
});

const loginData = JSON.stringify({
    email: '', // Will be updated
    argon2Hash: 'hash'
});

const vaultInitData = JSON.stringify({
    fileName: 'secret_plans.pdf.enc',
    fileSize: 1024,
    encryptedSymmetricKey: 'key_blob',
    mimeType: 'application/octet-stream' // Correction: Octet stream for encrypted
});

function makeRequest(path, method, data, cookie) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data ? data.length : 0,
                ...(cookie ? { 'Cookie': cookie } : {})
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.setEncoding('utf8');

            // Capture cookies on login
            if (path === '/api/auth/login' && res.headers['set-cookie']) {
                sessionCookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
                console.log('Got Cookie:', sessionCookie);
            }

            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`[${method} ${path}] Status: ${res.statusCode}`);
                console.log('Response:', body);
                resolve({ statusCode: res.statusCode, body: body ? JSON.parse(body) : {} });
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(data);
        req.end();
    });
}

async function runTests() {
    try {
        console.log('--- Register ---');
        const regRes = await makeRequest('/api/auth/register', 'POST', registerData);

        console.log('--- Login ---');
        const loginPayload = JSON.parse(loginData);
        loginPayload.email = JSON.parse(registerData).email;
        await makeRequest('/api/auth/login', 'POST', JSON.stringify(loginPayload));

        console.log('--- Init Upload ---');
        // This is expected to fail with 500 if no Google Creds, checking for graceful failure or Mock needs.
        await makeRequest('/api/vault/upload-init', 'POST', vaultInitData, sessionCookie);

        console.log('--- List Files ---');
        await makeRequest('/api/vault/files', 'GET', null, sessionCookie);

    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTests();
