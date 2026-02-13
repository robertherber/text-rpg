# PRD: Open World Dynamic Generation

## Introduction

Transform the text RPG from a pre-scripted adventure into a fully dynamic, AI-generated open world. Players can explore freely, interact with generated NPCs and locations, and type custom actions beyond the suggested choices. The world persists to disk, so returning to a location feels consistent - the same tavern, the same people (unless story events changed things). The fantasy medieval theme (classic high fantasy with dragons, elves, magic) is strictly maintained - modern/sci-fi elements are rejected. Players can go anywhere and do anything within that world - as long as they've learned about it first.

The existing Millbrook village serves as the seed world, with dynamic generation expanding outward from there.

### Core Design Philosophy

**Narrative-driven gameplay**: Almost anything is possible if it makes narrative sense within high fantasy. GPT is the arbiter of what's reasonable given context. The world reacts realistically to player actions, and consequences emerge naturally from choices. Rather than rigid systems, the game uses contextual judgment for stealth, persuasion, crafting, magic, combat initiation, and all other interactions.

### Narrator Personality

The narrator is a **chaotic trickster** - playful, witty, occasionally misleading for fun, and willing to break the fourth wall. Speaks in first person ("I notice you're looking nervous..."). When players attempt impossible actions, the narrator responds with humorous rejection. The narrator is almost a character in itself, adding personality to the experience. Meta-commands get playful acknowledgment ("Ah, consulting your pack again?").

## Goals

- Replace static location/NPC data with AI-generated content using OpenAI GPT
- Allow free-form text input alongside AI-generated suggested actions
- Persist entire world state to disk (survives server restarts)
- Pre-generate images for suggested choices in the background while player reads
- Enforce "knowledge boundaries" - players can only reference places/people they've encountered or heard about
- Maintain fantasy medieval theme consistency across all generations
- Create a living world where NPCs have goals, items decay, and consequences ripple through the world
- Drive emergent storylines based on player choices and interests
- Enable almost any action that fits high fantasy through narrative-driven resolution

## User Stories

### US-001: World State Persistence Layer
**Description:** As a developer, I need a persistence system so the generated world survives server restarts.

**Acceptance Criteria:**
- [ ] Create `WorldState` type containing: locations, npcs, items, player knowledge, history, actionCounter, deceasedHeroes
- [ ] Save world state to `world-state.json` on every meaningful change
- [ ] Load existing world state on server startup if file exists
- [ ] Create new world with seed location (village square) if no save exists
- [ ] Track total actions taken (used for decay/change calculations)
- [ ] Keep all data indefinitely - no pruning
- [ ] Typecheck passes

### US-002: Coordinate-Based World Grid
**Description:** As a developer, I need a coordinate system so locations have spatial relationships.

**Acceptance Criteria:**
- [ ] Each location has (x, y) coordinates on a grid
- [ ] Village square at (0, 0) as origin
- [ ] Adjacent tiles are N/S/E/W and diagonals
- [ ] Locations track which directions have been explored vs unknown
- [ ] GPT generates new locations with coordinates based on direction of travel
- [ ] Typecheck passes

### US-003: Dynamic Location Generation
**Description:** As a player, I want to discover new locations so the world feels infinite and explorable.

**Acceptance Criteria:**
- [ ] When player moves to unknown location, call GPT to generate it
- [ ] Generated location includes: id, name, description, imagePrompt, coordinates, dangerLevel, terrain type
- [ ] Location inherits context from how player arrived (e.g., "forest path north of village")
- [ ] Items at location generated based on terrain and context
- [ ] Secret areas can be discovered through NPC hints, environmental clues, thorough exploration, or special items
- [ ] Generated locations saved to world state immediately
- [ ] Typecheck passes

### US-004: Dynamic NPC Generation
**Description:** As a player, I want to meet unique characters so conversations feel fresh and meaningful.

