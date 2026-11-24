# Docs

Each fact lives in one place; the others link to it.

| Doc                                | What it's for                                                             |
| ---------------------------------- | ------------------------------------------------------------------------- |
| [roadmap.md](roadmap.md)           | Where the project stands and what's next. Start here.                     |
| [features/](features/README.md)    | **What** each feature does and where it lives in the code, in build order |
| [design.md](design.md)             | How the app is laid out: pages, the 3D HUD, the look                      |
| [releases.md](releases.md)         | The three releases and which backlog items (PBIs) go in each              |
| [decisions.md](decisions.md)       | **Why** things are the way they are, and ideas turned down                |
| [dev-guide.md](dev-guide.md)       | Test tools, checking UI, how maps are built, gotchas                      |
| [infra.md](infra.md)               | The AWS plan (nothing deployed yet)                                       |
| [manual-tests.md](manual-tests.md) | The owner's hand-test checklist, with who's who in the seed               |
| [open-issues.md](open-issues.md)   | Things noticed and not fixed                                              |

Commands, repo layout and working agreements are in [`AGENTS.md`](../AGENTS.md).

**When you change something:** update its spec; add a dated line to the decision log if a decision
was made; add hand-test checks for a new feature; add anything you noticed but didn't fix to open
issues; update the roadmap if the status changed.
