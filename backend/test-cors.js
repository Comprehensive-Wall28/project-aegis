const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/me',
  method: 'GET',
  headers: {
    'Origin': 'http://localhost:4173'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log('HEADERS:');
  console.log(JSON.stringify(res.headers, null, 2));
  
  if (res.headers['access-control-allow-origin']) {
    console.log('\n✅ CORS headers present!');
  } else {
    console.log('\n❌ CORS headers missing!');
  }
  
  process.exit(0);
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});

req.end();
