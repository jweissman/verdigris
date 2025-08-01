# Verdigris

...is a dark‑mythic, 1‑bit auto‑battler that asks players to command tiny lineages of heroes and fodder against waves of necromantic foes. Battles play out on a horizontally scrolling strip at the bottom of a 320 × 200 pixel screen, while the majority of the display shows a beautifully rendered MacPaint‑style landscape. Each encounter is a chaotic ballet of silhouettes, particle bursts, knockbacks and spell auras. Behind the scenes, a deterministic simulation and generative pipeline create factions, Houses and cards from simple seeds.

1.1 Design Intentions
	•	Mythic Tone: The world feels ancient and storied. Every faction, House and relic carries lore: crimes committed, founders martyred, traditions upheld. Even randomised content is interpretable—no meaningless strings or nonsense words.
	•	Constraints as Creativity: Following the demoscene ethos, we embrace severe technical limits. The 320 × 200 pixel resolution and two‑colour palette force bold silhouettes and minimal UI, echoing early 8‑bit platforms where restrictions inspired ingenuity ￼. A static lane system reduces pathfinding complexity and encourages clever card play.
	•	Procedural but Artisanal: Content is procedurally generated but guided by curated lists, handcrafted recipes and human curation. The generative pipeline threads seeds through deterministic functions, ensuring reproducible worlds and names, yet designers choose subtypes, moieties and archetypes, ensuring coherence. This approach answers the caution that game bibles should remain living documents and be updated as designs evolve ￼.
	•	Juice & Clarity: Despite the harsh palette, the battlefield should feel lively. Physics‐inspired motion, knockback arcs and screen shakes communicate impact, but visual effects never obscure the underlying mechanics. Area‑of‑effect attacks telegraph their zones before impact so players and AI can react ￼.

1.2 Narrative Themes

The tone is bleak but not hopeless. Themes include:
	•	Decay and Rebirth: Necromancers rot kingdoms to fuel their magic, while Houses strive to reclaim lost glory. Radiant units regenerate and mechanical constructs rust.
	•	Power and Responsibility: Heroes wield devastating spells that can save or doom entire lines; Houses rise and fall based on players’ choices.
	•	Interconnectedness: The world is built from layers—planes, factions, moieties, Houses, squads—each influencing the next. Cards are not isolated objects but manifestations of culture and lineage.

1.3 Inspirations
	•	Early Fantasy Consoles: The project pays homage to retro devices like the ZX Spectrum and early Macintosh, where artists created expressive worlds with minimal memory. The demoscene showed that striking visuals can emerge from tiny code and monochrome palettes ￼
	•	Auto‑Battlers & Roguelikes: Games like Auto Chess and Into the Breach inspire the semi‑autonomous combat and tactical depth. Runs are short but replayable; each run creates a lineage and a story.
	•	Neuro‑Symbolic Worldgen: Names, factions and relics derive from symbolic combinations of subtypes and archetypes. This interpretable generativity is influenced by narrative generation research.

2. Aesthetic Guidelines

2.1 Monochrome Visuals

All art uses exactly two colours: foreground and background. Artists use dithering patterns, stippling and hatching to convey shading and texture. Units are drawn as solid silhouettes to emphasise shape recognition at low resolution. Landscapes are illustrated with MacPaint‑style line art, showing crumbling towers, bridges and necropolises. The limited palette reduces cognitive load and invites players to imagine details.

2.2 Screen Layout
	•	Landscape Panel (top 3/5): Sets the mood. It scrolls slowly to show progression. When players move deeper, backgrounds become more ominous (e.g., twisted forests, ossuaries).
	•	Battle Strip (bottom 2/5): A thin horizontal strip divided into 12–15 lanes. Lanes are evenly spaced vertical bands where units move horizontally. The width is continuous; units can push each other, dash or be knocked back. The camera follows the centre of combat.
	•	UI Panel: A narrow area below the battle strip for cards, AP meter and text. It uses minimalistic text and icons reminiscent of early GUI systems.

2.3 Audio & Atmosphere

Sound design uses chiptune and ambient noises to evoke a lost console. Low bit‑rate synths, ticking clocks and eerie pads underscore the mythic tone. Attack hits, spell casts and deaths are punchy but not overbearing. The music adjusts in intensity as battles progress; victory stingers and defeat dirges hint at the cyclical nature of runs.

3. Design Philosophy

FREEHOLD adheres to the following principles:
	•	Living Documentation: The design bible is not a fixed monolith but a living document updated as systems evolve. The best documentation is ultimately tested code for minimal working examples￼.
	•	Interpretable Mechanics: Every stat, ability and number should have an in‑world justification. For example, mechanical units resist burst damage because they count hits rather than damage; radiant units drift toward baseline because they are tethered to a divine source. Avoid arbitrary effects unless they fit the mythos.
	•	Emergent Depth: The combination of simple rules should create surprising interactions. Lanes limit movement but enable lane switching; AoE spells create temporary terrain ￼; synergy metrics encourage exploration of combos.
	•	Accessibility & Depth: The initial experience should be easy to grasp (few cards, fixed AP costs), but there must be layers of mastery: building balanced decks, anticipating enemy patterns, exploiting perdurance weaknesses and synergy tags.

4. Implementation Guidelines

Development should follow a test‑first approach. Build small prototypes (MWEs) to validate each system—lane movement, AoE telegraphs, card draw, House generation—and integrate them gradually. Use the Aura language and Flav orchestrator to author custom data generation pipelines in human‑readable scripts, compile cards to YAML and feed them to the simulation. Use the Furnace harness to run thousands of micro‑battles to gather metrics and balance cards.

By grounding the vision in constraints and design principles, this foundation document sets the tone for all subsequent work. It is intended to be referenced by artists, programmers, writers and producers as a compass for decision‑making.

## World & Story

1. World Structure

FREEHOLD’s world is generated procedurally but grounded in interpretable structures. The generation pipeline proceeds from broad cultural categories to individual units. This file details factions, moieties, microfactions, Houses and the narrative arc.

1.1 Subtypes

Society in FREEHOLD is organised around subtypes. These are broad categories of human (or other) endeavour:
	•	Creative – artists, poets, musicians; generate cards with buffs or morale effects.
	•	Scientific – inventors, engineers, alchemists; produce constructs and gadgets.
	•	Economic – merchants, bankers; supply trade and resource manipulation abilities.
	•	Government – judges, bureaucrats; specialise in control spells and law magic.
	•	Criminal – thieves, assassins; enable stealth, poison and sabotage.
	•	Martial – soldiers, knights; focus on melee combat and defence.
	•	Occult – necromancers, priests; deal with spectral and radiant energies.
	•	Agrarian – farmers, shepherds; create swarm units and regenerative fields.

Subtypes are building blocks for moieties and archetypes. Many units draw two subtypes to form a microtype.

