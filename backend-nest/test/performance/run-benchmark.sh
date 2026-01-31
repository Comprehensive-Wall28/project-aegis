#!/bin/bash

# Ensure server is running (User must start it, or we assume it's on localhost:50000)
URL="http://127.0.0.1:50000"

echo "🚀 Starting Comprehensive Performance Benchmark..."
echo "Target: $URL"
echo "---------------------------------------------------"

# 1. Baseline - Fastify Overhead
echo "1️⃣  Testing Baseline (GET /api)..."
npx -y autocannon -c 100 -d 5 -p 10 $URL/api | grep -E "(Req/Sec|Latency|Bytes/Sec)"

# 2. Database Read - Notes (Requires Auth ideally, but checking public/error path latency is still useful for overhead)
# Note: For real auth testing, we'd need to generate a token first. 
# We'll test the 401 path to see Guard overhead which is significant (JWT extraction)
echo ""
echo "2️⃣  Testing Guard Overhead (GET /api/notes - 401 Expected)..."
npx -y autocannon -c 100 -d 5 -p 10 $URL/api/notes | grep -E "(Req/Sec|Latency|Bytes/Sec)"

# 3. High CPU - Auth Login (Mock bad credentials to test Argon2/Validation)
# We expect lower RPS here due to Argon2 if it reaches that stage, or ValidationPipe overhead
echo ""
echo "3️⃣  Testing CPU Intensive (POST /api/auth/login)..."
npx -y autocannon -c 50 -d 5 -p 10 -m POST \
  -H "Content-Type: application/json" \
  -b '{"email":"bench@test.com", "password":"password123"}' \
  $URL/api/auth/login | grep -E "(Req/Sec|Latency|Bytes/Sec)"

echo ""
echo "---------------------------------------------------"
echo "✅ Benchmark Complete"
