# Agent Guide for jam-testing

Instructions for AI coding agents (Claude Code, Cursor, Copilot, etc.)
working on this repository. Human contributors may also find this useful
as a quick-reference checklist.

## Repository overview

This is a **performance and conformance testing suite** for JAM protocol
implementations. Each team provides a Docker image that speaks the
[JAM Fuzz protocol v1](https://github.com/davxy/jam-conformance/tree/main/fuzz-proto)
over Unix domain sockets. The suite runs two stages against it:

1. **Minifuzz** — correctness gate (replays captured request-response pairs)
2. **Picofuzz** — performance measurement (timing only, no response checks)
3. **Fuzz source** — external fuzzer testing (e.g. graymatter fuzz source against a target)

All inter-container communication uses Unix domain sockets on shared Docker
volumes. Containers run with `--network none` — no outbound network access.

## Adding a new team

A new-team PR must include **all five** of the following:

### 1. Workflow file

Create `.github/workflows/<team>-performance.yml`:

```yaml
name: "Performance: <team>"

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  test:
    uses: ./.github/workflows/reusable-picofuzz.yml
    with:
      target_name: <team>
      docker_image: '<registry>/<image>:<tag>'
      docker_cmd: '<command> {TARGET_SOCK}'
      # Optional:
      # docker_env: 'KEY=VALUE KEY2=VALUE2'
      # docker_memory: '512m'
      # docker_platform: 'linux/amd64'
      # readiness_pattern: 'Ready'
```

Copy the structure from an existing file like `typeberry-performance.yml`.

### 2. README badge

Add a row to the badge table in `README.md` (under "## Minifuzz + Performance"):

```markdown
| <team> | [![Performance: <team>](https://github.com/FluffyLabs/jam-testing/actions/workflows/<team>-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/<team>-performance.yml) |
```

### 3. Team directory

Create an empty `teams/<team>/` directory. No README or other files needed
(no existing team has one).

### 4. Dashboard deploy workflow trigger

Add the workflow name to the `workflow_run.workflows` list in
`.github/workflows/deploy-dashboard.yml`:

```yaml
on:
  workflow_run:
    workflows:
      # ... existing entries ...
      - "Performance: <team>"    # <-- add this
```

This is required because GitHub Actions needs a static list of workflow
names for triggers. The `TARGETS` variable for artifact downloads is
derived automatically from the `teams/` directory.

### 5. Workflow naming convention

The workflow `name:` field must follow the pattern `"Performance: <team>"`.
The filename must be `<team>-performance.yml`.

## Adding a fuzz source workflow

To run an external fuzzer source (e.g. graymatter) against a team's target,
create `.github/workflows/<team>-fuzz.yml`:

```yaml
name: "Fuzz: <team>"

on:
  workflow_dispatch:

jobs:
  graymatter-source:
    uses: ./.github/workflows/graymatter-fuzz-source.yml
    with:
      target_name: <team>
      docker_image: '<registry>/<image>:<tag>'
      docker_cmd: '<command> {TARGET_SOCK}'
      # Optional:
      # docker_env: 'KEY=VALUE KEY2=VALUE2'
      # docker_memory: '512m'
      # docker_platform: 'linux/amd64'
      # readiness_pattern: 'Ready'
      mention: <github-username>
```

Copy the structure from `typeberry-fuzz.yml`.

The `mention` input controls who gets @-mentioned in the issue body when
the fuzz job fails. On failure the workflow creates a GitHub issue
(deduplicated — it won't create a second issue while one is still open).
The mentioned user receives a GitHub notification without needing any
special repository access.

## Checklist for reviewing new-team PRs

- [ ] Workflow file follows the exact pattern of existing ones
- [ ] Badge row added to `README.md`
- [ ] `teams/<team>/` directory created (can be empty)
- [ ] Workflow name matches `"Performance: <team>"`
- [ ] `deploy-dashboard.yml` updated: `workflow_run.workflows` trigger list
- [ ] Docker image is publicly pullable
- [ ] Source repo for the Docker image is public (for auditability)
- [ ] No changes to shared infrastructure (reusable workflow, tests/, etc.)

## Checklist for reviewing fuzz workflow PRs

- [ ] Workflow file references `graymatter-fuzz-source.yml` (or another reusable fuzz source)
- [ ] Workflow name matches `"Fuzz: <team>"`
- [ ] Filename is `<team>-fuzz.yml`
- [ ] `mention` is set to a valid GitHub username
- [ ] Docker image is publicly pullable
- [ ] No changes to shared infrastructure (reusable workflow, tests/, etc.)

## Security constraints

All test containers run with `--network none`. This is enforced in
`tests/common.ts` (via `DOCKER_OPTIONS`) and must not be removed.

Target Docker images are **untrusted code** — they come from external
teams. The isolation model relies on:

- `--network none` — no outbound network access
- Memory and CPU limits
- Volume mounts are minimal and read-only where possible
- Containers are `--rm` (removed after exit)

When reviewing PRs that modify `tests/common.ts`, `reusable-picofuzz.yml`,
or any shared infrastructure, verify that these isolation properties are
preserved.

## Key files

| Path | Purpose |
|------|---------|
| `.github/workflows/reusable-picofuzz.yml` | Core reusable workflow (minifuzz + picofuzz) |
| `.github/workflows/graymatter-fuzz-source.yml` | Reusable workflow for graymatter fuzz source |
| `.github/workflows/deploy-dashboard.yml` | Dashboard deploy (has hardcoded team list) |
| `.github/workflows/<team>-performance.yml` | Per-team performance workflow |
| `.github/workflows/<team>-fuzz.yml` | Per-team fuzz source workflow |
| `tests/common.ts` | Docker container orchestration (resource limits, networking) |
| `tests/external-process.ts` | Docker process lifecycle management |
| `tests/minifuzz/` | Minifuzz test suites |
| `tests/picofuzz/` | Picofuzz test suites |
| `tests/fuzz-source/` | External fuzz source test suites |
| `minifuzz/` | Minifuzz Docker image (Python) |
| `picofuzz/` | Picofuzz tool (TypeScript) |
| `minifuzz-traces/` | Pre-captured traces from typeberry (reference impl) |
| `minifuzz-traces/populate.sh` | Regenerate traces when STF data changes |
| `teams/<team>/` | Per-team directory (currently empty for all teams) |

## Common tasks

### Run tests locally

```bash
npm ci
npm run build-docker -w @fluffylabs/picofuzz
npm run build -w @fluffylabs/minifuzz
docker pull --platform=linux/amd64 <target-image>
mkdir -p ./picofuzz-result

TARGET_NAME=<team> \
TARGET_IMAGE='<image>' \
TARGET_CMD='<cmd> {TARGET_SOCK}' \
TARGET_READINESS_PATTERN='<pattern>' \
npx tsx --test tests/minifuzz/fallback.test.ts
```

### Regenerate minifuzz traces

```bash
./minifuzz-traces/populate.sh
```

Only needed when `picofuzz-stf-data/` submodule is updated. The script
checks the version and skips if already current.

### Build Docker images

```bash
npm run build-docker -w @fluffylabs/picofuzz   # picofuzz
npm run build -w @fluffylabs/minifuzz           # minifuzz
```
