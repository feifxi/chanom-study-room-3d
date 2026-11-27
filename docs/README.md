# Docs

Each fact lives in one place; the others link to it.

| Doc                                | What it's for                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| [guide/](guide/README.md)          | **How the code works**, from scratch: architecture, conventions, each release's code |
| [roadmap.md](roadmap.md)           | Where the project stands and what's next. Start here.                                |
| [features/](features/README.md)    | **What** each feature does and where it lives in the code, in build order            |
| [design.md](design.md)             | How the app is laid out: pages, the 3D HUD, the look                                 |
| [releases.md](releases.md)         | The three releases and which backlog items (PBIs) go in each                         |
| [decisions.md](decisions.md)       | **Why** things are the way they are, and ideas turned down                           |
| [dev-guide.md](dev-guide.md)       | Test tools, checking UI, how maps are built, gotchas                                 |
| [infra.md](infra.md)               | The AWS plan (nothing deployed yet)                                                  |
| [manual-tests.md](manual-tests.md) | The owner's hand-test checklist, with who's who in the seed                          |
| [open-issues.md](open-issues.md)   | Things noticed and not fixed                                                         |

Commands, repo layout and working agreements are in [`AGENTS.md`](../AGENTS.md).

## How the docs fit together

The same 16 features, numbered the same everywhere, seen three ways:

| Question                         | Doc                                    | Keyed by                                     |
| -------------------------------- | -------------------------------------- | -------------------------------------------- |
| **What** does the feature do?    | its spec, `features/NN-name.md`        | the feature number (1–16)                    |
| **When** is each part delivered? | [releases.md](releases.md)             | PBI IDs (ACC-1, ROOM-3…), each in R1, R2, R3 |
| **How** does its code work?      | the guide's release chapters (4, 5, 6) | sections headed with the same PBI IDs        |

Every spec starts with a line linking its PBIs and its code walkthrough; every feature in the
release plan links its guide sections; every guide section links back to its spec and PBIs. So from
any one of them you're one click from the other two.

**When you change something:** update its spec; add a dated line to the decision log if a decision
was made; add hand-test checks for a new feature; add anything you noticed but didn't fix to open
issues; update the roadmap if the status changed. If files, endpoints, messages or flows changed,
update the guide section that describes them; new work gets PBIs in the release plan.
