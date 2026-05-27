#!/usr/bin/env node
/**
 * Downloads the newest picofuzz CSV artifacts for all known teams.
 *
 * `gh run download --name ...` searches repository artifacts for each name. With
 * many teams and 90-day artifact retention, doing that once per benchmark burns
 * a large part of the GitHub Actions API budget. This script lists artifacts
 * once, keeps the newest expected artifact names, then downloads those archives.
 */

const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const BENCHMARKS = ["fallback", "safrole", "storage", "storage_light"];
const PER_PAGE = 100;

function usage() {
  console.error("Usage: download-latest-picofuzz-artifacts.cjs <output-dir>");
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function nextLink(linkHeader) {
  if (!linkHeader) {
    return null;
  }

  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

async function githubFetch(url, token) {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = response.headers.get("x-ratelimit-reset");
    const rateLimit = remaining === null ? "" : ` rate-limit-remaining=${remaining} reset=${reset}`;
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}.${rateLimit}\n${text}`);
  }

  return response;
}

function expectedArtifactNames(teamsDir) {
  const teams = fs
    .readdirSync(teamsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const names = new Set();
  for (const team of teams) {
    for (const benchmark of BENCHMARKS) {
      names.add(`picofuzz-csv-${team}-${benchmark}`);
    }
  }

  return { teams, names };
}

async function collectLatestArtifacts(repo, token, expectedNames) {
  const selected = new Map();
  let url = `https://api.github.com/repos/${repo}/actions/artifacts?per_page=${PER_PAGE}`;
  let pages = 0;
  let seen = 0;

  while (url) {
    pages++;
    const response = await githubFetch(url, token);
    const payload = await response.json();
    const artifacts = payload.artifacts || [];
    seen += artifacts.length;

    for (const artifact of artifacts) {
      if (!expectedNames.has(artifact.name) || artifact.expired) {
        continue;
      }

      const existing = selected.get(artifact.name);
      if (existing && new Date(existing.created_at) >= new Date(artifact.created_at)) {
        continue;
      }

      selected.set(artifact.name, artifact);
    }

    url = nextLink(response.headers.get("link"));
  }

  console.log(`Scanned ${seen} artifacts across ${pages} page(s); selected ${selected.size}/${expectedNames.size}.`);
  return selected;
}

async function downloadArtifact(artifact, token, outputDir) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "picofuzz-artifact-"));
  const zipPath = path.join(tmpDir, `${artifact.name}.zip`);
  const artifactDir = path.join(outputDir, artifact.name);

  try {
    const response = await githubFetch(artifact.archive_download_url, token);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(zipPath, buffer);

    fs.rmSync(artifactDir, { recursive: true, force: true });
    fs.mkdirSync(artifactDir, { recursive: true });
    childProcess.execFileSync("unzip", ["-q", "-o", zipPath, "-d", artifactDir], { stdio: "inherit" });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  const [outputDir] = process.argv.slice(2);
  if (!outputDir) {
    usage();
    process.exit(1);
  }

  const repo = requiredEnv("GITHUB_REPOSITORY");
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GH_TOKEN or GITHUB_TOKEN is required");
  }

  const teamsDir = path.join(process.cwd(), "teams");
  const { teams, names } = expectedArtifactNames(teamsDir);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Looking for ${names.size} artifacts for ${teams.length} teams.`);
  const artifacts = await collectLatestArtifacts(repo, token, names);

  const missing = [...names].filter((name) => !artifacts.has(name)).sort();
  if (missing.length > 0) {
    console.log(`Missing ${missing.length} artifact(s), continuing without them:`);
    for (const name of missing) {
      console.log(`  ${name}`);
    }
  }

  for (const name of [...artifacts.keys()].sort()) {
    const artifact = artifacts.get(name);
    console.log(`Downloading ${name} from ${artifact.workflow_run?.head_sha || "unknown sha"}...`);
    await downloadArtifact(artifact, token, outputDir);
  }

  console.log("Downloaded artifacts:");
  const csvFiles = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const artifactDir = path.join(outputDir, entry.name);
      return fs
        .readdirSync(artifactDir)
        .filter((file) => file.endsWith(".csv"))
        .map((file) => path.join(artifactDir, file));
    })
    .sort();

  for (const csvFile of csvFiles) {
    console.log(csvFile);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