**Acceptance Criteria:**
- [ ] NPCs generated with: id, name, description, personality, knowledge[], currentLocationId, dialogue style
- [ ] Each NPC gets a "soul instruction" - a short paragraph covering background, goals, personality traits, speech patterns, gullibility/perceptiveness woven into personality
- [ ] Soul instruction influences dialogue tone, decisions to move locations, and reactions to player
- [ ] NPCs remember previous conversations with player (stored in world state)
- [ ] NPCs can provide information about other locations/people (adds to player knowledge)
- [ ] NPCs can move between locations based on their soul instruction and story events
- [ ] NPCs can die permanently - world remembers, other NPCs react with ripple effects
- [ ] Animals/creatures are NPCs too - can be befriended, tamed, or fought
- [ ] Typecheck passes

### US-005: AI-Generated Suggested Actions
**Description:** As a player, I want contextual action suggestions so I understand what's possible without limiting my options.

**Acceptance Criteria:**
- [ ] On entering location, GPT generates 3-6 contextual choices based on: location, present NPCs, inventory, recent events
- [ ] Choices include: movement options, NPC interactions, item interactions, contextual actions
- [ ] Movement choices include "step carefully" (one tile) or "travel to [known location]"
- [ ] Choices displayed as clickable buttons (existing UI pattern)
- [ ] Typecheck passes
- [ ] Verify suggested actions appear in browser

### US-006: Free-Form Text Input
**Description:** As a player, I want to type custom actions so I'm not limited to pre-defined choices.

**Acceptance Criteria:**
- [ ] Add text input field below suggested actions
- [ ] Placeholder text: "Or type your own action..."
- [ ] Submit on Enter key or button click
- [ ] Send free-form input to GPT for interpretation and response
- [ ] Typecheck passes
- [ ] Verify text input works in browser

### US-007: Knowledge Boundary System
**Description:** As a player, I can only reference things I've learned about so the world feels consistent and earned.

**Acceptance Criteria:**
- [ ] Track `playerKnowledge` set: known location names, NPC names, item names, lore, coordinates
- [ ] Knowledge gained through: visiting locations, NPC conversations, asking about places, reading books/signs
- [ ] When processing free-form input, validate references against knowledge
- [ ] Unknown references get playful narrator rejection ("Rivendell? Never heard of it. Perhaps you're thinking of somewhere else?")
- [ ] Starting knowledge includes: current village name, visible surroundings, basic directions
- [ ] Secrets must be discovered, not invented by player
- [ ] Typecheck passes

### US-008: Dynamic Image Generation
**Description:** As a player, I want images that reflect the current state of each location.

**Acceptance Criteria:**
- [ ] Images generated based on location description AND characters/NPCs currently present
- [ ] After generating suggested actions, queue image generation for each choice's destination
- [ ] Image generation happens in parallel background tasks
- [ ] Store pre-generated images in cache with location ID + state hash
- [ ] If something drastic changes (NPC dies, building destroyed, new NPC arrives), regenerate image
- [ ] If image not ready when player arrives, show loading (graceful fallback)
- [ ] Typecheck passes

### US-009: GPT Context Management
**Description:** As a developer, I need efficient context management so GPT calls are fast and consistent.

**Acceptance Criteria:**
- [ ] Create system prompt establishing: world theme, narrator personality (chaotic trickster first-person), consistency rules, narrative-driven resolution
- [ ] Include relevant context in each call: current location, nearby NPCs, recent history (last 5 events), player skills/knowledge
- [ ] Limit context size to stay within token limits
- [ ] Cache GPT responses where appropriate
- [ ] Typecheck passes

### US-010: Action Resolution Engine
**Description:** As a player, I want my actions to have meaningful effects on the world.

**Acceptance Criteria:**
- [ ] GPT determines outcome of any action (suggested or free-form)
- [ ] Outcomes can: change location, update NPC state, add/remove inventory, add knowledge, trigger events, initiate combat, reveal flashbacks
- [ ] Combat uses existing turn-based system - GPT decides when combat initiates
- [ ] Response includes: narrative text, state changes, new suggested actions
- [ ] Response length adapts to match player's input style (concise input = concise response, detailed input = rich response)
- [ ] Impossible actions get humorous narrator rejection with comic touch
- [ ] Stealth, persuasion, lying, stealing all resolved narratively based on context
- [ ] Typecheck passes

### US-011: Conversation System
**Description:** As a player, I want deep NPC conversations with memory.

