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
  available as a fuzz source, run against both the JAM `tiny` and `full`
  specs. Every team gets two demo fuzz jobs (5 000 blocks each on a shared
  runner — one per spec); dedicated long-running runs cover both specs in
  a single matrix.

## Status

The **Performance** column covers minifuzz (conformance gate) + picofuzz
(timing). **Demo (tiny)** and **Demo (full)** are short fuzz runs (5 000
blocks each on a shared runner) executing the JAM `tiny` and `full` specs
respectively. **Long-run** is a dedicated, multi-hour fuzz run that
exercises both specs in a matrix (single badge — red if either spec
fails). Targets pick which spec to run from the `JAM_FUZZ_SPEC` environment
variable; the matching `--spec <value>` is also passed to the graymatter
source command by the workflow.

| Team | Performance | Demo (tiny) | Demo (full) | Long-run |
|------|-------------|-------------|-------------|----------|
| typeberry | [![Performance: typeberry](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-performance.yml) | [![Demo (tiny): typeberry](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-demo-tiny.yml) | [![Demo (full): typeberry](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-demo-full.yml) | [![Fuzz: typeberry](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-fuzz.yml) |
| pyjamaz | [![Performance: pyjamaz](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-performance.yml) | [![Demo (tiny): pyjamaz](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-demo-tiny.yml) | [![Demo (full): pyjamaz](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-demo-full.yml) | — |
| boka | [![Performance: boka](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-performance.yml) | [![Demo (tiny): boka](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-demo-tiny.yml) | [![Demo (full): boka](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-demo-full.yml) | — |
| turbojam | [![Performance: turbojam](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-performance.yml) | [![Demo (tiny): turbojam](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-demo-tiny.yml) | [![Demo (full): turbojam](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-demo-full.yml) | [![Fuzz: turbojam](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-fuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-fuzz.yml) |
| graymatter | [![Performance: graymatter](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-performance.yml) | [![Demo (tiny): graymatter](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-demo-tiny.yml) | [![Demo (full): graymatter](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-demo-full.yml) | — |
| jam4s | [![Performance: jam4s](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-performance.yml) | [![Demo (tiny): jam4s](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-demo-tiny.yml) | [![Demo (full): jam4s](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-demo-full.yml) | — |
| pbnjam | [![Performance: pbnjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-performance.yml) | [![Demo (tiny): pbnjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-demo-tiny.yml) | [![Demo (full): pbnjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-demo-full.yml) | — |
| javajam | [![Performance: javajam](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-performance.yml) | [![Demo (tiny): javajam](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-demo-tiny.yml) | [![Demo (full): javajam](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-demo-full.yml) | — |
| jamforge | [![Performance: jamforge](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-performance.yml) | [![Demo (tiny): jamforge](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-demo-tiny.yml) | [![Demo (full): jamforge](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-demo-full.yml) | — |
| jotl | [![Performance: jotl](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-performance.yml) | [![Demo (tiny): jotl](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-demo-tiny.yml) | [![Demo (full): jotl](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jotl-demo-full.yml) | — |
| jamzilla | [![Performance: jamzilla](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-performance.yml) | [![Demo (tiny): jamzilla](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-demo-tiny.yml) | [![Demo (full): jamzilla](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-demo-full.yml) | — |
| jamzilla-int | [![Performance: jamzilla-int](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-performance.yml) | [![Demo (tiny): jamzilla-int](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-demo-tiny.yml) | [![Demo (full): jamzilla-int](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzilla-int-demo-full.yml) | — |
| jampy | [![Performance: jampy](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-performance.yml) | [![Demo (tiny): jampy](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-demo-tiny.yml) | [![Demo (full): jampy](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-demo-full.yml) | — |
| jampy-recompiler | [![Performance: jampy-recompiler](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-performance.yml) | [![Demo (tiny): jampy-recompiler](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-demo-tiny.yml) | [![Demo (full): jampy-recompiler](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jampy-recompiler-demo-full.yml) | — |
| new-jamneration | [![Performance: new-jamneration](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-performance.yml) | [![Demo (tiny): new-jamneration](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-demo-tiny.yml) | [![Demo (full): new-jamneration](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/new-jamneration-demo-full.yml) | — |
| vinwolf | [![Performance: vinwolf](https://github.com/FluffyLabs/jam-testing/actions/workflows/vinwolf-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/vinwolf-performance.yml) | [![Demo (tiny): vinwolf](https://github.com/FluffyLabs/jam-testing/actions/workflows/vinwolf-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/vinwolf-demo-tiny.yml) | [![Demo (full): vinwolf](https://github.com/FluffyLabs/jam-testing/actions/workflows/vinwolf-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/vinwolf-demo-full.yml) | — |
| jamduna | [![Performance: jamduna](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamduna-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamduna-performance.yml) | [![Demo (tiny): jamduna](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamduna-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamduna-demo-tiny.yml) | [![Demo (full): jamduna](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamduna-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamduna-demo-full.yml) | — |
| jamzig | [![Performance: jamzig](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzig-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzig-performance.yml) | [![Demo (tiny): jamzig](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzig-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzig-demo-tiny.yml) | [![Demo (full): jamzig](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzig-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamzig-demo-full.yml) | — |
| tessera | [![Performance: tessera](https://github.com/FluffyLabs/jam-testing/actions/workflows/tessera-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/tessera-performance.yml) | [![Demo (tiny): tessera](https://github.com/FluffyLabs/jam-testing/actions/workflows/tessera-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/tessera-demo-tiny.yml) | [![Demo (full): tessera](https://github.com/FluffyLabs/jam-testing/actions/workflows/tessera-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/tessera-demo-full.yml) | — |
| tsjam | [![Performance: tsjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/tsjam-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/tsjam-performance.yml) | [![Demo (tiny): tsjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/tsjam-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/tsjam-demo-tiny.yml) | [![Demo (full): tsjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/tsjam-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/tsjam-demo-full.yml) | — |
| jambda | [![Performance: jambda](https://github.com/FluffyLabs/jam-testing/actions/workflows/jambda-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jambda-performance.yml) | [![Demo (tiny): jambda](https://github.com/FluffyLabs/jam-testing/actions/workflows/jambda-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jambda-demo-tiny.yml) | [![Demo (full): jambda](https://github.com/FluffyLabs/jam-testing/actions/workflows/jambda-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jambda-demo-full.yml) | — |
| jamixir | [![Performance: jamixir](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamixir-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamixir-performance.yml) | [![Demo (tiny): jamixir](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamixir-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamixir-demo-tiny.yml) | [![Demo (full): jamixir](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamixir-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamixir-demo-full.yml) | — |
| spacejam | [![Performance: spacejam](https://github.com/FluffyLabs/jam-testing/actions/workflows/spacejam-performance.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/spacejam-performance.yml) | [![Demo (tiny): spacejam](https://github.com/FluffyLabs/jam-testing/actions/workflows/spacejam-demo-tiny.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/spacejam-demo-tiny.yml) | [![Demo (full): spacejam](https://github.com/FluffyLabs/jam-testing/actions/workflows/spacejam-demo-full.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/spacejam-demo-full.yml) | — |

### Long-running fuzzing (dedicated)

If your team wants extended fuzz runs (more blocks, multiple runs, dedicated
runner), reach out by commenting on
[issue #1](https://github.com/FluffyLabs/jam-testing/issues/1). We'll set up
a dedicated `<team>-fuzz.yml` workflow with a self-hosted runner labeled for
your team. Long-running workflows run a `[tiny, full]` matrix on a single
badge — both specs share one workflow file, so size `num_blocks` so the
per-spec budget × 2 fits your runner's wall-time window.

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

   The harness sets the
   [standard target packaging](https://github.com/davxy/jam-conformance/tree/main/fuzz-proto#standard-target-packaging)
   env vars on every target container: `JAM_FUZZ=1`, `JAM_FUZZ_SPEC=<tiny|full>`,
   `JAM_FUZZ_DATA_PATH=/shared/data`, `JAM_FUZZ_SOCK_PATH=/shared/jam_target.sock`,
   `JAM_FUZZ_LOG_LEVEL=debug`. `JAM_FUZZ_SPEC` is set per-workflow; your image
   must support both `tiny` and `full` and pick the right one from the env var.
   New targets should read the socket path from `JAM_FUZZ_SOCK_PATH` and can
   be launched with their image's default `CMD` — leave `docker_cmd` unset in
   that case. For backwards compatibility, when `docker_cmd` is provided the
   legacy `{TARGET_SOCK}` placeholder is substituted with the same socket
   path, so existing targets keep working unchanged. **Full-spec workflows
   must omit `docker_cmd`** — full-spec runs are env-only. Anything in `docker_env`
   is appended after the standard vars and can override them.
   `JAM_FUZZ_DATA_PATH` is wiped between sequential fuzz-source runs to match
   official testing's fresh-init behavior.

2. **Create the performance workflow** at `.github/workflows/<team>-performance.yml`:

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
         # Optional overrides:
         # docker_cmd: 'fuzz --socket {TARGET_SOCK}'   # only if your image needs args; new targets read JAM_FUZZ_SOCK_PATH
         # docker_env: 'MY_VAR=value'
         # docker_memory: '512m'
         # docker_platform: 'linux/amd64'
         # readiness_pattern: 'Server ready'
   ```

3. **Create the two demo fuzz workflows.** One for `tiny`, one for `full`.
   Tiny may pass `docker_cmd` (legacy `{TARGET_SOCK}` substitution allowed);
   full **must not** pass `docker_cmd` (env-only invocation):

   ```yaml
   # .github/workflows/myteam-demo-tiny.yml
   name: "Demo (tiny): myteam"

   on:
     schedule:
       - cron: '0 18 * * *'
     workflow_dispatch:
     pull_request:
       paths:
         - '.github/workflows/myteam-demo-tiny.yml'
         - '.github/workflows/demo-source.yml'

   permissions:
     contents: read
     issues: write

   jobs:
     demo:
       uses: ./.github/workflows/demo-source.yml
       with:
         target_name: myteam
         docker_image: 'ghcr.io/myorg/myimage:latest'
         docker_cmd: 'fuzz --socket {TARGET_SOCK}'   # tiny: legacy placeholder OK
         spec: tiny
         mention: yourgithub
   ```

   ```yaml
   # .github/workflows/myteam-demo-full.yml
   # Identical to demo-tiny except: spec: full and no docker_cmd.
   # Full-spec runs are env-only — your target must read JAM_FUZZ_SOCK_PATH.
   name: "Demo (full): myteam"

   on:
     schedule:
       - cron: '0 18 * * *'
     workflow_dispatch:
     pull_request:
       paths:
         - '.github/workflows/myteam-demo-full.yml'
         - '.github/workflows/demo-source.yml'

   permissions:
     contents: read
     issues: write

   jobs:
     demo:
       uses: ./.github/workflows/demo-source.yml
       with:
         target_name: myteam
         docker_image: 'ghcr.io/myorg/myimage:latest'
         spec: full
         mention: yourgithub
   ```

   Your target image must support both `tiny` and `full` (selected via
   `JAM_FUZZ_SPEC`). The `--spec <value>` argument is passed to the
   graymatter source by the workflow; your target receives no spec-related
   CLI args.

4. **Create a team directory** at `teams/<team>/` for any team-specific
   scripts or data you might add later.

5. **Open a PR** and trigger the workflows via `workflow_dispatch` to verify
   everything works.

### Workflow inputs reference

| Input | Required | Default | Description |
|---|---|---|---|
| `target_name` | yes | — | Your implementation name |
| `docker_image` | yes | — | Full image reference |
| `docker_cmd` | no | `""` | Override container command. `{TARGET_SOCK}` is substituted with the socket path. Leave empty for targets that read `JAM_FUZZ_SOCK_PATH` from env. |
| `docker_env` | no | `""` | Space-separated `KEY=VALUE` pairs passed as `-e` flags |
| `docker_memory` | no | `"512m"` | Container memory limit |
| `docker_platform` | no | `"linux/amd64"` | Platform for `docker pull` |
| `readiness_pattern` | no | `""` | Regex matched against stdout to detect readiness |
| `timeout_minutes` | no | `10` | Per-suite timeout |
| `test_suites` | no | all four | JSON array of picofuzz suite names to run |
| `minifuzz_suites` | no | all six | JSON array of minifuzz suite names to run |
| `spec` | no | `"tiny"` | (Demo / long-run only) JAM spec to test against (`tiny` or `full`). The reusable workflow sets `JAM_FUZZ_SPEC` env on the target and appends `--spec <value>` to the graymatter source. |

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

| Variable | Required | Description |
|---|---|---|
| `TARGET_NAME` | yes | Implementation name |
| `TARGET_IMAGE` | yes | Docker image to test |
| `TARGET_CMD` | no | Container command override (`{TARGET_SOCK}` is replaced with the socket path). Empty/unset uses the image's default `CMD`. |
| `TARGET_ENV` | no | Space-separated `KEY=VALUE` pairs |
| `TARGET_MEMORY` | no | Container memory limit (default `512m`) |
| `TARGET_READINESS_PATTERN` | no | Regex for log-based readiness; default is socket-probe |

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
  reusable-picofuzz.yml         # Core reusable workflow (minifuzz + picofuzz)
  demo-source.yml               # Reusable demo fuzz source workflow (tiny|full)
  graymatter-fuzz-source.yml    # Reusable long-running fuzz source workflow
  <team>-performance.yml        # Per-team performance workflow files
  <team>-demo-tiny.yml          # Per-team demo fuzz against the tiny spec
  <team>-demo-full.yml          # Per-team demo fuzz against the full spec
  <team>-fuzz.yml               # Per-team long-running fuzz (matrix over [tiny, full])
                                #   — only for teams with dedicated runners
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
