# Tiny + full spec demo fuzzing — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the fuzz demo against every team in both `tiny` and `full` JAM specs with explicit per-spec badges, plus convert the long-running fuzz to a spec matrix for typeberry and turbojam.

**Architecture:** Plumb `JAM_FUZZ_SPEC` end-to-end. The reusable workflows (`demo-source.yml`, `graymatter-fuzz-source.yml`) gain a `spec` input that sets the `JAM_FUZZ_SPEC` env on the test step and appends `--spec=<value>` to the graymatter source command. The test harness reads `JAM_FUZZ_SPEC` from process env (default `tiny`) and forwards it to the target container. Per-team demo coverage is split into two workflow files (`<team>-demo-tiny.yml`, `<team>-demo-full.yml`) so each spec gets its own GHA badge.

**Tech Stack:** GitHub Actions YAML, Node.js + tsx test harness, Docker.

**Spec:** `docs/superpowers/specs/2026-05-06-tiny-full-demo-fuzzing-design.md`

**Notes:**
- This is mostly mechanical workflow scaffolding. There are no unit tests to TDD against — verification is via `actionlint` (if available) and a single `workflow_dispatch` smoke run on a canary team.
- Commit cadence: one commit per task. Each task is independently reviewable.

---

## Team inventory

23 teams total. Long-run capable (have `graymatter-source` job today): **typeberry**, **turbojam**. The other 21 are demo-only.

For each team's existing demo config, this is the source-of-truth used by Tasks 4 & 5 (extracted from `.github/workflows/<team>-fuzz.yml`):

| Team | docker_image | docker_cmd | docker_env | docker_memory | readiness_pattern | mention |
|------|--------------|------------|------------|---------------|-------------------|---------|
| boka | acala/boka:latest | `fuzz target --socket-path {TARGET_SOCK}` | — | — | — | xlc |
| graymatter | ghcr.io/jambrains/graymatter/gm:conformance-fuzzer-latest | — | — | — | — | franciscoaguirre |
| jam4s | jamforscala/jam4s:0.7.2-rc.11-amd64 | `--fuzz --seed 0 --socket {TARGET_SOCK}` | `CONFIG_FILE=app/config/node-dev.conf` | 4096m | — | celadari |
| jambda | ghcr.io/archelabs/jambda-fuzz-target:latest | — | — | — | — | libingjiang47 |
| jamduna | ghcr.io/jam-duna/duna-target:latest | — | — | — | — | mkchungs |
| jamforge | ghcr.io/philoniare/jam-forge:latest | `--socket-path {TARGET_SOCK}` | — | 4096m | — | philoniare |
| jamixir | ghcr.io/jamixir/jamixir:0.7.2 | — | — | — | — | danicuki |
| jampy | ghcr.io/dakk/jampy-target:0.7.2 | `--sock {TARGET_SOCK}` | — | — | — | dakk |
| jampy-recompiler | ghcr.io/dakk/jampy-target:0.7.2 | `--use-recompiler --sock {TARGET_SOCK}` | — | — | — | dakk |
| jamzig | docker.io/jamzig/jam-conformance-target:latest | — | — | — | — | boymaas |
| jamzilla | ghcr.io/ascrivener/jamzilla:edge | `-socket {TARGET_SOCK}` | `PVM_MODE=jit` | — | — | ascrivener |
| jamzilla-int | ghcr.io/ascrivener/jamzilla:edge | `-socket {TARGET_SOCK}` | `PVM_MODE=interpreter` | — | — | ascrivener |
| javajam | ghcr.io/methodfive/javajam:latest-amd64 | `-Dskip.warmup=true fuzz {TARGET_SOCK}` | — | 8192m | — | jaymansfield |
| jotl | ghcr.io/polykrate/jotl:latest | `{TARGET_SOCK}` | — | 2048m | `Listening on` | polykrate |
| new-jamneration | ghcr.io/new-jamneration/new-jamneration-target:latest | `{TARGET_SOCK}` | `USE_MINI_REDIS=true` | — | — | YCC3741 |
| pbnjam | shimonchick/pbnjam-fuzzer-target:latest | `--socket {TARGET_SOCK}` | — | 4096m | — | mikirov |
| pyjamaz | jamdottech/pyjamaz:latest | `fuzzer target --db-path=/tmp/pyjamaz_fuzzer_db --socket-path={TARGET_SOCK}` | — | — | — | emielsebastiaan |
| spacejam | clearloop/spacejam:latest | — | — | — | — | clearloop |
| tessera | ghcr.io/chainscore/tessera:latest | — | — | — | — | prasad-kumkar |
| tsjam | ghcr.io/vekexasia/tsjam-target:0.7.2 | — | — | — | — | vekexasia |
| turbojam | r2rationality/turbojam-fuzz:latest | `fuzzer-api {TARGET_SOCK}` | — | — | — | sierkov |
| typeberry | ghcr.io/fluffylabs/typeberry:latest | `--version=1 fuzz-target {TARGET_SOCK}` | `JAM_LOG=log` | — | `PVM Backend` | tomusdrw |
| vinwolf | ghcr.io/bloppan/vinwolf:latest | `--fuzz {TARGET_SOCK}` | — | — | `listening on` | bloppan |

