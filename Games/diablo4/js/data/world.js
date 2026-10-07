/* Sanctuary — world data: difficulties, zones, areas, towns, NPCs, quests, cosmetics, mounts, paragon (global: DATA.*) */
(function () {
  'use strict';

  DATA.DIFFICULTIES = [
    { id: 'normal', name: 'Normal', hp: 1.0, dmg: 1.0, xp: 1.0, gold: 1.0, minLevel: 1, powerFloor: 0, legChance: 1.0, desc: 'For those new to Sanctuary.' },
    { id: 'hard', name: 'Hard', hp: 1.6, dmg: 1.3, xp: 1.25, gold: 1.25, minLevel: 1, powerFloor: 0, legChance: 1.2, desc: 'Monsters hit harder and have more Life. +25% XP and Gold.' },
    { id: 'expert', name: 'Expert', hp: 2.6, dmg: 1.7, xp: 1.5, gold: 1.5, minLevel: 1, powerFloor: 100, legChance: 1.4, desc: 'A real challenge. +50% XP and Gold.' },
    { id: 'penitent', name: 'Penitent', hp: 3.8, dmg: 2.1, xp: 1.75, gold: 1.75, minLevel: 50, powerFloor: 300, legChance: 1.7, desc: 'For veterans. +75% XP and Gold. Requires level 50.', reqQuest: 'capstone_penitent' },
    { id: 't1', name: 'Torment I', hp: 5.5, dmg: 2.6, xp: 2.0, gold: 2.2, minLevel: 60, powerFloor: 600, legChance: 2.0, desc: 'Ancestral items drop. +100% XP and Gold. Resistances reduced by 25%.', resPenalty: 0.25, reqQuest: 'capstone_torment' },
    { id: 't2', name: 'Torment II', hp: 8, dmg: 3.4, xp: 2.4, gold: 2.8, minLevel: 60, powerFloor: 700, legChance: 2.3, desc: 'Resistances reduced by 50%. More Ancestral items.', resPenalty: 0.5, reqQuest: 'capstone_torment' },
    { id: 't3', name: 'Torment III', hp: 12, dmg: 4.4, xp: 2.8, gold: 3.4, minLevel: 60, powerFloor: 800, legChance: 2.7, desc: 'Resistances reduced by 75%. Mythics may drop.', resPenalty: 0.75, reqQuest: 'capstone_torment' },
    { id: 't4', name: 'Torment IV', hp: 18, dmg: 5.5, xp: 3.5, gold: 4.0, minLevel: 60, powerFloor: 900, legChance: 3.2, desc: 'Resistances reduced by 100%. The ultimate test.', resPenalty: 1.0, reqQuest: 'capstone_torment' }
  ];
  DATA.diffById = {}; DATA.DIFFICULTIES.forEach(d => { DATA.diffById[d.id] = d; });

  // ---- Zones & areas ----------------------------------------------------------
  // area types: field (open-world roam), dungeon (3 floors, final elite pack; first clear unlocks aspect), stronghold (single tough map, unlocks waypoint/town),
  //             cellar (1 short floor), boss (arena), event (timed horde)
  const ZONE = (id, name, o) => Object.assign({ id, name }, o);
  DATA.ZONES = [
    ZONE('fractured_peaks', 'Fractured Peaks', { level: [1, 15], town: 'kyovashad', ground: '#2b3340', ground2: '#3a4452', decor: 'snow', families: ['fallen', 'skeleton', 'zombie', 'khazra', 'bandit', 'wildlife', 'ghost'],
      desc: 'Snow-choked mountains haunted by the Fallen and the restless dead.',
      areas: [
        { id: 'nevesk_fields', name: 'Nevesk Outskirts', type: 'field', lvl: 0, desc: 'Frozen fields crawling with Fallen and wolves.' },
        { id: 'pilgrims_road', name: 'Pilgrim\'s Road', type: 'field', lvl: 3, families: ['bandit', 'skeleton', 'ghost'], desc: 'Bandits ambush travelers on the mountain road.' },
        { id: 'hoarfrost_demise', name: 'Hoarfrost Demise', type: 'dungeon', lvl: 2, families: ['skeleton', 'zombie', 'ghost'], aspects: { all: 'protector' }, desc: 'A glacier tomb where frozen corpses stir.' },
        { id: 'light_watch', name: 'Light\'s Watch', type: 'dungeon', lvl: 4, families: ['fallen', 'bandit'], aspects: { necromancer: 'blood_getters', barbarian: 'relentless_armament', druid: 'nighthowler', paladin: 'radiant_faith' }, desc: 'An abandoned watchtower claimed by the Fallen.' },
        { id: 'anica_claim', name: 'Anica\'s Claim', type: 'dungeon', lvl: 6, families: ['skeleton', 'ghost'], aspects: { necromancer: 'torment', barbarian: 'iron_warrior', druid: 'quicksand', paladin: 'holy_bulwark' }, desc: 'Mining tunnels where the dead still dig.' },
        { id: 'forbidden_city', name: 'Forbidden City', type: 'dungeon', lvl: 8, families: ['fallen', 'khazra', 'bandit'], aspects: { all: 'rapid' }, desc: 'Ruined streets lost to the Fallen.' },
        { id: 'kor_dragan', name: 'Kor Dragan', type: 'stronghold', lvl: 10, families: ['vampire', 'skeleton', 'ghost'], desc: 'A fortress overrun by vampires.', reward: { cosmetic: 'kor_dragan_sigil' } },
        { id: 'malnok', name: 'Malnok', type: 'stronghold', lvl: 7, families: ['khazra', 'wildlife'], desc: 'A Khazra-held village in the high passes.', reward: { mount_trophy: 'khazra_horn' } },
        { id: 'xfal_lair', name: 'X\'Fal\'s Lair', type: 'boss', lvl: 12, boss: 'xfal', desc: 'The Scarred Baron waits beneath the ice.' },
        { id: 'gaspar_camp', name: 'Gaspar\'s Camp', type: 'boss', lvl: 16, boss: 'gaspar', desc: 'The bandit king\'s stronghold.' },
        { id: 'cellar_fp', name: 'Bear Tribe Cellar', type: 'cellar', lvl: 2, families: ['wildlife', 'bandit'], desc: 'A quick dive into a frozen cellar.' },
        { id: 'horde_fp', name: 'Siege of Nevesk', type: 'event', lvl: 5, desc: 'Survive waves of Fallen for 90 seconds.' }
      ] }),
    ZONE('scosglen', 'Scosglen', { level: [12, 28], town: 'cerrigar', ground: '#223324', ground2: '#2d4330', decor: 'forest', families: ['drowned', 'spider', 'khazra', 'wildlife', 'bandit', 'cultist'],
      desc: 'Rain-soaked forests and drowned coasts where druids once ruled.',
      areas: [
        { id: 'braestaig', name: 'Braestaig Coast', type: 'field', lvl: 0, families: ['drowned', 'spider', 'wildlife'], desc: 'The drowned walk the shoreline.' },
        { id: 'moordaine', name: 'Moordaine Lodge', type: 'field', lvl: 4, families: ['khazra', 'wildlife', 'spider'], desc: 'The Khazra have claimed the deep woods.' },
        { id: 'whispering_pines', name: 'Whispering Pines', type: 'dungeon', lvl: 2, families: ['spider', 'khazra'], aspects: { all: 'disobedience' }, desc: 'A spider-infested forest grove.' },
        { id: 'mariners_refuge', name: 'Mariner\'s Refuge', type: 'dungeon', lvl: 5, families: ['drowned'], aspects: { necromancer: 'grasping_veins', barbarian: 'bul_kathos', druid: 'stormchasers', paladin: 'sacred_hammers' }, desc: 'A shipwreck full of the drowned.' },
        { id: 'maugans_works', name: 'Maugan\'s Works', type: 'dungeon', lvl: 8, families: ['bandit', 'cultist', 'spider'], aspects: { necromancer: 'splintering', barbarian: 'dust_devils', druid: 'shockwave', paladin: 'zealous' }, desc: 'An old mine turned cultist hideout.' },
        { id: 'hallowed_ossuary', name: 'Hallowed Ossuary', type: 'dungeon', lvl: 11, families: ['skeleton', 'ghost', 'cultist'], aspects: { all: 'edgemaster' }, desc: 'A bone-lined crypt of the druids.' },
        { id: 'tur_dulra', name: 'Túr Dúlra', type: 'stronghold', lvl: 12, families: ['khazra', 'spider', 'cultist'], desc: 'The druid college, fallen to the Khazra.', reward: { cosmetic: 'tur_dulra_cloak' } },
        { id: 'moordaine_stronghold', name: 'Hope\'s Light', type: 'stronghold', lvl: 9, families: ['drowned', 'ghost'], desc: 'A lighthouse haunted by the drowned.', reward: { mount: 'spectral_charger' } },
        { id: 'ashava_arena', name: 'Caen Adar', type: 'boss', lvl: 13, boss: 'ashava', desc: 'Ashava rises from the bog.' },
        { id: 'butcher_hunt', name: 'Butcher\'s Hunting Ground', type: 'boss', lvl: 8, boss: 'butcher', desc: 'Fresh meat...' },
        { id: 'cellar_sc', name: 'Flooded Cellar', type: 'cellar', lvl: 1, families: ['drowned'], desc: 'A quick dive.' },
        { id: 'horde_sc', name: 'Siege of Cerrigar', type: 'event', lvl: 6, desc: 'Hold the gates against the drowned.' }
      ] }),
    ZONE('dry_steppes', 'Dry Steppes', { level: [25, 40], town: 'ked_bardu', ground: '#4a3a28', ground2: '#5a4a34', decor: 'salt', families: ['cannibal', 'bandit', 'demon', 'skeleton', 'wildlife', 'fallen'],
      desc: 'Salt flats and scorched canyons stalked by cannibals and demons.',
      areas: [
        { id: 'untamed_scarps', name: 'Untamed Scarps', type: 'field', lvl: 0, families: ['cannibal', 'wildlife', 'bandit'], desc: 'Cannibal hunting grounds.' },
        { id: 'chambatar_ridge', name: 'Chambatar Ridge', type: 'field', lvl: 5, families: ['demon', 'fallen', 'cannibal'], desc: 'Demons pour from the ridge.' },
        { id: 'charnel_house', name: 'Charnel House', type: 'dungeon', lvl: 2, families: ['cannibal', 'zombie'], aspects: { all: 'executioner' }, desc: 'The cannibals\' larder.' },
        { id: 'shivta_ruins', name: 'Shivta Ruins', type: 'dungeon', lvl: 5, families: ['skeleton', 'construct', 'ghost'], aspects: { necromancer: 'hardened_bones', barbarian: 'skullbreaker', druid: 'crashstone', paladin: 'consecrated_ground' }, desc: 'Ancient ruins guarded by constructs.' },
        { id: 'onyx_hold', name: 'Onyx Hold', type: 'dungeon', lvl: 8, families: ['demon', 'cultist'], aspects: { all: 'inner_calm' }, desc: 'A hold corrupted by the Triune.' },
        { id: 'heathens_keep', name: 'Heathen\'s Keep', type: 'dungeon', lvl: 11, families: ['bandit', 'cannibal', 'demon'], aspects: { necromancer: 'decay', barbarian: 'limitless_rage', druid: 'lightning_dancer', paladin: 'heavenly_wrath' }, desc: 'A keep ruled by heathens.' },
        { id: 'temple_of_rot', name: 'Temple of Rot', type: 'stronghold', lvl: 12, families: ['cultist', 'zombie', 'demon'], desc: 'Varshan\'s cultists fester here.', reward: { cosmetic: 'rot_mask' } },
        { id: 'alcarnus', name: 'Alcarnus', type: 'stronghold', lvl: 8, families: ['bandit', 'cannibal'], desc: 'A town overrun by raiders.', reward: { mount_armor: 'steppes_barding' } },
        { id: 'varshan_lair', name: 'Malignant Burrow', type: 'boss', lvl: 10, boss: 'varshan', desc: 'The Echo of Varshan.' },
        { id: 'grigoire_lair', name: 'Hall of the Penitent', type: 'boss', lvl: 15, boss: 'grigoire', desc: 'The Galvanic Saint.' },
        { id: 'cellar_ds', name: 'Salt Cellar', type: 'cellar', lvl: 1, families: ['cannibal'], desc: 'A quick dive.' },
        { id: 'horde_ds', name: 'Siege of Ked Bardu', type: 'event', lvl: 6, desc: 'Hold against the cannibal horde.' }
      ] }),
    ZONE('hawezar', 'Hawezar', { level: [35, 50], town: 'zarbinzet', ground: '#263a2a', ground2: '#2f4a36', decor: 'swamp', families: ['nangari', 'spider', 'zombie', 'vampire', 'cultist', 'ghost'],
      desc: 'A fetid swamp where serpent-folk and witches hold court.',
      areas: [
        { id: 'fethis_wetlands', name: 'Fethis Wetlands', type: 'field', lvl: 0, families: ['nangari', 'spider', 'zombie'], desc: 'Snakes in the reeds.' },
        { id: 'rotspill_delta', name: 'Rotspill Delta', type: 'field', lvl: 5, families: ['vampire', 'cultist', 'ghost'], desc: 'The vampires hunt at dusk.' },
        { id: 'serpents_lair', name: 'Serpent\'s Lair', type: 'dungeon', lvl: 2, families: ['nangari'], aspects: { all: 'bloodied' }, desc: 'The Nangari nest.' },
        { id: 'witchwater', name: 'Witchwater', type: 'dungeon', lvl: 5, families: ['cultist', 'zombie', 'spider'], aspects: { necromancer: 'bursting_bone', barbarian: 'ancestral_force', druid: 'ursine_horror', paladin: 'conviction_aspect' }, desc: 'Witches brew in the dark.' },
        { id: 'blind_burrows', name: 'Blind Burrows', type: 'dungeon', lvl: 8, families: ['spider', 'nangari'], aspects: { all: 'shared_misery' }, desc: 'Spiders in the dark.' },
        { id: 'sepulcher', name: 'Sepulcher of the Forsworn', type: 'dungeon', lvl: 11, families: ['vampire', 'ghost', 'skeleton'], aspects: { necromancer: 'exposed_flesh', barbarian: 'echoing_fury', druid: 'mangled', paladin: 'smiting' }, desc: 'A vampire crypt.' },
        { id: 'vyeresz', name: 'Vyeresz', type: 'stronghold', lvl: 12, families: ['nangari', 'cultist'], desc: 'A serpent-cult town.', reward: { cosmetic: 'serpent_scale_armor' } },
        { id: 'crusaders_monument', name: 'Crusader\'s Monument', type: 'stronghold', lvl: 9, families: ['ghost', 'skeleton'], desc: 'Haunted by fallen crusaders.', reward: { mount_trophy: 'crusader_banner' } },
        { id: 'beast_lair', name: 'Glacial Fissure', type: 'boss', lvl: 10, boss: 'beast_in_ice', desc: 'The Beast in the Ice.' },
        { id: 'zir_lair', name: 'Darkened Way', type: 'boss', lvl: 15, boss: 'lord_zir', desc: 'Lord Zir\'s blood court.' },
        { id: 'cellar_hz', name: 'Sunken Cellar', type: 'cellar', lvl: 1, families: ['zombie', 'spider'], desc: 'A quick dive.' },
        { id: 'horde_hz', name: 'Siege of Zarbinzet', type: 'event', lvl: 6, desc: 'Hold against the serpents.' }
      ] }),
    ZONE('kehjistan', 'Kehjistan', { level: [45, 60], town: 'gea_kul', ground: '#5a4a2a', ground2: '#6c5a36', decor: 'desert', families: ['demon', 'cultist', 'skeleton', 'fallen', 'vampire', 'construct'],
      desc: 'Sun-scorched deserts and the ruins of Caldeum, where the Triune rises again.',
      areas: [
        { id: 'amber_sands', name: 'Amber Sands', type: 'field', lvl: 0, families: ['fallen', 'skeleton', 'wildlife'], desc: 'Dunes of the lost.' },
        { id: 'caldeum', name: 'Ruins of Caldeum', type: 'field', lvl: 5, families: ['demon', 'cultist', 'construct'], desc: 'The jewel of the east, in ruins.' },
        { id: 'sunken_library', name: 'Sunken Library', type: 'dungeon', lvl: 2, families: ['construct', 'skeleton', 'ghost'], aspects: { all: 'accelerating' }, desc: 'Knowledge drowned in sand.' },
        { id: 'uldur_cave', name: 'Uldur\'s Cave', type: 'dungeon', lvl: 5, families: ['demon', 'fallen'], aspects: { necromancer: 'empowering_reaper', barbarian: 'giant_strides', druid: 'overcharged', paladin: 'lightbringer' }, desc: 'Demons nest in the deep.' },
        { id: 'yshari_sanctum', name: 'Yshari Sanctum', type: 'dungeon', lvl: 8, families: ['cultist', 'demon'], aspects: { all: 'elements' }, desc: 'The mage clans\' lost sanctum.' },
        { id: 'abandoned_mineworks', name: 'Abandoned Mineworks', type: 'dungeon', lvl: 11, families: ['construct', 'demon', 'vampire'], aspects: { necromancer: 'potent_blood', barbarian: 'earthquake_aspect', druid: 'trampled_earth', paladin: 'radiant_faith' }, desc: 'Deep and dark.' },
        { id: 'omath_redoubt', name: 'Omath\'s Redoubt', type: 'stronghold', lvl: 12, families: ['demon', 'cultist'], desc: 'A Triune fortress.', reward: { cosmetic: 'triune_vestments' } },
        { id: 'altar_of_ruin', name: 'Altar of Ruin', type: 'stronghold', lvl: 9, families: ['vampire', 'cultist'], desc: 'Blood rites in the sand.', reward: { mount: 'cold_iron_steed' } },
        { id: 'duriel_lair', name: 'Gaping Crevasse', type: 'boss', lvl: 10, boss: 'duriel', desc: 'The King of Maggots.' },
        { id: 'andariel_lair', name: 'Hall of Anguish', type: 'boss', lvl: 13, boss: 'andariel', desc: 'The Maiden of Anguish.' },
        { id: 'cellar_kj', name: 'Sand-Choked Cellar', type: 'cellar', lvl: 1, families: ['fallen', 'skeleton'], desc: 'A quick dive.' },
        { id: 'horde_kj', name: 'Siege of Gea Kul', type: 'event', lvl: 6, desc: 'Hold the harbor.' },
        { id: 'capstone_cathedral', name: 'Cathedral of Light (Capstone)', type: 'dungeon', lvl: 8, families: ['demon', 'cultist', 'ghost'], capstone: 'capstone_penitent', bossFinal: 'varshan', desc: 'Prove yourself worthy of Penitent difficulty.' }
      ] }),
    ZONE('nahantu', 'Nahantu', { level: [55, 60], town: 'kurast', ground: '#1d3322', ground2: '#28432c', decor: 'jungle', families: ['nahantu', 'spider', 'demon', 'wildlife', 'construct', 'nangari'],
      desc: 'Jungles of the Lower Kurast, where Mephisto\'s hatred takes root.',
      areas: [
        { id: 'teganze', name: 'Teganze Plateau', type: 'field', lvl: 0, families: ['nahantu', 'wildlife', 'spider'], desc: 'The Mother\'s zealots prowl.' },
        { id: 'lower_kurast', name: 'Lower Kurast', type: 'field', lvl: 3, families: ['demon', 'nahantu', 'construct'], desc: 'Hatred spreads through the undercity.' },
        { id: 'kurast_undercity', name: 'Kurast Undercity', type: 'dungeon', lvl: 2, families: ['nahantu', 'spider', 'demon'], aspects: { all: 'unyielding' }, desc: 'Beneath the city.' },
        { id: 'spirit_pass', name: 'Hall of Spirits', type: 'dungeon', lvl: 4, families: ['ghost', 'construct', 'nahantu'], aspects: { necromancer: 'blighted', barbarian: 'berserk_ripping', druid: 'rampaging_werebeast', paladin: 'holy_bulwark' }, desc: 'Spirits of the ancestors.' },
        { id: 'tomb_of_the_saints', name: 'Tomb of the Saints', type: 'dungeon', lvl: 5, families: ['demon', 'skeleton', 'vampire'], aspects: { all: 'conceited' }, desc: 'The saints do not rest.' },
        { id: 'the_pit', name: 'The Pit of Artificers', type: 'dungeon', lvl: 5, families: ['demon', 'construct', 'nahantu', 'vampire'], aspects: { all: 'veteran_brawler' }, desc: 'Endless depths. Each clear is harder than the last.', pit: true },
        { id: 'harbinger_lair', name: 'Mephisto\'s Antechamber', type: 'boss', lvl: 5, boss: 'harbinger', desc: 'The Harbinger of Hatred.' },
        { id: 'lilith_lair', name: 'Echo of Hatred', type: 'boss', lvl: 5, boss: 'lilith_echo', desc: 'The ultimate challenge.', pinnacle: true },
        { id: 'capstone_fallen_temple', name: 'Fallen Temple (Capstone)', type: 'dungeon', lvl: 5, families: ['demon', 'nahantu', 'cultist'], capstone: 'capstone_torment', bossFinal: 'grigoire', desc: 'Prove yourself worthy of Torment.' },
        { id: 'horde_nh', name: 'Siege of Kurast', type: 'event', lvl: 5, desc: 'Hold the temple steps.' }
      ] })
  ];
  DATA.zoneById = {}; DATA.ZONES.forEach(z => { DATA.zoneById[z.id] = z; z.areas.forEach(a => { a.zone = z.id; }); });
  DATA.areaById = {}; DATA.ZONES.forEach(z => z.areas.forEach(a => { DATA.areaById[a.id] = a; }));

  // ---- Towns & NPCs -----------------------------------------------------------
  // Vendor roles: blacksmith (upgrade/salvage), jeweler (gems/sockets), occultist (aspects/enchant), alchemist (elixirs/potion), healer, purveyor (gamble), stable (mounts), wardrobe (cosmetics), stash, tree (whispers)
  const NPC = (id, name, role, lines, o) => Object.assign({ id, name, role, lines }, o || {});
  DATA.TOWNS = {
    kyovashad: { id: 'kyovashad', name: 'Kyovashad', zone: 'fractured_peaks', desc: 'The great walled city of the Peaks, bastion of the Cathedral of Light.',
      npcs: [
        NPC('lorath', 'Lorath Nahr', 'quest', ['The Horadrim are few now. But even few can stand against Lilith\'s return.', 'You have the look of someone who has seen too much. Good. You\'ll need it.', 'Every corpse in these mountains tells a story. Most of them end badly.']),
        NPC('neyrelle', 'Neyrelle', 'quest', ['My mother left me the Horadric texts. I intend to use them.', 'The Soulstone must not fall into Lilith\'s hands.']),
        NPC('donan', 'Donan', 'quest', ['My old horse Nell could use a rider. She\'s seen more of Sanctuary than most.', 'Take the stable. The roads are long and the nights are longer.']),
        NPC('bs_kyov', 'Zivek the Smith', 'blacksmith', ['Steel, iron, bone. I can work anything that came out of a monster.', 'Salvage what you don\'t need. The materials are worth more than the gold.']),
        NPC('jw_kyov', 'Alix the Jeweler', 'jeweler', ['Gems cut right can turn a cheap blade into a legend.', 'Sockets cost. Legends cost more.']),
        NPC('oc_kyov', 'Demyan the Occultist', 'occultist', ['Aspects are the echoes of power. I can bind them to your gear... for a price.', 'The Codex remembers every power you have claimed.']),
        NPC('al_kyov', 'Veroka the Alchemist', 'alchemist', ['Elixirs sharpen the mind and body. Herbs, gold, and I\'ll brew you anything.', 'Your potion can hold more. Let me improve it.']),
        NPC('hl_kyov', 'Sister Octavia', 'healer', ['The Light mends what the darkness breaks.', 'Rest. Your potions are refilled.']),
        NPC('pv_kyov', 'Lizveth', 'purveyor', ['Obols for a chance at greatness. Spend them wisely... or don\'t.', 'Every gamble is a prayer to fortune.']),
        NPC('st_kyov', 'Oskar the Stable Master', 'stable', ['A good horse is worth more than a good sword in these mountains.', 'Armor for your mount, trophies for your saddle.']),
        NPC('wd_kyov', 'Mirela the Tailor', 'wardrobe', ['Look the part. The dead care not, but you will.', 'Dyes, transmogs, markers. Vanity is survival here.']),
        NPC('stash_kyov', 'Stash', 'stash', ['Your belongings, safe and sound.']),
        NPC('wp_kyov', 'Waypoint', 'waypoint', [])
      ] },
    cerrigar: { id: 'cerrigar', name: 'Cerrigar', zone: 'scosglen', desc: 'The stone city of the druids, perched above the drowned coast.',
      npcs: [
        NPC('airidah', 'Airidah', 'quest', ['The spirits of Scosglen are restless. Lilith stirs them.', 'The Khazra have taken Túr Dúlra. Our college. Our history.']),
        NPC('vhenard', 'Vhenard', 'quest', ['The drowned come at high tide. Every night, more of them.']),
        NPC('bs_cerr', 'Fiona the Smith', 'blacksmith', ['Druid steel is forged in the rain.']),
        NPC('jw_cerr', 'Eamon the Jeweler', 'jeweler', ['Emeralds from the deep woods. Finest in Sanctuary.']),
        NPC('oc_cerr', 'Morrigan the Occultist', 'occultist', ['The old powers of Scosglen can be yours.']),
        NPC('al_cerr', 'Brianna the Alchemist', 'alchemist', ['Howler moss and biteberry. The forest provides.']),
        NPC('hl_cerr', 'Elder Sionnach', 'healer', ['The spirits restore you.']),
        NPC('pv_cerr', 'Keegan', 'purveyor', ['Luck of the Scosglen!']),
        NPC('st_cerr', 'Rhona the Stable Master', 'stable', ['Mountain ponies, sure-footed and fierce.']),
        NPC('wd_cerr', 'Niamh the Weaver', 'wardrobe', ['Wool, leather and bone. Druid fashion.']),
        NPC('stash_cerr', 'Stash', 'stash', ['Your belongings.']),
        NPC('wp_cerr', 'Waypoint', 'waypoint', [])
      ] },
    ked_bardu: { id: 'ked_bardu', name: 'Ked Bardu', zone: 'dry_steppes', desc: 'A trade city on the salt flats, ruled by the Oxen Gods.',
      npcs: [
        NPC('elias', 'Elias', 'quest', ['The Steppes remember the Horadrim. Not fondly.', 'Cannibals to the south, demons to the north. Pick your poison.']),
        NPC('timue', 'Timue', 'quest', ['The Oxen Gods watch. Prove yourself to them.']),
        NPC('bs_kb', 'Batu the Smith', 'blacksmith', ['Salt and iron. Hard metal for hard lands.']),
        NPC('jw_kb', 'Gerti the Jeweler', 'jeweler', ['Rubies from the canyon. Red as blood.']),
        NPC('oc_kb', 'Yorin the Occultist', 'occultist', ['The Triune left powers behind. I collect them.']),
        NPC('al_kb', 'Mahari the Alchemist', 'alchemist', ['Reddamine grows in the ash. Potent stuff.']),
        NPC('hl_kb', 'Priest of the Oxen', 'healer', ['The Oxen Gods restore you.']),
        NPC('pv_kb', 'Ulgar', 'purveyor', ['Obols, friend? The Gods love a gambler.']),
        NPC('st_kb', 'Khanduras Stable Master', 'stable', ['Steppe horses. Fast and tireless.']),
        NPC('wd_kb', 'Saba the Tailor', 'wardrobe', ['Silks from the east, leathers from the west.']),
        NPC('stash_kb', 'Stash', 'stash', ['Your belongings.']),
        NPC('wp_kb', 'Waypoint', 'waypoint', [])
      ] },
    zarbinzet: { id: 'zarbinzet', name: 'Zarbinzet', zone: 'hawezar', desc: 'A stilt-city above the swamp, home to witches and smugglers.',
      npcs: [
        NPC('taissa', 'Taissa', 'quest', ['The Tree of Whispers hungers. Bring it heads and it will reward you.', 'The swamp takes what it wants. Don\'t let it take you.']),
        NPC('tree', 'Tree of Whispers', 'tree', ['Whispers of the dead... bring us heads, wanderer.', 'The Tree remembers every debt.']),
        NPC('bs_zb', 'Hadri the Smith', 'blacksmith', ['Rust is the enemy here. I fight it daily.']),
        NPC('jw_zb', 'Peza the Jeweler', 'jeweler', ['Amethysts from the drowned caverns.']),
        NPC('oc_zb', 'Witch Vhyrna', 'occultist', ['The swamp witches know many powers.']),
        NPC('al_zb', 'Oyvind the Alchemist', 'alchemist', ['Lifesbane. Deadly if brewed wrong. Delicious if brewed right.']),
        NPC('hl_zb', 'Swamp Healer', 'healer', ['The waters cleanse.']),
        NPC('pv_zb', 'Rosza', 'purveyor', ['Mud, blood and obols.']),
        NPC('st_zb', 'Fen Stable Master', 'stable', ['Marsh-horses. They don\'t sink.']),
        NPC('wd_zb', 'Ilse the Seamstress', 'wardrobe', ['Serpent scale, bog leather. Exotic.']),
        NPC('stash_zb', 'Stash', 'stash', ['Your belongings.']),
        NPC('wp_zb', 'Waypoint', 'waypoint', [])
      ] },
    gea_kul: { id: 'gea_kul', name: 'Gea Kul', zone: 'kehjistan', desc: 'A harbor city of smugglers at the edge of the desert.',
      npcs: [
        NPC('meshif', 'Meshif', 'quest', ['The desert swallowed Caldeum. The Triune swallowed what was left.', 'Duriel sleeps beneath the crevasse. Let him sleep... or don\'t.']),
        NPC('prava', 'Prava', 'quest', ['The Cathedral of Light must stand. Prove yourself in the Capstone.']),
        NPC('bs_gk', 'Hakan the Smith', 'blacksmith', ['Desert glass and Caldeum steel.']),
        NPC('jw_gk', 'Zoltun\'s Apprentice', 'jeweler', ['Diamonds. Only diamonds matter here.']),
        NPC('oc_gk', 'Ishaq the Occultist', 'occultist', ['Caldeum\'s mage clans left powers in the sand.']),
        NPC('al_gk', 'Kasim the Alchemist', 'alchemist', ['Gallowvine grows even in the dunes.']),
        NPC('hl_gk', 'Harbor Healer', 'healer', ['The sea restores.']),
        NPC('pv_gk', 'Rakha', 'purveyor', ['Obols! Fortune favors the bold!']),
        NPC('st_gk', 'Desert Stable Master', 'stable', ['Desert-bred. Fast as the wind.']),
        NPC('wd_gk', 'Caldeum Tailor', 'wardrobe', ['Finest silks in Sanctuary.']),
        NPC('stash_gk', 'Stash', 'stash', ['Your belongings.']),
        NPC('wp_gk', 'Waypoint', 'waypoint', [])
      ] },
    kurast: { id: 'kurast', name: 'Kurast', zone: 'nahantu', desc: 'The jungle city of Nahantu, reclaimed from the Mother\'s cult.',
      npcs: [
        NPC('eru', 'Eru', 'quest', ['The spirits of Nahantu guide you. Do not disappoint them.', 'Mephisto\'s hatred seeps from the undercity. We must cut it out.']),
        NPC('akarat_mentor', 'Mentor of Akarat', 'quest', ['The Light endures even here. Prove it in the Fallen Temple.']),
        NPC('bs_ku', 'Nahantu Smith', 'blacksmith', ['Spirit-forged steel.']),
        NPC('jw_ku', 'Kurast Jeweler', 'jeweler', ['Grand gems, for those who earn them.']),
        NPC('oc_ku', 'Spirit Occultist', 'occultist', ['The ancestors share their powers.']),
        NPC('al_ku', 'Jungle Alchemist', 'alchemist', ['Every plant here kills or cures.']),
        NPC('hl_ku', 'Spirit Healer', 'healer', ['The ancestors mend you.']),
        NPC('pv_ku', 'Kurast Gambler', 'purveyor', ['Spirits and obols.']),
        NPC('st_ku', 'Jungle Stable Master', 'stable', ['Jungle-born mounts, fearless.']),
        NPC('wd_ku', 'Kurast Tailor', 'wardrobe', ['Feathers and jade.']),
        NPC('stash_ku', 'Stash', 'stash', ['Your belongings.']),
        NPC('wp_ku', 'Waypoint', 'waypoint', [])
      ] }
  };
  DATA.npcById = {}; Object.values(DATA.TOWNS).forEach(t => t.npcs.forEach(n => { n.town = t.id; DATA.npcById[n.id] = n; }));

  // ---- Quests -----------------------------------------------------------------
  // objective types: kill {family|enemy, n} | elite {n} | dungeon {id} | stronghold {id} | boss {id} | collect {mat, n} | level {n} | talk {npc} | event {id} | difficulty {id}
  // rewards: xp (multiplier of level xp), gold (mult), items [{rarity, slot?}], skillPoints, paragon, cosmetic, mount, mount_armor, mount_trophy, materials {}, potion (upgrade), obols
  const Q = (id, name, zone, giver, desc, objectives, rewards, o) => Object.assign({ id, name, zone, giver, desc, objectives, rewards }, o || {});
  DATA.QUESTS = [
    // Fractured Peaks
    Q('fp_wolves', 'Wolves at the Door', 'fractured_peaks', 'lorath', 'Lorath asks you to thin the wolves and Fallen in the Nevesk Outskirts.', [{ type: 'kill', family: 'fallen', n: 15 }, { type: 'kill', family: 'wildlife', n: 10 }], { xp: 3, gold: 2, items: [{ rarity: 'magic' }] }),
    Q('fp_donans_favor', 'Donan\'s Favor', 'fractured_peaks', 'donan', 'Donan will give you his old horse Nell if you clear the Bear Tribe Cellar.', [{ type: 'dungeon', id: 'cellar_fp' }], { xp: 2, mount: 'old_nell', gold: 1 }),
    Q('fp_hoarfrost', 'Frozen Tombs', 'fractured_peaks', 'lorath', 'Clear Hoarfrost Demise. The dead there do not rest.', [{ type: 'dungeon', id: 'hoarfrost_demise' }], { xp: 4, gold: 3, items: [{ rarity: 'rare' }], skillPoints: 1 }, { prereq: ['fp_wolves'] }),
    Q('fp_pilgrims', 'Bandit Toll', 'fractured_peaks', 'lorath', 'Bandits hold Pilgrim\'s Road. Kill their captains.', [{ type: 'kill', enemy: 'bandit_captain', n: 3 }, { type: 'kill', family: 'bandit', n: 25 }], { xp: 4, gold: 3, items: [{ rarity: 'rare' }] }),
    Q('fp_malnok', 'The Khazra of Malnok', 'fractured_peaks', 'lorath', 'Reclaim the stronghold of Malnok from the Khazra.', [{ type: 'stronghold', id: 'malnok' }], { xp: 6, gold: 4, items: [{ rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['fp_hoarfrost'] }),
    Q('fp_kor_dragan', 'Blood of Kor Dragan', 'fractured_peaks', 'neyrelle', 'Vampires rule Kor Dragan. Purge the fortress.', [{ type: 'stronghold', id: 'kor_dragan' }], { xp: 8, gold: 5, items: [{ rarity: 'legendary' }], paragon: 2 }, { prereq: ['fp_malnok'] }),
    Q('fp_xfal', 'The Scarred Baron', 'fractured_peaks', 'lorath', 'X\'Fal commands the Fallen of the Peaks. End him.', [{ type: 'boss', id: 'xfal' }], { xp: 10, gold: 6, items: [{ rarity: 'legendary' }], skillPoints: 1, cosmetic: 'baron_pauldrons' }, { prereq: ['fp_malnok'] }),
    Q('fp_gaspar', 'Bandit King', 'fractured_peaks', 'neyrelle', 'Gaspar Stilbian\'s bandits bleed the Peaks dry.', [{ type: 'boss', id: 'gaspar' }], { xp: 12, gold: 8, items: [{ rarity: 'legendary' }], mount_trophy: 'bandit_skull' }, { prereq: ['fp_pilgrims'] }),
    Q('fp_siege', 'Siege of Nevesk', 'fractured_peaks', 'lorath', 'Hold the village against the Fallen horde.', [{ type: 'event', id: 'horde_fp' }], { xp: 6, gold: 4, obols: 50 }),
    Q('fp_herbs', 'Veroka\'s Garden', 'fractured_peaks', 'al_kyov', 'Gather herbs for the Alchemist.', [{ type: 'collect', mat: 'gallowvine', n: 10 }, { type: 'collect', mat: 'biteberry', n: 5 }], { xp: 2, gold: 2, potion: true }),
    // Scosglen
    Q('sc_drowned', 'High Tide', 'scosglen', 'vhenard', 'The drowned swarm Braestaig Coast. Push them back.', [{ type: 'kill', family: 'drowned', n: 30 }], { xp: 3, gold: 2, items: [{ rarity: 'rare' }] }),
    Q('sc_spiders', 'Webs in the Pines', 'scosglen', 'airidah', 'Clear the spiders from Whispering Pines.', [{ type: 'dungeon', id: 'whispering_pines' }], { xp: 4, gold: 3, items: [{ rarity: 'rare' }], skillPoints: 1 }),
    Q('sc_mariners', 'Shipwrecked', 'scosglen', 'vhenard', 'Something stirs in the Mariner\'s Refuge.', [{ type: 'dungeon', id: 'mariners_refuge' }], { xp: 5, gold: 3, items: [{ rarity: 'legendary' }] }, { prereq: ['sc_drowned'] }),
    Q('sc_tur_dulra', 'The Druid College', 'scosglen', 'airidah', 'Reclaim Túr Dúlra from the Khazra.', [{ type: 'stronghold', id: 'tur_dulra' }], { xp: 8, gold: 5, items: [{ rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['sc_spiders'] }),
    Q('sc_hopes_light', 'Hope\'s Light', 'scosglen', 'vhenard', 'The lighthouse at Hope\'s Light has gone dark.', [{ type: 'stronghold', id: 'moordaine_stronghold' }], { xp: 7, gold: 5, items: [{ rarity: 'legendary' }], paragon: 2 }, { prereq: ['sc_mariners'] }),
    Q('sc_ashava', 'The Pestilent', 'scosglen', 'airidah', 'Ashava rises at Caen Adar. Slay the world boss.', [{ type: 'boss', id: 'ashava' }], { xp: 14, gold: 10, items: [{ rarity: 'legendary' }, { rarity: 'legendary' }], cosmetic: 'ashava_hide', skillPoints: 1 }, { prereq: ['sc_tur_dulra'] }),
    Q('sc_butcher', 'Fresh Meat', 'scosglen', 'airidah', 'The Butcher stalks the woods. Hunt the hunter.', [{ type: 'boss', id: 'butcher' }], { xp: 10, gold: 6, items: [{ rarity: 'legendary' }], mount_trophy: 'butcher_cleaver' }),
    Q('sc_elites', 'Champions of the Wild', 'scosglen', 'airidah', 'Slay 12 Elite monsters in Scosglen.', [{ type: 'elite', n: 12 }], { xp: 6, gold: 4, obols: 80 }),
    Q('sc_siege', 'Siege of Cerrigar', 'scosglen', 'vhenard', 'Hold the gates.', [{ type: 'event', id: 'horde_sc' }], { xp: 6, gold: 4, obols: 50 }),
    // Dry Steppes
    Q('ds_cannibals', 'A Taste for Flesh', 'dry_steppes', 'elias', 'Cannibals raid the caravans. Kill their brutes.', [{ type: 'kill', family: 'cannibal', n: 40 }, { type: 'kill', enemy: 'cannibal_brute', n: 3 }], { xp: 4, gold: 3, items: [{ rarity: 'rare' }] }),
    Q('ds_charnel', 'The Larder', 'dry_steppes', 'elias', 'Burn the Charnel House.', [{ type: 'dungeon', id: 'charnel_house' }], { xp: 5, gold: 3, items: [{ rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['ds_cannibals'] }),
    Q('ds_shivta', 'Ruins of Shivta', 'dry_steppes', 'timue', 'Constructs guard the ruins. Study them... by destroying them.', [{ type: 'dungeon', id: 'shivta_ruins' }], { xp: 6, gold: 4, items: [{ rarity: 'legendary' }] }),
    Q('ds_temple', 'Temple of Rot', 'dry_steppes', 'elias', 'Varshan\'s cult festers in the Temple of Rot.', [{ type: 'stronghold', id: 'temple_of_rot' }], { xp: 9, gold: 6, items: [{ rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['ds_charnel'] }),
    Q('ds_alcarnus', 'Raiders of Alcarnus', 'dry_steppes', 'timue', 'Free Alcarnus.', [{ type: 'stronghold', id: 'alcarnus' }], { xp: 8, gold: 5, items: [{ rarity: 'legendary' }], paragon: 2 }),
    Q('ds_varshan', 'The Malignant Heart', 'dry_steppes', 'elias', 'Slay the Echo of Varshan.', [{ type: 'boss', id: 'varshan' }], { xp: 14, gold: 10, items: [{ rarity: 'legendary' }, { rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['ds_temple'] }),
    Q('ds_grigoire', 'Galvanic Saint', 'dry_steppes', 'timue', 'Grigoire awaits in the Hall of the Penitent.', [{ type: 'boss', id: 'grigoire' }], { xp: 16, gold: 12, items: [{ rarity: 'legendary' }, { rarity: 'unique' }], cosmetic: 'galvanic_plate' }, { prereq: ['ds_varshan'] }),
    Q('ds_siege', 'Siege of Ked Bardu', 'dry_steppes', 'timue', 'Hold the walls.', [{ type: 'event', id: 'horde_ds' }], { xp: 6, gold: 4, obols: 60 }),
    // Hawezar
    Q('hz_snakes', 'Serpents in the Reeds', 'hawezar', 'taissa', 'The Nangari infest the wetlands.', [{ type: 'kill', family: 'nangari', n: 40 }], { xp: 4, gold: 3, items: [{ rarity: 'rare' }] }),
    Q('hz_whispers', 'The Tree Hungers', 'hawezar', 'tree', 'Complete 3 Whispers for the Tree.', [{ type: 'whispers', n: 3 }], { xp: 6, gold: 4, items: [{ rarity: 'legendary' }], obols: 100 }),
    Q('hz_witchwater', 'Witchwater', 'hawezar', 'taissa', 'Witches brew in Witchwater. Stop them.', [{ type: 'dungeon', id: 'witchwater' }], { xp: 6, gold: 4, items: [{ rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['hz_snakes'] }),
    Q('hz_vyeresz', 'Serpent Cult', 'hawezar', 'taissa', 'Reclaim Vyeresz.', [{ type: 'stronghold', id: 'vyeresz' }], { xp: 10, gold: 7, items: [{ rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['hz_witchwater'] }),
    Q('hz_crusaders', 'Crusader\'s Monument', 'hawezar', 'taissa', 'Lay the crusaders to rest.', [{ type: 'stronghold', id: 'crusaders_monument' }], { xp: 9, gold: 6, items: [{ rarity: 'legendary' }], paragon: 2 }),
    Q('hz_beast', 'The Beast in the Ice', 'hawezar', 'taissa', 'Something ancient stirs beneath the glacier.', [{ type: 'boss', id: 'beast_in_ice' }], { xp: 16, gold: 12, items: [{ rarity: 'legendary' }, { rarity: 'unique' }], skillPoints: 1 }, { prereq: ['hz_vyeresz'] }),
    Q('hz_zir', 'The Dark Master', 'hawezar', 'tree', 'Lord Zir holds court in the Darkened Way.', [{ type: 'boss', id: 'lord_zir' }], { xp: 18, gold: 14, items: [{ rarity: 'legendary' }, { rarity: 'unique' }], mount_armor: 'blood_barding' }, { prereq: ['hz_beast'] }),
    Q('hz_siege', 'Siege of Zarbinzet', 'hawezar', 'taissa', 'Hold the stilts.', [{ type: 'event', id: 'horde_hz' }], { xp: 7, gold: 5, obols: 60 }),
    // Kehjistan
    Q('kj_sands', 'Sand and Bone', 'kehjistan', 'meshif', 'The dunes crawl with the dead.', [{ type: 'kill', family: 'skeleton', n: 40 }, { type: 'kill', family: 'fallen', n: 30 }], { xp: 5, gold: 4, items: [{ rarity: 'rare' }] }),
    Q('kj_library', 'Drowned Knowledge', 'kehjistan', 'meshif', 'Explore the Sunken Library.', [{ type: 'dungeon', id: 'sunken_library' }], { xp: 7, gold: 5, items: [{ rarity: 'legendary' }], skillPoints: 1 }),
    Q('kj_omath', 'Omath\'s Redoubt', 'kehjistan', 'prava', 'Break the Triune fortress.', [{ type: 'stronghold', id: 'omath_redoubt' }], { xp: 12, gold: 8, items: [{ rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['kj_library'] }),
    Q('kj_altar', 'Altar of Ruin', 'kehjistan', 'meshif', 'Blood rites in the sand.', [{ type: 'stronghold', id: 'altar_of_ruin' }], { xp: 10, gold: 7, items: [{ rarity: 'legendary' }], paragon: 2 }),
    Q('capstone_penitent', 'Cathedral of Light', 'kehjistan', 'prava', 'Prove your worth in the Capstone dungeon to unlock Penitent difficulty.', [{ type: 'level', n: 50 }, { type: 'dungeon', id: 'capstone_cathedral' }], { xp: 20, gold: 15, items: [{ rarity: 'legendary' }, { rarity: 'legendary' }], skillPoints: 2, cosmetic: 'penitent_halo' }, { prereq: ['kj_omath'] }),
    Q('kj_duriel', 'King of Maggots', 'kehjistan', 'meshif', 'Duriel sleeps beneath the crevasse.', [{ type: 'boss', id: 'duriel' }], { xp: 22, gold: 16, items: [{ rarity: 'unique' }, { rarity: 'legendary' }], skillPoints: 1 }, { prereq: ['kj_omath'] }),
    Q('kj_andariel', 'Maiden of Anguish', 'kehjistan', 'prava', 'Andariel has returned.', [{ type: 'boss', id: 'andariel' }], { xp: 24, gold: 18, items: [{ rarity: 'unique' }, { rarity: 'legendary' }], mount: 'pale_horse' }, { prereq: ['kj_duriel'] }),
    Q('kj_siege', 'Siege of Gea Kul', 'kehjistan', 'meshif', 'Hold the harbor.', [{ type: 'event', id: 'horde_kj' }], { xp: 8, gold: 6, obols: 80 }),
    // Nahantu
    Q('nh_zealots', 'The Mother\'s Children', 'nahantu', 'eru', 'Zealots of the Mother roam Teganze.', [{ type: 'kill', family: 'nahantu', n: 50 }], { xp: 6, gold: 5, items: [{ rarity: 'legendary' }] }),
    Q('nh_undercity', 'Into the Undercity', 'nahantu', 'eru', 'Clear the Kurast Undercity.', [{ type: 'dungeon', id: 'kurast_undercity' }], { xp: 9, gold: 6, items: [{ rarity: 'legendary' }], skillPoints: 1 }),
    Q('nh_spirits', 'Hall of Spirits', 'nahantu', 'eru', 'The ancestors call.', [{ type: 'dungeon', id: 'spirit_pass' }], { xp: 10, gold: 7, items: [{ rarity: 'legendary' }], paragon: 3 }, { prereq: ['nh_undercity'] }),
    Q('capstone_torment', 'The Fallen Temple', 'nahantu', 'akarat_mentor', 'Prove your worth to unlock Torment difficulties.', [{ type: 'level', n: 60 }, { type: 'dungeon', id: 'capstone_fallen_temple' }], { xp: 25, gold: 20, items: [{ rarity: 'legendary' }, { rarity: 'legendary' }], paragon: 5, cosmetic: 'torment_wings' }, { prereq: ['nh_spirits'] }),
    Q('nh_harbinger', 'Harbinger of Hatred', 'nahantu', 'eru', 'Face Mephisto\'s herald.', [{ type: 'boss', id: 'harbinger' }], { xp: 30, gold: 25, items: [{ rarity: 'unique' }, { rarity: 'legendary' }], mount: 'hatred_steed', paragon: 5 }, { prereq: ['capstone_torment'] }),
    Q('nh_lilith', 'Echo of Hatred', 'nahantu', 'eru', 'The pinnacle challenge: defeat the Echo of Lilith.', [{ type: 'boss', id: 'lilith_echo' }], { xp: 40, gold: 40, items: [{ rarity: 'mythic' }], cosmetic: 'lilith_crown', mount_trophy: 'lilith_petals', paragon: 10 }, { prereq: ['nh_harbinger'] }),
    Q('nh_pit', 'The Pit', 'nahantu', 'akarat_mentor', 'Clear The Pit of Artificers three times.', [{ type: 'dungeon', id: 'the_pit', n: 3 }], { xp: 20, gold: 15, items: [{ rarity: 'legendary' }], paragon: 4 }, { prereq: ['capstone_torment'] }),
    // Account-wide milestones
    Q('m_level10', 'Growing Stronger', 'any', null, 'Reach level 10.', [{ type: 'level', n: 10 }], { xp: 2, skillPoints: 1, gold: 2 }, { milestone: true }),
    Q('m_level25', 'Seasoned', 'any', null, 'Reach level 25.', [{ type: 'level', n: 25 }], { xp: 2, skillPoints: 1, gold: 3, cosmetic: 'veteran_sash' }, { milestone: true }),
    Q('m_level40', 'Veteran', 'any', null, 'Reach level 40.', [{ type: 'level', n: 40 }], { xp: 2, skillPoints: 1, gold: 4, mount_armor: 'veteran_barding' }, { milestone: true }),
    Q('m_level60', 'Ascended', 'any', null, 'Reach level 60.', [{ type: 'level', n: 60 }], { xp: 1, skillPoints: 1, gold: 5, cosmetic: 'ascended_aura', paragon: 5 }, { milestone: true }),
    Q('m_elites100', 'Elite Hunter', 'any', null, 'Slay 100 Elites.', [{ type: 'elite', n: 100 }], { gold: 10, mount_trophy: 'elite_hunter_banner', obols: 200 }, { milestone: true }),
    Q('m_dungeons10', 'Delver', 'any', null, 'Complete 10 dungeons.', [{ type: 'dungeons_total', n: 10 }], { gold: 8, skillPoints: 1, cosmetic: 'delver_hood' }, { milestone: true })
  ];
  DATA.questById = {}; DATA.QUESTS.forEach(q => { DATA.questById[q.id] = q; });

  // Whisper (bounty) templates — Tree of Whispers. Generated against the current zone.
  DATA.WHISPER_TEMPLATES = [
    { id: 'w_kill', name: 'Cull the {family}', type: 'kill', n: [25, 60], grim: 1 },
    { id: 'w_elite', name: 'Champion\'s Blood', type: 'elite', n: [3, 8], grim: 2 },
    { id: 'w_dungeon', name: 'Delve: {area}', type: 'dungeon', grim: 3 },
    { id: 'w_cellar', name: 'Cellar Sweep', type: 'cellar', grim: 1 },
    { id: 'w_event', name: 'Hold the Line', type: 'event', grim: 3 },
    { id: 'w_boss', name: 'Head of {boss}', type: 'boss', grim: 5 }
  ];

  // ---- Cosmetics --------------------------------------------------------------
  // Transmogs: {id, name, slot, style (visual descriptor used for drawing: color/shape), unlock: {type:'default'|'gold'|'quest'|'level'|'stronghold'|'salvage'|'drop', ...}}
  const CO = (id, name, slot, color, unlock, o) => Object.assign({ id, name, slot, color, unlock }, o || {});
  DATA.COSMETICS = [
    CO('plain_helm', 'Traveler\'s Hood', 'helm', '#6a5a4a', { type: 'default' }), CO('iron_helm', 'Iron Sallet', 'helm', '#8a9098', { type: 'gold', cost: 2500 }), CO('bone_crown', 'Crown of Bone', 'helm', '#e8e2d0', { type: 'gold', cost: 6000 }),
    CO('delver_hood', 'Delver\'s Hood', 'helm', '#3a4a6a', { type: 'quest' }), CO('penitent_halo', 'Penitent Halo', 'helm', '#ffe55c', { type: 'quest' }), CO('lilith_crown', 'Crown of Hatred', 'helm', '#b36cff', { type: 'quest' }), CO('rot_mask', 'Mask of Rot', 'helm', '#6f8a5a', { type: 'stronghold' }),
    CO('plain_chest', 'Traveler\'s Coat', 'chest', '#5a4a3a', { type: 'default' }), CO('iron_plate', 'Iron Breastplate', 'chest', '#8a9098', { type: 'gold', cost: 4000 }), CO('shadow_robe', 'Robe of Shadows', 'chest', '#2a1a3a', { type: 'gold', cost: 8000 }),
    CO('galvanic_plate', 'Galvanic Plate', 'chest', '#ffe55c', { type: 'quest' }), CO('ashava_hide', 'Ashava\'s Hide', 'chest', '#4a8a3a', { type: 'quest' }), CO('tur_dulra_cloak', 'Cloak of Túr Dúlra', 'chest', '#2d4330', { type: 'stronghold' }), CO('serpent_scale_armor', 'Serpent Scale', 'chest', '#4a8a4a', { type: 'stronghold' }), CO('triune_vestments', 'Triune Vestments', 'chest', '#8a2a6a', { type: 'stronghold' }),
    CO('torment_wings', 'Wings of Torment', 'back', '#ff8c1a', { type: 'quest' }), CO('ascended_aura', 'Ascended Aura', 'back', '#fff2a6', { type: 'quest' }), CO('kor_dragan_sigil', 'Sigil of Kor Dragan', 'back', '#8a1a2a', { type: 'stronghold' }), CO('veteran_sash', 'Veteran\'s Sash', 'back', '#c9a86a', { type: 'quest' }), CO('baron_pauldrons', 'Baron\'s Pauldrons', 'back', '#c0583a', { type: 'quest' }),
    CO('plain_gloves', 'Traveler\'s Gloves', 'gloves', '#6a5a4a', { type: 'default' }), CO('iron_gauntlets', 'Iron Gauntlets', 'gloves', '#8a9098', { type: 'gold', cost: 1500 }), CO('ember_grips', 'Ember Grips', 'gloves', '#ff7a2a', { type: 'gold', cost: 5000 }),
    CO('plain_boots', 'Traveler\'s Boots', 'boots', '#4a3a2a', { type: 'default' }), CO('iron_sabatons', 'Iron Sabatons', 'boots', '#8a9098', { type: 'gold', cost: 1500 }), CO('frost_treads', 'Frost Treads', 'boots', '#7fd6ff', { type: 'gold', cost: 5000 }),
    CO('wpn_plain', 'Standard Weapon', 'weapon', null, { type: 'default' }), CO('wpn_ember', 'Ember Weapon Glow', 'weapon', '#ff7a2a', { type: 'gold', cost: 7000 }), CO('wpn_frost', 'Frost Weapon Glow', 'weapon', '#7fd6ff', { type: 'gold', cost: 7000 }), CO('wpn_shadow', 'Shadow Weapon Glow', 'weapon', '#b36cff', { type: 'gold', cost: 7000 }), CO('wpn_holy', 'Holy Weapon Glow', 'weapon', '#fff2a6', { type: 'level', level: 40 })
  ];
  DATA.cosmeticById = {}; DATA.COSMETICS.forEach(c => { DATA.cosmeticById[c.id] = c; });
  DATA.DYES = [
    { id: 'none', name: 'No Dye', color: null, unlock: { type: 'default' } }, { id: 'crimson', name: 'Crimson Dye', color: '#b02020', unlock: { type: 'gold', cost: 800 } }, { id: 'ivory', name: 'Ivory Dye', color: '#e8e2d0', unlock: { type: 'gold', cost: 800 } },
    { id: 'onyx', name: 'Onyx Dye', color: '#1a1a1a', unlock: { type: 'gold', cost: 800 } }, { id: 'azure', name: 'Azure Dye', color: '#2a5aa0', unlock: { type: 'gold', cost: 800 } }, { id: 'emerald', name: 'Emerald Dye', color: '#2a8a4a', unlock: { type: 'gold', cost: 800 } },
    { id: 'gold', name: 'Gilded Dye', color: '#d0a040', unlock: { type: 'gold', cost: 2000 } }, { id: 'violet', name: 'Violet Dye', color: '#7a3aa0', unlock: { type: 'gold', cost: 2000 } }, { id: 'bone', name: 'Bone Dye', color: '#cfc8b8', unlock: { type: 'level', level: 20 } }, { id: 'hellfire', name: 'Hellfire Dye', color: '#ff4a1a', unlock: { type: 'level', level: 50 } }
  ];
  DATA.MARKERS = [
    { id: 'none', name: 'No Marker', unlock: { type: 'default' } }, { id: 'horadric', name: 'Horadric Sigil', glyph: '✦', unlock: { type: 'gold', cost: 1500 } }, { id: 'skull', name: 'Skull Marker', glyph: '☠', unlock: { type: 'gold', cost: 1500 } },
    { id: 'flame', name: 'Flame Marker', glyph: '🔥', unlock: { type: 'level', level: 30 } }, { id: 'crown', name: 'Crown of Sanctuary', glyph: '👑', unlock: { type: 'quest', quest: 'nh_lilith' } }
  ];
  DATA.TITLES = [
    { id: 'none', name: 'No Title', unlock: { type: 'default' } }, { id: 'wanderer', name: 'the Wanderer', unlock: { type: 'default' } }, { id: 'slayer', name: 'the Slayer', unlock: { type: 'kills', n: 1000 } },
    { id: 'delver', name: 'the Delver', unlock: { type: 'quest', quest: 'm_dungeons10' } }, { id: 'penitent', name: 'the Penitent', unlock: { type: 'quest', quest: 'capstone_penitent' } }, { id: 'tormented', name: 'the Tormented', unlock: { type: 'quest', quest: 'capstone_torment' } },
    { id: 'lilithbane', name: 'Lilithbane', unlock: { type: 'quest', quest: 'nh_lilith' } }, { id: 'elite_hunter', name: 'Elite Hunter', unlock: { type: 'quest', quest: 'm_elites100' } }
  ];

  // ---- Mounts -----------------------------------------------------------------
  DATA.MOUNTS = [
    { id: 'old_nell', name: 'Old Nell', color: '#8a6a4a', mane: '#3a2a1a', speed: 1.0, spurs: 3, desc: 'Donan\'s faithful old mare. Slow but steady.', unlock: { type: 'quest' } },
    { id: 'mustang', name: 'Steppe Mustang', color: '#b08a5a', mane: '#5a3a1a', speed: 1.1, spurs: 3, desc: 'A hardy horse of the Dry Steppes.', unlock: { type: 'gold', cost: 12000 } },
    { id: 'dark_bay', name: 'Dark Bay', color: '#3a2a1a', mane: '#1a1a1a', speed: 1.15, spurs: 3, desc: 'A sleek dark horse.', unlock: { type: 'gold', cost: 25000 } },
    { id: 'spectral_charger', name: 'Spectral Charger', color: '#9ac0d0', mane: '#e8f6ff', speed: 1.2, spurs: 4, desc: 'A ghostly steed from Hope\'s Light.', unlock: { type: 'stronghold' }, glow: '#9ac0d0' },
    { id: 'cold_iron_steed', name: 'Cold Iron Steed', color: '#6a7a8a', mane: '#d0d6e0', speed: 1.25, spurs: 4, desc: 'Armored in cold iron.', unlock: { type: 'stronghold' } },
    { id: 'pale_horse', name: 'Pale Horse', color: '#e8e2d0', mane: '#cfc8b8', speed: 1.3, spurs: 4, desc: 'Death\'s own mount.', unlock: { type: 'quest' }, glow: '#cfc8b8' },
    { id: 'hatred_steed', name: 'Steed of Hatred', color: '#2a1a2a', mane: '#b36cff', speed: 1.35, spurs: 5, desc: 'Mephisto\'s gift.', unlock: { type: 'quest' }, glow: '#b36cff' },
    { id: 'temptation', name: 'Temptation', color: '#5a1020', mane: '#ff4a6a', speed: 1.4, spurs: 5, desc: 'Lilith\'s blood-red mount. Drops from the Echo of Lilith.', unlock: { type: 'drop' }, glow: '#ff4a6a' }
  ];
  DATA.mountById = {}; DATA.MOUNTS.forEach(m => { DATA.mountById[m.id] = m; });
  DATA.MOUNT_ARMOR = [
    { id: 'none', name: 'No Armor', unlock: { type: 'default' } }, { id: 'leather_barding', name: 'Leather Barding', color: '#6a4a2a', unlock: { type: 'gold', cost: 3000 }, mods: [{ stat: 'mount_speed', add: 0.02 }] },
    { id: 'steppes_barding', name: 'Steppes Barding', color: '#b08a5a', unlock: { type: 'stronghold' }, mods: [{ stat: 'mount_speed', add: 0.04 }] }, { id: 'veteran_barding', name: 'Veteran\'s Barding', color: '#c9a86a', unlock: { type: 'quest' }, mods: [{ stat: 'mount_speed', add: 0.05 }] },
    { id: 'blood_barding', name: 'Blood Barding', color: '#8a1a2a', unlock: { type: 'quest' }, mods: [{ stat: 'mount_speed', add: 0.06 }, { stat: 'dmg_mount', add: 0.2 }] }, { id: 'iron_barding', name: 'Iron Barding', color: '#8a9098', unlock: { type: 'gold', cost: 15000 }, mods: [{ stat: 'mount_spur', add: 1 }] }
  ];
  DATA.MOUNT_TROPHIES = [
    { id: 'none', name: 'No Trophy', unlock: { type: 'default' } }, { id: 'khazra_horn', name: 'Khazra Horn', unlock: { type: 'stronghold' } }, { id: 'bandit_skull', name: 'Bandit King\'s Skull', unlock: { type: 'quest' } },
    { id: 'butcher_cleaver', name: 'Butcher\'s Cleaver', unlock: { type: 'quest' } }, { id: 'crusader_banner', name: 'Crusader Banner', unlock: { type: 'stronghold' } }, { id: 'elite_hunter_banner', name: 'Elite Hunter Banner', unlock: { type: 'quest' } },
    { id: 'lilith_petals', name: 'Petals of Hatred', unlock: { type: 'quest' } }, { id: 'lantern', name: 'Traveler\'s Lantern', unlock: { type: 'gold', cost: 2000 } }
  ];

  // ---- Paragon ----------------------------------------------------------------
  // Boards are 9x9 grids generated from a template: start node, normal nodes (+5 core stat), magic nodes (bigger bonus), rare nodes (named, with bonus),
  // one legendary node per board (except the starting board), one glyph socket per board, and a gate on each edge to attach the next board.
  DATA.PARAGON = {
    boards: {
      necromancer: [
        { id: 'start', name: 'Starting Board', rare: [{ name: 'Fruition', mods: [{ stat: 'dmg_vs_vuln', add: 0.1 }, { stat: 'int', add: 10 }] }, { name: 'Harmony', mods: [{ stat: 'life_pct', add: 0.05 }, { stat: 'will', add: 10 }] }] },
        { id: 'bone_graft', name: 'Bone Graft', legendary: { name: 'Bone Graft', desc: 'Bone skills deal 20% increased damage and Lucky Hit: 15% chance to restore 10 Essence.', mods: [{ stat: 'dmg_bone', add: 0.2 }, { on: 'lucky', tag: 'bone', chance: 0.15, do: { gain: 'resource', amt: 10 } }] }, rare: [{ name: 'Essence', mods: [{ stat: 'max_resource', add: 10 }, { stat: 'resource_gen', add: 0.05 }] }, { name: 'Splinter', mods: [{ stat: 'crit_dmg', add: 0.15 }] }] },
        { id: 'bloodbath', name: 'Bloodbath', legendary: { name: 'Bloodbath', desc: 'Blood skills deal 20% increased Overpower damage and Blood Orbs heal 50% more.', mods: [{ stat: 'overpower_dmg', add: 0.2 }, { stat: 'dmg_blood', add: 0.15 }, { flag: 'orb_heal', v: 0.5 }] }, rare: [{ name: 'Sanguine', mods: [{ stat: 'life_pct', add: 0.08 }] }, { name: 'Drain', mods: [{ stat: 'life_on_hit', add: 3, scaleLevel: true }] }] },
        { id: 'cult_leader', name: 'Cult Leader', legendary: { name: 'Cult Leader', desc: 'Minions deal 30% increased damage and you gain 10% Damage Reduction while you have 5+ Minions.', mods: [{ stat: 'dmg_summon', add: 0.3 }, { flag: 'hardened_bones', v: 0.1 }] }, rare: [{ name: 'Commander', mods: [{ stat: 'minion_life', add: 0.2 }] }, { name: 'Legion', mods: [{ stat: 'minion_attack_speed', add: 0.1 }] }] },
        { id: 'flesh_eater', name: 'Flesh-eater', legendary: { name: 'Flesh-eater', desc: 'After consuming a Corpse, deal 20% increased damage for 6 seconds.', mods: [{ on: 'corpse_consume', do: { buff: { id: 'flesheater', dur: 6, mods: [{ stat: 'dmg', add: 0.2 }] } } }] }, rare: [{ name: 'Carrion', mods: [{ stat: 'dmg_dark', add: 0.15 }] }, { name: 'Gloom', mods: [{ stat: 'dmg_shadow', add: 0.12 }] }] },
        { id: 'wither', name: 'Wither', legendary: { name: 'Wither', desc: 'Shadow damage over time deals 25% increased damage. Cursed enemies take 10% more damage.', mods: [{ stat: 'dmg_dot', add: 0.25 }, { stat: 'dmg_curse', add: 0.1 }] }, rare: [{ name: 'Decay', mods: [{ stat: 'dmg_shadow', add: 0.15 }] }, { name: 'Hex', mods: [{ stat: 'dmg_vs_slowed', add: 0.12 }] }] }
      ],
      paladin: [
        { id: 'start', name: 'Starting Board', rare: [{ name: 'Zeal', mods: [{ stat: 'attack_speed', add: 0.06 }, { stat: 'str', add: 10 }] }, { name: 'Faith', mods: [{ stat: 'life_pct', add: 0.05 }, { stat: 'will', add: 10 }] }] },
        { id: 'holy_light', name: 'Holy Light', legendary: { name: 'Holy Light', desc: 'Holy damage increased by 25%. Holy skills heal 1% Life on Critical Strike.', mods: [{ stat: 'dmg_holy', add: 0.25 }, { on: 'crit', element: 'holy', do: { heal: 0.01 } }] }, rare: [{ name: 'Radiance', mods: [{ stat: 'crit_chance', add: 0.05 }] }, { name: 'Zeal', mods: [{ stat: 'dmg_core', add: 0.12 }] }] },
        { id: 'bastion', name: 'Bastion', legendary: { name: 'Bastion', desc: 'Block Chance increased by 15% and blocking heals 2% Life.', mods: [{ stat: 'block_chance', add: 0.15 }, { flag: 'block_heal', v: 0.02 }] }, rare: [{ name: 'Wall', mods: [{ stat: 'armor_pct', add: 0.15 }] }, { name: 'Resolve', mods: [{ stat: 'dr_fortified', add: 0.08 }] }] },
        { id: 'conviction', name: 'Conviction', legendary: { name: 'Conviction', desc: 'Your active Aura is 40% stronger.', mods: [{ flag: 'aura_mastery', v: 0.4 }] }, rare: [{ name: 'Devotion', mods: [{ stat: 'resource_gen', add: 0.1 }] }, { name: 'Prayer', mods: [{ stat: 'healing', add: 0.1 }] }] },
        { id: 'judgement', name: 'Judgement', legendary: { name: 'Judgement', desc: 'Damage to Crowd Controlled enemies increased by 30%. Stuns last 20% longer.', mods: [{ stat: 'dmg_vs_cc', add: 0.3 }, { stat: 'cc_duration', add: 0.2 }] }, rare: [{ name: 'Verdict', mods: [{ stat: 'crit_dmg', add: 0.15 }] }, { name: 'Wrath', mods: [{ stat: 'dmg_vs_elite', add: 0.1 }] }] },
        { id: 'crusade', name: 'Crusade', legendary: { name: 'Crusade', desc: 'Core skills deal 20% increased damage and cost 15% less Faith.', mods: [{ stat: 'dmg_core', add: 0.2 }, { stat: 'resource_cost_red', add: 0.15 }] }, rare: [{ name: 'March', mods: [{ stat: 'move_speed', add: 0.08 }] }, { name: 'Banner', mods: [{ stat: 'dmg', add: 0.1 }] }] }
      ],
      barbarian: [
        { id: 'start', name: 'Starting Board', rare: [{ name: 'Hubris', mods: [{ stat: 'crit_dmg', add: 0.15 }, { stat: 'str', add: 10 }] }, { name: 'Prime', mods: [{ stat: 'life_pct', add: 0.05 }, { stat: 'will', add: 10 }] }] },
        { id: 'blood_rage', name: 'Blood Rage', legendary: { name: 'Blood Rage', desc: 'Berserking grants 25% increased damage and 10% Attack Speed.', mods: [{ stat: 'dmg_berserk', add: 0.25 }, { stat: 'attack_speed', add: 0.1, when: 'self_berserk' }] }, rare: [{ name: 'Rage', mods: [{ stat: 'dmg', add: 0.1 }] }, { name: 'Fury', mods: [{ stat: 'resource_gen', add: 0.1 }] }] },
        { id: 'bone_breaker', name: 'Bone Breaker', legendary: { name: 'Bone Breaker', desc: 'Overpower damage increased by 40%. Every 12 seconds your next skill Overpowers.', mods: [{ stat: 'overpower_dmg', add: 0.4 }, { flag: 'periodic_overpower', v: 12 }] }, rare: [{ name: 'Crush', mods: [{ stat: 'dmg_vs_stunned', add: 0.15 }] }, { name: 'Smash', mods: [{ stat: 'dmg_core', add: 0.12 }] }] },
        { id: 'carnage', name: 'Carnage', legendary: { name: 'Carnage', desc: 'Killing an enemy grants 5% increased damage for 5 seconds, up to 25%.', mods: [{ on: 'kill', do: { buff: { id: 'carnage', dur: 5, stackMax: 5, mods: [{ stat: 'dmg', add: 0.05 }] } } }] }, rare: [{ name: 'Slaughter', mods: [{ stat: 'dmg_vs_injured', add: 0.15 }] }, { name: 'Gore', mods: [{ stat: 'dmg_bleed', add: 0.15 }] }] },
        { id: 'flawless_technique', name: 'Flawless Technique', legendary: { name: 'Flawless Technique', desc: 'Weapon Mastery skills deal 25% increased damage and have 15% Cooldown Reduction.', mods: [{ stat: 'dmg_mastery', add: 0.25 }, { stat: 'cdr', add: 0.15 }] }, rare: [{ name: 'Precision', mods: [{ stat: 'crit_chance', add: 0.05 }] }, { name: 'Arsenal', mods: [{ stat: 'attack_speed', add: 0.06 }] }] },
        { id: 'warbringer', name: 'Warbringer', legendary: { name: 'Warbringer', desc: 'Fortify for 10% of Maximum Life when you cast a Shout. Damage increased by 10% while Fortified.', mods: [{ on: 'cast', tag: 'shout', do: { fortify: 0.1 } }, { stat: 'dmg', add: 0.1, when: 'self_fortified' }] }, rare: [{ name: 'Bulwark', mods: [{ stat: 'armor_pct', add: 0.15 }] }, { name: 'Vigor', mods: [{ stat: 'life_pct', add: 0.08 }] }] }
      ],
      druid: [
        { id: 'start', name: 'Starting Board', rare: [{ name: 'Wilds', mods: [{ stat: 'dmg', add: 0.08 }, { stat: 'will', add: 10 }] }, { name: 'Fang', mods: [{ stat: 'crit_chance', add: 0.04 }, { stat: 'dex', add: 10 }] }] },
        { id: 'thunderstruck', name: 'Thunderstruck', legendary: { name: 'Thunderstruck', desc: 'Storm skills deal 25% increased damage. Lightning damage has 10% chance to Immobilize.', mods: [{ stat: 'dmg_storm', add: 0.25 }, { on: 'lucky', element: 'lightning', chance: 0.1, do: { apply: { st: 'immobilize', dur: 2 } } }] }, rare: [{ name: 'Tempest', mods: [{ stat: 'dmg_light', add: 0.15 }] }, { name: 'Gale', mods: [{ stat: 'resource_gen', add: 0.1 }] }] },
        { id: 'earthen_devastation', name: 'Earthen Devastation', legendary: { name: 'Earthen Devastation', desc: 'Earth skills deal 25% increased damage and Fortify 5% on Critical Strike.', mods: [{ stat: 'dmg_earth', add: 0.25 }, { on: 'crit', tag: 'earth', do: { fortify: 0.05 } }] }, rare: [{ name: 'Boulder', mods: [{ stat: 'overpower_dmg', add: 0.2 }] }, { name: 'Stone', mods: [{ stat: 'armor_pct', add: 0.15 }] }] },
        { id: 'lust_for_carnage', name: 'Lust for Carnage', legendary: { name: 'Lust for Carnage', desc: 'Werewolf skills deal 25% increased damage and Werewolf Critical Strikes heal 2% Life.', mods: [{ stat: 'dmg_werewolf', add: 0.25 }, { on: 'crit', tag: 'werewolf', do: { heal: 0.02 } }] }, rare: [{ name: 'Fangs', mods: [{ stat: 'attack_speed', add: 0.08 }] }, { name: 'Hunt', mods: [{ stat: 'move_speed', add: 0.08 }] }] },
        { id: 'heightened_malice', name: 'Heightened Malice', legendary: { name: 'Heightened Malice', desc: 'Poison damage increased by 30%. Poisoned enemies deal 10% less damage.', mods: [{ stat: 'dmg_poison', add: 0.3 }, { stat: 'dr_vs_poisoned', add: 0.1 }] }, rare: [{ name: 'Venom', mods: [{ stat: 'dmg_dot', add: 0.15 }] }, { name: 'Toxin', mods: [{ stat: 'dmg_vs_poisoned', add: 0.12 }] }] },
        { id: 'ancestral_guidance', name: 'Ancestral Guidance', legendary: { name: 'Ancestral Guidance', desc: 'Werebear skills deal 25% increased damage and grant 10% Damage Reduction.', mods: [{ stat: 'dmg_werebear', add: 0.25 }, { stat: 'dr', add: 0.1, when: 'self_werebear' }] }, rare: [{ name: 'Ursine', mods: [{ stat: 'life_pct', add: 0.08 }] }, { name: 'Guardian', mods: [{ stat: 'dr_close', add: 0.08 }] }] }
      ]
    },
    glyphs: {
      all: [
        { id: 'g_might', name: 'Might', desc: '+{v}% damage per rank. Bonus: +10% Damage Reduction with 40+ Strength in radius.', stat: 'dmg', per: 0.02, req: 'str', bonus: [{ stat: 'dr', add: 0.1 }] },
        { id: 'g_exploit', name: 'Exploit', desc: '+{v}% Vulnerable Damage per rank. Bonus: Enemies become Vulnerable for 3s when first damaged (20+ Dex).', stat: 'vuln_dmg', per: 0.03, req: 'dex', bonus: [{ flag: 'exploit_glyph' }] },
        { id: 'g_control', name: 'Control', desc: '+{v}% damage to Crowd Controlled per rank. Bonus: +10% DR vs CC\'d (40+ Int).', stat: 'dmg_vs_cc', per: 0.035, req: 'int', bonus: [{ stat: 'dr_vs_cc', add: 0.1 }] },
        { id: 'g_territorial', name: 'Territorial', desc: '+{v}% damage to Close per rank. Bonus: +10% DR from Close (40+ Will).', stat: 'dmg_close', per: 0.03, req: 'will', bonus: [{ stat: 'dr_close', add: 0.1 }] },
        { id: 'g_protector', name: 'Protector', desc: '+{v}% Armor per rank. Bonus: +5% Max Life (40+ Str).', stat: 'armor_pct', per: 0.02, req: 'str', bonus: [{ stat: 'life_pct', add: 0.05 }] },
        { id: 'g_tenacity', name: 'Tenacity', desc: '+{v}% Max Life per rank. Bonus: +10% Healing (40+ Will).', stat: 'life_pct', per: 0.012, req: 'will', bonus: [{ stat: 'healing', add: 0.1 }] },
        { id: 'g_marksman', name: 'Marksman', desc: '+{v}% damage to Distant per rank. Bonus: +10% DR from Distant (40+ Dex).', stat: 'dmg_distant', per: 0.03, req: 'dex', bonus: [{ stat: 'dr_distant', add: 0.1 }] },
        { id: 'g_elemental', name: 'Elementalist', desc: '+{v}% Non-Physical damage per rank. Bonus: +10% Resistances (40+ Int).', stat: 'dmg_nonphys', per: 0.025, req: 'int', bonus: [{ stat: 'res_all', add: 0.1 }] },
        { id: 'g_wrath', name: 'Wrath', desc: '+{v}% Critical Strike Damage per rank. Bonus: +5% Crit Chance (40+ Dex).', stat: 'crit_dmg', per: 0.04, req: 'dex', bonus: [{ stat: 'crit_chance', add: 0.05 }] },
        { id: 'g_undaunted', name: 'Undaunted', desc: '+{v}% Damage Reduction per rank. Bonus: +10% DR while Fortified (40+ Will).', stat: 'dr', per: 0.008, req: 'will', bonus: [{ stat: 'dr_fortified', add: 0.1 }] }
      ],
      necromancer: [{ id: 'g_corporeal', name: 'Corporeal', desc: '+{v}% Bone damage per rank. Bonus: Bone skills gain 10% Crit Chance.', stat: 'dmg_bone', per: 0.04, req: 'int', bonus: [{ stat: 'crit_chance', add: 0.1 }] }, { id: 'g_deadraiser', name: 'Deadraiser', desc: '+{v}% Minion damage per rank. Bonus: +15% Minion Life.', stat: 'dmg_summon', per: 0.05, req: 'int', bonus: [{ stat: 'minion_life', add: 0.15 }] }],
      paladin: [{ id: 'g_zealot', name: 'Zealot', desc: '+{v}% Holy damage per rank. Bonus: +10% Attack Speed.', stat: 'dmg_holy', per: 0.04, req: 'str', bonus: [{ stat: 'attack_speed', add: 0.1 }] }, { id: 'g_aegis', name: 'Aegis', desc: '+{v}% Block Chance per rank. Bonus: +15% Block Damage Reduction.', stat: 'block_chance', per: 0.015, req: 'will', bonus: [{ stat: 'block_red', add: 0.15 }] }],
      barbarian: [{ id: 'g_executioner', name: 'Executioner', desc: '+{v}% damage to Injured per rank. Bonus: +10% Crit Chance vs Injured.', stat: 'dmg_vs_injured', per: 0.05, req: 'str', bonus: [{ stat: 'crit_chance_vs_injured', add: 0.1 }] }, { id: 'g_ire', name: 'Ire', desc: '+{v}% damage while Berserking per rank. Bonus: +15% Berserking Duration.', stat: 'dmg_berserk', per: 0.04, req: 'str', bonus: [{ stat: 'berserk_dur', add: 0.15 }] }],
      druid: [{ id: 'g_fulminate', name: 'Fulminate', desc: '+{v}% Lightning damage per rank. Bonus: +10% Storm damage.', stat: 'dmg_light', per: 0.04, req: 'will', bonus: [{ stat: 'dmg_storm', add: 0.1 }] }, { id: 'g_shapeshifter', name: 'Shapeshifter', desc: '+{v}% damage while Shapeshifted per rank. Bonus: +10% DR while Shapeshifted.', stat: 'dmg_shapeshift', per: 0.04, req: 'will', bonus: [{ stat: 'dr', add: 0.1, when: 'self_shapeshifted' }] }]
    }
  };
  DATA.STAT_DEFS.dmg_nonphys = { name: 'Non-Physical Damage', kind: 'pct', group: 'Offense' };
})();
