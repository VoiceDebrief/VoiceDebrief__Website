# Semantic graphs for VoiceDebrief — briefing pack

**version** v0.1.23 · **assembled** 8 August 2026 · **for** an interactive Claude session

This pack exists so that a session with **no access to the repository** can produce
worked examples and a simulation of what semantic graphs over voice-note transcripts
and summaries should look like. Everything needed is in here: the source briefs, what
has actually been built, the real data shapes, the real constraints, and a specific
ask.

The output of that session comes back here and becomes the specification for the
visualisation — which is the part that cannot be designed sensibly until somebody has
seen what the data actually looks like.

## Read in this order

| # | Document | What it is |
|---|---|---|
| 00 | [00 — Read me first](v0.1.23__pack__00-read-me-first.md) | The ask in one page. Start here. |
| 01 | [01 — The product & constraints](v0.1.23__pack__01-the-product-and-constraints.md) | What VoiceDebrief is, what one pass produces, and the constraints that are not negotiable |
| 02 | [02 — What exists today](v0.1.23__pack__02-what-exists-today.md) | The concept scheme and the three views already built — what the simulation output has to fit into |
| 03 | [03 — Brief: Concepts, Not Words](v0.1.23__pack__03-source-brief-concepts-not-words.md) | **Source brief, verbatim** (Dinis, 6 Aug) — the concept model |
| 04 | [04 — Brief: Voice Debrief Ontologies](v0.1.23__pack__04-source-brief-voice-debrief-ontologies.md) | **Source brief, verbatim** (Dinis, 6 Aug) — extraction vs mapping |
| 05 | [05 — Engineering review](v0.1.23__pack__05-engineering-review-of-the-briefs.md) | Where the briefs are right, and three places where building them literally would go wrong |
| 06 | [06 — The ask](v0.1.23__pack__06-the-ask-what-to-simulate.md) | **The detailed specification of what to produce**, with acceptance criteria |

## Data included

Real files, copied unmodified from the running product:

| File | What it is |
|---|---|
| `data/concepts.json` | The concept scheme as shipped — 15 concepts, 3 schemes, the schema the simulation should extend |
| `data/summary-prompt.md` | The prompt that produces every summary. **The simulation's input shape.** |
| `data/translate-prompt.md` | The translate step's prompt, for the multilingual case |
| `data/standard-workflow.json` | The declared pipeline with its per-step budgets — what a mapping step must fit into |

## Status of things named in here

- **The rename to VoiceDebrief is decided and the domain is bought** (`VoiceDebrief.ai`,
  Dinis, 8 Aug). It has **not** been applied to the code: 43 literals still say
  "Voice Note Transcribe". Documents in this pack use VoiceDebrief; screenshots and
  data files still say the old name.
- **The concept scheme exists and is live** at `/engineering/concepts/`. It is
  deliberately **not wired** to the product.
- **Nothing in briefs 03 and 04 about ontology extraction or mapping is built.** Not a
  line of it. Treat every feature described there as proposed.

---

*CC BY 4.0.*