For Task 5 (demo-full files), every team's `docker_cmd` is set to `''` (empty), regardless of what the table shows for tiny — full-spec runs are env-only.

---

## File Structure

**Modified:**
- `tests/common.ts` — `JAM_FUZZ_SPEC` derived from env.
- `.github/workflows/demo-source.yml` — `spec` input, env wiring, source-cmd flag, concurrency suffix, notify suffix.
- `.github/workflows/graymatter-fuzz-source.yml` — same as above.
- `.github/workflows/typeberry-fuzz.yml` — convert to spec matrix; drop demo job.
- `.github/workflows/turbojam-fuzz.yml` — convert to spec matrix; halve `num_blocks`; drop demo job.
- `README.md` — Status table restructured; explanatory copy + Adding your team + Project structure updated.

**Created:** 46 files (one per team × 2 specs)
- `.github/workflows/<team>-demo-tiny.yml` × 23
- `.github/workflows/<team>-demo-full.yml` × 23

**Deleted:** 21 files (every `<team>-fuzz.yml` except typeberry/turbojam)
- boka, graymatter, jam4s, jambda, jamduna, jamforge, jamixir, jampy, jampy-recompiler, jamzig, jamzilla, jamzilla-int, javajam, jotl, new-jamneration, pbnjam, pyjamaz, spacejam, tessera, tsjam, vinwolf.

---

### Task 1: Plumb `JAM_FUZZ_SPEC` through the test harness

**Files:**
- Modify: `tests/common.ts:17-23`

- [ ] **Step 1: Edit `tests/common.ts`**

Change the `STANDARD_TARGET_ENV` block from:

```ts
const STANDARD_TARGET_ENV: Record<string, string> = {
  JAM_FUZZ: "1",
  JAM_FUZZ_SPEC: "tiny",
  JAM_FUZZ_DATA_PATH: DATA_PATH,
  JAM_FUZZ_SOCK_PATH: SOCKET_PATH,
  JAM_FUZZ_LOG_LEVEL: "debug",
};
```

to:

```ts
const STANDARD_TARGET_ENV: Record<string, string> = {
  JAM_FUZZ: "1",
  JAM_FUZZ_SPEC: process.env.JAM_FUZZ_SPEC || "tiny",
  JAM_FUZZ_DATA_PATH: DATA_PATH,
  JAM_FUZZ_SOCK_PATH: SOCKET_PATH,
  JAM_FUZZ_LOG_LEVEL: "debug",
};
```

- [ ] **Step 2: Sanity-check the change with tsc**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tests/common.ts
git commit -m "harness: derive JAM_FUZZ_SPEC from process env (default tiny)"
```

---

### Task 2: Add `spec` input to `demo-source.yml`

**Files:**
- Modify: `.github/workflows/demo-source.yml`

- [ ] **Step 1: Add the input definition**

Insert under `inputs:` (before `mention:`):

```yaml
      spec:
        required: false
        type: string
        default: "tiny"
        description: "JAM spec to test against (tiny or full)"
```

- [ ] **Step 2: Update concurrency group to include spec**

Change:

```yaml
concurrency:
  group: "demo-graymatter-${{ inputs.target_name }}"
  cancel-in-progress: true
```

to:

```yaml
concurrency:
  group: "demo-graymatter-${{ inputs.target_name }}-${{ inputs.spec }}"
  cancel-in-progress: true
```

- [ ] **Step 3: Update job names to include spec**

Change `Init demo (graymatter → ${{ inputs.target_name }})` → `Init demo (graymatter → ${{ inputs.target_name }}, ${{ inputs.spec }})`. Same for `Demo fuzz (graymatter → ${{ inputs.target_name }})` and `Notify demo (${{ inputs.target_name }})`.

- [ ] **Step 4: Add `JAM_FUZZ_SPEC` env to the fuzz step**

In the `fuzz` job's `Run fuzz source test` step, add `JAM_FUZZ_SPEC: ${{ inputs.spec }}` to the `env:` block (alphabetical-ish placement, e.g. after `TIMEOUT_MINUTES`).

- [ ] **Step 5: Append `--spec` to graymatter source cmd**

Change:

```yaml
SOURCE_CMD: 'fuzz-m1-source --num-blocks ${{ inputs.num_blocks }} --target {TARGET_SOCK}'
```

to:

```yaml
SOURCE_CMD: 'fuzz-m1-source --spec=${{ inputs.spec }} --num-blocks ${{ inputs.num_blocks }} --target {TARGET_SOCK}'
```

- [ ] **Step 6: Update issue title and labels in the notify job**

Change the issue title from `Demo fuzz failure: graymatter → ${{ inputs.target_name }}` to `Demo fuzz failure: graymatter → ${{ inputs.target_name }} (${{ inputs.spec }})`.

Change the labels from `fuzz-failure,demo,${{ inputs.target_name }}` to `fuzz-failure,demo,${{ inputs.spec }},${{ inputs.target_name }}`.

Update the issue body's first sentence from `The demo graymatter fuzz source test against **${{ inputs.target_name }}** failed.` to `The demo graymatter fuzz source test against **${{ inputs.target_name }}** with spec **${{ inputs.spec }}** failed.`

Same change to the duplicate-detection `gh issue list --label` query (must include `${{ inputs.spec }}` so tiny and full failures don't dedupe each other).

- [ ] **Step 7: Verify YAML parses**

Run: `npx --yes js-yaml .github/workflows/demo-source.yml > /dev/null`
Expected: no output, exit 0. (If `js-yaml` isn't available, `python3 -c 'import yaml; yaml.safe_load(open(".github/workflows/demo-source.yml"))'` works too.)

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/demo-source.yml
git commit -m "demo-source: add spec input (tiny|full), thread JAM_FUZZ_SPEC + --spec"
```

---

### Task 3: Add `spec` input to `graymatter-fuzz-source.yml`

**Files:**
- Modify: `.github/workflows/graymatter-fuzz-source.yml`

Apply the same six edits as Task 2, adapted to this file's wording:

- [ ] **Step 1: Add input definition** (identical to Task 2 Step 1).

- [ ] **Step 2: Update concurrency group**

Change:

```yaml
concurrency:
  group: "fuzz-graymatter-${{ inputs.target_name }}"
  cancel-in-progress: true
```

to:

```yaml
concurrency:
  group: "fuzz-graymatter-${{ inputs.target_name }}-${{ inputs.spec }}"
  cancel-in-progress: true
```

- [ ] **Step 3: Update job names** to include `, ${{ inputs.spec }}` after `${{ inputs.target_name }}` (Init / Fuzz / Notify).

- [ ] **Step 4: Add `JAM_FUZZ_SPEC: ${{ inputs.spec }}`** to the fuzz step's `env:` block.

- [ ] **Step 5: Append `--spec=${{ inputs.spec }}`** to `SOURCE_CMD` (place right after `fuzz-m1-source`).

- [ ] **Step 6: Update notify job**

Issue title: `Fuzz failure: graymatter → ${{ inputs.target_name }} (${{ inputs.spec }})`.
Labels: `fuzz-failure,${{ inputs.spec }},${{ inputs.target_name }}`.
Issue body sentence: `The graymatter fuzz source test against **${{ inputs.target_name }}** with spec **${{ inputs.spec }}** failed.`
Duplicate-detection query: include `--label "${{ inputs.spec }}"`.

- [ ] **Step 7: Verify YAML parses** (same command as Task 2 Step 7, swap path).

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/graymatter-fuzz-source.yml
git commit -m "graymatter-fuzz-source: add spec input (tiny|full), thread JAM_FUZZ_SPEC + --spec"
```

---

### Task 4: Create per-team `<team>-demo-tiny.yml` files (23 files)

**Files:**
- Create: `.github/workflows/<team>-demo-tiny.yml` for every team in the inventory.

For each team in the inventory table, create a file with the structure below. Replace `<team>` with the team name and use the team's `docker_image` / `docker_cmd` / `docker_env` / `docker_memory` / `readiness_pattern` / `mention` from the inventory. Omit a `with:` line when the inventory cell is `—`.

- [ ] **Step 1: Create the canary file (typeberry) first**

Path: `.github/workflows/typeberry-demo-tiny.yml`

```yaml
name: "Demo (tiny): typeberry"

on:
  schedule:
    - cron: '0 18 * * *'
  workflow_dispatch:
  pull_request:
    paths:
      - '.github/workflows/typeberry-demo-tiny.yml'
      - '.github/workflows/demo-source.yml'

permissions:
  contents: read
  issues: write

jobs:
  demo:
    uses: ./.github/workflows/demo-source.yml
    with:
      target_name: typeberry
      docker_image: 'ghcr.io/fluffylabs/typeberry:latest'
      docker_cmd: '--version=1 fuzz-target {TARGET_SOCK}'
      docker_env: 'JAM_LOG=log'
      readiness_pattern: 'PVM Backend'
      spec: tiny
      mention: tomusdrw
```

- [ ] **Step 2: Verify YAML parses for the canary**

Run: `python3 -c 'import yaml; yaml.safe_load(open(".github/workflows/typeberry-demo-tiny.yml"))'`
Expected: no output, exit 0.

- [ ] **Step 3: Create the remaining 22 `<team>-demo-tiny.yml` files**

Use the inventory table above. For each team, derive the file name and contents from this template (omit `docker_cmd:`, `docker_env:`, `docker_memory:`, `readiness_pattern:` lines when the corresponding cell is `—`):

```yaml
name: "Demo (tiny): <team>"

on:
  schedule:
    - cron: '0 18 * * *'
  workflow_dispatch:
  pull_request:
    paths:
      - '.github/workflows/<team>-demo-tiny.yml'
      - '.github/workflows/demo-source.yml'

permissions:
  contents: read
  issues: write

jobs:
  demo:
    uses: ./.github/workflows/demo-source.yml
    with:
      target_name: <team>
      docker_image: '<image>'
      docker_cmd: '<cmd>'
      docker_env: '<env>'
      docker_memory: '<memory>'
      readiness_pattern: '<pattern>'
      spec: tiny
      mention: <mention>
```

Files to create (22 of them, one per team):
boka, graymatter, jam4s, jambda, jamduna, jamforge, jamixir, jampy, jampy-recompiler, jamzig, jamzilla, jamzilla-int, javajam, jotl, new-jamneration, pbnjam, pyjamaz, spacejam, tessera, tsjam, turbojam, vinwolf.

- [ ] **Step 4: Verify all 23 files parse**

Run:
```bash
for f in .github/workflows/*-demo-tiny.yml; do
  python3 -c "import yaml; yaml.safe_load(open('$f'))" || echo "FAIL: $f"
done
```
Expected: no `FAIL:` output.

- [ ] **Step 5: Spot-check job graph for canary**

Run: `cat .github/workflows/typeberry-demo-tiny.yml`
Verify: `spec: tiny` is present, `target_name: typeberry`, all other fields match the table.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/*-demo-tiny.yml
git commit -m "workflows: add per-team demo-tiny workflow files (spec=tiny)"
```

---

### Task 5: Create per-team `<team>-demo-full.yml` files (23 files)

**Files:**
- Create: `.github/workflows/<team>-demo-full.yml` for every team in the inventory.

Identical structure to Task 4 except: `spec: full`, name `Demo (full): <team>`, and **`docker_cmd` is always omitted** (or set to `''`) regardless of what the team uses for tiny — full-spec runs are env-only by policy.

- [ ] **Step 1: Create the canary file (typeberry) first**

Path: `.github/workflows/typeberry-demo-full.yml`

```yaml
name: "Demo (full): typeberry"

on:
  schedule:
    - cron: '0 18 * * *'
  workflow_dispatch:
  pull_request:
    paths:
      - '.github/workflows/typeberry-demo-full.yml'
      - '.github/workflows/demo-source.yml'

permissions:
  contents: read
  issues: write

jobs:
  demo:
    uses: ./.github/workflows/demo-source.yml
    with:
      target_name: typeberry
      docker_image: 'ghcr.io/fluffylabs/typeberry:latest'
      docker_env: 'JAM_LOG=log'
      readiness_pattern: 'PVM Backend'
      spec: full
      mention: tomusdrw
```

(Note: no `docker_cmd:` line. `docker_env`, `readiness_pattern`, `docker_memory` are kept per the inventory because they're not spec-specific.)

- [ ] **Step 2: Verify YAML parses for the canary** (same check as Task 4 Step 2).

- [ ] **Step 3: Create the remaining 22 `<team>-demo-full.yml` files**

Template (omit `docker_env:`, `docker_memory:`, `readiness_pattern:` lines when the inventory cell is `—`; **never include `docker_cmd:`**):

```yaml
name: "Demo (full): <team>"

on:
  schedule:
    - cron: '0 18 * * *'
  workflow_dispatch:
  pull_request:
    paths:
      - '.github/workflows/<team>-demo-full.yml'
      - '.github/workflows/demo-source.yml'

permissions:
  contents: read
  issues: write

jobs:
  demo:
    uses: ./.github/workflows/demo-source.yml
    with:
      target_name: <team>
      docker_image: '<image>'
      docker_env: '<env>'
      docker_memory: '<memory>'
      readiness_pattern: '<pattern>'
      spec: full
      mention: <mention>
```

Same 22 teams as Task 4 Step 3.

- [ ] **Step 4: Verify all 23 files parse**

Run:
```bash
for f in .github/workflows/*-demo-full.yml; do
  python3 -c "import yaml; yaml.safe_load(open('$f'))" || echo "FAIL: $f"
done
```
Expected: no `FAIL:` output.

- [ ] **Step 5: Confirm no full file leaks `docker_cmd`**

Run: `grep -l 'docker_cmd' .github/workflows/*-demo-full.yml || echo "OK: no docker_cmd in any full file"`
Expected: `OK: no docker_cmd in any full file`.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/*-demo-full.yml
git commit -m "workflows: add per-team demo-full workflow files (spec=full, env-only)"
```

---

### Task 6: Convert `typeberry-fuzz.yml` to spec matrix; drop demo job

**Files:**
- Modify: `.github/workflows/typeberry-fuzz.yml`

The demo job has moved to `typeberry-demo-tiny.yml` / `typeberry-demo-full.yml`. The long-run becomes a `[tiny, full]` matrix on the same reusable workflow.

- [ ] **Step 1: Replace the file contents with**

```yaml
name: "Fuzz: typeberry"

on:
  schedule:
    - cron: '0 18 * * *'
  workflow_dispatch:
  pull_request:

permissions:
  contents: read
  issues: write

jobs:
  graymatter-source:
    strategy:
      fail-fast: false
      matrix:
        spec: [tiny, full]
    uses: ./.github/workflows/graymatter-fuzz-source.yml
    with:
      target_name: typeberry
      docker_image: 'ghcr.io/fluffylabs/typeberry:latest'
      docker_cmd: ${{ matrix.spec == 'full' && '' || '--version=1 fuzz-target {TARGET_SOCK}' }}
      docker_env: 'JAM_LOG=log'
      readiness_pattern: 'PVM Backend'
      spec: ${{ matrix.spec }}
      timeout_minutes: 30
      num_blocks: 5000
      num_runs: 9
      mention: tomusdrw
```

Notes:
- `num_blocks` halved from 10 000 → 5 000 per spec.
- `docker_cmd` uses an inline conditional: empty for full, original cmd for tiny.
- The `demo:` job is removed entirely.

- [ ] **Step 2: Verify YAML parses**

Run: `python3 -c 'import yaml; yaml.safe_load(open(".github/workflows/typeberry-fuzz.yml"))'`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/typeberry-fuzz.yml
git commit -m "typeberry-fuzz: convert long-run to [tiny,full] matrix; halve num_blocks"
```

---

### Task 7: Convert `turbojam-fuzz.yml` to spec matrix; halve num_blocks; drop demo job

**Files:**
- Modify: `.github/workflows/turbojam-fuzz.yml`

- [ ] **Step 1: Replace the file contents with**

```yaml
name: "Fuzz: turbojam"

on:
  schedule:
    - cron: '0 18 * * *'
  workflow_dispatch:
  pull_request:
    paths:
      - '.github/workflows/turbojam-fuzz.yml'

permissions:
  contents: read
  issues: write

jobs:
  graymatter-source:
    strategy:
      fail-fast: false
      matrix:
        spec: [tiny, full]
    uses: ./.github/workflows/graymatter-fuzz-source.yml
    with:
      target_name: turbojam
      docker_image: 'r2rationality/turbojam-fuzz:latest'
      docker_cmd: ${{ matrix.spec == 'full' && '' || 'fuzzer-api {TARGET_SOCK}' }}
      spec: ${{ matrix.spec }}
      timeout_minutes: 1380
      num_blocks: 175000
      num_runs: 10
      mention: sierkov
```

Notes:
- `num_blocks` halved from 350 000 → 175 000 per spec.
- `timeout_minutes` left at 1380 — each spec gets its own timeout; the matrix entries serialize on the single `[self-hosted, turbojam]` runner so total wall time is ≤ 23 h after halving.
- The `demo:` job is removed.

- [ ] **Step 2: Verify YAML parses** (same command as Task 6 Step 2, swap path).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/turbojam-fuzz.yml
git commit -m "turbojam-fuzz: convert long-run to [tiny,full] matrix; halve num_blocks 350k→175k"
```

---

### Task 8: Delete obsolete `<team>-fuzz.yml` files (21 files)

**Files:**
- Delete: `.github/workflows/<team>-fuzz.yml` for every team except typeberry and turbojam.

These files only contained the `demo:` job, which has moved to `<team>-demo-tiny.yml` / `<team>-demo-full.yml`.

- [ ] **Step 1: Delete the 21 files**

```bash
git rm \
  .github/workflows/boka-fuzz.yml \
  .github/workflows/graymatter-fuzz.yml \
  .github/workflows/jam4s-fuzz.yml \
  .github/workflows/jambda-fuzz.yml \
  .github/workflows/jamduna-fuzz.yml \
  .github/workflows/jamforge-fuzz.yml \
  .github/workflows/jamixir-fuzz.yml \
  .github/workflows/jampy-fuzz.yml \
  .github/workflows/jampy-recompiler-fuzz.yml \
  .github/workflows/jamzig-fuzz.yml \
  .github/workflows/jamzilla-fuzz.yml \
  .github/workflows/jamzilla-int-fuzz.yml \
  .github/workflows/javajam-fuzz.yml \
  .github/workflows/jotl-fuzz.yml \
  .github/workflows/new-jamneration-fuzz.yml \
  .github/workflows/pbnjam-fuzz.yml \
  .github/workflows/pyjamaz-fuzz.yml \
  .github/workflows/spacejam-fuzz.yml \
  .github/workflows/tessera-fuzz.yml \
  .github/workflows/tsjam-fuzz.yml \
  .github/workflows/vinwolf-fuzz.yml
```

- [ ] **Step 2: Verify only typeberry-fuzz.yml and turbojam-fuzz.yml remain**

Run: `ls .github/workflows/*-fuzz.yml`
Expected output:
```
.github/workflows/turbojam-fuzz.yml
.github/workflows/typeberry-fuzz.yml
```

- [ ] **Step 3: Commit**

```bash
git commit -m "workflows: drop per-team -fuzz.yml for demo-only teams (moved to demo-tiny/-full)"
```

---

### Task 9: Update `README.md` Status table

**Files:**
- Modify: `README.md` (the Status section, the bullet list above it, the "How it works" section, the "Adding your team" section, and the "Project structure" block).

- [ ] **Step 1: Replace the Status section header copy**

Find:
```
The **Performance** column covers minifuzz (conformance gate) + picofuzz
(timing). The **Fuzz** column covers demo fuzz runs.
```

Replace with:
```
The **Performance** column covers minifuzz (conformance gate) + picofuzz
(timing). **Demo (tiny)** and **Demo (full)** are short fuzz runs (5 000 blocks
each on a shared runner) executing the JAM `tiny` and `full` specs respectively.
**Long-run** is a dedicated, multi-hour fuzz run that exercises both specs in
a matrix (single badge — red if either spec fails). Targets pick which spec
to run from the `JAM_FUZZ_SPEC` environment variable; the matching
`--spec=<value>` is also passed to the graymatter source command by the
workflow.
```

- [ ] **Step 2: Replace the Status table**

Replace the entire `| Team | Performance | Fuzz |` table with:

```markdown
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
```

(Order preserved from current README.)

- [ ] **Step 3: Verify the markdown table is well-formed**

Run: `head -80 README.md | grep -c '^|'`
Expected: 25 (1 header + 1 divider + 23 rows).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: restructure Status table for tiny+full demo + long-run columns"
```

---

### Task 10: Refresh "How it works", "Adding your team", and "Project structure" sections in README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the bullet list in the intro**

In the bullet list above the Status section, find the `**Fuzz testing**` bullet and replace it with:

```
- **Fuzz testing** — one implementation (the "source") generates random
  blocks and another (the "target") must process them without crashing.
  Currently [graymatter](https://github.com/jambrains/graymatter) is
  available as a fuzz source, run against both the JAM `tiny` and `full`
  specs. Every team gets two demo fuzz jobs (5 000 blocks each on a shared
  runner — one per spec); dedicated long-running runs cover both specs in
  a single matrix.
```

- [ ] **Step 2: Update "Adding your team" workflow example**

Replace the example yaml under "Create a workflow file" with two examples:

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
         docker_cmd: 'fuzz --socket {TARGET_SOCK}'   # legacy: tiny only
         spec: tiny
         mention: yourgithub
```

```yaml
   # .github/workflows/myteam-demo-full.yml
   # Identical to demo-tiny except: spec: full, no docker_cmd
   # (full-spec runs are env-only — your target must read JAM_FUZZ_SOCK_PATH).
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

Add a sentence after the examples: *"Your target image must support both `tiny` and `full` specs (selected via `JAM_FUZZ_SPEC`). The `--spec=<value>` argument is passed to the graymatter source by the workflow — your target receives no spec-related CLI args."*

- [ ] **Step 3: Update the workflow inputs reference table**

Add a `spec` row after the existing rows:

```markdown
| `spec` | no | `"tiny"` | JAM spec to test against (`tiny` or `full`). The reusable workflow sets `JAM_FUZZ_SPEC` env on the target and appends `--spec=<value>` to the graymatter source. |
```

- [ ] **Step 4: Update the Project structure block**

Replace the workflows portion of the structure block with:

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
```

- [ ] **Step 5: Update "Long-running fuzzing (dedicated)" section**

Find the section header and replace its body to mention both specs:

```
If your team wants extended fuzz runs (more blocks, multiple runs, dedicated
runner), reach out by commenting on
[issue #1](https://github.com/FluffyLabs/jam-testing/issues/1). We'll set up
a dedicated `<team>-fuzz.yml` workflow with a self-hosted runner labeled for
your team. Long-running workflows run a `[tiny, full]` matrix on a single
badge; configure `num_blocks` so the per-spec budget × 2 fits your runner
window.
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: refresh How-it-works, Adding-your-team, Project-structure for tiny+full"
```

---

### Task 11: End-to-end smoke verification

**Files:**
- None modified.

This task validates the implementation without merging. The user will dispatch the canary workflows manually.

- [ ] **Step 1: Push the branch and open a draft PR**

```bash
git push -u origin td-fuzz-full-spec
gh pr create --draft --base main --title "Add tiny+full demo fuzzing" --body "Implements docs/superpowers/specs/2026-05-06-tiny-full-demo-fuzzing-design.md. Includes the rebase onto td-check-jam-conformance-targets's 7 new env-only targets (final base for that branch should be merged first)."
```

- [ ] **Step 2: Trigger the typeberry canary tiny demo**

```bash
gh workflow run typeberry-demo-tiny.yml --ref td-fuzz-full-spec
```

Wait for completion (`gh run watch`). Expected: green.

- [ ] **Step 3: Trigger the typeberry canary full demo**

```bash
gh workflow run typeberry-demo-full.yml --ref td-fuzz-full-spec
```

Expected: pass if typeberry supports full spec; otherwise targeted protocol-level failure (this is OK and reveals the work needed in the target). Do NOT block the PR on this — it's the signal we built.

- [ ] **Step 4: Render-check README on GitHub**

Open the PR's "Files changed" view, scroll to README, confirm the badge images load and the table renders correctly with 23 data rows × 5 columns.

- [ ] **Step 5: Mark PR ready for review**

```bash
gh pr ready
```

---

## Self-review checklist

- **Spec coverage:** every section of the spec maps to at least one task — harness change → Task 1; reusable workflows → Tasks 2-3; per-team demo files → Tasks 4-5; long-run matrix → Tasks 6-7; obsolete file deletes → Task 8; README → Tasks 9-10. ✓
- **Placeholder scan:** no TBDs/TODOs in the plan. The 22 per-team file creations in Tasks 4 and 5 are templated against the inventory table — exact contents are derivable, not "fill in later". ✓
- **Type consistency:** input names (`spec`, `target_name`, `docker_image`, `docker_cmd`, `docker_env`, `docker_memory`, `readiness_pattern`, `mention`) used consistently across all tasks. ✓
- **Day-one failure expectation:** Task 11 Step 3 calls out that the full canary may fail and that's the intended signal — not a plan bug.
