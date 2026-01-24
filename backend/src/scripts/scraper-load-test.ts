/**
 * Scraper Load Test Script
 * 
 * Tests the scraper's performance under heavy concurrent load.
 * Run with: npx ts-node src/scripts/scraper-load-test.ts
 */

import { smartScrape, advancedScrape, readerScrape, ScrapeResult, ReaderContentResult } from '../utils/scraper';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Number of concurrent requests to fire (keep low for local testing)
    CONCURRENT_REQUESTS: 10,

    // Test URLs (mix of fast and slow sites)
    TEST_URLS: [
        'https://example.com',
        'https://httpbin.org/html',
        'https://www.wikipedia.org',
        'https://news.ycombinator.com',
        'https://github.com',
        'https://stackoverflow.com',
        'https://medium.com',
        'https://dev.to',
        'https://www.reddit.com',
        'https://www.bbc.com/news',
    ],

    // Which scraper to test: 'smart' | 'advanced' | 'reader'
    SCRAPER_TYPE: 'advanced' as const
};

// =============================================================================
// TYPES
// =============================================================================

interface TestResult {
    url: string;
    duration: number;
    status: 'success' | 'blocked' | 'failed';
    title: string;
    error?: string;
}

interface LoadTestReport {
    totalRequests: number;
    successCount: number;
    failedCount: number;
    blockedCount: number;
    totalTime: number;
    avgTimePerRequest: number;
    minTime: number;
    maxTime: number;
    requestsPerSecond: number;
    results: TestResult[];
}

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

async function runSingleScrape(url: string, type: 'smart' | 'advanced' | 'reader'): Promise<TestResult> {
    const startTime = Date.now();

    try {
        let result: ScrapeResult | ReaderContentResult;

        switch (type) {
            case 'smart':
                result = await smartScrape(url);
                break;
            case 'advanced':
                result = await advancedScrape(url);
                break;
            case 'reader':
                result = await readerScrape(url);
                break;
        }

        const duration = Date.now() - startTime;
        const status = 'scrapeStatus' in result ? result.scrapeStatus : result.status;

        return {
            url,
            duration,
            status,
            title: result.title || '(no title)',
            error: 'error' in result ? result.error : undefined,
        };
    } catch (error: any) {
        return {
            url,
            duration: Date.now() - startTime,
            status: 'failed',
            title: '',
            error: error.message,
        };
    }
}

async function runLoadTest(): Promise<LoadTestReport> {
    console.log('\n🚀 SCRAPER LOAD TEST');
    console.log('='.repeat(60));
    console.log(`Scraper Type: ${CONFIG.SCRAPER_TYPE}`);
    console.log(`Concurrent Requests: ${CONFIG.CONCURRENT_REQUESTS}`);
    console.log(`Test URLs: ${CONFIG.TEST_URLS.length}`);
    console.log('='.repeat(60));

    // Build request list (cycle through URLs if needed)
    const requests: string[] = [];
    for (let i = 0; i < CONFIG.CONCURRENT_REQUESTS; i++) {
        requests.push(CONFIG.TEST_URLS[i % CONFIG.TEST_URLS.length]);
    }

    console.log(`\n⏳ Firing ${requests.length} concurrent requests...\n`);

    const overallStart = Date.now();

    // Fire all requests concurrently
    const promises = requests.map((url, index) => {
        console.log(`[${index + 1}/${requests.length}] Queuing: ${url}`);
        return runSingleScrape(url, CONFIG.SCRAPER_TYPE);
    });

    const results = await Promise.all(promises);

    const totalTime = Date.now() - overallStart;

    // Compute stats
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const blockedCount = results.filter(r => r.status === 'blocked').length;
    const durations = results.map(r => r.duration);
    const avgTimePerRequest = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minTime = Math.min(...durations);
    const maxTime = Math.max(...durations);
    const requestsPerSecond = results.length / (totalTime / 1000);

    return {
        totalRequests: results.length,
        successCount,
        failedCount,
        blockedCount,
        totalTime,
        avgTimePerRequest,
        minTime,
        maxTime,
        requestsPerSecond,
        results,
    };
}

function printReport(report: LoadTestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LOAD TEST RESULTS');
    console.log('='.repeat(60));

    console.log(`
┌─────────────────────────────────────────────────────────┐
│  SUMMARY                                                │
├─────────────────────────────────────────────────────────┤
│  Total Requests:     ${String(report.totalRequests).padEnd(36)}│
│  ✅ Successful:      ${String(report.successCount).padEnd(36)}│
│  ❌ Failed:          ${String(report.failedCount).padEnd(36)}│
│  🚫 Blocked:         ${String(report.blockedCount).padEnd(36)}│
├─────────────────────────────────────────────────────────┤
│  TIMING                                                 │
├─────────────────────────────────────────────────────────┤
│  Total Time:         ${(report.totalTime / 1000).toFixed(2).padEnd(33)}s │
│  Avg per Request:    ${(report.avgTimePerRequest / 1000).toFixed(2).padEnd(33)}s │
│  Min Time:           ${(report.minTime / 1000).toFixed(2).padEnd(33)}s │
│  Max Time:           ${(report.maxTime / 1000).toFixed(2).padEnd(33)}s │
│  Throughput:         ${report.requestsPerSecond.toFixed(2).padEnd(30)}req/s │
└─────────────────────────────────────────────────────────┘
`);

    console.log('\n📋 INDIVIDUAL RESULTS:\n');
    console.log('┌' + '─'.repeat(80) + '┐');

    for (const result of report.results) {
        const statusIcon = result.status === 'success' ? '✅' : result.status === 'blocked' ? '🚫' : '❌';
        const duration = (result.duration / 1000).toFixed(2) + 's';
        const title = result.title.slice(0, 30) || '(no title)';
        const url = result.url.slice(0, 35);

        console.log(`│ ${statusIcon} ${duration.padEnd(7)} │ ${url.padEnd(35)} │ ${title.padEnd(30)} │`);
    }

    console.log('└' + '─'.repeat(80) + '┘');

    // Success rate
    const successRate = (report.successCount / report.totalRequests * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    // Queue performance analysis
    const REAL_CONCURRENCY = 4; // Matching SCRAPE_QUEUE_CONCURRENCY in scraper.ts
    console.log('\n📈 QUEUE ANALYSIS:');
    console.log(`   With ${CONFIG.CONCURRENT_REQUESTS} concurrent requests and concurrency limit of ${REAL_CONCURRENCY}:`);
    const theoreticalMinTime = report.avgTimePerRequest * Math.ceil(report.totalRequests / REAL_CONCURRENCY);
    console.log(`   - Theoretical min total time (sequential batches): ${(theoreticalMinTime / 1000).toFixed(2)}s`);
    console.log(`   - Actual total time: ${(report.totalTime / 1000).toFixed(2)}s`);
    console.log(`   - Queue efficiency: ${((theoreticalMinTime / report.totalTime) * 100).toFixed(1)}%`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    try {
        const report = await runLoadTest();
        printReport(report);

        console.log('\n✅ Load test complete!\n');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Load test failed:', error.message);
        process.exit(1);
    }
}

main();
