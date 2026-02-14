# PRD: Dialog & Map UI Improvements

## Introduction

Improve the text RPG experience with better dialog presentation, an immersive hand-drawn map, and fixed image loading. The narrator should be visually distinct from NPC speech, NPCs should never refer to the player as "player", and conversations should offer suggested responses similar to action suggestions.

## Goals

- Make narrator text visually distinct from NPC dialog (italic + muted color)
- Ensure NPCs refer to player as "adventurer", "traveler", etc. - never "player"
- Stop narrator from repeating what NPCs say
- Make NPC dialogs and narrator descriptions shorter and punchier
- Generate 3 contextual dialog response suggestions during conversations
- Create a hand-drawn parchment-style map with fog of war for unexplored areas
- Fix image loading issues and add proper loading/error states
- Add loading indicators for area transitions, dialogs, and actions
- Handle failed GPT JSON responses gracefully with retry logic

## User Stories

### US-001: De-emphasize Narrator Text
**Description:** As a player, I want narrator text to be visually distinct from NPC dialog so I can easily tell who is "speaking".

**Acceptance Criteria:**
- [ ] Narrator text renders in italic style
- [ ] Narrator text uses a muted/gray color (e.g., `#6b7280` or similar)
- [ ] NPC dialog remains in normal weight with standard text color
- [ ] Clear visual distinction between narrator descriptions and NPC speech
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Update Player Reference Terminology
**Description:** As a player, I want NPCs to address me as "adventurer" or similar terms so the game feels more immersive.

**Acceptance Criteria:**
- [ ] GPT prompts instruct NPCs to use "adventurer", "traveler", "stranger", "hero" etc.
- [ ] Never use the word "player" in NPC dialog or narrator text
- [ ] Update conversation system prompt in `gptService.ts`
- [ ] Update action resolution system prompt in `gptService.ts`
- [ ] Typecheck passes

### US-003: Prevent Narrator Repeating NPC Dialog
**Description:** As a player, I want the narrator to describe NPC behavior without echoing their words so dialog isn't redundant.

**Acceptance Criteria:**
- [ ] Narrator describes actions, expressions, tone - not speech content
- [ ] NPC dialog appears exactly once (in quotes)
- [ ] System prompts explicitly forbid narrator from paraphrasing NPC speech
- [ ] Typecheck passes

### US-003b: Shorten Dialog and Narration
**Description:** As a player, I want NPC responses and narrator descriptions to be concise so the game feels snappy and readable.

**Acceptance Criteria:**
- [ ] NPC responses limited to 1-2 sentences typically
- [ ] Narrator descriptions limited to 1 sentence
- [ ] Action narratives limited to 2-3 sentences
- [ ] GPT prompts specify "be concise" and include max length guidance
- [ ] Typecheck passes

### US-004: Generate Dialog Response Suggestions
**Description:** As a player, I want 3 suggested dialog responses when talking to NPCs so I have conversation options like I have action options.

**Acceptance Criteria:**
- [ ] Conversation endpoint returns 3 suggested responses
- [ ] Suggestions include mix of contextual (personality-aware) and generic options
- [ ] Each suggestion has id, text, and type (e.g., "friendly", "inquisitive", "farewell")
- [ ] UI displays suggestions as clickable buttons below the conversation
- [ ] Clicking a suggestion sends that message to the NPC
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Create Hand-Drawn Parchment Map Style
**Description:** As a player, I want the map to look like a hand-drawn fantasy map on parchment so it feels immersive and fits the medieval theme.

**Acceptance Criteria:**
- [ ] Map has parchment/aged paper background texture
- [ ] Terrain rendered with illustrated/hand-drawn style icons or fills
- [ ] Location markers look hand-drawn (not generic pins)
- [ ] Map edges have subtle worn/torn parchment effect
- [ ] Player position clearly marked with distinctive icon
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Add Fog of War to Map
**Description:** As a player, I want unexplored areas to be hidden by fog so discovering new locations feels rewarding.

**Acceptance Criteria:**
- [ ] Unexplored map tiles/areas covered with fog or cloud effect
- [ ] Fog clears when player visits a location
- [ ] Explored areas remain visible permanently
- [ ] Fog has soft edges that blend naturally
- [ ] Adjacent tiles to explored areas show slight visibility (preview)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Fix Image Loading Issues
**Description:** As a player, I want location images to load correctly so I can see the generated artwork instead of placeholder text.

**Acceptance Criteria:**
- [ ] Debug why images show "village" placeholder instead of generated images
- [ ] Verify DALL-E API calls are succeeding
- [ ] Verify image URLs are being stored and retrieved correctly
- [ ] Images display when available
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Add Image Loading States
**Description:** As a player, I want to see loading indicators and error states for images so I know what's happening.

**Acceptance Criteria:**
- [ ] Parchment texture placeholder with "Revealing..." text while image generates
- [ ] Error state with retry button if image fails to load
- [ ] Graceful fallback if image unavailable (styled placeholder, not broken image)
- [ ] Loading state doesn't block other UI interactions
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Add Loading Indicators for Game Actions
**Description:** As a player, I want to see loading feedback when the game is processing my actions so I know something is happening.