1.2 Factions & Moieties

A faction is defined by a blend of moieties, each of which is a combination of subtypes. Factions control territory, doctrine and aesthetics. Each has a colour hex code influencing card visuals and stat biases.

Moieties give each faction a distinct flavour. Factions can have multiple moieties; players may encounter Houses tied to different moieties within the same faction.

1.3 Microfactions

Microfactions are smaller organisations that emphasise one moiety. They might be guilds, cults, companies or rebel cells. They supply specialty units and spells. Microfactions enrich faction diversity; Houses aligned with them gain access to unique cards.

1.4 Houses & Lineages

A House is a noble lineage tied to a microfaction. Houses have:
	•	Founder – A unique hero (see Card & Creature file) whose archetype belongs to the dominant subtype of the microfaction. Founders grant traits like increased AP regen, free summons or special win conditions.
	•	Heraldry – A crest combining microfaction motifs (gear, skull, ship) with founder symbols.
	•	Starting Deck – A curated mix of common units, rare units from the microfaction, spells and the founder’s hero card.
	•	Lineage Traits – Bonuses unlocked through play; e.g. “first death spawns a wraith”, “mechanical units regenerate at end of wave”.
	•	Genealogy – A family tree showing ancestors, heirs and notable deeds. Players can view lineage history and see how traits were earned.

Houses persist across runs. Players may draft a House, run a gauntlet and retire it, passing traits to heirs for the next run.

2. Narrative Beats

FREEHOLD tells its story through cut‑scenes, flavour text and emergent events. The narrative structure includes:
	1.	Inciting Incident – The Necromancer declares war on the last bastion of order. He summons waves of minions to block the path to his tower.
	2.	Gauntlet of Foes – The player’s House fights through a series of encounters, each themed to a faction and its moiety. Early waves introduce fodder; mid waves add specialist units; late waves include heroes and mini‑bosses.
	3.	Mid‑Bosses – Each faction has a lieutenant. Defeating them reveals lore about the faction’s motives and grants access to new cards.
	4.	The Tower & Necromancer – The final battle takes place at the tower’s foot. The Necromancer uses spectral and radiant spells, summons phantasms of fallen heroes and challenges the player’s knowledge of synergy.
	5.	Ascension & Continuation – Upon defeating the Necromancer, the player ascends to a mythic plane or triggers a new cycle (higher difficulty, new factions). The world changes based on the House’s deeds.

Narrative beats are intentionally minimal to allow the simulation and emergent lineages to shine. Flavour text on cards and relics fills out the lore.

As FREEHOLD grows, more factions, moieties and story arcs can be introduced. Each addition would include new Houses, heroes, relics and narrative beats.

## Architecture & Systems

What underlying systems power FREEHOLD? The intended workflow would move from the generative pipeline to the simulation engine out the tools that support final prototype development.

1. Generative Pipeline

FREEHOLD’s content generation is a deterministic pipeline that produces factions, Houses and cards. The pipeline threads seeds through each stage to ensure reproducibility and uses enumerated lists combined with handcrafted recipes.

1.1 Subtype & Archetype Library

All generative rules rely on a library of subtypes and archetypes. Subtypes are broad categories (creative, scientific, etc.) and archetypes are specific professions or roles that belong to subtypes (Alchemist, Poet, Assassin). These lists are curated by designers and can be expanded.

1.2 Faction & Moiety Generation
	•	Subtype Selection – For each faction, designers choose 2–3 dominant subtypes that reflect its culture (e.g. scientific + economic + martial for Mechanized Scribes). These choices determine available moieties.
	•	Moiety Recipes – Moieties are assembled manually or via simple rules: combine dominant subtype with one or two minor subtypes to create a cultural slice. Recipes include names, visual motifs, preferred perdurance types and doctrine notes.
	•	Colour & Aesthetics – Faction colour hex codes are chosen to reflect faction personality and to modulate card art and UI accents. Colours are not random; they’re part of the world’s semiotics.
	•	Doctrine & Founder – For some factions, a founder hero is defined (e.g. Sir Celeron of the Mechanized Scribes). Founders can appear as enemy bosses and influence story beats.

1.3 Microfaction & House Generation
	•	Microfactions are derived from moieties by emphasising one aspect (e.g. The Clockwork League emphasises the scientific/economic side of Machinists). They supply unique units, spells and relics.
	•	House Creation – A House is built by selecting a founder hero (rank 3 card) whose archetype matches the microfaction’s dominant subtype. The House’s starting deck draws from faction commons, microfaction rares and the founder’s signature cards. Houses gain traits based on the founder and can acquire new traits through play.

1.4 Card & Creature Generation
	•	Body Determination – For each creature card, choose a body size (swarm, fodder, standard, titan) and a perdurance type. These determine baseline stats (HP, speed, damage).
	•	Subtype Assignment – Assign two subtypes. This defines the unit’s flavour and ability space.
	•	Ability Selection – Based on subtypes, choose an ability from a curated list. For example, a scientific/martial unit might have Deploy Turret; a criminal/occult unit might have Soul Theft.
	•	Rarity & Archetypes – Rare units assign an archetype (profession) which adds a thematic modifier and names the unit (“Machinist Foreman”). Heroes have unique names, backstories and signature abilities. Founders add a leadership trait on top of a hero.
	•	Spells & Relics – Spell cards are generated separately by combining an effect template (AoE blast, buff aura, pull vortex) with a flavour (e.g. “Soul Drain”, “Clockwork Repair”). Relics are long‑lasting passive cards that modify global stats or spawn persistent objects.

2. Simulation Engine

2.1 Architecture
	•	Stateless Steps – The simulation runs in discrete ticks. Each tick takes the current state (positions, HP, cooldowns) and a list of queued actions, then outputs a new state and a list of events.
	•	Event System – Events include Move, Attack, SpellCast, AoETelegraph, AoEImpact, ApplyStatus, Death. The renderer subscribes to events but does not influence simulation.
	•	Action Bags – Each unit maintains an action bag with short actions (move, attack, cast). Actions have wind‑up times and can be interrupted.
	•	Collision & Forces – Basic physics apply: units move at constant speed unless blocked; knockback adds velocity; friction and drag slow units. Entities can overlap briefly to avoid jitter.

2.2 Lanes & Flow
	•	Lanes are vertical indices. Units move horizontally along lanes. Skirmishers and titans can change lanes; others cannot unless a spell forces them. Lanes are fixed to ensure readability on the 1‑bit canvas.
	•	The battlefield scrolls horizontally. A sliding window follows the fight to keep the action centred.

2.3 Abilities & Status Effects
	•	Ability Execution – When a card is played, it spawns an entity or triggers an effect. Abilities may involve telegraphs (AoE), delays or persistent auras. Each ability defines its range, area, duration and status effects.
	•	Status Effects – Stun, Slow, Burn, Charm, Shield, Regeneration, Decay. Effects interact with perdurance types; e.g. burn ignores sturdiness, charm only affects biological units.

