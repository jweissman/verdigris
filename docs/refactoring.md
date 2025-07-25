# Furnace Architectural Decisions

0.0 We'll build a tiny ruby-based simulator for the card engine to aggregate results from 1v1s to start.
0.1 We may ultimately want a typescript engine since running on the client is the real goal (we could invoke via bun on cli/headless)
0.2 At the CLI furnace can be invoked for duels with random creatures from the bank
0.3 A major goal is to run competitions over 'isotypes' (creatures with nominal 4/4 and 2/2 bodies and a single ability)
0.4 By running 2v2 and 3v3 of isotype creatures we can identify synergies and dissynergies, start to band abilities along the moieties and other worldgen factors
0.5 An initial goal would just be to generate simple intelligence reports: instantaneous threat of (ratio of creatures in the set who one-shot me vs those i one-shot); rough prowess from all-pairs 1v1 k/d ratio; and yes a deeper championship once we have enough synergy data to start grouping abilities in metafactions