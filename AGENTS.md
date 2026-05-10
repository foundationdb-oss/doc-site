# AGENTS.md — FoundationDB doc-site maintenance playbook

This file is the canonical entry point for **agents and humans** maintaining
this repository (convention: <https://agents.md>). Read this before touching
versioned content or wiring up a new release.

## Repo orientation

This is an [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) site
built into multiple FoundationDB versions with [mike](https://github.com/jimporter/mike)
and deployed via Vercel. Three versions are built today: **7.1** (legacy),
**7.3** (stable, served at `/`) and **7.4** (pre-release). Per-version content
is gated with Jinja blocks like `{% if fdb_version == "7.3" %} … {% endif %}`
(canonical example: [`docs/operations/gray-failure-detection.md`](docs/operations/gray-failure-detection.md)),
and per-version metadata (`fdb_release`, `docker_tag`, `api_version`, …) lives
in [`main_hooks.py`](main_hooks.py).

> **House rule:** only document features that are actually shipped in a tagged
> release of the version being built. Pre-shipped features go on the
> [Roadmap page](docs/getting-started/roadmap.md), **not** on per-feature pages.

---

## Table of contents

- [Trigger 1 — A new 7.3.x or 7.4.x patch is released upstream](#trigger-1--a-new-73x-or-74x-patch-is-released-upstream)
- [Trigger 2 — A feature lands on `main` but not a release branch](#trigger-2--a-feature-lands-on-main-but-not-a-release-branch)
- [Trigger 3 — `apple/foundationdb` cuts a public 8.0 build](#trigger-3--applefoundationdb-cuts-a-public-80-build)
- [Verification cheat sheet](#verification-cheat-sheet)
- [Cross-version content patterns](#cross-version-content-patterns)
- [Verifying knob / option / trace-event names against upstream](#verifying-knob--option--trace-event-names-against-upstream)
- [Rotating the Discord invite](#rotating-the-discord-invite)

---

## Trigger 1 — A new 7.3.x or 7.4.x patch is released upstream

Use when Apple tags a new patch on
[`apple/foundationdb` releases](https://github.com/apple/foundationdb/releases).

1. **Bump `main_hooks.py`** for the affected version. Update `fdb_release`,
   `docker_tag`, `java_version`, and `package_version` to the new patch number.
   Mirror the value used in the upstream release tag exactly.
2. **Update `scripts/vercel-build.sh`.** The comment block around line 43 lists
   example `fdb_release` values per version — keep it in sync with
   `main_hooks.py`.
3. **Sweep illustrative references** in user-facing docs that intentionally
   hard-code the latest patch (rather than using the `{{ fdb_release }}`
   variable):

   ```bash
   grep -rn "<old patch>" docs/ main_hooks.py mkdocs.yml scripts/vercel-build.sh README.md
   ```

   Typical files to touch: `docs/getting-started/versions.md`,
   `docs/getting-started/installation.md`, `docs/api/python.md`,
   `docs/api/c.md`, `docs/api/java.md`, `docs/operations/upgrading.md`, and
   `README.md`.
4. **Reconcile the Roadmap page.** Open
   [`docs/getting-started/roadmap.md`](docs/getting-started/roadmap.md) and
   read the *"Coming in the next 7.3.x / 7.4.x patch"* section. For each item:
   - Check whether the upstream backport PR is now in the released tag — compare
     the backport's merge date to the release tag's date on
     `apple/foundationdb`.
   - If shipped: **move the entry off the Roadmap** and document the feature on
     the appropriate per-feature page (e.g. async `status` belongs on
     `docs/operations/troubleshooting.md` or `docs/operations/monitoring.md`).
     Mention any new client-visible options (e.g. `max_grv_queue_delay` on
     `docs/api/python.md`), gated by version with `{% if fdb_version >= "..." %}`.
   - If still not shipped: leave it on the Roadmap and update version numbers in
     surrounding prose if needed.
5. **Verify** all built versions still build with strict mode:

   ```bash
   for v in 7.1 7.3 7.4; do FDB_VERSION=$v mkdocs build --strict || echo FAILED; done
   ```

---

## Trigger 2 — A feature lands on `main` but not a release branch

A PR has merged to `apple/foundationdb` `main` but is not yet on
`release-7.3` or `release-7.4`.

- Add it to [`docs/getting-started/roadmap.md`](docs/getting-started/roadmap.md)
  under the *"Targeting 8.0 (merged to `main`)"* section.
- Hyperlink the PR number to
  `https://github.com/apple/foundationdb/pull/<num>`.
- **Do not** add it to per-feature pages — those describe shipped behavior only.

---

## Trigger 3 — `apple/foundationdb` cuts a public 8.0 build

This is the big one. Order matters.

1. **Add 8.0 metadata to `main_hooks.py`.** Add a new `"8.0"` entry to
   `VERSION_CONFIG` with `api_version: 800`, `fdb_release`, `docker_tag`,
   `java_version`, `package_version`, plus any new variables 8.0 introduces.
2. **Wire 8.0 into mike.** Add a new `mike deploy` step in
   [`scripts/vercel-build.sh`](scripts/vercel-build.sh) mirroring the existing
   7.4 block. Decide on aliases — typical options: promote 7.4 → `stable`/`latest`
   and demote 7.3, **or** keep 7.3 stable until 8.0 stabilizes. Confirm the
   alias plan with the maintainer before merging.
3. **Update `mkdocs.yml`** if any version-specific nav changes are needed
   (e.g. new pages that only exist in 8.0).
4. **Update `docs/getting-started/versions.md`** and the version-table sections
   of `README.md` (the *"Current Versions"*, *"URL Structure"*, and example
   variable table).
5. **Reorganize the Roadmap page** ([`docs/getting-started/roadmap.md`](docs/getting-started/roadmap.md)):
   - Move every *"Targeting 8.0"* item that actually shipped in 8.0 onto the
     appropriate per-feature page, gated with `{% if fdb_version >= "8.0" %}`.
   - Anything cut from 8.0 stays on the Roadmap, re-bucketed under the next
     major.
   - Update the top-of-page warning admonition (it currently states "no public
     8.0 build exists today" — flip that).
6. **Audit existing per-feature pages** — especially
   [`docs/operations/gray-failure-detection.md`](docs/operations/gray-failure-detection.md) —
   for new 8.0-only knobs and trace events. The gray-failure rework on `main`
   is known to introduce additional trace events (e.g.
   `ClusterControllerUpdateWorkerHealth`-related rework). Verify against
   `apple/foundationdb` `release-8.0` source once it exists.
7. **Verify** all four versions build strict and the picker works locally:

   ```bash
   for v in 7.1 7.3 7.4 8.0; do FDB_VERSION=$v mkdocs build --strict || echo FAILED; done
   ./scripts/mike-serve.sh
   ```

---

## Verification cheat sheet

| Goal | Command |
|------|---------|
| Single-version strict build | `FDB_VERSION=<v> mkdocs build --strict` |
| All built versions in a loop | `for v in 7.1 7.3 7.4; do FDB_VERSION=$v mkdocs build --strict || echo FAILED; done` |
| Multi-version preview with picker | `./scripts/mike-serve.sh` (handles temp branch + cleanup) |

> ⚠️ **Never** run `scripts/vercel-build.sh` locally — it deletes `.git`. It is
> only safe in Vercel's ephemeral build environment.

---

## Cross-version content patterns

Two patterns cover most version gating. Both are taken from
[`docs/operations/gray-failure-detection.md`](docs/operations/gray-failure-detection.md).

**Per-row gating inside a table** (one row in 7.3, two rows in 7.4+):

```jinja
{% if fdb_version == "7.3" %}
| `CC_ENABLE_REMOTE_LOG_ROUTER_MONITORING` | `true` | Detect degraded log-router connectivity. |
{% else %}
| `CC_ENABLE_REMOTE_LOG_ROUTER_DEGRADATION_MONITORING` | `false` | Detect degraded (slow) remote log-router links. |
| `CC_ENABLE_REMOTE_LOG_ROUTER_DISCONNECT_MONITORING` | `true` | Detect disconnected remote log-router links. |
{% endif %}
```

**Whole-section gating** (only render on 7.4 and later):

```jinja
{% if fdb_version >= "7.4" %}
On {{ fdb_version }} you can also enable `CC_GRAY_FAILURE_STATUS_JSON` and read
the `gray_failure` object inside `status json` for a snapshot of currently
degraded servers without tailing trace logs.
{% endif %}
```

String comparison on `fdb_version` works for the current `7.x` / `8.x` range.
Re-check this if the version space ever grows past single-digit minors.

---

## Verifying knob / option / trace-event names against upstream

When confirming a name exists in a specific FoundationDB release:

- Check **both `.cpp` and `.h`** files. For example,
  `fdbserver/include/fdbserver/ClusterController.actor.h` declares trace events
  that don't appear in the matching `.cpp`.
- Knobs live in `fdbclient/ServerKnobs.cpp` (defaults) and
  `fdbclient/include/fdbclient/ServerKnobs.h` (declarations). Always check both.
- Use raw GitHub fetch for definitive answers — the GitHub code-search index is
  incomplete for header files in this repo:

  ```text
  https://raw.githubusercontent.com/apple/foundationdb/release-<v>/<path>
  ```

  e.g. `https://raw.githubusercontent.com/apple/foundationdb/release-7.4/fdbclient/ServerKnobs.cpp`.

---

## Rotating the Discord invite

The Discord invite URL is referenced from two places and **both must be
updated together** when the invite is rotated:

1. **`main_hooks.py`** — update the `DISCORD_INVITE` module-level constant.
   Documentation pages reference it via the `{{ discord_invite }}` Jinja
   variable, so all markdown content picks up the new value automatically.
2. **`mkdocs.yml`** — update the `social` Discord `link:` literal. `mkdocs.yml`
   is parsed before the macros plugin runs, so the Jinja variable cannot be
   used here; the URL must be hard-coded.

After rotating, verify no stale references remain anywhere in the repo:

```bash
grep -rn "discord.gg/" docs/ main_hooks.py mkdocs.yml README.md AGENTS.md
```

Every match should be the current invite URL.