2.4 Testing & Balancing
	•	Unit Tests ensure deterministic outcomes for basic mechanics (movement, collision, spell radius).
	•	Scenario Tests simulate common encounters (2 tanks vs 3 swarms, AoE vs dash). Used to spot edge cases.
	•	Furnace Harness runs thousands of micro‑battles to collect metrics (threat rating, prowess, synergy). Results inform card balancing and AI squad construction.

3. Rendering Engine
	•	Canvas Drawing – The renderer runs in the browser. It draws backgrounds, units, telegraphs and effects at a fixed resolution. It uses different layers: background, units, FX, UI.
	•	Sprite Sheets – Units are drawn as silhouettes in different poses (idle, run, attack, cast, death). Sprites are reused with palette swaps to conserve memory.
	•	Animations – Simple interpolation between frames; camera shake and screen flashes are used sparingly to avoid overwhelming the low‑resolution display.
	•	Performance – Because the sim and renderer run client‑side, performance optimisations (batch drawing, pooling objects) are essential to maintain frame rate.

4. Game Shell & UX
	•	Menu Structure – Boot screen → Main menu (New run, Continue, Lineage Viewer, Options) → Mode select (Sandbox, Gauntlet, Skirmish) → Deck builder → Battle.
	•	Lineage Viewer – A genealogical view of Houses showing founders, heirs and traits. Players can inspect how they earned lineage bonuses.
	•	Deck Builder – Allows players to inspect cards, swap them out, and view synergy suggestions based on Furnace metrics.
	•	Settings – Sound, screen scale, debug overlays. In dev builds, toggles for hitboxes and AoE radius display.

5. Development Tools
	•	Aura DSL & Compiler – Authors write scripts describing subtypes, moieties, factions, units, spells and relics. The compiler generates JSON blobs consumed by the game.
	•	Sprite Editor – A tailored version of Aseprite with templates for 4×4, 8×8, 16×16 and 32×32 units. Includes dithering brushes and animation timeline.
	•	Log Viewer – An in‑game tool to play back recorded battles. Useful for debugging and replay sharing.
	•	Metrics Dashboard – Visualises Furnace outputs: win rates, synergy graphs, threat distribution. Helps designers spot overpowered or underused combinations.

The architecture outlined here underpins the FREEHOLD experience. It shows how generative data flows into simulation, rendering and UX, and how development tooling supports iteration.

6. Event Log & Replay

To support both debugging and player replays, the simulation records an event log during each run. Each tick’s events (Move, Attack, SpellCast, StatusApply, etc.) are appended to a JSON array alongside a timestamp and random seed. The renderer can step through this log to replay battles exactly as they occurred. This system enables:
	1.	Debugging: Developers can scrub through a log to identify edge cases (e.g., units getting stuck, AoE damage misapplied).
	2.	Player Replays: Players can share logs to show off wins or ask for balance fixes. Because logs contain no hidden state (just deterministic actions), they are small and easy to verify.
	3.	AI Training: Future machine learning agents could train on logs to evaluate card effectiveness or propose combos.

Implementation details:
	•	Serialization: Each tick’s state and events are serialised into a compact binary or JSON format. Only state diffs need to be recorded to reduce file size.
	•	Determinism: Random number generators are seeded at run start. All procedural choices (e.g. damage variance) use this generator so replays are identical.
	•	Playback Controls: The log viewer offers pause, step forward/back, speed adjustment and lane focus. Visual markers show when spells were cast and when units died.

7. Parallel Simulation & Metrics

FREEHOLD uses a simulation harness called Furnace to run thousands of micro‑battles for tuning. Because battle simulations are embarrassingly parallel, Furnace distributes fights across cores or machines. Each fight uses a unique seed to sample different decks, lane arrangements and AI behaviours. Metrics collected include:
	•	Threat Rating: Quick evaluation of whether a unit can kill another unit before being killed ￼. Values are normalised to [-1,1] and mapped to 1–5 stars.
	•	Prowess: Win/loss ratios across matchups. Useful for ranking units and cards.
	•	Synergy: Performance gain when two cards are played together compared to individually. E.g. Vortex Glyph + Cleave vs Cleave alone.
	•	Resource Curve: Average AP spent per tick and hand utilisation.

Furnace outputs CSV or JSON reports which the Metrics Dashboard ingests. Designers can view graphs of win rates over time, synergy heatmaps and distribution of battles by faction. By running simulations on different hardware (client vs cloud), the team ensures consistent behaviour and catches performance regressions.

8. Physics & Forces

FREEHOLD’s movement and collision system takes inspiration from basic physics: units have velocity, acceleration and apply forces on collision. However, the model is simplified for readability and fun ￼. Key considerations:
	•	Discrete Ticks: The game advances in fixed time steps; velocities are integrated each tick. This prevents tunnelling issues and ensures repeatable results.
	•	Knockback & Gravity: Spells and attacks can impart velocity. Vertical movement is confined to lane switching; horizontal knockback moves units back along the strip. There is a drag term to slow units after knockback. Units never leave the ground; there is no jumping.
	•	Collision Resolution: Tanks and titans block lanes completely; other units may overlap for one tick to prevent jitter. If two bodies occupy the same tile and both are moving forward, the faster unit pushes the slower; otherwise they swap lanes if permitted by role.
	•	Physics Flexibility: By modelling forces explicitly, designers can add magical fields (e.g. low gravity zones, vortexes) without rewriting the core movement code ￼.

9. Card Engine Implementation

The card engine manages deck construction, draw, hand management, AP cost and card resolution.
	1.	Deck Structure: A deck is an ordered list of card definitions with optional upgrade flags. Cards are drawn into a hand of 3–5 slots. Discard piles are reshuffled when empty; players can view their discard and upcoming cards.
	2.	AP Meter: Action Points regenerate at a fixed rate (e.g., 1 AP per second) and can accumulate up to a cap. Playing a card spends AP equal to its cost; some relics modify regen rate.
	3.	Card Resolution: When a player selects a card and a lane, the engine validates whether conditions are met (enough AP, space on lane). It then spawns the corresponding unit or effect with initial state (HP, cooldowns, timers) and logs a Spawn event. Spells with delayed effects create AoETelegraph events followed by AoEImpact events after a delay.
	4.	Card Upgrades: Over runs, cards can upgrade (e.g., Iron Golem II: more HP, new passive). Upgrades occur through lineage events or relics.
	5.	Enemy AI: Enemy waves are composed of AI scripts that choose cards based on a weight table. The AI can be parameterised by difficulty level and faction.

10. World Generation Implementation

The generative pipeline uses Aura, a domain‑specific language. Aura scripts define subtypes, archetypes, moieties and recipes. At compile time, the Aura compiler reads scripts and produces data packs (JSON) describing factions, microfactions, Houses, cards and flavour text. Key implementation details:
	•	Seed Propagation: Each run generates a base seed. When a faction or House is generated, part of the seed is used to select subtypes, colours, names and units. Seeds propagate downward; the same House will always have the same founder and starting deck.
	•	Recipe Templates: Designers write recipes like moiety(scientific, economic, martial) -> Machinists { colour = 6A5ACD; doctrine = "Slow advance"; }. These templates specify name patterns, colour options and doctrine tags. The compiler expands them using enumerated lists (e.g. surname components, adjectives).
	•	Archetype Pools: Rare units and heroes pull from an archetype pool specific to the faction’s dominant subtypes. For instance, a creative‑martial faction might assign Bardic Knight as an archetype. Each archetype has a list of signature abilities and names.
	•	Flavour Text Generation: Aura supports string interpolation and grammar rules. Writers craft templates with variables (e.g. {{city}} or {{founder}}). The compiler replaces variables using the seed and context, ensuring consistent names across cards and lore.

11. Integration & Tooling

Development uses an integrated toolchain:
	•	Bun & TypeScript: The simulation engine and card engine are implemented in TypeScript, compiled via Bun for speed. Uvu provides unit testing; tests live alongside code and ensure deterministic results.
	•	Renderer (Browser): The renderer is a web client built with Canvas API. It loads JSON data produced by Aura, runs the simulation in Web Workers and draws frames at 60 FPS. Input handling uses event listeners for mouse and keyboard.
	•	Aura CLI: A command‑line interface compiles Aura scripts, runs validations (e.g. catching duplicate names, missing assets) and outputs JSON data. It also supports hot reloading—when a script changes, the game reloads the updated data without a full restart.
	•	Metrics Dashboard: A local web app that reads Furnace output and displays graphs using d3.js. Designers can filter by faction, perdurance type, card cost and run seed.

12. Future Extensions

The architecture is designed to be extensible. Potential future features include:
	•	Networked Play: Using the deterministic event log, asynchronous PvP could be implemented where players send decks and seeds to a server which returns the result. Because the sim is deterministic, only seeds and actions need to be transmitted.
	•	Cloud Furnace: Running Furnace simulations on distributed servers to gather larger data sets for balancing and machine learning analysis. Data can be anonymised and aggregated.
	•	Modding Support: Exposing Aura scripts and sprites to players so they can create custom factions, moieties and relics. Community content would be sandboxed to prevent malicious scripts.

## Entities & Cards

This document catalogues the creatures, spells and relics that populate FREEHOLD. It defines unit roles, stats and abilities, provides examples of cards and explains how synergy tags and metrics influence deck‑building. For design clarity, tables contain only concise data; descriptive text appears in the body.

1. Unit Roles & Body Sizes

Units in FREEHOLD are semi‑autonomous actors. Their capabilities are determined by role, body size, perdurance type and ability. Roles describe how a unit behaves in battle; body size determines its sprite size and baseline stats; perdurance defines its damage model; abilities add unique effects.

1.1 Roles & Stats

Below is a reference table of typical units. Stats are illustrative; final values will be tuned via playtesting and Furnace simulations.

Design Notes
	•	Tank units anchor lanes, absorbing hits and shielding allies. Their Shield Wall ability encourages players to deploy damage dealers behind them.
	•	Skirmisher units challenge tanks by bypassing them; they punish back‑line casters. Their high speed demands quick reaction from opponents.
	•	Summoner units trade mobility for the ability to spawn swarms or constructs. They are valuable in attrition fights.
	•	Caster units have high burst damage and spells. They are fragile, encouraging protective play.
	•	Swarm units act as numbers; each member counts as one hit point. They excel against single targets but die quickly to AoE.
	•	Titan units disrupt positioning. Their large hitboxes and knockback attacks create space.
	•	Agent units use debuffs and mind control. They add unpredictability; charmed enemies can turn a tide.

1.2 Perdurance Interactions

Perdurance types affect how units take and recover damage. Designers can combine types to create hybrids (e.g., Mechanical + Radiant). Remember that spectral units are intangible to physical hits; only magic can damage them. Design spells accordingly.

2. Card Types

Cards are the player’s tools. They fall into three broad categories: Units, Spells and Relics. Cards cost Action Points (AP); early prototypes fix most costs at 2 AP but later designs vary costs.

2.1 Unit Cards

Unit cards summon creatures onto the battle strip. When summoned, the unit appears in the chosen lane at the leftmost free position (player side). Units act autonomously thereafter. 

2.2 Spell Cards

Spell cards create one‑time or short‑lived effects. Many spells have telegraphed zones: a white outline appears on the lane, giving units a moment to react. Telegraphing is critical because it provides fairness and clarity. If the AI sees an incoming AoE, it will attempt to move units out of the area if possible.

2.3 Items

Equipment must be attached before combat to cards and generally improves combat effectiveness or provides stat buff. 

Relics encourage players to build around a theme: mechanical synergy, swarm synergy, radiant control, etc. They persist across waves until destroyed or overwritten.

Trinkets are technically distinct, not being cards themselves and more like Charms; they are card mods that may affix to any card permanently.

3. Synergy Tags & Metrics

Every card carries tags (e.g. swarm, mechanical, AoE, pirate). Tags serve three purposes:
	1.	AI & Generation: The generative pipeline uses tags to assemble balanced decks. A faction favouring the mechanical tag will include constructs and repair spells.
	2.	Synergy Metrics: Furnace simulations track performance when certain tags are present together. For example, swarm + AoE may show negative synergy (your own AoE kills your swarm), while vortex + cleave shows strong synergy. These metrics inform card cost and availability.
	3.	Player Guidance: In the deck builder, tags appear on cards. Hovering a tag reveals synergy suggestions (e.g. “Pairs well with Titan cards”). This helps players craft combos without exhaustive trial and error.

Synergy scores are computed by comparing the win rate of decks containing a pair of tags against the baseline win rate. A positive delta indicates a beneficial interaction; negative indicates anti‑synergy. Tags with neutral synergy may still be interesting but do not require balancing.

4. Rare & Hero Cards

Rare units and heroes are differentiated by their archetype. An archetype is a profession or character concept drawn from the dominant subtypes of its faction (e.g. Archivist, Machinist Foreman, Grave Prophet). Rares add unique passives and names. Heroes are rare units with leader traits.

Heroes appear as single cards in a House’s starting deck. They cannot be replaced but can upgrade during runs. Losing a hero may trigger lineage events (e.g. “Heir ascends to leadership, but loses the founder trait”).

Heroes are just like normal units but act as the source of player actions. A player may have only one hero active on the field at a time. There must be a caster hero on the field with available mana in order to play spells (in general only caster heroes will have spells in their decks.)

5. Design Considerations & Balancing