**Acceptance Criteria:**
- [ ] Loading indicator shown when navigating to new area
- [ ] Loading indicator shown when submitting dialog message
- [ ] Loading indicator shown when selecting an action
- [ ] Indicators are unobtrusive but visible (e.g., subtle spinner, pulsing text)
- [ ] Action buttons disabled during loading to prevent double-submission
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Handle Failed GPT JSON Responses
**Description:** As a player, I want the game to recover gracefully from GPT failures so my experience isn't broken by occasional API errors.

**Acceptance Criteria:**
- [ ] GPT calls retry up to 2 times on JSON parse failure
- [ ] Exponential backoff between retries (e.g., 500ms, 1500ms)
- [ ] After retries exhausted, show user-friendly error message: "Something went wrong. Retry?"
- [ ] Error message offers "Try again" button
- [ ] Log failures for debugging (console or server-side)
- [ ] Typecheck passes

### US-011: Add Thematic Loading Indicators
**Description:** As a player, I want loading feedback that fits the game's tone so the experience feels cohesive.

**Acceptance Criteria:**
- [ ] Loading shows pulsing/fading text inline under the last message
- [ ] Multiple thematic variations rotate randomly, e.g.:
  - "The narrator ponders..."
  - "Fate weaves its thread..."
  - "The story unfolds..."
  - "A moment of contemplation..."
- [ ] Loading indicator appears for area navigation, dialog, and actions
- [ ] Action/dialog buttons disabled during loading
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Stream GPT Responses to UI
**Description:** As a player, I want narrative and dialog text to stream in word-by-word so I see content as quickly as possible.

**Acceptance Criteria:**
- [ ] GPT narrative responses use streaming API
- [ ] Text appears in StoryPanel progressively as tokens arrive
- [ ] Streaming works for both action narratives and conversation responses
- [ ] Structured data (suggested actions, state changes) fetched separately via JSON after stream
- [ ] UI remains responsive during streaming
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Narrator text must render with `font-style: italic` and muted gray color
- FR-2: All GPT prompts must instruct use of "adventurer/traveler/stranger" instead of "player"
- FR-3: Narrator frame in conversation must only describe behavior, never quote/paraphrase NPC words
- FR-4: NPC responses limited to 1-2 sentences, narrator to 1 sentence, action narratives to 2-3 sentences
- FR-5: `handleConversation` must return `suggestedResponses: Array<{id, text, type}>` - 2 contextual + 1 generic
- FR-6: Dialog suggestions show tone in brackets like "[Friendly] How's business?"
- FR-7: Map canvas must render parchment texture as background
- FR-8: Map must use terrain-appropriate hand-drawn icons based on location terrain type
- FR-9: Map must track explored locations and render fog over unexplored tiles
- FR-10: Fog clears for visited tile + immediate neighbors (1 tile radius)
- FR-11: Image placeholder shows parchment texture with "Revealing..." text
- FR-12: Loading indicators shown during area navigation, dialog, and action processing
- FR-13: GPT calls retry up to 2 times on failure with exponential backoff (500ms, 1500ms)
- FR-14: After retry exhaustion, show "Something went wrong. Retry?" with retry button
- FR-15: Loading indicator shows pulsing text inline under last message with rotating thematic phrases
- FR-16: GPT narrative/dialog responses stream via SSE or chunked response to frontend
- FR-17: StoryPanel renders streamed text progressively as tokens arrive

## Non-Goals

- No animated map elements (scrolling clouds, etc.)
- No real-time map updates (only updates on location change)
- No voice acting or audio for dialog
- No branching dialog trees (just suggested responses)
- No procedural map terrain generation (terrain comes from location data)

## Technical Considerations

- Map rendering uses HTML Canvas - will need to load/draw texture images
- Fog of war can be achieved with semi-transparent overlay or masking
- Dialog suggestions reuse the same pattern as action suggestions
- Image loading fix likely involves checking `imageService.ts` cache logic
- Consider using CSS variables for narrator styling for easy theming
- Streaming requires OpenAI `stream: true` option and SSE/chunked transfer to frontend
- StoryPanel needs to handle partial message updates during streaming
- Backend endpoints need to support streaming response (not JSON, but text/event-stream)
- Consider using `ReadableStream` on backend and `EventSource` or fetch streaming on frontend
- Only stream the narrative text; structured data (actions, state changes) uses current JSON approach
- Both conversation and action narratives stream identically

## Success Metrics

- Narrator text immediately distinguishable from NPC dialog
- Zero instances of "player" in game text
- Dialog flows naturally without repeated content
- Map evokes fantasy RPG aesthetic similar to reference image
- Images load successfully within 5 seconds or show appropriate loading state

## Open Questions

- Should the map have a compass rose decoration?
- Should dialog suggestions be regenerated after each NPC response or persist until conversation ends?
- What should the retry error message say? (e.g., "The fates are unclear... Try again?")
