# PRD: Text-to-Speech Narration & UI Reorganization

## Introduction

Add immersive text-to-speech narration to Dragon's Bane using OpenAI's `gpt-4o-mini-tts` model. The narrator maintains a consistent voice with chaotic trickster personality instructions, while NPCs receive randomly assigned persistent voices. Additionally, reorganize the UI to move the Actions panel below the Story panel and add Inventory as its own tab alongside Story, Map, and Journal.

## Goals

- Automatically read all narrative text aloud as it appears
- Use a consistent narrator voice with personality instructions for trickster delivery
- Assign random voices to NPCs on first encounter, persisted in `world-state.json`
- Provide skip button to stop current audio playback
- Duck (lower volume) background music during speech playback
- Move Actions panel from right column to bottom of Story panel
- Add Inventory as a new tab next to Story, Map, and Journal

## User Stories

### US-001: Create TTS Service
**Description:** As a developer, I need a service to call OpenAI's speech API so that text can be converted to audio.

**Acceptance Criteria:**
- [ ] Create `src/world/ttsService.ts` with function `generateSpeech(text: string, voice: string, instructions?: string): Promise<ArrayBuffer>`
- [ ] Use model `gpt-4o-mini-tts`
- [ ] Support voice parameter from available voices: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse
- [ ] Support optional `instructions` parameter for narrator personality
- [ ] Return audio as ArrayBuffer (mp3 format)
- [ ] Handle errors gracefully (return null on failure, don't crash)
- [ ] Typecheck passes

### US-002: Create TTS API Endpoint
**Description:** As a developer, I need a backend endpoint to generate speech audio so the frontend can request narration.

**Acceptance Criteria:**
- [ ] Create POST `/api/tts` endpoint
- [ ] Accept JSON body: `{ text: string, voice: string, instructions?: string }`
- [ ] Return audio/mpeg response with generated speech
- [ ] Limit text to 4096 characters (API limit)
- [ ] Return 400 for invalid requests, 500 for API failures
- [ ] Typecheck passes

### US-003: Add Voice Field to NPC Data
**Description:** As a developer, I need to store NPC voice assignments so they remain consistent across sessions.

**Acceptance Criteria:**
- [ ] Add optional `voice` field to NPC type in world state
- [ ] When NPC speaks and has no voice assigned, randomly select from voice pool
- [ ] Persist voice assignment to `world-state.json`
- [ ] Voice pool excludes narrator voice to keep it distinct
- [ ] Typecheck passes

### US-004: Create Audio Playback Component
**Description:** As a user, I want narrative text to be read aloud automatically so I can enjoy an immersive audio experience.

**Acceptance Criteria:**
- [ ] Create `src/frontend/NarrationPlayer.tsx` component
- [ ] Automatically fetch and play audio when new narrative message appears
- [ ] Queue multiple messages if they arrive faster than playback
- [ ] Show skip button (⏭️) while audio is playing
- [ ] Skip button stops current audio and moves to next in queue
- [ ] Handle playback errors gracefully (continue to next message)
- [ ] Typecheck passes
- [ ] Verify in browser: audio plays when narrative appears

### US-005: Integrate Narrator Voice with Personality
**Description:** As a user, I want the narrator to sound like a chaotic trickster so the audio matches the written personality.

**Acceptance Criteria:**
- [ ] Define narrator voice constant (suggest: "fable" - storyteller quality)
- [ ] Define narrator instructions: "Speak with playful, mischievous energy. You are a chaotic trickster narrator - witty, theatrical, occasionally breaking the fourth wall. Vary your pacing for dramatic effect."
- [ ] All narrator text uses this voice + instructions
- [ ] Typecheck passes
- [ ] Verify in browser: narrator sounds theatrical and playful

### US-006: Integrate NPC Voices
**Description:** As a user, I want each NPC to have their own distinct voice so I can identify who is speaking.

**Acceptance Criteria:**
- [ ] Parse narrative text to identify NPC dialogue (format: `Name: "dialogue"`)
- [ ] Look up NPC voice from world state
- [ ] If no voice assigned, assign random voice and persist
- [ ] Play NPC dialogue with their assigned voice (no personality instructions)
- [ ] Typecheck passes
- [ ] Verify in browser: different NPCs have different voices

### US-007: Duck Background Music During Speech
**Description:** As a user, I want the background music to lower during narration so I can hear the speech clearly.

**Acceptance Criteria:**
- [ ] When TTS audio starts playing, reduce background music volume to 20% of current level
- [ ] When TTS audio ends (or is skipped), restore background music to previous volume
- [ ] Transition smoothly (fade over 300ms)
- [ ] Handle rapid start/stop without glitches
- [ ] Typecheck passes
- [ ] Verify in browser: music ducks during speech

### US-008: Move Actions Panel Below Story
**Description:** As a user, I want the actions panel below the story so I can see more story content and have a natural reading flow.

**Acceptance Criteria:**
- [ ] Remove ActionPanel from right column (`actions-panel` section)
- [ ] Place ActionPanel at bottom of Story panel content area
- [ ] Actions remain visible only when Story tab is active
- [ ] Present NPCs section remains in right column
- [ ] Update CSS grid/flexbox layout accordingly
- [ ] Typecheck passes
- [ ] Verify in browser: actions appear below story text, layout looks balanced

### US-009: Add Inventory Tab
**Description:** As a user, I want Inventory as its own tab so I can access it without scrolling the actions panel.

**Acceptance Criteria:**
- [ ] Add "Inventory" tab button next to Story, Map, Journal
- [ ] Tab order: Story | Map | Journal | Inventory
- [ ] When Inventory tab active, show InventoryPanel in content area
- [ ] Remove InventoryPanel from right column
- [ ] Right column now only shows "Present NPCs" section
- [ ] Typecheck passes
- [ ] Verify in browser: inventory tab works, items display correctly

### US-010: Update Right Column Layout
**Description:** As a developer, I need to simplify the right column now that Actions and Inventory have moved.

**Acceptance Criteria:**
- [ ] Right column contains only "Present NPCs" section
- [ ] Adjust column width if needed (may be narrower now)
- [ ] Consider hiding right column entirely if no NPCs present
- [ ] Maintain responsive behavior on smaller screens
- [ ] Typecheck passes
- [ ] Verify in browser: layout looks balanced with simplified right column

## Functional Requirements

- FR-1: TTS service must call OpenAI `/v1/audio/speech` endpoint with model `gpt-4o-mini-tts`
- FR-2: Narrator voice is fixed (suggest "fable") with personality instructions for chaotic trickster delivery
- FR-3: NPC voices randomly assigned from pool on first dialogue, persisted in world-state.json
- FR-4: Voice pool for NPCs: alloy, ash, ballad, coral, echo, onyx, nova, sage, shimmer, verse (excludes narrator voice)
- FR-5: Audio plays automatically when narrative messages appear
- FR-6: Skip button visible during playback, stops current audio
- FR-7: Background music volume reduced to 20% during speech, restored after
- FR-8: ActionPanel renders below StoryPanel content when Story tab is active
- FR-9: InventoryPanel accessible via new "Inventory" tab
- FR-10: Right column shows only "Present NPCs" section

## Non-Goals

- No voice selection UI for users (voices are system-assigned)
- No TTS for player action echoes (only narrative and NPC dialogue)
- No TTS for system messages
- No offline/cached TTS (always fetch fresh)
- No lip-sync or avatar animations
- No TTS settings panel (volume controlled via skip or global mute)

## Design Considerations

- Skip button should be subtle but accessible (small icon in corner of story panel)
- Inventory tab icon could use a backpack/bag emoji or icon for visual distinction
- Right column may need minimum width to prevent "Present NPCs" from looking cramped
- Consider adding visual indicator (speaker icon) next to text currently being read

## Technical Considerations

- OpenAI TTS API has 4096 character limit per request - may need to chunk long narratives
- Audio playback requires user interaction first (browser autoplay policy) - piggyback on existing BackgroundMusic interaction
- NPC voice assignment should happen in conversation handler on backend, not frontend
- Use `HTMLAudioElement` for playback with proper cleanup on unmount
- Consider using `URL.createObjectURL()` for blob playback, revoke URLs to prevent memory leaks
- Volume ducking should communicate via React context or callback between components

## Success Metrics

- All narrative text is read aloud within 2 seconds of appearing
- NPCs maintain consistent voices across sessions
- Background music smoothly ducks without jarring transitions
- Skip button stops audio within 100ms
- UI reorganization feels natural and improves story readability

## Open Questions

- Should there be a global TTS mute toggle separate from skip?
- Should very short messages (under 10 characters) skip TTS?
- Should combat narration have different pacing instructions?

## References

- [OpenAI Text-to-Speech API](https://platform.openai.com/docs/guides/text-to-speech)
- [GPT-4o-mini-TTS Model](https://platform.openai.com/docs/models/gpt-4o-mini-tts) - supports voice instructions for emotional control
- Available voices: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse
