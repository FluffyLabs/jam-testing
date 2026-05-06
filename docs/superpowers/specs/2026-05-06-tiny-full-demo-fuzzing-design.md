# Tiny + full spec demo fuzzing — design

Date: 2026-05-06
Status: Draft
Base branch: `td-check-jam-conformance-targets` (commit `20e267e` — adds 7 new
env-only targets: jamduna, jamzig, tessera, tsjam, jambda, jamixir, spacejam,
bringing the team count to 23).

## Goal

Run the fuzz demo (and existing long-running fuzz) against every team's
implementation under **both** `tiny` and `full` JAM specs, with explicit per-spec
visibility (badges) in the README.

The graymatter source must learn a `--spec=<value>` flag. Targets must rely
exclusively on the `JAM_FUZZ_SPEC` environment variable for their spec
selection — they receive no additional CLI arguments to communicate spec.

## Scope

In scope:
- `tests/common.ts` plumbing for `JAM_FUZZ_SPEC`.
- Reusable workflows: `demo-source.yml` and `graymatter-fuzz-source.yml` accept
  a `spec` input.
- One demo workflow per team **per spec** (`<team>-demo-tiny.yml`,
  `<team>-demo-full.yml`).
- Long-running fuzz workflow per team converted to a `[tiny, full]` matrix in a
  single file (one badge), with workload halved so total wall time stays ≤ 23 h.
- README restructured to reflect the new per-spec status grid.

Out of scope:
- Changes to picofuzz/minifuzz spec handling (those already pass `--spec tiny`
  literally and are not part of this work).
- New runner labels or runner provisioning.
- Adapting any team's docker image to support full spec — that's the team's
  responsibility; this PR only exposes the surface.

## Non-goals

- We do **not** introduce conditional skip-on-failure for teams that don't yet
  support full. Failing-loud is the intended behavior; teams must support full
  spec to keep their badge green.
- We do **not** preserve the current `<team>-fuzz.yml` for teams without a
  long-running job. Those files are deleted; their demo coverage moves to the
  two per-spec demo files.

## Architecture changes

### Test harness (`tests/common.ts`)

`STANDARD_TARGET_ENV.JAM_FUZZ_SPEC` becomes derived from the process env:

```ts
JAM_FUZZ_SPEC: process.env.JAM_FUZZ_SPEC || "tiny",
```

The harness already passes `STANDARD_TARGET_ENV` through to the target via
`buildTargetEnvArgs`. No other test changes are required: targets read
`JAM_FUZZ_SPEC` and pick the right spec themselves.

### Reusable workflow: `demo-source.yml`

Add input:

```yaml
spec:
  required: false
  type: string
  default: "tiny"
  description: "JAM spec: 'tiny' or 'full'"
```

In the `fuzz` job:
- Pass `JAM_FUZZ_SPEC: ${{ inputs.spec }}` in the `env:` block of the test step.
- Append `--spec=${{ inputs.spec }}` to `SOURCE_CMD`. Graymatter accepts both
  `--spec=tiny` and `--spec=full` so we always pass the flag explicitly.

The existing `concurrency.group` becomes `demo-graymatter-${{ inputs.target_name }}-${{ inputs.spec }}`
so tiny and full demos for the same team don't cancel each other.

The notify job's issue title and labels include the spec
(`Demo fuzz failure: graymatter → ${{ inputs.target_name }} (${{ inputs.spec }})`,
labels `fuzz-failure,demo,${{ inputs.spec }},${{ inputs.target_name }}`).

### Reusable workflow: `graymatter-fuzz-source.yml`

Same `spec` input, same env / cmd plumbing, same concurrency suffix, same
issue-label/title suffix. Default remains `tiny`.

### Per-team workflows

For **every team** (23 teams):

- `<team>-demo-tiny.yml` — calls `demo-source.yml` with `spec: tiny`.
  Keeps the team's existing `docker_cmd` (legacy `{TARGET_SOCK}` substitution
  still allowed for tiny).
- `<team>-demo-full.yml` — calls `demo-source.yml` with `spec: full` and
  `docker_cmd: ''` (env-only invocation — the target must read
  `JAM_FUZZ_SOCK_PATH`).

Triggers identical to today's `demo:` job (schedule, dispatch, PR with path
filter on the file itself plus `demo-source.yml`).

For **teams that currently have a long-running job** (typeberry, turbojam):

- `<team>-fuzz.yml` keeps the long-running `graymatter-source` job.
  Converted to a `strategy.matrix` over `spec: [tiny, full]` calling
  `graymatter-fuzz-source.yml` once per spec. Per-spec workload halved
  (e.g. turbojam `num_blocks: 350000 → 175000`) so the two matrix entries —
  serialized on the single self-hosted runner — fit within the original 23 h
  envelope. The `demo:` job is removed (now in demo-tiny / demo-full files).
  Tiny matrix entry keeps existing `docker_cmd`. Full matrix entry passes
  `docker_cmd: ''`.

