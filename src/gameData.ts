import type { Location, Item, Enemy, Character } from "./types";

export const initialCharacter: Character = {
  name: "Hero",
  health: 100,
  maxHealth: 100,
  strength: 10,
  magic: 5,
  defense: 5,
  level: 1,
  experience: 0,
  gold: 50,
};

export const items: Record<string, Item> = {
  rusty_sword: {
    id: "rusty_sword",
    name: "Rusty Sword",
    description: "An old but serviceable blade",
    type: "weapon",
    effect: { stat: "strength", value: 3 },
  },
  leather_armor: {
    id: "leather_armor",
    name: "Leather Armor",
    description: "Basic protection against attacks",
    type: "armor",
    effect: { stat: "defense", value: 2 },
  },
  health_potion: {
    id: "health_potion",
    name: "Health Potion",
    description: "Restores 30 health points",
    type: "potion",
    effect: { stat: "health", value: 30 },
  },
  magic_amulet: {
    id: "magic_amulet",
    name: "Magic Amulet",
    description: "Enhances magical abilities",
    type: "misc",
    effect: { stat: "magic", value: 5 },
  },
  dungeon_key: {
    id: "dungeon_key",
    name: "Dungeon Key",
    description: "An ancient key that opens the dungeon gate",
    type: "key",
  },
  enchanted_blade: {
    id: "enchanted_blade",
    name: "Enchanted Blade",
    description: "A sword crackling with magical energy",
    type: "weapon",
    effect: { stat: "strength", value: 8 },
  },
  dragon_scale_armor: {
    id: "dragon_scale_armor",
    name: "Dragon Scale Armor",
    description: "Armor forged from dragon scales",
    type: "armor",
    effect: { stat: "defense", value: 10 },
  },
};

export const enemies: Record<string, Enemy> = {
  goblin: {
    id: "goblin",
    name: "Goblin",
    health: 30,
    maxHealth: 30,
    strength: 5,
    defense: 2,
    experienceReward: 15,
    goldReward: 10,
    description: "A small, green creature with sharp teeth and a wicked grin",
  },
  wolf: {
    id: "wolf",
    name: "Dire Wolf",
    health: 45,
    maxHealth: 45,
    strength: 8,
    defense: 3,
    experienceReward: 25,
    goldReward: 5,
    description: "A massive wolf with glowing red eyes",
  },
  skeleton: {
    id: "skeleton",
    name: "Skeleton Warrior",
    health: 40,
    maxHealth: 40,
    strength: 7,
    defense: 5,
    experienceReward: 30,
    goldReward: 20,
    description: "The animated bones of a fallen warrior",
  },
  dark_mage: {
    id: "dark_mage",
    name: "Dark Mage",
    health: 35,
    maxHealth: 35,
    strength: 12,
    defense: 2,
    experienceReward: 50,
    goldReward: 40,
    description: "A robed figure crackling with dark energy",
  },
  dragon: {
    id: "dragon",
    name: "Ancient Dragon",
    health: 150,
    maxHealth: 150,
    strength: 20,
    defense: 15,
    experienceReward: 200,
    goldReward: 500,
    description: "A colossal dragon with scales like molten gold and eyes burning with ancient wisdom",
  },
};

