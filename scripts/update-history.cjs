#!/usr/bin/env node
/**
 * Appends current benchmark data as a new snapshot to history.json.
 *
 * Usage:
 *   node scripts/update-history.cjs <existing-history.json> <aggregated-data.json> <output-history.json> [commit-sha]
 *
 * The output is a JSON array of snapshots, each containing:
 *   - timestamp (ISO 8601)
 *   - commit (short SHA)
 *   - versions → per-version team scores and metrics
 */

const fs = require('fs');
const path = require('path');

function main() {
  const [,, existingPath, aggregatedPath, outputPath, commitSha = 'unknown'] = process.argv;

  if (!existingPath || !aggregatedPath || !outputPath) {
    console.error('Usage: update-history.cjs <existing-history.json> <aggregated-data.json> <output-history.json> [commit-sha]');
    process.exit(1);
  }

  // Load existing history or start fresh
  let history = [];
  if (fs.existsSync(existingPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
      if (Array.isArray(raw)) {
        history = raw;
      }
    } catch {
      console.warn('Could not parse existing history, starting fresh');
    }
  }

  // Load current aggregated data
  if (!fs.existsSync(aggregatedPath)) {
    console.error(`Aggregated data not found: ${aggregatedPath}`);
    process.exit(1);
  }

  const aggregated = JSON.parse(fs.readFileSync(aggregatedPath, 'utf-8'));

  // Build a compact snapshot
  const timestamp = new Date().toISOString();
  const snapshot = {
    timestamp,
    commit: commitSha,
    versions: {},
  };

  for (const [version, data] of Object.entries(aggregated)) {
    snapshot.versions[version] = {
      baseline: data.baseline,
      teams: data.teams.map(t => {
        const entry = {
          name: t.name,
          score: t.score,
          rank: t.rank,
          metrics: t.metrics,
          relativeToBaseline: t.relativeToBaseline,
        };
        if (t.benchmarkScores) {
          entry.benchmarkScores = {};
          for (const [bm, info] of Object.entries(t.benchmarkScores)) {
            entry.benchmarkScores[bm] = {
              score: info.score ?? null,
              metrics: info.metrics || null,
            };
          }
        }
        return entry;
      }),
    };
  }

  history.push(snapshot);

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(history, null, 2));
  console.log(`History updated: ${history.length} total snapshots → ${outputPath}`);
}

main();
