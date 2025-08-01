# 🌱 Architecture Overview

**Verdigris** is a generative tactical RPG simulation and game design platform. It is the spiritual kernel of a multiverse, intended to be flexible, expressive, and extendable across settings.

---

## 🧬 The Pipeline

The engine is built on a **generative pipeline** of composable tasks, executed in dependency-aware sequence via the `Flav` task runner. Each generator declares its inputs and outputs. The pipeline flows like this:

```
Color ID → Body Type → Rank → Base Creature → Archetype Creature → Rare Creature
→ CardSet → YAML Output → Simulation → Visual Display
```

All generators are defined as Aura scripts (`*.aura`) and live in `/app/generates`. Their orchestration is defined in a `flavfile.yml`.

These generation tasks can be run by hand, in batch, or by an LLM-backed agent (`FlavChef`), or automated cron-like runners.

There is also a pipeline for worldgen that would have a similar flow:

```
Color ID → Plane → Moiety (Churches, States) → Houses/Microtypes/etc → Squad → Card
```

There is intended to some recursion and complex reference between the world and card layers; houses should have a founder card, who is a legendary hero etc.

In particular one design intention is that 'moieties' should be defined as one of 12-15 types (economic, government, occult, criminal, creative, culinary etc); and the 'archetypes' (~300 named character/profession portraits that we use to add color to rare creatures) are _also_ organized into the same subtypes. A faction may have creatures belonging to archetypes that have subtypes outside their moieties types but the idea is this at least provides some _influence and aspects_ on the decision at other layers.

One other design intention would be to have the _overlaps_ between the moieties be defined as the 'microtype' -- so government + criminal is a 'tradecraft' group, with access to charm abilities, hide/stealth sort of abilities; ideally a means to fool the enemy and mix into their ranks and assassinate creatures subtly. So there would have to be counterintelligence units that can detect or 'correct' alignment interpretations and so on. And maybe spymasters who can again reinforce them...

---

## 🧩 2. Key Components

### 🧠 `Flav`

Custom dependency-aware task runner, written in Ruby. Drives Aura generation pipelines. Executes scripts and manages flow of structured data between them.

* *Primary unit:* A named task (e.g. `creature`)
* *Core structure:* A `Flavfile` yaml that defines task dependencies and data flow
* *Vision:* Like `make` or `rake` etc, but designed for aura workflows and capable of sophisticated pipelines

### 🌀 `Aura`

A minimal, testable, domain-specific language (DSL) for YAML-based data generation. Aura is embedded inside Ruby but independent in design. Most content is authored in this language.

* *Primary use:* Describe creatures, cards, abilities, and full cardsets (cardgen pipeline); describe planes, factions, moieties, microfactions/houses, squads (determined to some extent by synergy ratings)
* *Strengths:* Clean declarative syntax, composable templates, and while novel and outside-of-training, should be highly-readable/writeable/interpretable by LLMs

---

### 🔥 `Furnace`

The simulation engine, implemented in Ruby. Responsible for creature behavior, abilities, turn execution, and tactical resolution.

* *Takes in:* One or more YAML-defined cardsets
* *Outputs:* Battle logs (JSON or stream)
* *Goal:* Deterministic, testable
* *Vision:* Ultimately this could wrap around an (ideally optimized) typescript simulation core but let's get things working roughly for now and we can just stream events to the client until we have that going!

---

### 🧾 `chef`

An interactive CLI or agent that can list tasks, execute generators, and help explore the card space. The idea is to support aura-based or external-agentic LLM flows for naming, balancing, tagging, and categorizing outputs. Miniminally this could be a simple loop with an agent who has a tool that can invoke flav tasks (this would be really direct with a minimal flav ruby wrapper + ruby_llm for instance)

---

## 🗂 3. Code Layout

```
/app/
  generates/       → Aura scripts (e.g., creature.aura)
  sim/             → Furnace simulation engine
  helpers.rb       → Shared Ruby utilities
  server.rb        → Sinatra API/web entry point
/public/           → Web UI assets (canvas, JS runner)
/scripts/          → Ruby tools (e.g., CLI launcher)
/tests/            → (TBD) specs for sim + integration
flavfile.yml       → Pipeline declaration
README.md          → This document
```

## 📘  Core Concepts

| Term            | Description                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Color ID`      | A hex-like seed (e.g., `0F0`) used to control generation lineage. Each ID implies traits, factions, and themes.                      |
| `Body Type`     | A physical chassis: quadruped, winged, mounted, worm-like, etc. Determines physics and layout.                                       |
| `Rank`          | A simple power tier (common → legendary)                                                                                             |
| `Creature`      | The base YAML structure for a unit, including name, stats, subtypes                                                                  |
| `Rare Creature` | A decorated variant with archetypes and enhanced abilities                                                                           |
| `CardSet`       | A collection of creatures + metadata to simulate                                                                                     |
| `Archetype`     | A semantic label that reflects class and personality; used for synergy and tagging                                                   |
| `Ability`       | A defined effect with a trigger, condition, and targeting rule                                                                       |
| `Furnace`       | The sim engine that resolves actions and outputs battle logs                                                                         |
| `aura-lang`     | The language model runtime for describing generated components (the language `flav` tasks are written in)                            |
| `flav`          | Aura task orchestrator; the aura pipeline runner that executes generation tasks in order and manages dependencies                    |
| `flav chef`     | The intended agentic wrapper that interacts with users, makes suggestions, and performs guided synthesis                             |