Balancing an auto‑battler is challenging because emergent behaviours can produce unforeseen dominance loops. FREEHOLD uses a combination of test cases and Furnace simulations to keep units and spells within bounds:
	•	Role Counters: For every role, there should be counters. Tanks are countered by swarm and AoE; skirmishers are countered by knockback or mind control; summoners are countered by burst damage; casters are countered by dash or silence spells; swarms are countered by cleave; titans are countered by control spells; agents are countered by radiant wards.
	•	Cost Scaling: High‑impact cards cost more AP. The Vortex Glyph has a high ceiling but costs 3 AP. Low‑impact fodder like Powder Monkey cost 1 AP.
	•	Perdurance & Spell Interactions: Some spells ignore or are amplified by certain perdurance types. Soul Drain heals radiant units more than biological; Shadow Snare affects mechanical but passes through spectral.
	•	Telegraphing: AoE spells always telegraph before hitting ￼. This gives the AI and human players a chance to react. Telegraph timing can be tuned for difficulty.

## Gameplay Flow & Player Experience

This document describes how a typical FREEHOLD session unfolds, the structure of different modes and what the player sees and does. It also outlines the intended emotional beats and progression arcs.

1. Player Experience Loop

A FREEHOLD run follows a cyclical loop:
	1.	Select House & Deck: The player chooses a House (noble lineage) or drafts one from a pool. Each House comes with a founder hero, deck, colour scheme and starting traits. Players can inspect lineage history and adjust card loadouts within permitted limits.
	2.	Plan: Before each encounter, the player sees a briefing: enemy faction and moiety, recommended counters, predicted synergy tags. Players may reorder their draw pile or select sideboard cards if unlocked.
	3.	Battle: Combat plays out in real time. The player manages AP, chooses when and where to deploy units, casts spells and reacts to telegraphed AoE zones. The top of the screen shows a scrolling landscape while the bottom shows the battle strip. A battle ends when one side’s units reach the opposite edge or all opposing units die.
	4.	Resolve & Reward: After battle, players gain rewards: new cards (random or chosen from three), relics, lineage traits and story snippets. Health and AP carry over; some units persist until killed.
	5.	Advance: The player proceeds to the next encounter. Difficulty ramps up: more lanes become active, enemy decks introduce rare units, terrain effects appear.
	6.	End Run: Runs end with success (defeat the Necromancer) or failure (founder dies, units wiped). Success unlocks new Houses, factions or story chapters. Failure yields consolation rewards and updates lineage history.
	7.	Meta‑Progression: Traits and unlocked cards persist across runs. Players may also unlock new subtypes, moiety recipes or visual themes.

2. Modes of Play

FREEHOLD includes several modes, each emphasising different facets of the simulation and deck building.

2.1 Gauntlet
	•	Primary Mode. Players draft a House and battle through a series of increasingly challenging encounters culminating in the Necromancer fight. Encounters draw from multiple factions and moieties. Gauntlet emphasises endurance and adaptation. Time between encounters allows deck tweaks.

2.2 Sandbox
	•	Players choose any factions and deck compositions to create arbitrary simulations. Useful for testing synergy or enjoying emergent chaos. Results are not recorded to meta‑progression.

2.3 Skirmish
	•	Single‑battle mode with randomised decks and terrain. Good for quick sessions. Players earn rewards proportional to performance but cannot unlock heroes.

2.4 Campaign (Future)
	•	A persistent world where Houses maintain holdings, resources and political relationships. Players can influence faction power, cause wars or forge alliances. Combat uses the same simulation but decisions between battles carry more weight.

3. First Five Minutes

The initial minutes of gameplay set the tone and teach core mechanics:
	1.	Title & Boot: Retro boot screen appears: a fake BIOS message, startup chime and a blinking prompt inviting the player to “Press Start”. The title FREEHOLD appears in pixelated font over a rising tower.
	2.	House Selection: The player chooses from a short list of Houses. Each House profile shows founder art, starting deck icons and a short tagline (e.g. “Defenders of the Cog”). A tutorial prompt suggests the Mechanized Scribes as an easy first pick.
	3.	Cut‑Scene: A monochrome panorama zooms towards the Necromancer’s tower. A speech bubble emerges with taunts. This sequence introduces the villain and hints at the scale of the gauntlet to come. The camera pulls back to reveal the battle strip below.
	4.	Battle 1: A small wave of skeleton swarms enters. The player is prompted to drag Iron Golem onto a lane. The golem slowly moves forward, blocking skeletons. A Powder Monkey is played behind the golem; it dies and explodes, clearing the lane. This teaches basics of summoning, lane blocking and death triggers.
	5.	Battle 2: New enemies include a radiant caster. The player draws Swiftsilver Pirate and Soul Drain. The pirate dashes to kill the caster, then the player casts Soul Drain with a telegraph, learning about AoE and telegraphing ￼. The telegraph shows a white circle and countdown, and the AI tries to move away.
	6.	Reward & Decision: After two battles, players choose between three cards. One is a Vortex Glyph, hinting at synergy with Titans. A short lore snippet reveals more about the Necromancer’s lieutenant. The loop continues, ramping difficulty.

This carefully designed sequence ensures players learn core mechanics before facing more complex interactions.

4. Narrative & Emotional Beats

FREEHOLD’s story unfolds lightly through encounters, cut‑scenes and card flavour. Emotional pacing alternates between empowerment and tension:
	1.	Resolve & Grit: Choosing a House and seeing its founder fosters pride. Early fights are easy, making players feel empowered.
	2.	Dread & Anticipation: Mid‑boss battles ramp up difficulty. Cut‑scenes reveal the Necromancer’s cruelty, raising stakes.
	3.	Hope & Resurgence: Unlocking new cards and traits provides bursts of optimism. Players witness lineages improving.
	4.	Climax: The final tower run is chaotic. All lanes fill; spells fly; the Necromancer appears. The fight is difficult but fair; telegraphs give players just enough time to react. ￼ emphasises clear visual cues.
	5.	Aftermath: Victory triggers a quiet epilogue. The Necromancer flees to another plane, hinting at future campaigns. Failure results in elegiac text; the lineage falls, but seeds of hope remain in traits passed on.

5. Progression & Meta Systems

Between runs, players unlock and manage meta content:
	•	Lineage Traits: When a House achieves milestones (e.g. kill a mid‑boss, deploy 100 constructs), it gains traits (e.g. +10% AP regen, free Powder Monkey every 30 s). Traits attach to the House lineage and may be inherited by heirs.
	•	Card Unlocks: Completing gauntlets or facing new factions unlocks cards in the global pool. Unlocked cards appear in future deck drafts and Houses.
	•	Faction Unveiling: Defeating a faction’s lieutenant reveals more about their origin and unlocks their cards for player use.
	•	Visual Customisation: Players can unlock portrait frames, heraldry decorations and dithering patterns to personalise Houses.

