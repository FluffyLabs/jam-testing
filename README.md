# jam-testing

Smoke testing, performance measurement, and fuzz testing suite for JAM
implementations. Each team provides a Docker image that speaks the
[JAM Fuzz protocol](https://github.com/davxy/jam-conformance/tree/main/fuzz-proto),
and the suite runs three stages against it:

- **[Minifuzz](./minifuzz/)** — runs the bare-minimum `forks`/`no_forks`
  protocol examples first, then replays STF-based traces for `fallback`,
  `safrole`, `storage`, and `storage_light` suites and validates that the
  implementation returns the expected responses. Acts as a gate: if any
  minifuzz suite fails, performance tests are skipped.
- **[Picofuzz](./picofuzz/)** — runs the same four STF suites (`fallback`,
  `safrole`, `storage`, `storage_light`) but does not check responses. Its
  only purpose is to measure block import performance (timings are displayed
  on the [dashboard](#dashboard)).
- **Fuzz testing** — one implementation (the "source") generates random
  blocks and another (the "target") must process them without crashing.
  Currently [graymatter](https://github.com/jambrains/graymatter) is
  available as a fuzz source. Every team gets a demo fuzz job (5 000 blocks
  on a shared runner); dedicated long-running runs are available on request.

## Status

The **Performance** column covers minifuzz (conformance gate) + picofuzz
(timing). The **Fuzz** column covers demo fuzz runs.

| Team | Performance | Fuzz |
|------|-------------|------|
| typeberry | [![Performance: typeberry](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-performance.yml) | [![Fuzz: typeberry](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-fuzz.yml) |
| pyjamaz | [![Performance: pyjamaz](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-performance.yml) | [![Fuzz: pyjamaz](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-fuzz.yml) |
| boka | [![Performance: boka](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-performance.yml) | [![Fuzz: boka](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-fuzz.yml) |
| turbojam | [![Performance: turbojam](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-performance.yml) | [![Fuzz: turbojam](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-fuzz.yml) |
| graymatter | [![Performance: graymatter](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-performance.yml) | [![Fuzz: graymatter](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-fuzz.yml) |
| jam4s | [![Performance: jam4s](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-performance.yml) | [![Fuzz: jam4s](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-fuzz.yml) |
| pbnjam | [![Performance: pbnjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-performance.yml) | [![Fuzz: pbnjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-fuzz.yml) |
| javajam | [![Performance: javajam](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-performance.yml) | [![Fuzz: javajam](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-fuzz.yml) |
| jamforge | [![Performance: jamforge](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-performance.yml) | [![Fuzz: jamforge](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-fuzz.yml) |
| jotl | [![Performance: jotl](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-performance.yml) | [![Fuzz: jotl](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-fuzz.yml) |
| jamzilla | [![Performance: jamzilla](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-performance.yml) | [![Fuzz: jamzilla](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-fuzz.yml) |
| jamzilla-int | [![Performance: jamzilla-int](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-performance.yml) | [![Fuzz: jamzilla-int](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-fuzz.yml) |
| jampy | [![Performance: jampy](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-performance.yml) | [![Fuzz: jampy](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-fuzz.yml) |
| jampy-recompiler | [![Performance: jampy-recompiler](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-performance.yml) | [![Fuzz: jampy-recompiler](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-fuzz.yml) |
| new-jamneration | [![Performance: new-jamneration](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-performance.yml) | [![Fuzz: new-jamneration](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-fuzz.yml) |

### Long-running fuzzing (dedicated)

If your team wants extended fuzz runs (more blocks, multiple runs, dedicated
runner), reach out by commenting on
[issue #1](https://github.com/FluffyLabs/jam-testing/issues/1). We'll set up
a dedicated fuzz workflow with a self-hosted runner labeled for your team.

## How it works

1. A **reusable GitHub Actions workflow** pulls your Docker image, starts it
   with a shared Unix socket volume, and runs tests against it.
2. **Minifuzz** runs first as a gate. It has two stages:
   - **Bare-minimum examples** (`forks`, `no_forks`) — validates protocol basics.
   - **STF conformance** (`fallback`, `safrole`, `storage`, `storage_light`) —
     replays pre-captured request-response pairs and checks that the
     implementation returns the expected responses.
   If any minifuzz suite fails, picofuzz is skipped entirely.
3. **Picofuzz** runs the same four STF suites and collects per-trace timing
   statistics (it does not verify responses).
4. Each team has its own workflow file (e.g. `typeberry-performance.yml`) that
   passes team-specific config (image, command, env vars, memory) to the
   reusable workflow.
5. Tests run on a self-hosted runner. Timing results (CSV with per-trace
   percentiles) are uploaded as artifacts and displayed on the dashboard.

### Readiness detection

The suite needs to know when your implementation is ready to accept
connections on the Unix socket. Two modes are supported:

- **Log pattern** (recommended if your impl prints a startup message):
  set `readiness_pattern` to a regex matching your ready log line.
- **Socket probe** (default): polls for the socket file to appear inside the
  Docker volume. Works with any implementation, no config needed.

## Adding your team

1. **Provide a Docker image** that accepts a Unix socket path and speaks the
   [JAM Fuzz protocol](https://github.com/davxy/jam-conformance/tree/main/fuzz-proto).
   The image must be publicly pullable (or accessible to the runner).

2. **Create a workflow file** at `.github/workflows/<team>-performance.yml`:

   ```yaml
   name: "Performance: myteam"

   on:
     schedule:
       - cron: '0 6 * * *'
     workflow_dispatch:

   jobs:
     test:
       uses: ./.github/workflows/reusable-picofuzz.yml
       with:
         target_name: myteam
         docker_image: 'ghcr.io/myorg/myimage:latest'
         docker_cmd: 'fuzz --socket {TARGET_SOCK}'
         # Optional overrides:
         # docker_env: 'MY_VAR=value'
         # docker_memory: '512m'
         # docker_platform: 'linux/amd64'
         # readiness_pattern: 'Server ready'
   ```

3. **Create a team directory** at `teams/<team>/` for any team-specific
   scripts or data you might add later.

4. **Open a PR** and trigger the workflow via `workflow_dispatch` to verify
   everything works.

### Workflow inputs reference

| Input | Required | Default | Description |
|---|---|---|---|
| `target_name` | yes | — | Your implementation name |
| `docker_image` | yes | — | Full image reference |
| `docker_cmd` | yes | — | Command with `{TARGET_SOCK}` placeholder for the socket path |
| `docker_env` | no | `""` | Space-separated `KEY=VALUE` pairs passed as `-e` flags |
| `docker_memory` | no | `"512m"` | Container memory limit |
| `docker_platform` | no | `"linux/amd64"` | Platform for `docker pull` |
| `readiness_pattern` | no | `""` | Regex matched against stdout to detect readiness |
| `timeout_minutes` | no | `10` | Per-suite timeout |
| `test_suites` | no | all four | JSON array of picofuzz suite names to run |

## Running locally

```bash
# Install dependencies
npm ci

# Build the picofuzz Docker image
npm run build-docker -w @fluffylabs/picofuzz

# Pull the target image
docker pull --platform=linux/amd64 ghcr.io/fluffylabs/typeberry:latest

# Prepare results directory
mkdir -p ./picofuzz-result

# Run a single suite
TARGET_NAME=typeberry \
TARGET_IMAGE='ghcr.io/fluffylabs/typeberry:latest' \
TARGET_CMD='--version=1 fuzz-target {TARGET_SOCK}' \
TARGET_READINESS_PATTERN='PVM Backend' \
npx tsx --test tests/picofuzz/fallback.test.ts
```

### Environment variables

| Variable | Description |
|---|---|
| `TARGET_NAME` | Implementation name |
| `TARGET_IMAGE` | Docker image to test |
| `TARGET_CMD` | Container command (`{TARGET_SOCK}` is replaced with the socket path) |
| `TARGET_ENV` | Space-separated `KEY=VALUE` pairs |
| `TARGET_MEMORY` | Container memory limit (default `512m`) |
| `TARGET_READINESS_PATTERN` | Regex for log-based readiness |

## Regenerating minifuzz traces

The `minifuzz-traces/` directory contains pre-captured request-response pairs
generated by running picofuzz in capture mode against typeberry (reference
implementation). These traces must be regenerated whenever the STF test data
in `picofuzz-stf-data/` is updated:

```bash
./minifuzz-traces/populate.sh
```

The script builds picofuzz, pulls typeberry, and runs capture for all four
suites. It tracks the STF data version and skips regeneration if already
up-to-date.

## Project structure

```
.github/workflows/
  reusable-picofuzz.yml       # Core reusable workflow (minifuzz + picofuzz)
  demo-source.yml             # Reusable demo fuzz source workflow
  graymatter-fuzz-source.yml  # Reusable long-running fuzz source workflow
  <team>-performance.yml      # Per-team performance workflow files
  <team>-fuzz.yml             # Per-team fuzz workflow files
minifuzz/                     # Minifuzz Docker image (Python fuzz example runner)
minifuzz-traces/              # Captured request-response pairs from typeberry
  populate.sh                 # Script to regenerate traces
  {suite}/                    # Per-suite trace files (fallback, safrole, etc.)
picofuzz/                     # Picofuzz tool (fuzz protocol client + capture mode)
tests/
  common.ts                   # Target startup & shared helpers
  external-process.ts         # Docker process management
  minifuzz/
    common.ts                 # Minifuzz test harness
    *.test.ts                 # Minifuzz suites (forks, no_forks, fallback, safrole, ...)
  picofuzz/
    common.ts                 # Picofuzz test harness
    *.test.ts                 # Per-suite test files
  fuzz-source/
    common.ts                 # Fuzz source test harness
    fuzz.test.ts              # Fuzz source test entry point
teams/<team>/                 # Team-specific scripts & data
picofuzz-stf-data/            # Git submodule: STF test traces
picofuzz-conformance-data/    # Git submodule: jam-conformance (minifuzz examples)
```
