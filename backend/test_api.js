const http = require('http');

const postData = JSON.stringify({
    email: 'test@example.com',
    pqcPublicKey: 'some_pqc_key_12345',
    argon2Hash: 'some_argon2_hash_from_client'
});

const loginData = JSON.stringify({
    email: 'test@example.com',
    argon2Hash: 'some_argon2_hash_from_client'
});

function makeRequest(path, data, cookie) {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            ...(cookie ? { 'Cookie': cookie } : {})
        }
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('No more data in response.');
            if (path === '/api/auth/register' && res.statusCode === 201) {
                console.log('Register successful, testing login...');
                makeRequest('/api/auth/login', loginData);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.write(data);
    req.end();
}

console.log('Testing Register...');
makeRequest('/api/auth/register', postData);