6. Difficulty Scaling & Adaptive AI

FREEHOLD gradually increases difficulty. Lane count may increase from 8 to 15; enemy decks include rare and heroic cards; AI parameters such as AP regen and deployment aggressiveness scale up. An adaptive AI monitors player performance and adjusts unit composition: if players lean on certain strategies (e.g. mass swarm), the AI may bring more AoE spells. This ensures runs remain challenging without feeling unfair.

7. Long‑Term Story Arcs & Future Content

While early versions focus on the Necromancer gauntlet, long‑term plans include:
	•	Plane Expeditions: Runs set on different planes with unique environmental rules (e.g. low gravity plane where knockback is doubled; time‑dilated plane with slower regen). Each plane houses a different antagonist and narrative thread.
	•	Faction Campaigns: Play as or against a specific faction in a branching storyline. Choices influence which moieties dominate, altering card pools and events.
	•	Heirloom Relics: Persistent relics passed down across Houses. They can level up and even become sentient, offering guidance or curses.

These arcs must tie back into the world and story, ensuring a cohesive narrative while enabling endless replayability.

## UI/UX Style Guide

All screens, menus and in‑game elements adhere to the project’s user interface guidelines and 1‑bit aesthetic while remaining accessible and intuitive. Designers, artists and programmers should reference this guide when implementing UI components.

1. Pixel Grid & Layout

FREEHOLD runs at 320 × 200 pixels. All UI elements are drawn on this fixed pixel grid; avoid scaling elements at runtime. The screen is divided into three panels:
	1.	Landscape Panel (top ~60%): Displays scrolling MacPaint‑style backgrounds. It must remain free of interactive UI elements to preserve immersion.
	2.	Battle Strip (bottom ~40%): Contains 12–15 vertical lanes. Each lane is exactly 16 px wide with 1 px gutters. Units align to lane centres; telegraphs overlay lanes. Horizontal scrolling is continuous—units can move pixel by pixel.
	3.	UI Panel (below or overlaying the battle strip as needed): Houses cards, AP meter, health bars, pause and settings buttons. This panel uses minimalistic windows reminiscent of old Mac applications.

Grid Units
	•	Typography: Use a custom 5 × 7 pixel font for all text to ensure readability at small sizes. Uppercase is preferred for headings; lowercase for body text. Avoid italic or bold; instead, use inverse colours or underlines for emphasis.
	•	Buttons: Buttons are rectangular outlines with a 1 px stroke and 2 px corner radius. Fill them with the background colour and invert the text on hover or click. Provide 2 px padding around text.
	•	Cards: Cards are 56 px wide × 80 px tall. They show an icon (32 × 32), name, cost and tags. Use dotted lines to separate sections. Ensure card icons are centred and use consistent silhouettes.
	•	Icons: Draw icons at 16 × 16 px. Represent resources (AP, HP), statuses (stun, burn) and controls (pause, play). Icons should be simple, using negative space effectively. Avoid text inside icons.

2. Colour & Dithering

FREEHOLD is strictly 1‑bit: foreground (white) and background (black). Use dithering patterns to convey midtones and texture:
	•	Background Dithers: Use halftone patterns for sky gradients, stone textures and water. Avoid high‑frequency dithers that create noise on the battle strip.
	•	Unit Silhouettes: Fill units with solid colour; use white outlines for selection or highlighting.
	•	Telegraphs & FX: Telegraphed AoE zones should appear as dotted outlines with gradual fill (e.g. from 25% dither to solid) during the countdown ￼. FX such as explosions can invert colours momentarily; ensure they do not obscure units or telegraphs.

3. Interaction Patterns

3.1 Cards & Deck
	•	Card Selection: Cards appear in a hand at the bottom of the screen. Players click or drag a card onto a lane. When a card is hovered, display a tooltip showing stats, ability description and synergy tags.
	•	Targeting: When a card is selected, highlight valid lanes in grey. Invalid lanes remain unchanged. Clicking on a lane commits the card; right‑click or ESC cancels.
	•	AP Feedback: The AP meter is a horizontal bar. When insufficient AP, the bar pulses dark. Cards with insufficient cost appear dimmed.

3.2 Lane & Unit Interactions
	•	Hover Info: Hovering over a unit shows its name, HP bar and status icons. Keep tooltips anchored above the unit to avoid occluding action.
	•	Selections: Players cannot select enemy units but can click allies to focus the camera. Clicking the background closes any open tooltips.
	•	Pausing: Pressing P or clicking the pause icon freezes simulation and brings up an overlay with options (resume, settings, quit). The overlay uses semi‑transparent dithering to hint at the paused state.

4. Animation & Effects

4.1 Unit Animations
	•	Frame Count: Each animation (idle, run, attack, death) uses 2–4 frames to preserve memory. Loop at 8–12 FPS for a choppy, retro feel.
	•	Hit & Death: When hit, units flash inverted colours for one frame. Death animations shrink or fade to black in 6 frames.
	•	Knockback: Use easing functions to move units smoothly along lanes. Show dust particles or motion lines behind the unit to emphasise force.

4.2 Spell FX & Telegraphs
	•	Telegraphs: Draw a dashed circle or rectangle on the affected lanes. Animate a countdown by gradually filling the shape from outside inward. Use sound cues (e.g., rising pitch) to build anticipation ￼.
	•	Spell Impact: On impact, invert colours inside the area and display particle bursts. For AoE spells, show radial waves emanating from the centre.
	•	Buff/Debuff Indicators: Use small icons above a unit to indicate statuses (stun lightning bolt, burn flame). Flash the icon briefly when applied; fade out when removed.

5. Accessibility & Usability
	•	Contrast: Maintain high contrast between text and background. Avoid using dithering behind text.
	•	Input Options: Support mouse and keyboard controls. Allow key rebinding (e.g., Q/W/E/R for cards 1–4). Ensure the game is playable using only keyboard for accessibility.
	•	Screen Shake: Use minimal shake for strong impacts. Provide an option to reduce or disable shake for sensitive players.
	•	Tooltips & Tutorials: Include contextual tooltips during the tutorial. Provide an in‑game glossary accessible from the pause menu.

## AI & Enemy Design

The decision‑making framework for enemies in FREEHOLD supports simple swarm behaviour to synergy- or faction‑specific tactics. The goal is to create engaging and fair encounters that test the player’s understanding of cards, lanes and perdurance types.

1. Enemy Types & Behaviours

FREEHOLD features multiple classes of enemies, each requiring tailored AI:
	1.	Fodder & Swarm: Basic units with minimal decision logic. They target the nearest lane forward and attack the first enemy they encounter. They attempt to leave telegraphed AoE zones if they have time to react.
	2.	Role‑Specialised Units: Tanks hold position and defend adjacent lanes; skirmishers dash past tanks to attack back‑line units; summoners deploy additional fodder; casters prioritise casting spells on high‑value targets; agents look for vulnerable units to charm or disable.
	3.	Heroes & Bosses: Unique units with scripted abilities and voice lines. They follow encounter‑specific behaviours (e.g., reposition when health drops below 50%, unleash an ultimate when an allied lieutenant dies).