For **teams without a long-running job** (everyone else): `<team>-fuzz.yml`
is deleted entirely.

### Concurrency interactions

Long-running matrix entries with `cancel-in-progress: true` would cancel each
other since they currently share `fuzz-graymatter-${{ inputs.target_name }}`.
The new key includes spec, so tiny and full long-runs run independently and
do not cancel each other across specs (only the same spec's prior run cancels
when a new schedule fires).

## README changes

The Status section is restructured:

```
| Team | Performance | Demo (tiny) | Demo (full) | Long-run |
|------|-------------|-------------|-------------|----------|
| typeberry | <perf badge> | <demo-tiny badge> | <demo-full badge> | <fuzz badge> |
| turbojam  | … | … | … | <fuzz badge> |
| jamzilla  | … | … | … | — |
| …
```

The "Long-run" column is `—` for teams that don't have one.

A short paragraph explains the matrix:
- Demos run on a shared `demo` runner, 5 000 blocks, two specs.
- Long-runs are dedicated, single workflow that exercises both specs in a
  matrix; the badge goes red if either spec fails.
- Targets pick the spec from `JAM_FUZZ_SPEC`. The `--spec=<value>` argument
  to the graymatter source is set by the workflow.

The "Adding your team" section is updated:
- Two demo workflow files required (`-demo-tiny`, `-demo-full`).
- Long-running is opt-in via a separate `<team>-fuzz.yml`, single file with
  matrix.
- Reminder that full-spec workflows must invoke the target image with no
  command-line arguments — env-only.

The "Project structure" block is updated to mention the per-spec demo files.

## Risk and trade-offs

### What this gets right

- **Explicit per-spec signal.** Separate workflow files give the README two
  green-or-red badges per team. No ambiguity about which spec is broken.
- **Backward compatible at the harness level.** `JAM_FUZZ_SPEC` defaults to
  `tiny`, so anyone running the test harness locally without setting the env
  gets today's behavior.
- **Single source of truth in reusable workflows.** Spec handling is added in
  exactly two places (`demo-source.yml`, `graymatter-fuzz-source.yml`) and the
  23×2 demo files just call them with different values.

### What this trades off

- **File proliferation.** 46 new `<team>-demo-*.yml` files. Mostly identical
  except for the spec value. Mitigated by the fact that the per-team config
  itself is small (~15 lines per file) and is the only place team-specific
  knobs live.
- **Day-one failures.** Most teams probably don't yet support full spec. Their
  `<team>-demo-full` workflow will fail on the first scheduled run and open a
  `fuzz-failure` issue. Acceptable — that's the intended signal.
- **Long-run wall time.** Even with halved per-spec workload, the `[tiny, full]`
  matrix serializes on a single self-hosted runner, so total runtime ≈ original.
  This is the only way to keep one badge per long-run; the alternative was
  splitting into two files which the user rejected.
- **PR test fan-out.** A change to `demo-source.yml` does not auto-trigger all
  23×2 demo workflows (path filter is on the team file itself). PR authors
  changing the reusable workflow must dispatch a representative team manually.
  Same as today.

## Concrete change set

1. `tests/common.ts` — read `JAM_FUZZ_SPEC` from `process.env`, default `tiny`.
2. `.github/workflows/demo-source.yml` — `spec` input, env, source-cmd flag,
   concurrency suffix, notify title/label suffix.
3. `.github/workflows/graymatter-fuzz-source.yml` — same as above.
4. `.github/workflows/<team>-demo-tiny.yml` × 23 — new files (preserve each
   team's existing `docker_cmd`, which may be empty for newly-added env-only
   teams).
5. `.github/workflows/<team>-demo-full.yml` × 23 — new files (always
   `docker_cmd: ''`).
6. `.github/workflows/typeberry-fuzz.yml` — convert to spec matrix; halve
   per-spec workload; drop `demo:` job.
7. `.github/workflows/turbojam-fuzz.yml` — same; halve `num_blocks`
   `350000 → 175000`.
8. `.github/workflows/<other-team>-fuzz.yml` × 21 — deleted (every team
   except typeberry and turbojam).
9. `README.md` — restructure Status table; refresh "How it works" / "Adding
   your team" / "Project structure" sections.

## Validation

- `git grep` shows no remaining hardcoded `JAM_FUZZ_SPEC` outside the new
  derived line in `tests/common.ts` and the workflow `env:` blocks.
- A dry-run of `<team>-demo-tiny.yml` passes for one canary team (typeberry)
  via `workflow_dispatch`.
- A dry-run of `<team>-demo-full.yml` for the same canary either passes
  (target supports full) or fails with a clear protocol-level message
  (target rejects full).
- README badges resolve to the correct workflow files (visual check).