**Acceptance Criteria:**
- [ ] Can have extended back-and-forth dialogue (stay in conversation mode)
- [ ] Store conversation summaries per NPC in world state
- [ ] Include conversation history in GPT context when talking to NPC
- [ ] NPCs can reference past conversations ("As I told you before...")
- [ ] NPCs' attitudes can change based on player actions
- [ ] NPCs occasionally ask probing questions ("What brings you here?", "What do you value most?")
- [ ] Player answers influence emergent storyline direction
- [ ] NPCs can give quests/tasks - tracked in journal
- [ ] Each NPC tracks what name player introduced themselves as (can have aliases)
- [ ] Typecheck passes

### US-012: NPC World Simulation
**Description:** As a player, I want the world to feel alive with NPCs pursuing their own goals.

**Acceptance Criteria:**
- [ ] When entering a location, simulate what has changed since last visit
- [ ] Changes based on actions taken since last visit (more actions = higher chance of change)
- [ ] NPC soul instruction determines if they move, what they're doing, their mood
- [ ] NPCs can be "away" when player visits their usual location
- [ ] NPCs might appear in unexpected locations based on their goals
- [ ] Off-screen events can occur (player hears about them later)
- [ ] World state tracks NPC locations, activities, and relationship states
- [ ] NPCs can spread rumors (true or false) based on what they know/believe
- [ ] Player's deeds spread realistically - nearby areas first, via NPC networks
- [ ] Typecheck passes

### US-013: Permadeath System
**Description:** As a player, death should have real consequences that make survival meaningful.

**Acceptance Criteria:**
- [ ] When player health reaches 0, character dies permanently
- [ ] World state persists after death (NPCs remember fallen hero, changes remain)
- [ ] Deceased character added to "legends of those who came before" in journal
- [ ] Player creates new character with GPT-suggested backstory/origin
- [ ] New character has no inventory, fresh stats, world knowledge resets
- [ ] Death message includes brief narrative of demise with narrator flair
- [ ] NPCs who knew previous character may reference them vaguely ("You remind me of someone...")
- [ ] Previous character's items persist where they died/left them
- [ ] Companions survive, may reference fallen player to new character
- [ ] If companions/NPCs buried previous character, grave exists
- [ ] Option to start completely fresh world if desired
- [ ] Typecheck passes

### US-014: Seed World from Existing Content
**Description:** As a developer, I want to use Millbrook as the starting point so players have a familiar foundation.

**Acceptance Criteria:**
- [ ] Convert existing static locations to dynamic world state format with coordinates
- [ ] Convert existing NPCs (barkeep, stranger, wizard, etc.) to NPC format with soul instructions
- [ ] Preserve existing items, enemies, and their properties
- [ ] Mark existing content as "canonical" so regeneration doesn't overwrite
- [ ] Add some seed factions (thieves guild, merchant consortium, noble houses)
- [ ] New areas generated dynamically beyond the seed content
- [ ] Typecheck passes

### US-015: Dynamic Item Generation
**Description:** As a player, I want to find unique items that fit my progression level.

**Acceptance Criteria:**
- [ ] Items generated dynamically by GPT based on context (location, enemies, story)
- [ ] Item stats/prices scaled with slight inflation based on player's accumulated wealth
- [ ] Items found in a location are remembered and persist
- [ ] New items can still appear over time (restocking, new discoveries)
- [ ] Common items predefined, rare/special items generated uniquely
- [ ] Minor enchantments common, powerful artifacts rare and storied
- [ ] Food exists - eating heals or provides buffs but not required
- [ ] Items can break in narrative circumstances (dramatic sword shatter)
- [ ] Typecheck passes

### US-016: Travel System
**Description:** As a player, I want flexible movement between careful exploration and quick travel.

**Acceptance Criteria:**
- [ ] Can step one tile in any direction (careful movement)
- [ ] Can travel directly to any known location (auto-travel)
- [ ] Long-distance travel triggers potential encounters based on terrain danger level
- [ ] Encounters are contextual to regions traveled through
- [ ] Travel encounters can be combat, discoveries, or NPC meetings
- [ ] Mounts exist as flavor (no mechanical benefit)
- [ ] Typecheck passes