Each unit type contains a state machine with simple states: Advance, Attack, Cast, Avoid, Dead. Transitions occur based on lane occupancy, cooldowns and environmental cues.

2. Card Selection AI

Enemy waves are composed from decks similar to the player’s. The AI uses a weighted random selection system influenced by the current encounter profile:
	1.	Profile Definition: An encounter defines a target AP curve (e.g., “early rush,” “balanced,” “heavy control”), a list of key tags (e.g., mechanical, AoE), and a difficulty level.
	2.	Weighted Choice: At each decision point, the AI considers cards that are playable with its current AP. Weights are computed as baseWeight × tagAffinity × counterWeight × randomness, where:
	•	baseWeight is the inherent popularity of the card in that faction.
	•	tagAffinity boosts weights for tags matching the encounter profile.
	•	counterWeight boosts cards that counter recently seen player strategies (see Adaptive AI below).
	•	randomness introduces unpredictability to avoid determinism.
	3.	Lane Selection: Once a card is chosen, the AI selects a target lane. Lane choice heuristics include: reinforce lanes with many allies; avoid lanes with active AoE telegraphs; deploy ranged units behind tanks; flank open lanes with skirmishers.

Weights are normalised, then the AI draws from a weighted distribution. This system yields variety while adhering to the encounter’s theme.

3. Adaptive Difficulty

To prevent static patterns, the AI monitors the player’s strategies and adapts:
	•	Counterpool Tracking: The game tracks the frequency of player tags played in recent encounters (e.g., swarm, mechanical, AoE). If a tag exceeds a threshold, the AI increases weights for cards that counter that tag (e.g., cleave and AoE against swarm).
	•	Perdurance Exploits: If the player heavily relies on mechanical units, the AI may introduce magnetic spells that disable mechanical constructs. If the player uses spectral heroes, the AI equips more radiant spells.
	•	Aggression Scaling: Difficulty levels adjust AP regen rates, spawn cadence and how early rare cards appear. At higher difficulties, AI may coordinate multi‑lane assaults or synchronise telegraphed spells to trap lane‑switching units.
	•	Fairness Safeguards: Adaptive behaviour never reacts faster than humanly possible. For example, the AI sees telegraphs at the same time as the player and cannot cancel actions mid‑cast. This preserves perceived fairness, as recommended by FX telegraphing guidelines ￼.

4. Faction‑Specific Tactics

Each faction has unique play patterns that the AI emphasises:
	•	Mechanized Scribes: Build sturdy front lines and repair them. Deploy Iron Golems with Clockwork Repair spells; use ballistic units to support. Summon Ballista Carts behind tanks. Minimise lane switching; rely on attrition.
	•	Spirit Cult of Barrowmere: Alternate between spectral swarms and radiant bursts. Use Temple Spirits to weaken lanes, then flood with Wisp Swarm. Prioritise resurrection spells and decaying auras.
	•	Swiftsilver Pirates: Exploit lane mobility. Deploy Swiftsilver Pirates and Skysword Operatives in open lanes; dash past blockers. Use Charm to turn enemy tanks. Rarely deploy stationary summoners.
	•	Bone Alchemists: Mix mechanical constructs with undead. Deploy Skeleton Factories and Grave Prophets that summon bone constructs. Use spells that convert dead units into allies. Resist radiant spells; weak to swarm bombardment.

By codifying faction tactics, designers ensure that encounters feel distinct and true to lore.

5. Boss & Mini‑Boss Scripts

Bosses introduce special mechanics and personalised taunts:
	•	Lieutenants: Appear mid‑gauntlet. Have two abilities and one ultimate. For instance, the Mechanized Scribes lieutenant might overcharge all constructs every 30 s (increasing damage) and call in reinforcements when below 50% HP. Taunts appear as speech bubbles with custom fonts.
	•	Necromancer: The final boss uses phases. Phase 1 focuses on summoning phantasms; Phase 2 uses large AoE spells; Phase 3 teleports across the strip, collapsing lanes. The Necromancer comments on the player’s lineage, referencing traits earned.

Boss scripts use timers and state transitions rather than random selection. They must remain predictable enough that skilled players can learn and counter them over multiple runs.

6. Implementation Considerations
	•	State Machines vs. Behaviour Trees: Early AI can be implemented with finite state machines for simplicity. As complexity grows, consider behaviour trees or utility AI for better modularity.
	•	Performance: AI decisions must run within the simulation tick budget. Precompute weight tables and avoid deep recursion.
	•	Debugging Tools: Provide tools to visualise AI decisions—show which card weights were considered and why a lane was chosen. This aids designers in tuning AI and spotting bugs.

## Testing & Metrics

We combine automated simulation (Furnace) with human playtests to ensure mechanics are fair, fun and performant.

1. Testing Layers

FREEHOLD’s testing pipeline operates on three layers:
	1.	Unit Tests & Static Analysis: Code‑level tests using Uvu ensure deterministic behaviour of low‑level functions (e.g. damage calculations, AP regen). Static analysis catches type errors and data validation issues (e.g. missing sprite references).
	2.	Simulation Harness (Furnace): Automated batch simulations test interactions between cards, units and factions at scale. Furnace runs thousands of micro‑battles and records metrics for each. It helps identify overpowered or underperforming cards and reveals synergy patterns.
	3.	Human Playtests: Controlled sessions where players run gauntlets, skirmishes and sandbox sessions. Designers observe behaviours, collect qualitative feedback and measure player experience metrics (e.g. time to learn mechanics, perceived fairness of telegraphs). Playtesters may include internal team members and external alpha testers.

2. Furnace Simulation Methodology

Furnace uses seeds to generate consistent battle scenarios. Each scenario is defined by a deck composition, AI profile, lane count and random seed. We batch scenarios as follows:
	•	1v1 Duels: Single unit vs. single unit, across all combinations of units. Measures head‑to‑head win rates, damage dealt and time to kill.
	•	2v2 Combos: Pairs of units vs. pairs of units, focusing on ability interactions and synergy scores.
	•	Deck Trials: Mini‑decks (5–8 cards) run through short gauntlets (3–5 waves). Measures deck win rates, AP efficiency, average card usage and survival time.
	
