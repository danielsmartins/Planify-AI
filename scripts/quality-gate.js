const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(PROJECT_ROOT, '.quality-gate-baseline.json');
const COVERAGE_SUMMARY_PATH = path.join(PROJECT_ROOT, 'coverage', 'coverage-summary.json');
const REPORT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'quality-gate-report.md');

// Helper to format float with 2 decimals and sign for delta
function formatPct(val) {
  return `${Number(val).toFixed(2)}%`;
}

function formatDeltaPct(delta) {
  const num = Number(delta);
  if (Math.abs(num) < 0.001) return '0.00%';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

function formatDeltaInt(delta) {
  const num = Number(delta);
  if (num === 0) return '0';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num}`;
}

// 1. Coverage Metric Extractor
function getCoverageMetrics() {
  if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    console.warn('Coverage summary not found at:', COVERAGE_SUMMARY_PATH);
    return { lines: 0, statements: 0, functions: 0, branches: 0 };
  }
  try {
    const raw = fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf-8');
    const summary = JSON.parse(raw);
    const total = summary.total || {};
    return {
      lines: total.lines ? total.lines.pct : 0,
      statements: total.statements ? total.statements.pct : 0,
      functions: total.functions ? total.functions.pct : 0,
      branches: total.branches ? total.branches.pct : 0,
    };
  } catch (err) {
    console.error('Error reading coverage summary:', err);
    return { lines: 0, statements: 0, functions: 0, branches: 0 };
  }
}

// Helper: GetAllFiles recursively
function getAllSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'coverage' && file !== '.git') {
        getAllSourceFiles(filePath, fileList);
      }
    } else if (/\.(tsx?|jsx?)$/.test(file) && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// 2. Duplication & File Size Analyzer
function analyzeSourceCode() {
  const srcDir = path.join(PROJECT_ROOT, 'src');
  const files = getAllSourceFiles(srcDir);

  let totalLinesCount = 0;
  let oversizedFilesCount = 0;
  const blockMap = new Map();
  let duplicatedLinesCount = 0;
  let fragmentsCount = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('/*'));

    totalLinesCount += lines.length;

    if (lines.length > 300) {
      oversizedFilesCount++;
    }

    // Check 4-line blocks for duplication detection
    const BLOCK_SIZE = 4;
    for (let i = 0; i <= lines.length - BLOCK_SIZE; i++) {
      const block = lines.slice(i, i + BLOCK_SIZE).join('\n');
      if (block.length < 20) continue; // skip small blocks like imports
      const count = blockMap.get(block) || 0;
      if (count === 1) {
        fragmentsCount++;
        duplicatedLinesCount += BLOCK_SIZE;
      } else if (count > 1) {
        duplicatedLinesCount += 1;
      }
      blockMap.set(block, count + 1);
    }
  }

  const duplicationPercentage = totalLinesCount > 0 ? (duplicatedLinesCount / totalLinesCount) * 100 : 0;

  return {
    duplicationPercentage,
    fragmentsCount,
    oversizedFilesCount,
    totalFiles: files.length,
    totalLines: totalLinesCount
  };
}

// 3. ESLint Violation Count
function getEslintViolations() {
  try {
    const output = execSync('npx eslint src --format json', { cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const results = JSON.parse(output);
    let violations = 0;
    for (const res of results) {
      violations += (res.errorCount || 0) + (res.warningCount || 0);
    }
    return violations;
  } catch (err) {
    if (err.stdout) {
      try {
        const results = JSON.parse(err.stdout);
        let violations = 0;
        for (const res of results) {
          violations += (res.errorCount || 0) + (res.warningCount || 0);
        }
        return violations;
      } catch (parseErr) {
        return 0;
      }
    }
    return 0;
  }
}

// Baseline loader & updater
function loadBaseline(currentMetrics) {
  if (fs.existsSync(BASELINE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
    } catch (e) {
      console.warn('Failed to parse baseline file, using current as baseline.');
    }
  }
  return currentMetrics;
}

function saveBaseline(metrics) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(metrics, null, 2), 'utf-8');
  console.log('Baseline updated successfully at', BASELINE_PATH);
}

// MAIN FUNCTION
function runQualityGate() {
  console.log('Running Quality Gate analysis...');

  const coverage = getCoverageMetrics();
  const codeAnalysis = analyzeSourceCode();
  const violations = getEslintViolations();

  const current = {
    coverageLines: coverage.lines,
    coverageStatements: coverage.statements,
    coverageFunctions: coverage.functions,
    coverageBranches: coverage.branches,
    duplicationPct: codeAnalysis.duplicationPercentage,
    duplicationFragments: codeAnalysis.fragmentsCount,
    ruleViolations: violations,
    oversizedFiles: codeAnalysis.oversizedFilesCount
  };

  const updateBaselineArg = process.argv.includes('--update-baseline');
  if (updateBaselineArg || !fs.existsSync(BASELINE_PATH)) {
    saveBaseline(current);
  }

  const baseline = loadBaseline(current);

  const delta = {
    coverageLines: current.coverageLines - baseline.coverageLines,
    coverageStatements: current.coverageStatements - baseline.coverageStatements,
    coverageFunctions: current.coverageFunctions - baseline.coverageFunctions,
    coverageBranches: current.coverageBranches - baseline.coverageBranches,
    duplicationPct: current.duplicationPct - baseline.duplicationPct,
    duplicationFragments: current.duplicationFragments - baseline.duplicationFragments,
    ruleViolations: current.ruleViolations - baseline.ruleViolations,
    oversizedFiles: current.oversizedFiles - baseline.oversizedFiles,
  };

  const nowISO = new Date().toISOString();

  const reportMarkdown = `
### Quality Gate Report

#### Coverage

| Metric | Baseline | Current | Δ |
| :--- | :---: | :---: | :---: |
| Lines | ${formatPct(baseline.coverageLines)} | ${formatPct(current.coverageLines)} | ${formatDeltaPct(delta.coverageLines)} |
| Statements | ${formatPct(baseline.coverageStatements)} | ${formatPct(current.coverageStatements)} | ${formatDeltaPct(delta.coverageStatements)} |
| Functions | ${formatPct(baseline.coverageFunctions)} | ${formatPct(current.coverageFunctions)} | ${formatDeltaPct(delta.coverageFunctions)} |
| Branches | ${formatPct(baseline.coverageBranches)} | ${formatPct(current.coverageBranches)} | ${formatDeltaPct(delta.coverageBranches)} |

#### Duplication

| Metric | Baseline | Current | Δ |
| :--- | :---: | :---: | :---: |
| Percentage | ${formatPct(baseline.duplicationPct)} | ${formatPct(current.duplicationPct)} | ${formatDeltaPct(delta.duplicationPct)} |
| Fragments | ${baseline.duplicationFragments} | ${current.duplicationFragments} | ${formatDeltaInt(delta.duplicationFragments)} |

#### Violations

| Metric | Baseline | Current | Δ |
| :--- | :---: | :---: | :---: |
| Quality rule violations | ${baseline.ruleViolations} | ${current.ruleViolations} | ${formatDeltaInt(delta.ruleViolations)} |
| Oversized files | ${baseline.oversizedFiles} | ${current.oversizedFiles} | ${formatDeltaInt(delta.oversizedFiles)} |

*Generated by \`scripts/quality-gate.js\` on ${nowISO}*
`.trim();

  console.log('\n--- QUALITY GATE REPORT ---');
  console.log(reportMarkdown);
  console.log('---------------------------\n');

  fs.writeFileSync(REPORT_OUTPUT_PATH, reportMarkdown, 'utf-8');

  // Quality gate pass/fail conditions
  const hasCoverageDrop = delta.coverageLines < -2 || delta.coverageBranches < -2;
  const hasNewViolations = delta.ruleViolations > 0;

  if (hasCoverageDrop || hasNewViolations) {
    console.error('❌ Quality Gate failed! Coverage dropped or new violations introduced.');
    if (process.env.CI) {
      process.exit(1);
    }
  } else {
    console.log('✅ Quality Gate passed successfully!');
  }
}

runQualityGate();