### US-017: Visual Map Display
**Description:** As a player, I want to see where I've explored so I can navigate the world.

**Acceptance Criteria:**
- [ ] Canvas-drawn map showing explored areas
- [ ] Map updates as player discovers new locations
- [ ] Current location highlighted
- [ ] Only visited locations shown (no fog of war hints for adjacent)
- [ ] Terrain types visually distinct (forest, mountain, village, water, etc.)
- [ ] Map always visible in UI panel
- [ ] Typecheck passes
- [ ] Verify map renders correctly in browser

### US-018: Crafting and Building System
**Description:** As a player, I want to create things from materials I find.

**Acceptance Criteria:**
- [ ] Common items have discoverable recipes (find scrolls, learn from NPCs, experiment)
- [ ] Creative solutions judged by GPT - describe what you want, GPT determines if feasible
- [ ] Can build structures (camp, shelter, house, fort) with appropriate materials
- [ ] Crafted items added to inventory or world
- [ ] Built structures persist in the world at their location
- [ ] Can set traps for enemies/animals
- [ ] Typecheck passes

### US-019: World Decay and Change
**Description:** As a player, I want the world to evolve over time so it feels dynamic.

**Acceptance Criteria:**
- [ ] Track actions taken as proxy for time passing
- [ ] When entering location, calculate changes based on actions since last visit
- [ ] Built structures decay if not maintained
- [ ] Items left behind may disappear or be taken
- [ ] Changes described subtly woven into location description
- [ ] GPT generates contextual changes (weather effects, wear and tear)
- [ ] Bodies decay over time, scavengers may take gear
- [ ] Typecheck passes

### US-020: Emergent Storyline System
**Description:** As a player, I want the story to follow my interests and choices.

**Acceptance Criteria:**
- [ ] Track player behavior patterns (combat vs diplomacy, exploration vs social, etc.)
- [ ] NPCs ask probing questions that reveal player values
- [ ] GPT generates story hooks aligned with player interests
- [ ] No predefined main quest - storylines emerge from player actions
- [ ] Significant choices create ripple effects NPCs reference later
- [ ] Typecheck passes

### US-021: Dynamic Player Identity
**Description:** As a player, I want to define and evolve my character over time.

**Acceptance Criteria:**
- [ ] GPT generates starting scenario/backstory based on player input
- [ ] Player can modify initial physical description
- [ ] Physical description evolves with injuries, aging (cosmetic), transformations
- [ ] Can introduce self to NPCs with any name - each NPC remembers independently
- [ ] Hidden backstory elements revealed through flashbacks
- [ ] Flashbacks triggered by locations, NPCs, items, stressful moments, or quiet moments
- [ ] Flashbacks can reveal skills player didn't know they had
- [ ] Starting equipment based on origin
- [ ] Player starts human but can transform through story
- [ ] Typecheck passes

### US-022: Companion System
**Description:** As a player, I want to recruit NPCs and animals to join me.

**Acceptance Criteria:**
- [ ] Can recruit NPCs and tamed animals as companions
- [ ] No hard limit on companions (more = more management)
- [ ] Companions have AI personality but player can give orders in combat
- [ ] Companions can die permanently
- [ ] Companions follow their soul instruction - might betray, leave, or sacrifice for player
- [ ] Can give items to any NPC - they can hold/use them
- [ ] If player dies, companions scatter into world, may be found later
- [ ] Typecheck passes

### US-023: Home and Ownership
**Description:** As a player, I want to establish a home base in the world.

**Acceptance Criteria:**
- [ ] Can claim a location as home
- [ ] Can store items at home
- [ ] Companions can wait at home
- [ ] Stored items safe unless narrative event (raid, theft) - companions/guards protect
- [ ] Can leave notes/messages at locations
- [ ] Can mark locations with signs/symbols
- [ ] Typecheck passes

### US-024: Journal System
**Description:** As a player, I want to track my quests and knowledge.

**Acceptance Criteria:**
- [ ] Dedicated journal UI panel always visible
- [ ] Tracks active quests/tasks from NPCs
- [ ] Tracks known lore
- [ ] Tracks NPC relationships
- [ ] Tracks "legends of those who came before" (past characters)
- [ ] Quest completion: some auto-complete, some require return to quest-giver
- [ ] Quests can become impossible (NPC dies, item destroyed) but no time pressure
- [ ] Typecheck passes

### US-025: Factions and Reputation
**Description:** As a player, I want my actions to affect how groups perceive me.

**Acceptance Criteria:**
- [ ] Some seed factions exist, others emerge through play
- [ ] Player can create/lead a faction by recruiting NPCs with shared purpose
- [ ] Per-faction reputation tracked
- [ ] Per-NPC individual opinion also tracked
- [ ] Factions react to player deeds - bounties, hunters, exclusion or welcome
- [ ] Typecheck passes

### US-026: Consequences System
**Description:** As a player, I want my actions to have realistic consequences.

**Acceptance Criteria:**
- [ ] Caught stealing/lying/trespassing: NPCs react based on personality
- [ ] Can go to jail - escape options generated contextually
- [ ] Being evil is hard - bounties, hunters, towns refuse entry
- [ ] Evil factions might welcome villainous player
- [ ] Redemption possible but difficult and slow
- [ ] Some deeds unforgivable to certain NPCs
- [ ] Typecheck passes

### US-027: Skills and Magic
**Description:** As a player, I want to grow my abilities through practice.

**Acceptance Criteria:**
- [ ] Skills tracked narratively ("player has practiced swordplay several times")
- [ ] Some skills require teachers, others learned through practice
- [ ] Magic is narrative - describe intent, GPT judges if possible and consequences
- [ ] Magic is risky - spells can backfire, especially for beginners
- [ ] Can learn magic from teachers, spellbooks, or discover latent ability
- [ ] Typecheck passes

### US-028: Family and Relationships
**Description:** As a player, I want meaningful relationships with NPCs.

**Acceptance Criteria:**
- [ ] Relationships can develop naturally (friendship, romance, rivalry)
- [ ] Can marry and have children
- [ ] Family members are full NPCs with souls
- [ ] If player dies, family persists - new character might encounter them
- [ ] Can play as descendant if enough time passed
- [ ] Typecheck passes

## Functional Requirements

### Core Systems
- FR-1: World state persisted to `world-state.json`, loaded on startup, kept indefinitely
- FR-2: Existing Millbrook content used as seed world, converted to dynamic format
- FR-3: Grid-based coordinate system with village at (0,0)
- FR-4: Turn-based combat system retained, GPT triggers when appropriate

### Generation
- FR-5: Locations generated via GPT with coordinates, terrain, danger level, items, imagePrompt
- FR-6: NPCs generated via GPT with soul instruction (paragraph: background, goals, personality, speech, perceptiveness)
- FR-7: Items generated dynamically, prices inflated based on player wealth
- FR-8: Starting scenario/backstory generated by GPT based on player input

### NPCs and Simulation
- FR-9: NPC simulation on location entry - changes based on actions since last visit
- FR-10: NPCs can die permanently with ripple effects through the world
- FR-11: Animals/creatures are NPCs with souls
- FR-12: Companions follow soul instruction - can betray, leave, or sacrifice
- FR-13: NPCs spread information through their networks realistically
- FR-14: Each NPC tracks what name player gave them (aliases possible)
- FR-15: NPCs who knew previous character may reference them after permadeath

### Player Agency
- FR-16: Suggested actions generated contextually for each scene (3-6 options)
- FR-17: Free-form text input available alongside suggested actions
- FR-18: Player knowledge tracked; unknown references rejected with playful narrator response
- FR-19: Knowledge gained through exploration, conversation, asking questions, reading
- FR-20: Extended back-and-forth NPC conversations supported

### Narrator and Presentation
- FR-21: Chaotic trickster narrator in first person with fourth-wall breaking humor
- FR-22: Response length adapts to player's input style
- FR-23: Impossible actions get comic rejection from narrator
- FR-24: Images generated from location description + present NPCs/characters
- FR-24b: Images pre-generated in background for suggested action destinations
- FR-24c: Images regenerated when drastic changes occur (death, destruction, new arrivals)

### World Features
- FR-25: Flexible travel - step one tile or auto-travel to known locations
- FR-26: Long-distance travel has contextual encounter chance based on terrain danger
- FR-27: Canvas-drawn map of explored world (visited locations only)
- FR-28: Crafting via recipes (discovered) or freeform (GPT judged feasibility)
- FR-29: Building structures that persist in world
- FR-30: World decay based on actions taken since last visit, described subtly
- FR-31: Home ownership with item storage, companion waiting
- FR-32: Can leave notes and markers in world

### Character Systems
- FR-33: Physical description generated initially, evolves with story (injuries, transformations)
- FR-34: Hidden backstory revealed through contextual flashbacks
- FR-35: Flashbacks can reveal unknown skills
- FR-36: Starts human, can transform through story
- FR-37: Skills tracked narratively, some require teachers
- FR-38: Narrative magic - describe intent, GPT judges feasibility and risk

### Social Systems
- FR-39: NPCs can give quests, tracked in journal
- FR-40: Faction reputation + individual NPC opinion tracked
- FR-41: Player can create/lead factions
- FR-42: Crime and punishment - jail with contextual escape options
- FR-43: Being evil is viable but difficult (consequences, bounties)
- FR-44: Redemption possible but slow

### Relationships
- FR-45: Relationships develop naturally (friendship, romance, rivalry)
- FR-46: Marriage and children possible
- FR-47: Family are full NPCs with souls

### Permadeath
- FR-48: Permadeath - world persists, player restarts with new character
- FR-49: Past characters recorded as "legends" in journal
- FR-50: Previous character's items persist in world
- FR-51: Companions survive, may reference fallen player
- FR-52: Can play as descendant if enough time passed

### Emergent Gameplay
- FR-53: Emergent storylines driven by player behavior and choices
- FR-54: Secrets discovered through hints, exploration, items - not invented
- FR-55: Almost anything possible if it fits high fantasy and narrative context

## Non-Goals

- No multiplayer support
- No procedural quest generation system (quests emerge organically)
- No voice input/output
- No mod/plugin system for custom content
- No real-time events (world only changes on player action)
- No day/night cycle (time is abstract, simulated on location entry)
- No rigid mechanical systems for stealth/persuasion/etc (all narrative-driven)
- No hard inventory limits
- No hunger/sleep requirements
- No weather mechanical effects (cosmetic only)

## Technical Considerations

- **GPT Model:** Use `gpt-5-mini` for all generation
- **Token Management:** Keep context under 4000 tokens; summarize old history
- **Structured Output:** Use GPT function calling / JSON mode for reliable parsing
- **Race Conditions:** Queue image generation, don't block main flow
- **Error Handling:** Show error on API failure, let player retry (no in-character masking)
- **Cost Management:** Cache aggressively, batch requests where possible
- **Map Rendering:** Use HTML Canvas for map visualization
- **Coordinate System:** Simple (x, y) integer grid, extensible in all directions
- **Persistence:** Single JSON file, no pruning, grows indefinitely

## Design Considerations