export const locations: Record<string, Location> = {
  village_square: {
    id: "village_square",
    name: "Village Square",
    description:
      "You stand in the center of Millbrook village. Cobblestone streets wind between thatched-roof cottages. Villagers go about their daily business, though their faces show worry. A notice board stands near the well, and paths lead to the tavern, the blacksmith, and the road out of town.",
    imagePrompt:
      "Medieval fantasy village square with cobblestone streets, thatched cottages, a stone well, villagers in medieval clothing, warm morning light, painted style, detailed",
    choices: [
      { id: "tavern", text: "Enter the tavern", nextLocationId: "tavern" },
      { id: "blacksmith", text: "Visit the blacksmith", nextLocationId: "blacksmith" },
      { id: "notice", text: "Read the notice board", nextLocationId: "notice_board" },
      { id: "leave", text: "Take the road out of the village", nextLocationId: "crossroads" },
    ],
  },
  tavern: {
    id: "tavern",
    name: "The Prancing Pony Tavern",
    description:
      "The tavern is warm and filled with the smell of roasted meat and ale. A fire crackles in the hearth. The barkeep polishes mugs while a hooded figure sits alone in the corner. A bard strums a melancholy tune about heroes of old.",
    imagePrompt:
      "Cozy medieval fantasy tavern interior, wooden beams, roaring fireplace, barrels of ale, candlelit tables, mysterious hooded figure in corner, bard with lute, warm atmosphere, painted style",
    choices: [
      { id: "barkeep", text: "Speak with the barkeep", nextLocationId: "barkeep_dialogue" },
      { id: "stranger", text: "Approach the hooded stranger", nextLocationId: "stranger_dialogue" },
      { id: "rest", text: "Pay 10 gold to rest (restore health)", nextLocationId: "tavern_rest", requirement: { type: "gold", value: 10 } },
      { id: "leave", text: "Return to the village square", nextLocationId: "village_square" },
    ],
  },
  barkeep_dialogue: {
    id: "barkeep_dialogue",
    name: "The Barkeep",
    description:
      '"Ah, another adventurer!" the barkeep says, setting down a mug. "You\'ve heard about the dragon, I take it? Ever since it made its lair in the old mountain fortress, our village has lived in fear. The king offers a mighty reward to whoever slays the beast, but none who\'ve gone have returned. If you\'re serious about trying, you\'ll need the dungeon key from the old wizard in the forest."',
    parentLocationId: "tavern",
    choices: [
      { id: "info", text: '"Tell me more about the dragon"', nextLocationId: "dragon_info" },
      { id: "wizard", text: '"Where can I find this wizard?"', nextLocationId: "wizard_info" },
      { id: "back", text: "Return to the tavern", nextLocationId: "tavern" },
    ],
  },
  dragon_info: {
    id: "dragon_info",
    name: "The Dragon's Tale",
    description:
      '"The dragon appeared three moons ago," the barkeep says gravely. "Ancient thing, gold and terrible. It took over the mountain fortress built by the old kings. We\'ve lost livestock, crops burned... some say it demands tribute. The brave knights who challenged it were turned to ash. You\'ll need more than courage to face it - you\'ll need magic, strong steel, and perhaps some luck."',
    parentLocationId: "tavern",
    choices: [
      { id: "back", text: "Thank him and return to the tavern", nextLocationId: "tavern" },
    ],
  },
  wizard_info: {
    id: "wizard_info",
    name: "The Wizard's Location",
    description:
      '"Old Aldric? He lives deep in the Whisperwood forest, to the east. Strange fellow - left the village years ago to study magic. Some say he\'s mad, others say wise. Either way, he\'s the only one who has a key to the dungeon where the dragon sleeps. Take the east road from the crossroads and follow the blue lights. But beware - the forest has become dangerous with wolves and worse since the dragon came."',
    parentLocationId: "tavern",
    choices: [
      { id: "back", text: "Thank him and return to the tavern", nextLocationId: "tavern" },
    ],
  },
  stranger_dialogue: {
    id: "stranger_dialogue",
    name: "The Hooded Stranger",
    description:
      'The figure lowers their hood, revealing an elven woman with silver hair and knowing eyes. "I sense purpose in you, young one. You seek the dragon." She slides a small vial across the table. "A gift. You will need it." The vial contains a shimmering health potion. "When darkness seems absolute, remember: even dragons have weaknesses. Seek the enchanted blade in the dungeon depths - only it can pierce dragon scales."',
    parentLocationId: "tavern",
    choices: [
      { id: "accept", text: "Accept the potion with gratitude", nextLocationId: "tavern", action: "item", itemId: "health_potion" },
      { id: "decline", text: "Politely decline and return to the tavern", nextLocationId: "tavern" },
    ],
  },
  tavern_rest: {
    id: "tavern_rest",
    name: "A Night's Rest",
    description:
      "You pay 10 gold for a room and a meal. The bed is soft, the food hearty. You sleep deeply and wake refreshed, your wounds healed and spirit renewed. Morning light streams through the window as you prepare to continue your journey.",
    parentLocationId: "tavern",
    onEnter: { type: "heal", value: 100 },
    choices: [
      { id: "back", text: "Head back downstairs", nextLocationId: "tavern" },
    ],
  },
  blacksmith: {
    id: "blacksmith",
    name: "The Blacksmith's Forge",
    description:
      'Heat blasts from the forge as the blacksmith hammers glowing steel. Tools and weapons line the walls. "Looking to buy?" she asks, wiping soot from her brow. "I\'ve got what you need if you\'ve got the coin."',
    imagePrompt:
      "Medieval blacksmith forge interior, muscular female blacksmith at anvil, glowing orange metal, weapons on wall racks, sparks flying, dramatic firelight, painted fantasy style",
    choices: [
      { id: "buy_sword", text: "Buy Rusty Sword (30 gold)", nextLocationId: "blacksmith", action: "item", itemId: "rusty_sword", requirement: { type: "gold", value: 30 } },
      { id: "buy_armor", text: "Buy Leather Armor (40 gold)", nextLocationId: "blacksmith", action: "item", itemId: "leather_armor", requirement: { type: "gold", value: 40 } },
      { id: "back", text: "Return to the village square", nextLocationId: "village_square" },
    ],
  },
  notice_board: {
    id: "notice_board",
    name: "Village Notice Board",
    description:
      'The notice board is covered with various postings. One large notice dominates: "REWARD: 1000 GOLD PIECES for the slaying of the Dragon that terrorizes our lands. Brave souls apply to the King\'s Council." Below it, smaller notices mention missing livestock, a lost cat, and a warning about increased wolf activity on the roads.',
    imagePrompt:
      "Medieval wooden notice board with parchment notices pinned to it, prominent dragon bounty poster with drawing of dragon, village square background, afternoon light, painted fantasy style",
    choices: [
      { id: "back", text: "Return to the village square", nextLocationId: "village_square" },
    ],
  },
  crossroads: {
    id: "crossroads",
    name: "The Crossroads",
    description:
      "You stand at a weathered crossroads. A wooden signpost points in four directions: North to the Mountain Fortress (though the path is dark and foreboding), East to the Whisperwood Forest, South to some rocky hills marked 'Goblin Territory', and West back to Millbrook Village. The air grows colder as you look toward the mountain, where dark clouds gather around its peak.",
    imagePrompt:
      "Fantasy crossroads with weathered wooden signpost, four dirt paths leading different directions, ominous dark mountain in distance with storm clouds, mysterious forest to the east, rocky hills to the south, painted fantasy style",
    choices: [
      { id: "village", text: "Return to the village (West)", nextLocationId: "village_square" },
      { id: "forest", text: "Enter the Whisperwood Forest (East)", nextLocationId: "forest_entrance" },
      { id: "caves", text: "Head to the Goblin Territory (South)", nextLocationId: "goblin_caves" },
      { id: "mountain", text: "Approach the Mountain Fortress (North)", nextLocationId: "mountain_gate", requirement: { type: "item", id: "dungeon_key" } },
    ],
  },
  forest_entrance: {
    id: "forest_entrance",
    name: "Whisperwood Forest Entrance",
    description:
      "Ancient trees tower above you, their branches intertwining to block most of the sunlight. Blue wisps of magical light float between the trees, illuminating a winding path deeper into the woods. You hear the distant howl of wolves and the rustle of unseen creatures.",
    imagePrompt:
      "Entrance to dark mystical forest, massive ancient trees, floating blue magical wisps of light, overgrown path leading deeper, mysterious atmosphere, dappled moonlight, painted fantasy style",
    choices: [
      { id: "deeper", text: "Follow the blue lights deeper into the forest", nextLocationId: "forest_depths" },
      { id: "back", text: "Return to the crossroads", nextLocationId: "crossroads" },
    ],
    enemies: ["wolf"],
  },
  forest_depths: {
    id: "forest_depths",
    name: "Deep in Whisperwood",
    description:
      "The blue lights lead you through twisted paths until you reach a small clearing. In its center stands a crumbling tower covered in moss and ivy. Arcane symbols glow faintly on its stones. This must be the wizard's dwelling. A dire wolf blocks the entrance, its red eyes fixed upon you.",
    imagePrompt:
      "Mystical clearing in dark forest, ancient crumbling wizard tower with glowing arcane symbols, moss and ivy covered stones, blue magical lights floating around, threatening dire wolf with red eyes, painted fantasy style",
    choices: [
      { id: "fight", text: "Fight the dire wolf", action: "combat", enemyId: "wolf", nextLocationId: "forest_depths_clear" },
      { id: "back", text: "Retreat to the forest entrance", nextLocationId: "forest_entrance" },
    ],
  },
  forest_depths_clear: {
    id: "forest_depths_clear",
    name: "The Wizard's Tower",
    description:
      "With the wolf defeated, the path to the tower is clear. The wooden door creaks open at your touch, revealing a spiral staircase leading upward into darkness. Strange sounds echo from above.",
    imagePrompt:
      "Ancient wizard tower entrance, heavy wooden door standing open, spiral staircase visible inside with glowing runes on walls, defeated wolf nearby, mystical forest clearing, painted fantasy style",
    choices: [
      { id: "enter", text: "Climb the tower stairs", nextLocationId: "wizard_tower" },
      { id: "back", text: "Return to the crossroads", nextLocationId: "crossroads" },
    ],
  },
  wizard_tower: {
    id: "wizard_tower",
    name: "Aldric's Study",
    description:
      'You emerge into a circular room filled with books, bubbling potions, and strange artifacts. An elderly wizard with a long white beard looks up from his tome. "Ah, a visitor! Come for the key, have you? Many have sought it, few have proven worthy." He strokes his beard thoughtfully. "Defeat my guardian, and the key is yours. Or... bring me a magic amulet from the goblin caves nearby, and I shall simply give it to you."',
    imagePrompt:
      "Magical wizard study in tower, elderly wizard with white beard and blue robes, floating books, bubbling potions, crystal balls, arcane artifacts, warm candlelight, painted fantasy style",
    choices: [
      { id: "challenge", text: "Accept the guardian challenge", nextLocationId: "wizard_challenge" },
      { id: "caves", text: "Ask about the goblin caves", nextLocationId: "goblin_cave_info" },
      { id: "give_amulet", text: "Give him the Magic Amulet", nextLocationId: "wizard_reward", requirement: { type: "item", id: "magic_amulet" } },
      { id: "back", text: "Leave the tower", nextLocationId: "forest_depths_clear" },
    ],
  },
  wizard_challenge: {
    id: "wizard_challenge",
    name: "The Guardian Challenge",
    description:
      'The wizard waves his hand, and a skeleton warrior materializes from thin air, ancient armor clanking as it raises its sword. "Defeat my guardian, and prove your worth!" the wizard cries.',
    parentLocationId: "wizard_tower",
    choices: [
      { id: "fight", text: "Fight the skeleton warrior", action: "combat", enemyId: "skeleton", nextLocationId: "wizard_victory" },
    ],
  },
  wizard_victory: {
    id: "wizard_victory",
    name: "Victory!",
    description:
      'The skeleton crumbles to dust at your feet. The wizard claps his hands in delight. "Wonderful! You have proven yourself a true warrior. As promised, here is the key to the mountain dungeon." He hands you an ancient iron key covered in runes. "The dragon awaits in the deepest chamber. May fortune favor you, hero."',
    parentLocationId: "wizard_tower",
    choices: [
      { id: "take", text: "Take the key and thank the wizard", nextLocationId: "forest_depths_clear", action: "item", itemId: "dungeon_key" },
    ],
  },
  goblin_cave_info: {
    id: "goblin_cave_info",
    name: "The Goblin Caves",
    description:
      '"The caves lie south of the crossroads," the wizard explains. "A tribe of goblins took residence there recently. They stole my magic amulet - the little thieves! Retrieve it for me, and the key is yours without combat. But beware - where there is one goblin, there are usually many."',
    parentLocationId: "wizard_tower",
    choices: [
      { id: "back", text: "Return to the wizard's study", nextLocationId: "wizard_tower" },
    ],
  },
  wizard_reward: {
    id: "wizard_reward",
    name: "The Wizard's Gratitude",
    description:
      '"My amulet! You found it!" The wizard\'s eyes light up with joy. "A deal is a deal. Here is the dungeon key. You have done me a great service, and so I shall do one for you as well." He mutters an incantation, and you feel magical energy surge through you, increasing your magical abilities. "Now go, hero. The dragon awaits."',
    parentLocationId: "wizard_tower",
    onEnter: { type: "addItem", itemId: "dungeon_key" },
    choices: [
      { id: "leave", text: "Leave the tower", nextLocationId: "forest_depths_clear" },
    ],
  },
  goblin_caves: {
    id: "goblin_caves",
    name: "Goblin Cave Entrance",
    description:
      "A dark cave mouth yawns before you, the stench of goblins wafting from within. Crude drawings mark the entrance, and you can hear chattering voices echoing from the depths. Bones litter the ground near the entrance - a warning to intruders.",
    imagePrompt:
      "Dark cave entrance in hillside, crude goblin drawings on rocks, bones scattered on ground, ominous darkness within, overgrown vegetation, painted fantasy style",
    choices: [
      { id: "enter", text: "Enter the caves", nextLocationId: "goblin_lair" },
      { id: "back", text: "Return to the crossroads", nextLocationId: "crossroads" },
    ],
  },
  goblin_lair: {
    id: "goblin_lair",
    name: "Goblin Lair",
    description:
      "Torchlight flickers on rough stone walls covered in crude markings. A goblin guard spots you and shrieks an alarm, drawing a rusty blade. Behind it, you can see a pile of stolen treasures, including a glowing amulet that must be the wizard's!",
    parentLocationId: "goblin_caves",
    choices: [
      { id: "fight", text: "Fight the goblin", action: "combat", enemyId: "goblin", nextLocationId: "goblin_treasure" },
      { id: "flee", text: "Flee back outside", nextLocationId: "goblin_caves" },
    ],
  },
  goblin_treasure: {
    id: "goblin_treasure",
    name: "The Goblin's Hoard",
    description:
      "With the goblin defeated, you approach the treasure pile. Among the stolen goods, you find the wizard's magic amulet glowing with inner light, along with some gold coins. You pocket your rewards.",
    parentLocationId: "goblin_caves",
    onEnter: { type: "addGold", value: 30 },
    choices: [
      { id: "take", text: "Take the magic amulet", nextLocationId: "goblin_caves", action: "item", itemId: "magic_amulet" },
    ],
  },
  mountain_gate: {
    id: "mountain_gate",
    name: "Mountain Fortress Gate",
    description:
      "The ancient fortress looms before you, carved directly into the mountainside. Massive iron gates stand sealed, but the runes on your key begin to glow as you approach. Scorch marks and debris tell tales of the dragon's wrath. Dark clouds swirl above the peak, and the air crackles with dark energy.",
    imagePrompt:
      "Massive ancient fortress carved into dark mountain, huge iron gates with glowing runes, scorch marks on stone, ominous storm clouds above, dramatic dark atmosphere, painted fantasy style",
    choices: [
      { id: "enter", text: "Use the key to open the gates", nextLocationId: "dungeon_entrance" },
      { id: "back", text: "Return to the crossroads", nextLocationId: "crossroads" },
    ],
  },
  dungeon_entrance: {
    id: "dungeon_entrance",
    name: "Dungeon Entrance Hall",
    description:
      "The gates groan open, revealing a vast entrance hall. Pillars carved with ancient kings line the walls. A dark mage stands before the inner doors, guardian of the dragon's lair. Dark energy crackles around them as they prepare to attack!",
    imagePrompt:
      "Grand dungeon entrance hall, massive carved pillars with king statues, dark mage with swirling black energy, ancient stone architecture, dramatic torchlight, painted fantasy style",
    choices: [
      { id: "fight", text: "Battle the dark mage", action: "combat", enemyId: "dark_mage", nextLocationId: "dungeon_depths" },
      { id: "flee", text: "Retreat outside", nextLocationId: "mountain_gate" },
    ],
  },
  dungeon_depths: {
    id: "dungeon_depths",
    name: "The Dungeon Depths",
    description:
      "Beyond the mage, you descend deeper into the mountain. In a side chamber, you discover an ancient armory. Among the rusted weapons, one sword stands apart - a blade that glows with magical light. The Enchanted Blade, able to pierce dragon scales!",
    imagePrompt:
      "Ancient underground armory, rusted weapons on racks, one magical glowing sword on pedestal, dramatic light rays, dust particles, painted fantasy style",
    choices: [
      { id: "take_sword", text: "Take the Enchanted Blade", nextLocationId: "dungeon_depths", action: "item", itemId: "enchanted_blade" },
      { id: "continue", text: "Continue to the dragon's chamber", nextLocationId: "dragon_lair" },
    ],
  },
  dragon_lair: {
    id: "dragon_lair",
    name: "The Dragon's Lair",
    description:
      'You emerge into a massive cavern filled with treasure. Atop the golden hoard, the Ancient Dragon raises its head, eyes burning with ancient fire. "SO, ANOTHER FOOL COMES TO DIE," it rumbles, smoke curling from its nostrils. "YOUR BONES WILL JOIN THE OTHERS." The dragon rises, spreading its wings wide. This is it - the final battle!',
    imagePrompt:
      "Massive treasure-filled dragon lair, colossal golden dragon on pile of gold and gems, glowing eyes, smoke curling from nostrils, dramatic lighting from dragon fire, epic fantasy scene, painted style",
    choices: [
      { id: "fight", text: "Face the dragon in combat!", action: "combat", enemyId: "dragon", nextLocationId: "victory" },
      { id: "flee", text: "This is madness - flee!", nextLocationId: "dungeon_depths" },
    ],
  },
  victory: {
    id: "victory",
    name: "Victory!",
    description:
      "With a final mighty blow, the dragon falls! Its massive form crashes upon its treasure hoard, gold coins scattering everywhere. You have done the impossible - slain the Ancient Dragon! As word spreads, you will become a legend. The village is saved, and the king's reward of 1000 gold is yours. But more importantly, you have proven yourself a true hero. Your adventure is complete... or is it just the beginning?",
    imagePrompt:
      "Triumphant hero standing over fallen dragon, treasure scattered everywhere, dramatic light rays from above, epic victory scene, painted fantasy style",
    onEnter: { type: "addGold", value: 1000 },
    choices: [
      { id: "celebrate", text: "Return to the village as a hero", nextLocationId: "village_square" },
    ],
  },
};
