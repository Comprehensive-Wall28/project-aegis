/**
 * Report Generator
 *
 * Generates JSON, Markdown, and HTML reports from parity comparison results.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ParityReport } from './types';

export class ReportGenerator {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  generateJSON(report: ParityReport): string {
    const filePath = path.join(this.outputDir, 'parity-report.json');
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    return filePath;
  }

  generateMarkdown(report: ParityReport): string {
    const filePath = path.join(this.outputDir, 'parity-report.md');
    const content = this.buildMarkdown(report);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  generateHTML(report: ParityReport): string {
    const filePath = path.join(this.outputDir, 'parity-report.html');
    const content = this.buildHTML(report);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  private buildMarkdown(report: ParityReport): string {
    const lines: string[] = [];

    lines.push('# Express to NestJS Parity Report');
    lines.push('');
    lines.push(`**Generated:** ${report.timestamp}`);
    lines.push(`**Express Path:** \`${report.expressPath}\``);
    lines.push(`**NestJS Path:** \`${report.nestPath}\``);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| **Parity Score** | ${report.summary.parityScore}% |`);
    lines.push(`| 🔴 Critical Issues | ${report.summary.critical} |`);
    lines.push(`| 🟡 Warnings | ${report.summary.warnings} |`);
    lines.push(`| 🟢 Info | ${report.summary.info} |`);
    lines.push(`| Express Routes | ${report.summary.totalExpressRoutes} |`);
    lines.push(`| NestJS Routes | ${report.summary.totalNestRoutes} |`);
    lines.push(`| Express Services | ${report.summary.totalExpressServices} |`);
    lines.push(`| NestJS Services | ${report.summary.totalNestServices} |`);
    lines.push('');

    // Critical Issues
    const criticalIssues = report.issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      lines.push('## 🔴 Critical Issues');
      lines.push('');
      for (const issue of criticalIssues) {
        lines.push(`### ${issue.category.toUpperCase()}: ${issue.message}`);
        if (issue.expressFile) {
          lines.push(`- **Express file:** \`${issue.expressFile}\``);
        }
        if (issue.nestFile) {
          lines.push(`- **NestJS file:** \`${issue.nestFile}\``);
        }
        if (issue.suggestion) {
          lines.push(`- **Suggestion:** ${issue.suggestion}`);
        }
        lines.push('');
      }
    }

    // Routes Section
    lines.push('## Routes Comparison');
    lines.push('');
    
    lines.push('### ✅ Matched Routes');
    lines.push('');
    lines.push('| Method | Path | Express Handler | NestJS Handler | Issues |');
    lines.push('|--------|------|-----------------|----------------|--------|');
    for (const match of report.routes.matched) {
      const issues = match.issues.length > 0 ? match.issues.join('; ') : '✓';
      lines.push(`| ${match.express.method} | ${match.express.fullPath} | ${match.express.handlerName} | ${match.nest.handlerName} | ${issues} |`);
    }
    lines.push('');

    if (report.routes.missingInNest.length > 0) {
      lines.push('### ❌ Missing in NestJS');
      lines.push('');
      lines.push('| Method | Path | Handler | File |');
      lines.push('|--------|------|---------|------|');
      for (const route of report.routes.missingInNest) {
        lines.push(`| ${route.method} | ${route.fullPath} | ${route.handlerName} | ${route.fileName} |`);
      }
      lines.push('');
    }

    if (report.routes.methodMismatch.length > 0) {
      lines.push('### ⚠️ HTTP Method Mismatches');
      lines.push('');
      lines.push('| Path | Express Method | NestJS Method |');
      lines.push('|------|----------------|---------------|');
      for (const mismatch of report.routes.methodMismatch) {
        lines.push(`| ${mismatch.path} | ${mismatch.expressMethod} | ${mismatch.nestMethod} |`);
      }
      lines.push('');
    }

    // Services Section
    lines.push('## Services Comparison');
    lines.push('');
    
    if (report.services.missingInNest.length > 0) {
      lines.push('### ❌ Missing Service Methods in NestJS');
      lines.push('');
      lines.push('| Service | Method | Has Audit | File |');
      lines.push('|---------|--------|-----------|------|');
      for (const method of report.services.missingInNest) {
        lines.push(`| ${method.className} | ${method.name} | ${method.hasAuditLogging ? '✓' : '✗'} | ${method.fileName} |`);
      }
      lines.push('');
    }

    if (report.services.signatureMismatch.length > 0) {
      lines.push('### ⚠️ Signature Mismatches');
      lines.push('');
      for (const mismatch of report.services.signatureMismatch) {
        lines.push(`- **${mismatch.serviceName}.${mismatch.methodName}**: ${mismatch.reason}`);
      }
      lines.push('');
    }

    // Audit Logging Section
    lines.push('## Audit Logging');
    lines.push('');
    
    if (report.auditLogging.missingAudit.length > 0) {
      lines.push('### ❌ Missing Audit Logging in NestJS');
      lines.push('');
      lines.push('| Service | Method | Express Action |');
      lines.push('|---------|--------|----------------|');
      for (const missing of report.auditLogging.missingAudit) {
        lines.push(`| ${missing.serviceName} | ${missing.methodName} | ${missing.expressAuditAction} |`);
      }
      lines.push('');
    }

    // Schemas Section
    lines.push('## Schemas Comparison');
    lines.push('');
    
    if (report.schemas.missingInNest.length > 0) {
      lines.push('### ❌ Missing Schemas in NestJS');
      lines.push('');
      for (const schema of report.schemas.missingInNest) {
        lines.push(`- \`${schema.name}\` (${schema.fileName})`);
      }
      lines.push('');
    }

    if (report.schemas.fieldMismatch.length > 0) {
      lines.push('### ⚠️ Schema Field Mismatches');
      lines.push('');
      for (const mismatch of report.schemas.fieldMismatch) {
        lines.push(`#### ${mismatch.schemaName}`);
        if (mismatch.missingFields.length > 0) {
          lines.push(`- Missing fields: ${mismatch.missingFields.join(', ')}`);
        }
        if (mismatch.extraFields.length > 0) {
          lines.push(`- Extra fields: ${mismatch.extraFields.join(', ')}`);
        }
        lines.push('');
      }
    }

    // Warnings
    const warnings = report.issues.filter((i) => i.severity === 'warning');
    if (warnings.length > 0) {
      lines.push('## 🟡 Warnings');
      lines.push('');
      for (const issue of warnings) {
        lines.push(`- **[${issue.category}]** ${issue.message}`);
      }
      lines.push('');
    }

    // Info
    const info = report.issues.filter((i) => i.severity === 'info');
    if (info.length > 0) {
      lines.push('## 🟢 Informational');
      lines.push('');
      for (const issue of info) {
        lines.push(`- **[${issue.category}]** ${issue.message}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private buildHTML(report: ParityReport): string {
    const criticalCount = report.summary.critical;
    const warningCount = report.summary.warnings;
    const infoCount = report.summary.info;
    const parityScore = report.summary.parityScore;

    const scoreColor = parityScore >= 90 ? '#22c55e' : parityScore >= 70 ? '#eab308' : '#ef4444';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Express to NestJS Parity Report</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-card: #0f3460;
      --text-primary: #eaeaea;
      --text-secondary: #a0a0a0;
      --accent: #e94560;
      --success: #22c55e;
      --warning: #eab308;
      --error: #ef4444;
      --info: #3b82f6;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 2rem;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--bg-card);
    }
    
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--accent), #ff6b6b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .timestamp {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .summary-card {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      border: 1px solid var(--bg-card);
    }
    
    .summary-card.score {
      background: linear-gradient(135deg, var(--bg-card), var(--bg-secondary));
    }
    
    .summary-value {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    
    .summary-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    
    .critical { color: var(--error); }
    .warning { color: var(--warning); }
    .success { color: var(--success); }
    .info { color: var(--info); }
    
    section {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid var(--bg-card);
    }
    
    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--accent);
    }
    
    h3 {
      font-size: 1.2rem;
      margin: 1.5rem 0 1rem;
      color: var(--text-secondary);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--bg-card);
    }
    
    th {
      background: var(--bg-card);
      font-weight: 600;
      color: var(--text-secondary);
    }
    
    tr:hover {
      background: rgba(233, 69, 96, 0.1);
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    
    .badge-get { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .badge-post { background: rgba(59, 130, 246, 0.2); color: var(--info); }
    .badge-put { background: rgba(234, 179, 8, 0.2); color: var(--warning); }
    .badge-patch { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
    .badge-delete { background: rgba(239, 68, 68, 0.2); color: var(--error); }
    
    .issue-list {
      list-style: none;
    }
    
    .issue-item {
      padding: 1rem;
      margin: 0.5rem 0;
      border-radius: 8px;
      border-left: 4px solid;
    }
    
    .issue-critical {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--error);
    }
    
    .issue-warning {
      background: rgba(234, 179, 8, 0.1);
      border-color: var(--warning);
    }
    
    .issue-info {
      background: rgba(59, 130, 246, 0.1);
      border-color: var(--info);
    }
    
    .issue-category {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }
    
    .issue-message {
      font-weight: 500;
    }
    
    .issue-suggestion {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    
    code {
      background: var(--bg-card);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 0.9rem;
    }
    
    .check-icon { color: var(--success); }
    .x-icon { color: var(--error); }
    
    .progress-bar {
      height: 8px;
      background: var(--bg-card);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔄 Express to NestJS Parity Report</h1>
      <p class="timestamp">Generated: ${report.timestamp}</p>
    </header>
    
    <div class="summary-grid">
      <div class="summary-card score">
        <div class="summary-value" style="color: ${scoreColor}">${parityScore}%</div>
        <div class="summary-label">Parity Score</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${parityScore}%; background: ${scoreColor}"></div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-value critical">${criticalCount}</div>
        <div class="summary-label">Critical Issues</div>
      </div>
      <div class="summary-card">
        <div class="summary-value warning">${warningCount}</div>
        <div class="summary-label">Warnings</div>
      </div>
      <div class="summary-card">
        <div class="summary-value info">${infoCount}</div>
        <div class="summary-label">Info</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${report.summary.totalExpressRoutes}</div>
        <div class="summary-label">Express Routes</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${report.summary.totalNestRoutes}</div>
        <div class="summary-label">NestJS Routes</div>
      </div>
    </div>
    
    ${criticalCount > 0 ? `
    <section>
      <h2>🔴 Critical Issues</h2>
      <ul class="issue-list">
        ${report.issues
          .filter((i) => i.severity === 'critical')
          .map(
            (issue) => `
          <li class="issue-item issue-critical">
            <div class="issue-category">${issue.category}</div>
            <div class="issue-message">${issue.message}</div>
            ${issue.suggestion ? `<div class="issue-suggestion">💡 ${issue.suggestion}</div>` : ''}
          </li>
        `
          )
          .join('')}
      </ul>
    </section>
    ` : ''}
    
    <section>
      <h2>📍 Routes Comparison</h2>
      
      <h3>✅ Matched Routes (${report.routes.matched.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Express Handler</th>
            <th>NestJS Handler</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${report.routes.matched
            .map(
              (match) => `
            <tr>
              <td><span class="badge badge-${match.express.method.toLowerCase()}">${match.express.method}</span></td>
              <td><code>${match.express.fullPath}</code></td>
              <td>${match.express.handlerName}</td>
              <td>${match.nest.handlerName}</td>
              <td>${match.issues.length === 0 ? '<span class="check-icon">✓</span>' : `⚠️ ${match.issues.length} issues`}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      
      ${report.routes.missingInNest.length > 0 ? `
      <h3>❌ Missing in NestJS (${report.routes.missingInNest.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Handler</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          ${report.routes.missingInNest
            .map(
              (route) => `
            <tr>
              <td><span class="badge badge-${route.method.toLowerCase()}">${route.method}</span></td>
              <td><code>${route.fullPath}</code></td>
              <td>${route.handlerName}</td>
              <td><code>${route.fileName}</code></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : ''}
      
      ${report.routes.methodMismatch.length > 0 ? `
      <h3>⚠️ HTTP Method Mismatches (${report.routes.methodMismatch.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Path</th>
            <th>Express</th>
            <th>NestJS</th>
          </tr>
        </thead>
        <tbody>
          ${report.routes.methodMismatch
            .map(
              (m) => `
            <tr>
              <td><code>${m.path}</code></td>
              <td><span class="badge badge-${m.expressMethod.toLowerCase()}">${m.expressMethod}</span></td>
              <td><span class="badge badge-${m.nestMethod.toLowerCase()}">${m.nestMethod}</span></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : ''}
    </section>
    
    <section>
      <h2>🔒 Audit Logging</h2>
      
      ${report.auditLogging.missingAudit.length > 0 ? `
      <h3>❌ Missing Audit Logging in NestJS (${report.auditLogging.missingAudit.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Method</th>
            <th>Express Action</th>
          </tr>
        </thead>
        <tbody>
          ${report.auditLogging.missingAudit
            .map(
              (m) => `
            <tr>
              <td>${m.serviceName}</td>
              <td><code>${m.methodName}</code></td>
              <td><code>${m.expressAuditAction}</code></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : '<p class="success">✅ All methods with audit logging in Express have corresponding logging in NestJS</p>'}
    </section>
    
    ${report.schemas.missingInNest.length > 0 ? `
    <section>
      <h2>📋 Missing Schemas</h2>
      <table>
        <thead>
          <tr>
            <th>Schema Name</th>
            <th>Express File</th>
          </tr>
        </thead>
        <tbody>
          ${report.schemas.missingInNest
            .map(
              (s) => `
            <tr>
              <td><code>${s.name}</code></td>
              <td><code>${s.fileName}</code></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </section>
    ` : ''}
    
    ${warningCount > 0 ? `
    <section>
      <h2>🟡 Warnings</h2>
      <ul class="issue-list">
        ${report.issues
          .filter((i) => i.severity === 'warning')
          .map(
            (issue) => `
          <li class="issue-item issue-warning">
            <div class="issue-category">${issue.category}</div>
            <div class="issue-message">${issue.message}</div>
          </li>
        `
          )
          .join('')}
      </ul>
    </section>
    ` : ''}
    
    <footer>
      <p>Parity Checker Tool - Express to NestJS Migration</p>
      <p>Aegis Backend Migration Project</p>
    </footer>
  </div>
</body>
</html>`;
  }
}