Metric
Description
Threat Rating
Outcome of duels, normalised to [-1,1] and mapped to 1–5 stars; quick proxy for unit strength.
Prowess Score
Win/loss ratio across deck trials. Helps rank cards and decks.
Synergy Delta
Improvement (or decline) in win rate when two cards are used together vs. separately. Positive indicates synergy; negative indicates anti‑synergy.
AP Utilisation
Average percentage of available AP spent each tick. Low utilisation may indicate overpriced cards or too few options.
Time to Kill (TTK)
Average number of ticks it takes for a unit to die in duels. Helps calibrate HP and damage values.
Lane Congestion
Percentage of time lanes are fully occupied. High congestion may indicate need for more lanes or lane‑switching mechanics.

Analysis & Actions
	•	Outliers: Cards with exceptionally high Threat ratings or Prowess scores are flagged for nerfing. Those with low scores may receive buffs or cost reductions.
	•	Synergy Outliers: Highly positive synergies might be intentionally powerful combos; evaluate if they are too easy to assemble. Negative synergies may indicate cards that punish the player; consider adjusting or adding UI hints.
	•	AP Utilisation: If players rarely spend all their AP, costs may be too high or card draw too low. If AP is always drained, consider raising regen or adding cheaper cards
	
	
## Narrative & Dialogue

This document provides guidelines for writing narrative content, including cut‑scenes, flavour text, dialogue and naming conventions. It ensures consistency of tone, theme and style across all written materials in FREEHOLD. Writers should reference this bible when creating new story arcs, characters and card descriptions.

1. Tone & Voice

FREEHOLD is dark‑mythic with a hint of sardonic humour. The world is decaying but characters still find moments of wit and resolve. The voice should evoke ancient tales and demoscene manifestos—poetic yet grounded.
	•	Serious but Not Grimdark: Avoid grimdark clichés. Characters acknowledge horror but also find hope in lineage and resilience.
	•	Evocative Imagery: Use concrete nouns and verbs. Describe relics (“a silver cog etched with runes”) and locations (“the ash‑choked Library of Aenea”). Avoid generic fantasy tropes.
	•	Brief & Punchy: Flavour text should be concise—one or two sentences. Dialogue boxes must fit within the 320 × 200 screen; aim for 40–60 characters per line and a maximum of three lines.

2. Narrative Arcs

2.1 Gauntlet Storyline
	1.	Threat Emerges: The Necromancer sends a proclamation—rendered as a pixelated scroll. He taunts the Houses, promising oblivion unless they surrender relics.
	2.	Call to Arms: Founders rally their Houses. Cut‑scenes show silhouettes of factions preparing—pirates sharpening blades, scribes winding golems.
	3.	Mid‑Gauntlet Revelations: Defeating lieutenants reveals motives. The Mechanized Scribes lieutenant confesses they once allied with the Necromancer to preserve knowledge; the Spirit Cult lieutenant warns of something worse awakening.
	4.	Tower Ascension: The final ascent to the Necromancer’s tower is intercut with ghostly whispers of fallen Houses. The Necromancer uses the souls of defeated heroes against the player.
	5.	Conclusion: On defeat, the Necromancer taunts players, promising to return. On victory, he retreats to another plane, leaving behind cryptic clues about a greater threat. Houses celebrate briefly before the next cycle begins.

2.2 Faction Stories

Provide each faction with mini‑stories that unfold across runs:
	•	Mechanized Scribes: Centuries ago, knowledge was threatened by war. The Scribes sealed themselves in cog‑citadels, creating constructs to defend their libraries. Their motto: “Words endure when flesh fails.”
	•	Spirit Cult of Barrowmere: A radiant lake grants visions and revival. The Cult believes death is a mere transition. They see the Necromancer as an aberration rather than an enemy, wishing to reclaim lost souls.
	•	Swiftsilver Pirates: They plunder relics to fund an endless carnival aboard their sky‑ships. They obey no laws but their own code: “Freedom or death—preferably freedom with riches.”
	•	Bone Alchemists: In subterranean catacombs, they graft flesh and bone, seeking to perfect life through decay. Some say they created the Necromancer.

These stories can be delivered through environmental art (e.g. murals), flavour text and NPC dialogues.

3. Characters & Naming

3.1 Founders & Heroes

Founders are singular and storied. Their names blend classical and fabricated syllables (e.g., Sir Celeron, Lumina, Vorik). Each founder should have:
	•	Backstory: Two sentences summarising their rise, flaw and goal. E.g., “Lumina mastered the scrolls of Cogsworth and unlocked forbidden spells. Now she atones by undoing the Necromancer’s curses.”
	•	Signature Quote: A line that encapsulates their character. “Knowledge is our fortress; ignorance is the enemy’s blade.”
	•	Traits: How their ability reflects their story. Celeron’s AP gain from constructs ties to his reliance on machinery.

Heroes (non‑founder rares) are less grand but still unique. Use occupational titles (e.g., Archivist Lumina, Grave Prophet Vorik) and tie them to factions.

3.2 Faction & Moiety Names

Faction names combine a descriptor with a noun (e.g., “Mechanized Scribes,” “Spirit Cult”). Moiety names evoke craft and role (e.g., “Machinists,” “Revellers”). Avoid overused fantasy words like “Order,” “Legion,” or “Guild” unless subverted. Use internal consonant clusters (e.g., “Swiftsilver”) for a retro feel.

3.3 Location & Relic Names

Locations derive from function or history. Relics combine evocative nouns and adjectives: Soul Furnace, Cog of Perpetuity, Vortex Glyph. Names should suggest their effects; players should roughly infer a card’s function from its name.

4. Dialogue Guidelines
	•	Economy of Words: Because screen real estate is limited, dialogue should be succinct. Avoid verbose exposition. Rely on implication and suggestive phrasing.
	•	Dynamic Phrasing: Vary line length to create rhythm. Use ellipses sparingly to build suspense.
	•	Faction Voices: Different factions speak differently. The Scribes use measured, technical language. The Cult uses mystical, reverent tones. Pirates are brash and colloquial. Alchemists are clinical and morbid.
	•	Reactive Quips: Let bosses and heroes react to player actions. For example, when the player uses Soul Drain, a Cult lieutenant might exclaim, “You have stolen from the lake! You will return it!”

5. Flavour Text Templates

Use templates to streamline writing. Examples:
	•	Creature: “Once [a brief origin], now [a current role].” E.g., “Once archivists’ aids, now tireless sentinels.”
	•	Spell: “It [a verb] [a subject], leaving [a result].” E.g., “It drains the wicked, leaving allies renewed.”
	•	Relic: “An artefact from [place/event], it [gives effect].” E.g., “An artefact from the Cog Wars, it spins the wheel of time faster.”

6. Do’s & Don’ts
	•	Do use the lore to inform mechanics. If a relic comes from Cogsworth, its effect should relate to machinery or time.
	•	Do revisit narrative threads. Foreshadow future bosses in flavour text.
	•	Don’t break the mythic tone with anachronistic slang. Pirates may be colloquial, but avoid modern references.
	•	Don’t overcomplicate names. If a word is hard to pronounce, simplify or break it into known roots.