- Keep existing UI layout (image panel, story panel, choices panel)
- Add text input field below choice buttons
- Add journal panel (always visible)
- Add canvas map panel (always visible)
- Show subtle loading indicator while generating (don't block interaction)
- Pre-generated images should feel seamless
- Narrator personality should shine through in all text
- First-person narrator voice

## Success Metrics

- Player can explore for 30+ minutes without hitting repetitive content
- Return visits to locations feel consistent (same NPCs, same description tone)
- Free-form inputs are understood and resolved >90% of the time
- Image pre-generation hits cache >80% of the time for suggested actions
- Average response time under 3 seconds for suggested actions
- Players report feeling the narrator has "personality"
- Emergent stories feel personalized to player choices
- Companions feel like individuals with agency

## Resolved Design Decisions

- **World state size:** Keep everything forever, no pruning
- **Player naming:** Can introduce themselves mid-game - NPCs remember individually
- **Map fog of war:** Only show visited locations, no adjacent tile hints on map
- **Meta-commands:** Narrator playfully acknowledges ("Ah, consulting your pack again?")
- **API failures:** Show error, let player retry (no in-character masking)
- **Permadeath memory:** NPCs remember previous character ("You remind me of someone...")
- **Narrator voice:** First person, chaotic trickster
- **Conversations:** Extended back-and-forth supported
- **Building:** Permanent structures possible with resources
- **Ownership:** Can claim locations, NPCs recognize it
- **Decay:** Subtle, woven into descriptions
- **Companions:** Soul-driven loyalty, can betray or sacrifice
- **Items to NPCs:** Yes, they can hold and use them
- **Player death with companions:** Companions scatter, findable later
- **Quests:** NPCs can give tasks, tracked in journal
- **Journal:** Always visible panel
- **Lying:** NPCs vary in gullibility per soul
- **Stealing:** Possible with consequences
- **Reputation:** Per-faction + per-NPC individual
- **Intimidation/persuasion:** Narrative-based on context
- **Factions:** Some seed, others emerge, player can create/lead
- **Skills:** Narrative tracking, some need teachers
- **Rumor spreading:** Realistic via NPC networks
- **False rumors:** Can spread, NPCs may verify based on trust/gullibility
- **Races:** Start human, can transform
- **Race effects:** Narrative/soul-driven
- **Physical description:** GPT generated, player modifies, evolves over time
- **Aging:** Cosmetic only over very long play
- **Family:** Can marry, have kids, family are full NPCs
- **Family on death:** Persist, new character can encounter, can play descendant
- **Starting scenario:** GPT generated based on player backstory input
- **Backstory:** GPT suggests, player confirms/modifies, hidden elements revealed via flashbacks
- **Backstory world ties:** Can reference existing world elements
- **Flashbacks:** Triggered by context (locations, stress, quiet moments, items)
- **Flashback skill reveals:** Yes, can unlock abilities
- **Starting equipment:** Based on origin
- **Looting bodies:** Possible with social consequences
- **Corpse persistence:** Decay over time contextually
- **Burial:** Can bury/honor dead, NPCs may ask this
- **Undead/ghosts:** Exist, narrative-driven
- **Spirits/afterlife:** Possible contact under right circumstances
- **Player transformation:** Can become undead/vampire/werewolf through story
- **Curses/blessings:** Exist, significant narrative system
- **Multiple characters:** One at a time
- **Character history:** Journal tracks "legends of those who came before"
- **Past character items:** Persist where they died/left them
- **Past character grave:** Exists if someone buried them
- **Prisons:** Exist, escape options generated contextually
- **Taking prisoners:** Possible if player has means
- **Dark actions:** Fade-to-black, imply without graphic detail
- **Being evil:** Viable but hard mode (consequences everywhere)
- **Evil world reaction:** Bounties, hunters, exclusion, evil factions welcome
- **Redemption:** Possible but difficult, some deeds unforgivable to some NPCs
- **Food:** Exists, heals/buffs, not required
- **Inventory:** Unlimited
- **Item degradation:** Only in narrative moments
- **Magic:** Narrative, describe intent, GPT judges
- **Learning magic:** From teachers, books, or latent ability discovery
- **Magic danger:** Risky, can backfire
- **Magical items:** Minor enchantments common, powerful artifacts rare
- **Stealth:** Narrative-based
- **Disguises:** Narrative-based
- **Eavesdropping:** If narrative setup allows
- **Consequences for crimes:** Personality-driven NPC reactions
- **Secret discovery:** Through hints, exploration, items, abilities - not invented
- **Traps:** Can craft and place
- **Ambushes:** Narrative stealth approach
- **Animal companions:** Can tame/befriend, join like NPC companions
- **Mounts:** Flavor only
- **Business ownership:** Can sell but not run persistent shop
- **Economy:** Slight inflation based on player wealth
- **Player economic impact:** None - backdrop only
- **Sleep/rest:** Not required
- **Weather:** Static per location, cosmetic only

## Resolved Design Decisions (continued)

- **World seed:** No - each world is unique, no reproducibility needed
- **Off-screen NPC simulation:** Only simulate when entering or doing an action in a location - no background simulation
- **Image generation:** Based on location description + NPCs present; regenerate on drastic changes
