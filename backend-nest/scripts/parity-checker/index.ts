#!/usr/bin/env ts-node
/**
 * Parity Checker Tool
 *
 * Compares Express backend with NestJS backend to ensure API parity.
 * Extracts routes, controller methods, service methods, and repository methods
 * from both codebases and generates comparison reports.
 *
 * Usage:
 *   npm run parity:check              # Run full check
 *   npm run parity:check -- --module=tasks  # Check specific module
 *   npm run parity:check -- --json    # Output JSON only
 *   npm run parity:check -- --html    # Generate HTML report
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExpressParser } from './parsers/express-parser';
import { NestParser } from './parsers/nest-parser';
import { ParityComparator } from './comparator';
import { ReportGenerator } from './report-generator';
import type { ParityReport, ComparisonOptions } from './types';

const EXPRESS_BACKEND_PATH = path.resolve(__dirname, '../../../backend/src');
const NEST_BACKEND_PATH = path.resolve(__dirname, '../../src');
const OUTPUT_DIR = path.resolve(__dirname, '../parity-reports');

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log('🔍 Parity Checker - Express to NestJS Migration Tool\n');
  console.log('='.repeat(60));

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Parse Express backend
  console.log('\n📦 Parsing Express backend...');
  const expressParser = new ExpressParser(EXPRESS_BACKEND_PATH);
  const expressData = await expressParser.parse(options.module);

  // Parse NestJS backend
  console.log('📦 Parsing NestJS backend...');
  const nestParser = new NestParser(NEST_BACKEND_PATH);
  const nestData = await nestParser.parse(options.module);

  // Compare
  console.log('\n🔄 Comparing backends...');
  const comparator = new ParityComparator();
  const report = comparator.compare(expressData, nestData);

  // Generate reports
  const reportGenerator = new ReportGenerator(OUTPUT_DIR);

  if (options.json || options.all) {
    const jsonPath = reportGenerator.generateJSON(report);
    console.log(`\n📄 JSON report: ${jsonPath}`);
  }

  if (options.html || options.all) {
    const htmlPath = reportGenerator.generateHTML(report);
    console.log(`📄 HTML report: ${htmlPath}`);
  }

  // Always generate markdown
  const mdPath = reportGenerator.generateMarkdown(report);
  console.log(`📄 Markdown report: ${mdPath}`);

  // Print summary to console
  printSummary(report);

  // Exit with error code if there are critical issues
  const criticalCount = report.summary.critical;
  if (criticalCount > 0) {
    console.log(`\n❌ ${criticalCount} critical parity issues found!`);
    process.exit(1);
  }

  console.log('\n✅ Parity check completed successfully!');
}

function parseArgs(args: string[]): ComparisonOptions {
  const options: ComparisonOptions = {
    module: undefined,
    json: false,
    html: false,
    all: true,
  };

  for (const arg of args) {
    if (arg.startsWith('--module=')) {
      options.module = arg.split('=')[1];
      options.all = false;
    } else if (arg === '--json') {
      options.json = true;
      options.all = false;
    } else if (arg === '--html') {
      options.html = true;
      options.all = false;
    } else if (arg === '--all') {
      options.all = true;
    }
  }

  return options;
}

function printSummary(report: ParityReport) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PARITY SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n📍 Routes:`);
  console.log(`   ✅ Matched: ${report.routes.matched.length}`);
  console.log(`   ❌ Missing in NestJS: ${report.routes.missingInNest.length}`);
  console.log(`   ➕ Extra in NestJS: ${report.routes.extraInNest.length}`);
  console.log(`   ⚠️  Method Mismatch: ${report.routes.methodMismatch.length}`);

  console.log(`\n🔧 Services:`);
  console.log(`   ✅ Matched: ${report.services.matched.length}`);
  console.log(`   ❌ Missing in NestJS: ${report.services.missingInNest.length}`);
  console.log(`   ⚠️  Signature Mismatch: ${report.services.signatureMismatch.length}`);

  console.log(`\n📚 Repositories:`);
  console.log(`   ✅ Matched: ${report.repositories.matched.length}`);
  console.log(`   ❌ Missing in NestJS: ${report.repositories.missingInNest.length}`);

  console.log(`\n🔒 Audit Logging:`);
  console.log(`   ✅ With Audit: ${report.auditLogging.withAudit.length}`);
  console.log(`   ❌ Missing Audit: ${report.auditLogging.missingAudit.length}`);

  console.log(`\n📈 Overall Parity Score: ${report.summary.parityScore}%`);
  console.log(`   🔴 Critical Issues: ${report.summary.critical}`);
  console.log(`   🟡 Warnings: ${report.summary.warnings}`);
  console.log(`   🟢 Info: ${report.summary.info}`);
}

main().catch((err) => {
  console.error('❌ Parity check failed:', err);
  process.exit(1);
});
