/* Pure, zero-DOM, zero-Chrome Telemetry Engine for Night Camp Season 2.
 * Runs identically inside the MV3 background service worker and Node unit tests. */

export const DEFAULT_S2_POTIONS = {
  red: { price: 5, amt: 50 },
  red_m: { price: 16, amt: 150 },
  red_l: { price: 38, amt: 350 },
  blue: { price: 3, amt: 35 },
  blue_m: { price: 9, amt: 100 },
  blue_l: { price: 22, amt: 250 },
};

export const ELEMENT_META = {
  neutral: { name: 'ไร้ธาตุ', color: '#cbd5e1' },
  fire: { name: 'ไฟ', color: '#f97316' },
  water: { name: 'น้ำ', color: '#38bdf8' },
  wind: { name: 'ลม', color: '#4ade80' },
  earth: { name: 'ดิน', color: '#d97706' },
  holy: { name: 'แสง', color: '#fde047' },
  shadow: { name: 'มืด', color: '#a855f7' },
  poison: { name: 'พิษ', color: '#84cc16' },
  ghost: { name: 'วิญญาณ', color: '#c084fc' },
};

export const ARMOUR_META = {
  heavy: { name: 'เกราะหนัก (Heavy)', weak: 'ทุบ / เวท' },
  hide: { name: 'หนังสัตว์ (Hide)', weak: 'แทง / ยิง' },
  flesh: { name: 'เนื้อ (Flesh)', weak: 'ฟัน' },
  spirit: { name: 'วิญญาณ (Spirit)', weak: 'เวท' },
  unknown: { name: 'ไม่ระบุ', weak: '-' },
};

export const REACTION_META = {
  overload: {
    name: 'โอเวอร์โหลด',
    combo: 'ไฟ + ช็อต',
    element: 'fire',
    color: '#ff6b4a',
    mode: 'blast',
    hasBlast: true,
    hasMult: false,
    blastHitsSelf: true,
  },
  steam: {
    name: 'ไอน้ำระเบิด',
    combo: 'ไฟ + แช่แข็ง',
    element: 'fire',
    color: '#7dd3fc',
    mode: 'mult+blast',
    hasBlast: true,
    hasMult: true,
    blastHitsSelf: false,
  },
  superconduct: {
    name: 'ไฟฟ้าช็อตน้ำแข็ง',
    combo: 'ลม + เย็น/แข็ง',
    element: 'wind',
    color: '#67e8f9',
    mode: 'blast',
    hasBlast: true,
    hasMult: false,
    blastHitsSelf: false,
    maxBlastHits: 3,
  },
  poisonfire: {
    name: 'พิษลุกไหม้',
    combo: 'ไฟ + พิษ',
    element: 'poison',
    color: '#a3e635',
    mode: 'blast',
    hasBlast: true,
    hasMult: false,
    blastHitsSelf: true,
  },
  mist: {
    name: 'หมอกเดือด',
    combo: 'น้ำ + เผา',
    element: 'water',
    color: '#bae6fd',
    mode: 'blast',
    hasBlast: true,
    hasMult: false,
    blastHitsSelf: true,
    blastOnlySelf: true,
    maxBlastHits: 1,
  },
  cleanse: {
    name: 'ชำระล้าง',
    combo: 'แสง + คำสาป',
    element: 'holy',
    color: '#fde047',
    mode: 'mult',
    hasBlast: false,
    hasMult: true,
    blastHitsSelf: false,
  },
  wildfire: {
    name: 'ไฟลามทุ่ง',
    combo: 'ลม + เผา',
    element: 'fire',
    color: '#f97316',
    mode: 'spread',
    hasBlast: false,
    hasMult: false,
    blastHitsSelf: false,
  },
  conduct: {
    name: 'กระแสนำไฟ',
    combo: 'น้ำ + ช็อต',
    element: 'wind',
    color: '#93c5fd',
    mode: 'cc',
    hasBlast: false,
    hasMult: false,
    blastHitsSelf: false,
  },
};

export const REACTION_NAMES = Object.fromEntries(
  Object.entries(REACTION_META).map(([k, v]) => [k, v.name])
);

export const DOT_META = {
  burn: { name: 'เผา (Burn)', element: 'fire', color: '#f97316' },
  poison: { name: 'พิษ (Poison)', element: 'poison', color: '#84cc16' },
  bl_venom: { name: 'รูนพิษสะสม (Venom)', element: 'poison', color: '#a3e635' },
  bleed: { name: 'เลือดไหล (Bleed)', element: 'neutral', color: '#fb7185' },
  rp_bleed: { name: 'เลือดไหล (Reaper)', element: 'neutral', color: '#ff6a7a' },
  as_bleed: { name: 'เลือดไหล (Assassin)', element: 'neutral', color: '#ff6b6b' },
  __dot_burn_poison__: { name: 'เผา / พิษ (Burn/Poison)', element: 'poison', color: '#84cc16' },
  __dot_unknown__: { name: 'DoT อื่นๆ', element: 'neutral', color: '#4ade80' },
};

export const RUNE_META = {
  // Core 24 skill runes (js/bl_runes.js)
  split: { n: 'รูนแยก', cat: 'modifier', on: 'proj', bad: 'k', badMode: 'down', k: [0.7, 0.7, 0.8] },
  pierce: { n: 'รูนทะลุ', cat: 'modifier', on: 'proj', bad: 'k', badMode: 'down', k: [0.85, 0.92, 1] },
  bounce: { n: 'รูนสะท้อน', cat: 'extra_hit', on: 'proj', bonus: 'k', bonusMode: 'mul', k: [0.6, 0.6, 0.8] },
  echo: { n: 'รูนก้อง', cat: 'extra_hit', on: 'attack', bonus: 'k', bonusMode: 'mul', k: [0.3, 0.4, 0.55] },
  wide: { n: 'รูนขยาย', cat: 'utility', on: 'area', bad: 'k', badMode: 'down', k: [0.9, 0.9, 0.95] },
  focus: { n: 'รูนหดแน่น', cat: 'modifier', on: 'area', bonus: 'k', bonusMode: 'up', k: [1.25, 1.35, 1.5] },
  linger: { n: 'รูนค้าง', cat: 'proc', on: 'area', childSkill: 'bl_linger', bonus: 'k', bonusMode: 'mul', k: [0.15, 0.2, 0.25] },
  pull: { n: 'รูนดูด', cat: 'utility', on: 'area' },
  corpse: { n: 'รูนระเบิดศพ', cat: 'proc', on: 'attack', childSkill: 'bl_corpse', bonus: 'k', bonusMode: 'mul', k: [0.5, 0.75, 1] },
  haste: { n: 'รูนเร็ว', cat: 'utility', on: 'any', bad: 'dk', badMode: 'down', dk: [0.9, 0.9, 0.9] },
  heavy: { n: 'รูนหนัก', cat: 'modifier', on: 'attack', bonus: 'k', bonusMode: 'up', k: [1.2, 1.3, 1.4] },
  blood: { n: 'รูนเลือด', cat: 'modifier', on: 'any', bonus: 'k', bonusMode: 'up', k: [1.15, 1.2, 1.25] },
  execute: { n: 'รูนประหาร', cat: 'modifier', on: 'attack', bonus: 'k', bonusMode: 'up', k: [1.3, 1.45, 1.6] },
  corrode: { n: 'รูนกัดกร่อน', cat: 'modifier', on: 'attack', el: 'poison' },
  burn: { n: 'รูนเผา', cat: 'modifier', on: 'attack', el: 'fire' },
  curse: { n: 'รูนสาป', cat: 'modifier', on: 'attack', bonus: 'k', bonusMode: 'up', k: [1.08, 1.12, 1.16] },
  skyfall: { n: 'รูนตกฟ้า', cat: 'proc', on: 'attack', childSkill: 'bl_skyfall', bonus: 'k', bonusMode: 'mul', k: [0.4, 0.6, 0.5] },
  rush: { n: 'รูนพุ่ง', cat: 'modifier', on: 'melee', bonus: 'k', bonusMode: 'up', k: [1, 1, 1.15] },
  ambush: { n: 'รูนซุ่ม', cat: 'modifier', on: 'melee', bonus: 'k', bonusMode: 'up', k: [1.4, 1.6, 1.8] },
  stagger: { n: 'รูนกระแทก', cat: 'utility', on: 'melee' },
  pal: { n: 'รูนคู่หู', cat: 'utility', on: 'pet' },
  share: { n: 'รูนแบ่งปัน', cat: 'utility', on: 'buff' },
  shell: { n: 'รูนเปลือก', cat: 'utility', on: 'buff' },
  moonrite: { n: 'รูนจันทร์', cat: 'modifier', on: 'any', bonus: 'k', bonusMode: 'up', k: [1.2, 1.3, 1.4] },
  // Season 2 proc & pierce runes
  arc: { n: 'รูนสายฟ้าลูกโซ่', cat: 'proc', on: 'attack', el: 'wind', childSkill: 'bl_arc' },
  wildfire: { n: 'รูนไฟลาม', cat: 'proc', on: 'attack', el: 'fire', childSkill: 'bl_wildfire' },
  frostbite: { n: 'รูนเหมันต์', cat: 'proc', on: 'attack', el: 'water', childSkill: 'bl_frostbite' },
  venom: { n: 'รูนพิษสะสม', cat: 'proc', on: 'attack', el: 'poison', childSkill: 'bl_venom' },
  shade: { n: 'รูนเงาซ้อน', cat: 'proc', on: 'attack', el: 'shadow', childSkill: 'bl_shade' },
  trap: { n: 'รูนกับดัก', cat: 'proc', on: 'attack', el: 'earth', childSkill: 'bl_trap' },
  apierce: { n: 'รูนเจาะเกราะ', cat: 'modifier', on: 'attack' },
  wpierce: { n: 'รูนเจาะเวท', cat: 'modifier', on: 'attack' },
  // Season 2 gun runes
  grenade: { n: 'รูนระเบิดมือ', cat: 'gun', on: 'attack', el: 'fire', childSkill: 'bl_grenade' },
  ricochet: { n: 'รูนกระสุนเด้ง', cat: 'gun', on: 'attack', childSkill: 'bl_ricochet' },
  hollow: { n: 'รูนกระสุนหัวกลวง', cat: 'gun', on: 'attack', childSkill: 'bl_hollow' },
  duel: { n: 'รูนดวลปืน', cat: 'gun', on: 'attack', childSkill: 'bl_duel' },
  dragon: { n: 'รูนมังกรไฟ', cat: 'gun', on: 'attack', el: 'fire', childSkill: 'bl_dragon' },
  barrel: { n: 'รูนลำกล้องคู่', cat: 'gun', on: 'attack', childSkill: 'bl_barrel' },
  recoil: { n: 'รูนแรงถีบ', cat: 'gun', on: 'attack', childSkill: 'bl_recoil' },
  // Season 2 spell proc runes
  spmeteor: { n: 'รูนเรียกดาวตก', cat: 'spell', on: 'attack', el: 'fire', childSkill: 'bl_spmeteor' },
  spthunder: { n: 'รูนเรียกอัสนี', cat: 'spell', on: 'attack', el: 'wind', childSkill: 'bl_spthunder' },
  spfrost: { n: 'รูนเรียกน้ำแข็ง', cat: 'spell', on: 'attack', el: 'water', childSkill: 'bl_spfrost' },
  spquake: { n: 'รูนเรียกธรณีไหว', cat: 'spell', on: 'attack', el: 'earth', childSkill: 'bl_spquake' },
  spmagnus: { n: 'รูนเรียกวงแสง', cat: 'spell', on: 'attack', el: 'holy', childSkill: 'bl_spmagnus' },
  spwhirl: { n: 'รูนเรียกพายุหมุน', cat: 'spell', on: 'attack', el: 'wind', childSkill: 'bl_spwhirl' },
  splord: { n: 'รูนเรียกมหาอัสนี', cat: 'spell', on: 'attack', el: 'wind', childSkill: 'bl_splord' },
  spshadow: { n: 'รูนเรียกเงาทมิฬ', cat: 'spell', on: 'attack', el: 'shadow', childSkill: 'bl_spshadow' },
};

const CHILD_SKILL_TO_RUNE = {};
for (const [k, def] of Object.entries(RUNE_META)) {
  if (def.childSkill) CHILD_SKILL_TO_RUNE[def.childSkill] = k;
  CHILD_SKILL_TO_RUNE['bl_' + k] = k;
}

const KNOWN_SKILL_ELEMENTS = {
  burn: 'fire',
  chill: 'water',
  freeze: 'water',
  shock: 'wind',
  poison: 'poison',
  curse: 'shadow',
  bleed: 'neutral',
  rp_bleed: 'neutral',
  as_bleed: 'neutral',
  __dot_burn_poison__: 'poison',
  __dot_unknown__: 'neutral',
};
for (const [rxK, rxDef] of Object.entries(REACTION_META)) {
  KNOWN_SKILL_ELEMENTS[rxK] = rxDef.element;
  KNOWN_SKILL_ELEMENTS['reaction_' + rxK] = rxDef.element;
}

const EST_MULTIPLIER_RUNES = new Set(['heavy', 'execute', 'ambush', 'moonrite']);
const ALWAYS_ON_MOD_RUNES = new Set(['focus', 'blood']);

const WP_SKILL_NAMES = {
  wp_wind: 'ใบมีดลม (อาวุธ)',
  wp_bolt: 'ฟ้าผ่า (อาวุธ)',
  wp_spore: 'สปอร์พิษ (อาวุธ)',
  wp_bats: 'ฝูงค้างคาว (อาวุธ)',
  wp_holy: 'แสงศักดิ์สิทธิ์ (อาวุธ)',
  wp_ice: 'หนามน้ำแข็ง (อาวุธ)',
  wp_pillar: 'เสาเพลิง (อาวุธ)',
  wp_fireball: 'ลูกไฟ (อาวุธ)',
  wp_meteor: 'อุกกาบาต (อาวุธ)',
  wp_breath: 'ลมหายใจมังกร (อาวุธ)',
  wp_crescent: 'คลื่นเสี้ยวจันทร์ (อาวุธ)',
  wp_helper: 'ผู้ช่วย (อาวุธ)',
};

function emptySources() {
  return {
    skill: 0,
    runeProc: 0,
    runeMod: 0,
    cardExact: 0,
    cardMod: 0,
    gearExact: 0,
    gearMod: 0,
    dot: 0,
    reactionExact: 0,
    reactionMod: 0,
  };
}

function formatSources(src) {
  const s = src || emptySources();
  return {
    skill: s.skill || 0,
    runeProc: s.runeProc || 0,
    runeMod: s.runeMod || 0,
    card: (s.cardExact || 0) + (s.cardMod || 0),
    cardExact: s.cardExact || 0,
    cardMod: s.cardMod || 0,
    gear: (s.gearExact || 0) + (s.gearMod || 0),
    gearExact: s.gearExact || 0,
    gearMod: s.gearMod || 0,
    dot: s.dot || 0,
    reaction: (s.reactionExact || 0) + (s.reactionMod || 0),
    reactionExact: s.reactionExact || 0,
    reactionMod: s.reactionMod || 0,
  };
}

function sourceCatOfSkill(skillKey) {
  if (typeof skillKey === 'string') {
    if (skillKey.startsWith('bl_art_')) return 'card';
    if (skillKey.startsWith('wp_')) return 'gear';
    if (skillKey.startsWith('reaction_') || REACTION_META[skillKey]) return 'reaction';
    if (DOT_META[skillKey] && skillKey !== 'bl_venom') return 'dot';
  }
  return 'skill';
}

function resolveExplicitReactionKey(ev, rawSkill) {
  if (ev?.reaction && REACTION_META[ev.reaction]) return ev.reaction;
  if (rawSkill) {
    if (REACTION_META[rawSkill]) return rawSkill;
    const m = /^(?:reaction|rx)_(.+)$/.exec(rawSkill);
    if (m && REACTION_META[m[1]]) return m[1];
  }
  return null;
}

function normalizeDotKind(rawSkill, ev, mob) {
  const canon = (k) => {
    if (k === 'dot_burn' || k === 'burn') return 'burn';
    if (k === 'dot_poison' || k === 'poison') return 'poison';
    if (k === 'dot_bleed' || k === 'bleed') return 'bleed';
    return k;
  };
  if (rawSkill === 'bl_venom') return { id: 'bl_venom', inferred: false, sourceBucket: 'runeProc' };
  if (ev?.dotKind) {
    const dk = canon(String(ev.dotKind));
    return { id: dk, inferred: false, sourceBucket: dk === 'bl_venom' ? 'runeProc' : 'dot' };
  }
  if (rawSkill) {
    const dk = canon(String(rawSkill));
    return { id: dk, inferred: false, sourceBucket: dk === 'bl_venom' ? 'runeProc' : 'dot' };
  }
  const st = ev?.targetSt;
  const hasBurn = !!(st?.burn || mob?.st?.burn > 0);
  const hasPoison = !!(st?.poison || mob?.poisoned);
  if (hasBurn && !hasPoison) return { id: 'burn', inferred: true, sourceBucket: 'dot' };
  if (hasPoison && !hasBurn) return { id: 'poison', inferred: true, sourceBucket: 'dot' };
  if (hasBurn && hasPoison) return { id: '__dot_burn_poison__', inferred: true, sourceBucket: 'dot' };
  return { id: '__dot_unknown__', inferred: true, sourceBucket: 'dot' };
}

const RING_SIZE = 300;
const MAX_MONSTER_MIRRORS = 500;
const MAX_PLAYER_MIRRORS = 300;
const MAX_LOOT_CACHE = 300;
const MAX_FIRST_HITS = 400;
const MAX_LAST_HITS = 400;
const MAX_PENDING_REACTIONS = 16;
const MAX_COUNTED_KILLS = 500;
const MAX_SEEN_RUNES = 500;
const MAX_ACTORS = 80;
const MAX_ERRORS = 50;
const MAX_LOG_SIZE = 200;

export function parseSocketedRune(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const [kind = '', tierRaw = '1', qbRaw = '0', qdRaw = '0'] = raw.split(':');
  if (!kind) return null;
  const tier = Math.max(1, Math.min(3, Number(tierRaw) || 1));
  const qb = Number(qbRaw) || 0;
  const qd = Number(qdRaw) || 0;
  const grade = qb >= 0.0499 ? 'gold' : qb >= 0 ? 'plain' : 'grey';
  return { kind, tier, qb, qd, grade, raw };
}

export function rolledRuneBonusFactor(kind, tier = 1, qb = 0) {
  const M = RUNE_META[kind];
  if (!M || !M.bonus || !Array.isArray(M[M.bonus])) return 1;
  const base = M[M.bonus][Math.max(0, Math.min(2, (tier | 0) - 1))];
  if (!(base > 0)) return 1;
  const f = 1 + (qb || 0);
  return M.bonusMode === 'mul' ? base * f : 1 + (base - 1) * f;
}

function capMap(map, max) {
  while (map.size > max) {
    const oldest = map.keys().next().value;
    map.delete(oldest);
  }
}

function runeName(kind, meta) {
  return meta?.runes?.[kind]?.n || RUNE_META[kind]?.n || kind;
}

function buildRuneBonusEstimate(skillRec, taggedRunes) {
  const out = {};
  let sumWeights = 0;
  const parts = [];
  for (const rKind of taggedRunes) {
    if (!EST_MULTIPLIER_RUNES.has(rKind)) continue;
    const sock = skillRec?.equippedRunes?.find((r) => r.kind === rKind);
    const tier = sock?.tier || 1;
    const qb = sock?.qb || 0;
    const factor = rolledRuneBonusFactor(rKind, tier, qb);
    if (factor > 1.001) {
      parts.push({ rKind, factor });
      sumWeights += factor - 1;
    }
  }
  if (!parts.length || sumWeights <= 0) return out;
  let combinedFactor = 1;
  for (const p of parts) combinedFactor *= p.factor;
  return { combinedFactor, parts, sumWeights };
}

export class TelemetryEngine {
  constructor({ tabId = 0, now = () => Date.now() } = {}) {
    this.tabId = tabId;
    this._now = now;
    this.meta = {
      skills: {},
      monsters: {},
      items: {},
      runes: {},
      mats: {},
      maps: {},
      jobs: {},
    };
    this.s2 = {
      potions: { ...DEFAULT_S2_POTIONS },
      materials: {},
      armourTypeOf: {},
      buildRunes: {},
      party: null,
    };
    this.dpsMode = 'elapsed'; // 'elapsed' | 'active'
    this.paused = false;
    this.reset(this._now());
  }

  reset(t = this._now()) {
    this.startedAt = t;
    this.lastActivityAt = t;
    this.lastCombatAt = 0;
    this.lastSnapAt = 0;
    this.activeCombatMs = 0;
    this.activeElement = null;
    this.isNight = false;
    this.rtt = { cur: null, sum: 0, count: 0, max: 0 };

    this.hero = null;
    this.mapId = '';
    this.channelId = '';
    this.playerCount = 1;
    this.mobCount = 0;
    this.mobAvgLv = 0;
    this.partyThread = false;

    this.skills = {};
    this.runesRollup = {};
    this.elements = {};
    this.armours = {};
    this.monsters = {};
    this.reactions = {};
    this.dots = {};
    this.actors = {};
    this.buffs = {};
    this.buffSampleMs = 0;
    this.lastBuffSampleAt = 0;

    this._ringSec = new Float64Array(RING_SIZE);
    this._ringSec.fill(-1);
    this._ringDmg = new Float64Array(RING_SIZE);
    this._ringTaken = new Float64Array(RING_SIZE);
    this._ringHeal = new Float64Array(RING_SIZE);
    this._ringXp = new Float64Array(RING_SIZE);
    this._ringJobXp = new Float64Array(RING_SIZE);
    this._ringKills = new Uint32Array(RING_SIZE);

    this.totalDmgDealt = 0;
    this.directDmgTotal = 0;
    this.dotDmgTotal = 0;
    this.procDmgTotal = 0;
    this.reactionDmgTotal = 0;
    this._reactPct = 0;
    this.srcTotals = emptySources();
    this._cardMods = { critDmg: 0, bossDmg: 0, el: {} };
    this._gearMods = { critDmg: 0, bossDmg: 0, el: {}, sk: {} };
    this._totalMods = { critDmg: 0, bossDmg: 0, el: {}, sk: {} };
    this.totalHits = 0;
    this.totalCrits = 0;
    this.totalCritDmg = 0;
    this.totalMiss = 0;
    this.totalEvade = 0;
    this.totalRefused = 0;
    this.peakDps5 = 0;

    this.totalDmgTaken = 0;
    this.hitsTaken = 0;
    this.dodges = 0;
    this.luckyDodges = 0;
    this.deaths = 0;
    this.healTotal = 0;

    this.castPushCount = 0;
    this.castCancelCount = 0;
    this.errors = {};

    this.totalXp = 0;
    this.totalJobXp = 0;
    this.kills = 0;
    this.killsSinceCard = 0;
    this.killsSinceRune = 0;
    this.drops = [];

    this.potsUsed = { red: 0, red_m: 0, red_l: 0, blue: 0, blue_m: 0, blue_l: 0 };
    this.potCostTotal = 0;

    this._baselineReady = false;
    this._heroId = '';
    this._startLv = 0;
    this._startJobLv = 0;
    this._startJob = '';
    this._startCoins = 0;
    this._lastCoins = 0;
    this._startPotVal = 0;
    this._lastPots = null;
    this._startMatsVal = 0;
    this._lastMats = {};
    this._seenRuneIds = new Set();

    this._monsterMirrors = new Map(); // monsterId -> { id, type, lv, boss, rootBoss, storyBoss, dummy }
    this._playerMirrors = new Map(); // id -> { id, name, job, lv }
    this._lootCache = new Map();
    this._firstHitByTarget = new Map();
    this._lastHitByTarget = new Map(); // targetId -> { t, skillKey }
    this._lastDirectHitByTarget = new Map(); // targetId -> { t, dmg, skillKey, wRune, wCard, wGear, reactionApplied, deltas }
    this._pendingReactions = []; // recent reaction events waiting to correlate blast/mult hits (bounded MAX_PENDING_REACTIONS)
    this._countedKills = new Map(); // targetId -> t

    this.bossEncounters = [];
    this._activeBoss = null;
    this.combatLog = [];
    this._dirty = true;
  }

  setPaused(paused) {
    this.paused = !!paused;
    this._dirty = true;
  }

  setDpsMode(mode) {
    this.dpsMode = mode === 'active' ? 'active' : 'elapsed';
    this._dirty = true;
  }

  ingestBatch(batch) {
    if (!Array.isArray(batch)) return;
    for (const msg of batch) {
      if (!msg || typeof msg !== 'object') continue;
      if (msg.kind === 'meta') this.applyMetaPatch(msg.patch);
      else if (msg.kind === 's2') this.applyS2(msg.s2);
      else if (msg.kind === 'snap' && !this.paused) this.recordSnapshot(msg.snap, msg.t);
      else if (msg.kind === 'ev' && !this.paused) this.recordEvent(msg.ev, msg.t || msg.ev?.t);
    }
  }

  applyMetaPatch(patch) {
    if (!patch || typeof patch !== 'object') return;
    for (const cat of ['skills', 'monsters', 'items', 'runes', 'mats', 'maps', 'jobs']) {
      if (patch[cat] && typeof patch[cat] === 'object') {
        Object.assign(this.meta[cat], patch[cat]);
      }
    }
    this._dirty = true;
  }

  applyS2(s2) {
    if (!s2 || typeof s2 !== 'object') return;
    if (s2.potions) Object.assign(this.s2.potions, s2.potions);
    if (s2.materials) Object.assign(this.s2.materials, s2.materials);
    if (s2.armourTypeOf) Object.assign(this.s2.armourTypeOf, s2.armourTypeOf);
    if (s2.buildRunes) Object.assign(this.s2.buildRunes, s2.buildRunes);
    if (s2.party) this.s2.party = s2.party;
    this._dirty = true;
  }

  _potPrice(key) {
    return this.s2.potions?.[key]?.price ?? DEFAULT_S2_POTIONS[key]?.price ?? 0;
  }

  _matPrice(id) {
    if (this.s2.materials && this.s2.materials[id] != null) return Number(this.s2.materials[id]) || 0;
    return Number(this.meta.mats?.[id]?.price) || 0;
  }

  _potValue(counts) {
    if (!counts) return 0;
    return (
      (counts.red || 0) * this._potPrice('red') +
      (counts.red_m || 0) * this._potPrice('red_m') +
      (counts.red_l || 0) * this._potPrice('red_l') +
      (counts.blue || 0) * this._potPrice('blue') +
      (counts.blue_m || 0) * this._potPrice('blue_m') +
      (counts.blue_l || 0) * this._potPrice('blue_l')
    );
  }

  _matsValue(mats) {
    if (!mats || typeof mats !== 'object') return 0;
    let sum = 0;
    for (const [id, rawQty] of Object.entries(mats)) {
      const q = Number(rawQty) || 0;
      if (q > 0) sum += q * this._matPrice(id);
    }
    return sum;
  }

  _ensureSkill(skillKey, t) {
    let rec = this.skills[skillKey];
    if (!rec) {
      const isBasic = skillKey === '__basic__';
      const isShared = skillKey === '__rune_shared__';
      const skMeta = !isBasic && !isShared ? this.meta.skills[skillKey] : null;
      const isCardArt = typeof skillKey === 'string' && skillKey.startsWith('bl_art_');
      const isWp = typeof skillKey === 'string' && skillKey.startsWith('wp_');
      const cardEl = isCardArt ? skillKey.slice(7) : null;
      const rxKey = /^(?:reaction|rx)_(.+)$/.exec(String(skillKey || ''))?.[1] || (REACTION_META[skillKey] ? skillKey : null);
      const rxMeta = rxKey ? REACTION_META[rxKey] : null;
      const dotMeta = DOT_META[skillKey] || null;
      const name = isBasic
        ? 'ตีปกติ (Basic)'
        : isShared
          ? 'รูนส่วนกลาง (Shared)'
          : rxMeta
            ? `${rxMeta.name} (ปฏิกิริยา)`
            : dotMeta
              ? dotMeta.name
              : isCardArt && (!skMeta?.name || skMeta.name === 'วิชามอน')
                ? `วิชามอน/การ์ด (${ELEMENT_META[cardEl]?.name || cardEl})`
                : isWp && !skMeta?.name
                  ? (WP_SKILL_NAMES[skillKey] || skillKey)
                  : (skMeta?.name || skillKey);
      rec = this.skills[skillKey] = {
        id: skillKey,
        name,
        element: skMeta?.element || KNOWN_SKILL_ELEMENTS[skillKey] || rxMeta?.element || dotMeta?.element || (isCardArt && cardEl !== 'neutral' ? cardEl : null),
        isBasic,
        sourceCat: sourceCatOfSkill(skillKey),
        src: emptySources(),
        totalDmg: 0,
        directDmg: 0,
        dotDmg: 0,
        procChildDmg: 0,
        hits: 0,
        dotTicks: 0,
        crits: 0,
        critDmg: 0,
        miss: 0,
        evade: 0,
        refused: 0,
        minHit: Infinity,
        maxHit: 0,
        casts: 0,
        lastCastAt: 0,
        firstHitAt: t || 0,
        elements: {},
        equippedRunes: [],
        runeTriggers: {}, // rKind -> { kind, name, hits, totalDmg, crits, estBonusDmg }
        runeChildren: {}, // rKind -> { kind, skillId, name, element, totalDmg, directDmg, dotDmg, hits, dotTicks, crits, critDmg, minHit, maxHit, nonDmgCount }
      };
    } else if (!rec.isBasic && rec.id !== '__rune_shared__' && rec.name === rec.id && this.meta.skills[rec.id]?.name) {
      rec.name = this.meta.skills[rec.id].name;
      rec.element = rec.element || this.meta.skills[rec.id].element || null;
    }
    return rec;
  }

  _ensureReaction(key) {
    let rec = this.reactions[key];
    if (!rec) {
      const m = REACTION_META[key] || { name: key, combo: '', element: 'neutral', color: '#fb923c', mode: 'blast' };
      rec = this.reactions[key] = {
        key,
        name: m.name,
        combo: m.combo || '',
        element: m.element || 'neutral',
        color: m.color || '#fb923c',
        mode: m.mode || 'blast',
        count: 0,
        dmg: 0,
        exactDmg: 0,
        estDmg: 0,
        hits: 0,
        maxHit: 0,
      };
    }
    return rec;
  }

  _recordDotTick(dotInfo, dmg, crit, el) {
    const id = dotInfo?.id || '__dot_unknown__';
    let rec = this.dots[id];
    if (!rec) {
      const dm = DOT_META[id] || {};
      const effEl = dm.element || el || 'neutral';
      rec = this.dots[id] = {
        id,
        name: dm.name || this.meta.skills[id]?.name || id,
        element: effEl,
        color: dm.color || ELEMENT_META[effEl]?.color || '#4ade80',
        dmg: 0,
        ticks: 0,
        crits: 0,
        minTick: Infinity,
        maxTick: 0,
        inferred: !!dotInfo?.inferred,
        sourceBucket: dotInfo?.sourceBucket || 'dot',
      };
    }
    rec.dmg += dmg;
    rec.ticks++;
    if (crit) rec.crits++;
    if (dmg > 0) {
      rec.minTick = Math.min(rec.minTick, dmg);
      rec.maxTick = Math.max(rec.maxTick, dmg);
    }
    if (!dotInfo?.inferred && rec.inferred) rec.inferred = false;
    return rec;
  }

  _prunePendingReactions(t, maxAgeMs = 150) {
    while (this._pendingReactions.length && t - this._pendingReactions[0].t > maxAgeMs) {
      this._pendingReactions.shift();
    }
  }

  _reallocateReactionMultiplier(prev, rxKey) {
    if (!prev || !(prev.dmg > 0)) return 0;
    const wReact = Math.log(1 + (1 + this._reactPct / 100));
    const wSum = prev.wRune + prev.wCard + prev.wGear + wReact;
    if (!(wSum > 1e-9)) return 0;
    const baseDmg = prev.dmg / Math.exp(wSum);
    const bonus = prev.dmg - baseDmg;
    const nextDeltas = {
      skill: baseDmg,
      runeMod: bonus * (prev.wRune / wSum),
      cardMod: bonus * (prev.wCard / wSum),
      gearMod: bonus * (prev.wGear / wSum),
      reactionMod: bonus * (wReact / wSum),
    };
    const oldDeltas = prev.deltas || { skill: prev.dmg, runeMod: 0, cardMod: 0, gearMod: 0, reactionMod: 0 };
    const skillRec = this.skills[prev.skillKey];
    for (const k of ['skill', 'runeMod', 'cardMod', 'gearMod', 'reactionMod']) {
      const diff = nextDeltas[k] - (oldDeltas[k] || 0);
      if (skillRec) skillRec.src[k] += diff;
      this.srcTotals[k] += diff;
    }
    prev.deltas = nextDeltas;
    const added = nextDeltas.reactionMod;
    if (added > 0) {
      this.reactionDmgTotal += added;
      const rx = this._ensureReaction(rxKey);
      rx.estDmg += added;
      rx.dmg += added;
      rx.hits++;
      rx.maxHit = Math.max(rx.maxHit, added);
    }
    return added;
  }

  _syncEquippedRunes(runesMap, t) {
    if (!runesMap || typeof runesMap !== 'object') return;
    // Clear previous equipped list on existing skills first so resets/swaps stay accurate
    for (const sk of Object.values(this.skills)) {
      sk.equippedRunes = [];
    }
    for (const [rawSk, slots] of Object.entries(runesMap)) {
      if (!Array.isArray(slots)) continue;
      const skKey = rawSk === 'bl_basic' ? '__basic__' : rawSk;
      const parsed = [];
      for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
        const p = parseSocketedRune(slots[slotIdx]);
        if (!p) continue;
        parsed.push({ slot: slotIdx, ...p, name: runeName(p.kind, this.meta) });
      }
      if (parsed.length || this.skills[skKey]) {
        const rec = this._ensureSkill(skKey, t);
        rec.equippedRunes = parsed;
      }
    }
  }

  _ensureRuneChild(skillRec, rKind) {
    let ch = skillRec.runeChildren[rKind];
    if (!ch) {
      const def = RUNE_META[rKind];
      ch = skillRec.runeChildren[rKind] = {
        kind: rKind,
        skillId: def?.childSkill || ('bl_' + rKind),
        name: runeName(rKind, this.meta),
        element: def?.el || null,
        totalDmg: 0,
        directDmg: 0,
        dotDmg: 0,
        hits: 0,
        dotTicks: 0,
        crits: 0,
        critDmg: 0,
        minHit: Infinity,
        maxHit: 0,
        nonDmgCount: 0,
      };
    }
    return ch;
  }

  _findParentSkillForChildRune(rKind, targetId, t) {
    const owners = [];
    for (const sk of Object.values(this.skills)) {
      if (sk.equippedRunes.some((r) => r.kind === rKind)) owners.push(sk.id);
    }
    if (owners.length === 1) return owners[0];
    const recent = targetId ? this._lastHitByTarget.get(targetId) : null;
    if (recent && t - recent.t <= 800) {
      if (!owners.length || owners.includes(recent.skillKey)) return recent.skillKey;
    }
    if (owners.length > 0) return '__rune_shared__';
    return '__rune_shared__';
  }

  _resolveElement(ev, skillId) {
    if (ev.element && ELEMENT_META[ev.element]) return ev.element;
    if (skillId && KNOWN_SKILL_ELEMENTS[skillId]) return KNOWN_SKILL_ELEMENTS[skillId];
    if (skillId && this.meta.skills[skillId]?.element) return this.meta.skills[skillId].element;
    if (skillId && skillId.startsWith('bl_')) {
      const rKind = CHILD_SKILL_TO_RUNE[skillId] || skillId.slice(3);
      if (RUNE_META[rKind]?.el) return RUNE_META[rKind].el;
      if (this.meta.runes[rKind]?.el) return this.meta.runes[rKind].el;
    }
    return this.activeElement || 'neutral';
  }

  _armourOf(mobType) {
    if (!mobType) return 'unknown';
    return this.s2.armourTypeOf?.[mobType] || 'unknown';
  }

  _addLog(at, cat, text, detail = '', dmg = 0, crit = false) {
    this.combatLog.push({ at, cat, text, detail, dmg, crit });
    if (this.combatLog.length >= MAX_LOG_SIZE) {
      this.combatLog = this.combatLog.slice(-150);
    }
  }

  _ringSlot(sec) {
    const idx = ((sec % RING_SIZE) + RING_SIZE) % RING_SIZE;
    if (this._ringSec[idx] !== sec) {
      this._ringSec[idx] = sec;
      this._ringDmg[idx] = 0;
      this._ringTaken[idx] = 0;
      this._ringHeal[idx] = 0;
      this._ringXp[idx] = 0;
      this._ringJobXp[idx] = 0;
      this._ringKills[idx] = 0;
    }
    return idx;
  }

  _ringSum(arr, nowSec, windowSec) {
    let sum = 0;
    const startSec = nowSec - windowSec + 1;
    for (let s = startSec; s <= nowSec; s++) {
      const idx = ((s % RING_SIZE) + RING_SIZE) % RING_SIZE;
      if (this._ringSec[idx] === s) sum += arr[idx];
    }
    return sum;
  }

  _touchCombatWindow(t) {
    if (this.lastCombatAt > 0) {
      const gap = t - this.lastCombatAt;
      if (gap > 0 && gap <= 5000) this.activeCombatMs += gap;
      else if (gap > 5000) this.activeCombatMs += 500;
    } else {
      this.activeCombatMs = 1000;
    }
    this.lastCombatAt = t;
  }

  recordSnapshot(snap, now = this._now()) {
    if (!snap || !snap.self) return;
    const s = snap.self;
    this.lastActivityAt = now;

    // Detect character switch -> auto reset
    if (this._heroId && s.id && s.id !== this._heroId) {
      this.reset(now);
    }
    this._heroId = s.id || this._heroId;
    this.mapId = snap.mapId || this.mapId;
    this.channelId = snap.channelId || this.channelId;
    this.isNight = !!snap.isNight;
    if (snap.activeElement) this.activeElement = snap.activeElement;
    if (Number.isFinite(snap.rtt)) {
      this.rtt.cur = snap.rtt;
      this.rtt.sum += snap.rtt;
      this.rtt.count++;
      if (snap.rtt > this.rtt.max) this.rtt.max = snap.rtt;
    }

    // Crowd & monster mirrors
    const mobList = Array.isArray(snap.monsters) ? snap.monsters : [];
    const aliveMobs = mobList.filter((m) => m && !(m.dead > 0) && !m.dummy);
    this.mobCount = aliveMobs.length;
    this.mobAvgLv = aliveMobs.length
      ? Math.round(aliveMobs.reduce((acc, m) => acc + (m.lv || 0), 0) / aliveMobs.length)
      : 0;
    const players = Array.isArray(snap.players) ? snap.players : [];
    this.playerCount = 1 + players.filter((p) => p && p.id !== s.id).length;

    for (const pl of players) {
      if (pl && pl.id) {
        this._playerMirrors.delete(pl.id);
        this._playerMirrors.set(pl.id, pl);
      }
    }
    capMap(this._playerMirrors, MAX_PLAYER_MIRRORS);

    for (const m of mobList) {
      if (m && m.id) {
        this._monsterMirrors.delete(m.id);
        this._monsterMirrors.set(m.id, m);
      }
    }
    capMap(this._monsterMirrors, MAX_MONSTER_MIRRORS);

    for (const l of snap.loot || []) {
      if (l && l.id != null) {
        this._lootCache.delete(l.id);
        this._lootCache.set(l.id, l);
      }
    }
    capMap(this._lootCache, MAX_LOOT_CACHE);

    const equip = s.equip || {};
    const bl = s.buildLoot || {};
    this._syncEquippedRunes(bl.runes, now);
    if (s.cardMods && typeof s.cardMods === 'object') this._cardMods = s.cardMods;
    if (s.gearMods && typeof s.gearMods === 'object') this._gearMods = s.gearMods;
    if (s.totalMods && typeof s.totalMods === 'object') this._totalMods = s.totalMods;
    if (Number.isFinite(s.reactPct)) this._reactPct = Math.max(0, Number(s.reactPct));

    const potCounts = {
      red: s.potions || 0,
      red_m: s.potionsM || 0,
      red_l: s.potionsL || 0,
      blue: s.spPotions || 0,
      blue_m: s.spPotionsM || 0,
      blue_l: s.spPotionsL || 0,
    };
    const partyMemberIds = new Set((s.party?.members || []).map((m) => m.id));
    this.partyThread = !!(s.meters?.ptThread > 0);

    const matsNow = s.mats || {};
    if (!this._baselineReady) {
      this._startLv = s.lv || 1;
      this._startJobLv = s.jobLv || 1;
      this._startJob = s.job || '';
      this._startCoins = s.coins ?? 0;
      this._lastCoins = this._startCoins;
      this._lastPots = { ...potCounts };
      this._startPotVal = this._potValue(potCounts);
      this._lastMats = { ...matsNow };
      this._startMatsVal = this._matsValue(matsNow);
      if (Array.isArray(s.runePouchIds)) {
        for (const r of s.runePouchIds) {
          if (r?.id != null && this._seenRuneIds.size < MAX_SEEN_RUNES) {
            this._seenRuneIds.add(r.id);
          }
        }
      }
      this._baselineReady = true;
    } else {
      if (s.job && this._startJob && s.job !== this._startJob) {
        this._startJob = s.job;
        this._startJobLv = s.jobLv || 1;
      }
      // Track exact potion usage by tier
      for (const pKey of ['red', 'red_m', 'red_l', 'blue', 'blue_m', 'blue_l']) {
        const diff = (this._lastPots?.[pKey] || 0) - potCounts[pKey];
        if (diff > 0 && diff <= 20) {
          this.potsUsed[pKey] += diff;
          this.potCostTotal += diff * this._potPrice(pKey);
        }
      }
      this._lastPots = { ...potCounts };
      this._lastCoins = s.coins ?? this._lastCoins;

      // Rare material & card drops detection from mats delta
      for (const [matId, rawQ] of Object.entries(matsNow)) {
        const q = Number(rawQ) || 0;
        const prev = this._lastMats[matId] || 0;
        if (q > prev) {
          const delta = q - prev;
          if (matId.startsWith('bl_card_')) {
            this.killsSinceCard = 0;
            const sp = matId.slice(8);
            const label = this.meta.mats?.[matId]?.name || (`การ์ด ${this.meta.monsters?.[sp]?.name || sp}`);
            this._recordRareDrop(now, 'card', label, delta, this._matPrice(matId));
          } else if (matId.startsWith('bl_rune_')) {
            this.killsSinceRune = 0;
            const label = this.meta.mats?.[matId]?.name || matId;
            this._recordRareDrop(now, 'rune', label, delta, this._matPrice(matId));
          } else if (matId.startsWith('mat_vp_') || matId.startsWith('mat_rootcore_') || this.meta.mats?.[matId]?.rare) {
            const label = this.meta.mats?.[matId]?.name || matId;
            this._recordRareDrop(now, 'valuable', label, delta, this._matPrice(matId));
          }
        }
      }
      this._lastMats = { ...matsNow };

      if (Array.isArray(s.runePouchIds)) {
        const nextSeen = new Set();
        for (const r of s.runePouchIds) {
          if (!r || r.id == null) continue;
          if (!this._seenRuneIds.has(r.id)) {
            this.killsSinceRune = 0;
            const label = `${runeName(r.kind, this.meta)} Tier ${r.tier || 1}`;
            this._recordRareDrop(now, 'rune', label, 1, 0);
          }
          if (nextSeen.size < MAX_SEEN_RUNES) nextSeen.add(r.id);
        }
        this._seenRuneIds = nextSeen;
      }
    }

    // In-combat buff uptime tracking
    if (this.lastCombatAt > 0 && now - this.lastCombatAt <= 3000) {
      const dt = this.lastBuffSampleAt > 0 ? Math.min(2000, Math.max(0, now - this.lastBuffSampleAt)) : 500;
      this.buffSampleMs += dt;
      const buffsNow = s.buffs || {};
      for (const [bId, val] of Object.entries(buffsNow)) {
        if (Number(val) > 0) {
          if (!this.buffs[bId]) {
            this.buffs[bId] = {
              id: bId,
              name: this.meta.skills[bId]?.name || (bId === 'bl_shell' ? 'รูนเปลือก' : bId),
              activeMs: 0,
            };
          }
          this.buffs[bId].activeMs += dt;
        }
      }
    }
    this.lastBuffSampleAt = now;

    // Update hero summary
    const durVals = Object.values(s.dur || {}).filter((v) => typeof v === 'number');
    const minDur = durVals.length ? Math.min(...durVals) : 100;
    const loadPct = s.load
      ? (s.load.pct != null ? Math.round(s.load.pct) : (s.load.cap > 0 ? Math.round((s.load.w / s.load.cap) * 100) : 0))
      : 0;
    const weaponId = equip.weapon || '';

    this.hero = {
      id: s.id || '',
      name: s.name || '',
      lv: s.lv || 1,
      lvMax: s.lvMax || 0,
      xp: s.xp || 0,
      xpNext: s.xpNext || 0,
      job: s.job || '',
      jobName: this.meta.jobs[s.job]?.name || s.job || '',
      jobLv: s.jobLv || 1,
      jobMax: s.jobMax || this.meta.jobs[s.job]?.maxJob || 0,
      jobXp: s.jobXp || 0,
      jobXpNext: s.jobXpNext || 0,
      hp: s.hp || 0,
      maxHp: s.maxHp || 1,
      sp: s.sp || 0,
      maxSp: s.maxSp || 1,
      dead: s.dead || 0,
      coins: s.coins ?? 0,
      pots: potCounts,
      loadPct,
      minDur,
      weaponId,
      weaponName: this.meta.items[weaponId]?.name || weaponId || '-',
      pas: [bl.pas, bl.pas2, bl.pas3].filter(Boolean).map((sp) => ({
        id: sp,
        name: this.meta.monsters[sp]?.name || sp,
      })),
      partyMemberIds: [...partyMemberIds],
      inParty: !!(s.party && partyMemberIds.size > 1),
    };

    // Keep actor names / party flags updated
    for (const [id, act] of Object.entries(this.actors)) {
      const pl = id === s.id ? s : this._playerMirrors.get(id);
      if (pl) {
        act.name = pl.name || act.name;
        act.job = pl.job || act.job;
        act.lv = pl.lv || act.lv;
      }
      act.inParty = id === s.id || partyMemberIds.has(id);
    }

    // Auto-close idle boss encounter after 15s inactivity
    if (this._activeBoss && !this._activeBoss.ended && now - this._activeBoss.lastAt > 15000) {
      this._activeBoss.ended = true;
      this._activeBoss = null;
    }

    this.lastSnapAt = now;
    this._dirty = true;
  }

  _recordRareDrop(at, cat, name, count = 1, unitPrice = 0) {
    this.drops.unshift({ at, cat, name, count, unitPrice });
    if (this.drops.length > 60) this.drops.pop();
    this._addLog(at, 'drop', `ดรอป ${name}${count > 1 ? ` ×${count}` : ''}`, this.meta.maps[this.mapId]?.name || this.mapId);
  }

  recordEvent(ev, now = this._now()) {
    if (!ev || !ev.type) return;
    const t = ev.t || now;
    this.lastActivityAt = t;
    const meId = this._heroId || '';

    if (ev.type === 'combat') {
      const actor = ev.sourceId || ev.actorId || '';
      const dmg = Math.max(0, Math.round(Number(ev.damage) || 0));

      // Party / nearby hero DPS meter (excludes own monster hits? monsters aren't in actor unless target)
      if (actor && ev.targetId !== actor && !this._monsterMirrors.has(actor)) {
        this._recordActorHit(actor, dmg, !!ev.crit, !!ev.miss || !!ev.evade || !!ev.refused, t);
      }

      if (meId && actor === meId && ev.targetId !== meId) {
        this._handleOwnOutgoingCombat(ev, dmg, t);
      } else if (meId && ev.targetId === meId) {
        this._handleIncomingCombat(ev, dmg, t);
      }
    } else if (ev.type === 'reaction') {
      const actor = ev.actorId || ev.sourceId || '';
      if (!meId || actor === meId) {
        const key = ev.key || 'reaction';
        const rx = this._ensureReaction(key);
        rx.count++;
        const meta = REACTION_META[key];
        this._addLog(t, 'reaction', `ปฏิกิริยา: ${meta?.name || key}${meta?.combo ? ' (' + meta.combo + ')' : ''}`);

        this._prunePendingReactions(t, 150);
        const prev = ev.targetId ? this._lastDirectHitByTarget.get(ev.targetId) : null;
        if (prev && t - prev.t <= 40 && !prev.reactionApplied) {
          prev.reactionApplied = true;
          if (meta?.hasMult) {
            this._reallocateReactionMultiplier(prev, key);
          }
          if (meta?.hasBlast) {
            this._pendingReactions.push({
              key,
              targetId: ev.targetId || null,
              t,
              triggerConsumed: true,
              triggerDmg: prev.dmg,
              multApplied: !!meta.hasMult,
              blastHits: 0,
            });
            if (this._pendingReactions.length > MAX_PENDING_REACTIONS) this._pendingReactions.shift();
          }
        } else if (meta?.hasBlast || meta?.hasMult) {
          this._pendingReactions.push({
            key,
            targetId: ev.targetId || null,
            t,
            triggerConsumed: false,
            triggerDmg: 0,
            multApplied: false,
            blastHits: 0,
          });
          if (this._pendingReactions.length > MAX_PENDING_REACTIONS) this._pendingReactions.shift();
        }
      }
    } else if (ev.type === 's2rune' || ev.type === 's2trap' || ev.type === 'shot') {
      const actor = ev.actorId || ev.sourceId || '';
      if (!meId || !actor || actor === meId) {
        this._handleNonDmgRuneEvent(ev, t);
      }
    } else if (ev.type === 'heal') {
      if (meId && ev.targetId === meId && ev.amount > 0) {
        const amt = Math.round(ev.amount);
        this.healTotal += amt;
        const idx = this._ringSlot(Math.floor(t / 1000));
        this._ringHeal[idx] += amt;
        if (ev.sourceId && ev.sourceId !== meId) {
          const srcName = this._playerMirrors.get(ev.sourceId)?.name || 'เพื่อน';
          this._addLog(t, 'heal', `${srcName} ฮีล +${amt}`, '', amt);
        }
      }
    } else if (ev.type === 'reward') {
      const xp = Math.max(0, Math.round(Number(ev.xp) || 0));
      const jobXp = Math.max(0, Math.round(Number(ev.jobXp) || 0));
      if (xp > 0 || jobXp > 0) {
        const idx = this._ringSlot(Math.floor(t / 1000));
        if (xp > 0) {
          this.totalXp += xp;
          this._ringXp[idx] += xp;
        }
        if (jobXp > 0) {
          this.totalJobXp += jobXp;
          this._ringJobXp[idx] += jobXp;
        }
      }
      if (ev.monsterType && !/^chest_/.test(ev.monsterType)) {
        this._recordKill(ev.monsterId || ev.targetId, ev.monsterType, t);
      }
    } else if (ev.type === 'cast' || ev.type === 'skill') {
      const actor = ev.actorId || ev.sourceId || '';
      if (meId && actor === meId && ev.skillId) {
        const rec = this._ensureSkill(ev.skillId, t);
        rec.casts++;
        rec.lastCastAt = t;
      }
    } else if (ev.type === 'castPush') {
      const actor = ev.actorId || ev.sourceId || '';
      if (!meId || actor === meId) this.castPushCount++;
    } else if (ev.type === 'castCancel') {
      const actor = ev.actorId || ev.sourceId || '';
      if (!meId || actor === meId) this.castCancelCount++;
    } else if (ev.type === 'lootPickup') {
      const cached = ev.lootId != null ? this._lootCache.get(ev.lootId) : null;
      const inst = ev.inst || cached?.inst;
      if (inst && ((inst.g || 0) >= 3 || inst.sh)) {
        const name = (inst.sh ? '✦ ' : '') + (this.meta.items[inst.id]?.name || inst.id);
        this._recordRareDrop(t, 'gear', name, 1, 0);
      }
    } else if (ev.type === 'error' && ev.message) {
      const msg = String(ev.message);
      let bucket = /^loot/i.test(msg) ? 'loot' : msg;
      if (!(bucket in this.errors) && Object.keys(this.errors).length >= MAX_ERRORS) {
        bucket = '(other)';
      }
      this.errors[bucket] = (this.errors[bucket] || 0) + 1;
      if (!/^loot/i.test(msg) && !/cooling down/i.test(msg)) {
        this._addLog(t, 'error', msg);
      }
    }

    this._dirty = true;
  }

  _recordActorHit(actorId, dmg, crit, miss, t) {
    let act = this.actors[actorId];
    if (!act) {
      const keys = Object.keys(this.actors);
      if (keys.length >= MAX_ACTORS) {
        let victimKey = null;
        let victimTime = Infinity;
        for (const k of keys) {
          if (k === this._heroId) continue;
          const candidate = this.actors[k];
          if (candidate.inParty) continue;
          if (candidate.lastAt < victimTime) {
            victimTime = candidate.lastAt;
            victimKey = k;
          }
        }
        if (!victimKey) {
          for (const k of keys) {
            if (k === this._heroId) continue;
            const candidate = this.actors[k];
            if (candidate.lastAt < victimTime) {
              victimTime = candidate.lastAt;
              victimKey = k;
            }
          }
        }
        if (victimKey) delete this.actors[victimKey];
      }
      const pl = actorId === this._heroId ? this.hero : this._playerMirrors.get(actorId);
      act = this.actors[actorId] = {
        id: actorId,
        name: pl?.name || (actorId === this._heroId ? 'คุณ' : actorId.slice(0, 8)),
        job: pl?.job || '',
        lv: pl?.lv || 0,
        inParty: actorId === this._heroId || (this.hero?.partyMemberIds || []).includes(actorId),
        dmg: 0,
        hits: 0,
        crits: 0,
        miss: 0,
        firstAt: t,
        lastAt: t,
      };
    }
    act.lastAt = t;
    if (miss) act.miss++;
    else {
      act.hits++;
      act.dmg += dmg;
      if (crit) act.crits++;
    }
  }

  _handleOwnOutgoingCombat(ev, dmg, t) {
    this._touchCombatWindow(t);
    this._prunePendingReactions(t, 120);

    const rawSkill = ev.skillId || '';
    const isCardArt = rawSkill.startsWith('bl_art_');
    const isWeaponProc = rawSkill.startsWith('wp_');
    const isChildRune = !isCardArt && rawSkill.startsWith('bl_');
    const childRuneKind = isChildRune ? (CHILD_SKILL_TO_RUNE[rawSkill] || rawSkill.slice(3)) : null;
    const isDot = !!ev.dot;
    const isMiss = !!(ev.miss || ev.evade || ev.refused);

    // Path 1: explicit server-tagged reaction damage hit
    let matchedRxKey = null;
    let reactionMode = null;
    if (!isChildRune && !isCardArt && !isWeaponProc && !isDot) {
      const explicitRx = resolveExplicitReactionKey(ev, rawSkill);
      if (explicitRx) {
        matchedRxKey = explicitRx;
        reactionMode = 'exact';
      } else if (rawSkill === 'reaction') {
        for (let i = this._pendingReactions.length - 1; i >= 0; i--) {
          const pr = this._pendingReactions[i];
          if (t - pr.t <= 120) {
            matchedRxKey = pr.key;
            reactionMode = 'exact';
            break;
          }
        }
      }
      if (matchedRxKey) {
        for (let i = this._pendingReactions.length - 1; i >= 0; i--) {
          const pr = this._pendingReactions[i];
          if (pr.key === matchedRxKey && t - pr.t <= 120) {
            pr.explicitSeen = true;
            break;
          }
        }
      }
    }

    // Path 2: untagged same-tick blast reaction correlation
    if (!matchedRxKey && !isMiss && !isChildRune && !isCardArt && !isWeaponProc && !isDot && !rawSkill && !ev.crit && !(Array.isArray(ev.runes) && ev.runes.length)) {
      for (let i = this._pendingReactions.length - 1; i >= 0; i--) {
        const pr = this._pendingReactions[i];
        if (t - pr.t > 80 || pr.explicitSeen) continue;
        const meta = REACTION_META[pr.key];
        if (!meta?.hasBlast) continue;
        if (!pr.triggerConsumed && ev.targetId && pr.targetId && ev.targetId === pr.targetId) continue;
        if (meta.blastOnlySelf && pr.targetId && ev.targetId && ev.targetId !== pr.targetId) continue;
        if (!meta.blastHitsSelf && pr.targetId && ev.targetId && ev.targetId === pr.targetId) continue;
        if (meta.maxBlastHits && pr.blastHits >= meta.maxBlastHits) continue;
        pr.blastHits++;
        matchedRxKey = pr.key;
        reactionMode = 'est';
        break;
      }
    }

    const mob = ev.targetId ? this._monsterMirrors.get(ev.targetId) : null;
    const dotInfo = isDot ? normalizeDotKind(rawSkill, ev, mob) : null;

    const parentSkillKey = matchedRxKey
      ? ('reaction_' + matchedRxKey)
      : isChildRune
        ? this._findParentSkillForChildRune(childRuneKind, ev.targetId, t)
        : isDot
          ? dotInfo.id
          : (rawSkill || '__basic__');

    const skillRec = this._ensureSkill(parentSkillKey, t);
    const el = this._resolveElement(ev, rawSkill || parentSkillKey);

    if (ev.miss) { this.totalMiss++; skillRec.miss++; }
    if (ev.evade) { this.totalEvade++; skillRec.evade++; }
    if (ev.refused) { this.totalRefused++; skillRec.refused++; }
    if (isMiss) return;

    const isBossTarget = !!(mob && !mob.dummy && (mob.boss || mob.rootBoss || mob.storyBoss));

    // Track last direct non-child skill hit per monster for shared proc rune attribution
    if (!isChildRune && !isDot && !matchedRxKey && ev.targetId) {
      this._lastHitByTarget.delete(ev.targetId);
      this._lastHitByTarget.set(ev.targetId, { t, skillKey: parentSkillKey });
      capMap(this._lastHitByTarget, MAX_LAST_HITS);
    }
    if (ev.targetId && !this._firstHitByTarget.has(ev.targetId)) {
      this._firstHitByTarget.set(ev.targetId, t);
      capMap(this._firstHitByTarget, MAX_FIRST_HITS);
    }

    // Totals & window ring
    this.totalDmgDealt += dmg;
    if (isChildRune) this.procDmgTotal += dmg;
    else if (matchedRxKey) {} // accounted in reactionDmgTotal
    else if (isDot) this.dotDmgTotal += dmg;
    else this.directDmgTotal += dmg;

    if (isChildRune) {
      skillRec.src.runeProc += dmg;
      this.srcTotals.runeProc += dmg;
      if (isDot) this._recordDotTick(dotInfo, dmg, !!ev.crit, el);
    } else if (matchedRxKey) {
      this.reactionDmgTotal += dmg;
      const rx = this._ensureReaction(matchedRxKey);
      if (reactionMode === 'exact') {
        skillRec.src.reactionExact += dmg;
        this.srcTotals.reactionExact += dmg;
        rx.exactDmg += dmg;
      } else {
        skillRec.src.reactionMod += dmg;
        this.srcTotals.reactionMod += dmg;
        rx.estDmg += dmg;
      }
      rx.dmg += dmg;
      rx.hits++;
      rx.maxHit = Math.max(rx.maxHit, dmg);
    } else if (isCardArt) {
      skillRec.src.cardExact += dmg;
      this.srcTotals.cardExact += dmg;
    } else if (isWeaponProc) {
      skillRec.src.gearExact += dmg;
      this.srcTotals.gearExact += dmg;
    } else if (isDot) {
      skillRec.src.dot += dmg;
      this.srcTotals.dot += dmg;
      this._recordDotTick(dotInfo, dmg, !!ev.crit, el);
    } else {
      let runeFactor = 1;
      const taggedSet = new Set();
      if (Array.isArray(ev.runes) && ev.runes.length) {
        for (const rKind of ev.runes) {
          taggedSet.add(rKind);
          if (!EST_MULTIPLIER_RUNES.has(rKind)) continue;
          const sock = skillRec.equippedRunes.find((r) => r.kind === rKind);
          const f = rolledRuneBonusFactor(rKind, sock?.tier || 1, sock?.qb || 0);
          if (f > 1.001) runeFactor *= f;
        }
      }
      for (const er of skillRec.equippedRunes) {
        if (!ALWAYS_ON_MOD_RUNES.has(er.kind) || taggedSet.has(er.kind)) continue;
        const f = rolledRuneBonusFactor(er.kind, er.tier, er.qb);
        if (f > 1.001) runeFactor *= f;
      }

      let wCard = 0;
      let wGear = 0;
      const addBucketSplit = (cardPct, gearPct, totalPct) => {
        const cg = cardPct + gearPct;
        if (cg <= 0) return;
        const T = Math.max(cg, totalPct || 0);
        const factor = (100 + T) / Math.max(100, 100 + T - cg);
        const lnF = Math.log(factor);
        wCard += lnF * (cardPct / cg);
        wGear += lnF * (gearPct / cg);
      };

      if (el) {
        addBucketSplit(this._cardMods.el?.[el] || 0, this._gearMods.el?.[el] || 0, this._totalMods.el?.[el] || 0);
      }
      if (isBossTarget) {
        addBucketSplit(this._cardMods.bossDmg || 0, this._gearMods.bossDmg || 0, this._totalMods.bossDmg || 0);
      }
      if (ev.crit) {
        addBucketSplit(this._cardMods.critDmg || 0, this._gearMods.critDmg || 0, this._totalMods.critDmg || 0);
      }
      if (!skillRec.isBasic) {
        addBucketSplit(0, this._gearMods.sk?.[parentSkillKey] || 0, this._totalMods.sk?.[parentSkillKey] || 0);
      }

      // Case II: pending reaction (arrived before its triggering direct hit on targetId)
      let reactMultKey = null;
      let wReact = 0;
      if (ev.targetId) {
        for (let i = this._pendingReactions.length - 1; i >= 0; i--) {
          const pr = this._pendingReactions[i];
          if (t - pr.t <= 80 && pr.targetId === ev.targetId && !pr.triggerConsumed) {
            pr.triggerConsumed = true;
            pr.triggerDmg = dmg;
            const rxMeta = REACTION_META[pr.key];
            if (rxMeta?.hasMult && !pr.multApplied) {
              pr.multApplied = true;
              reactMultKey = pr.key;
              wReact = Math.log(1 + (1 + this._reactPct / 100));
            }
            break;
          }
        }
      }

      const wRune = runeFactor > 1.0001 ? Math.log(runeFactor) : 0;
      const wSum = wRune + wCard + wGear + wReact;
      let baseDmg = dmg;
      let runeModAdd = 0;
      let cardModAdd = 0;
      let gearModAdd = 0;
      let reactionModAdd = 0;
      if (wSum > 1e-9 && dmg > 0) {
        baseDmg = dmg / Math.exp(wSum);
        const bonus = dmg - baseDmg;
        runeModAdd = bonus * (wRune / wSum);
        cardModAdd = bonus * (wCard / wSum);
        gearModAdd = bonus * (wGear / wSum);
        reactionModAdd = bonus * (wReact / wSum);
      }
      skillRec.src.skill += baseDmg;
      skillRec.src.runeMod += runeModAdd;
      skillRec.src.cardMod += cardModAdd;
      skillRec.src.gearMod += gearModAdd;
      skillRec.src.reactionMod += reactionModAdd;
      this.srcTotals.skill += baseDmg;
      this.srcTotals.runeMod += runeModAdd;
      this.srcTotals.cardMod += cardModAdd;
      this.srcTotals.gearMod += gearModAdd;
      this.srcTotals.reactionMod += reactionModAdd;

      if (reactionModAdd > 0 && reactMultKey) {
        this.reactionDmgTotal += reactionModAdd;
        const rx = this._ensureReaction(reactMultKey);
        rx.estDmg += reactionModAdd;
        rx.dmg += reactionModAdd;
        rx.hits++;
        rx.maxHit = Math.max(rx.maxHit, reactionModAdd);
      }

      if (ev.targetId) {
        this._lastDirectHitByTarget.delete(ev.targetId);
        this._lastDirectHitByTarget.set(ev.targetId, {
          t,
          dmg,
          skillKey: parentSkillKey,
          wRune,
          wCard,
          wGear,
          reactionApplied: !!reactMultKey,
          deltas: {
            skill: baseDmg,
            runeMod: runeModAdd,
            cardMod: cardModAdd,
            gearMod: gearModAdd,
            reactionMod: reactionModAdd,
          },
        });
        capMap(this._lastDirectHitByTarget, MAX_LAST_HITS);
      }
    }

    if (!isDot) this.totalHits++;
    if (ev.crit) {
      this.totalCrits++;
      this.totalCritDmg += dmg;
    }

    const sec = Math.floor(t / 1000);
    const idx = this._ringSlot(sec);
    this._ringDmg[idx] += dmg;
    const dps5Now = this._ringSum(this._ringDmg, sec, 5) / 5;
    if (dps5Now > this.peakDps5) this.peakDps5 = dps5Now;

    // Skill totals
    skillRec.totalDmg += dmg;
    skillRec.elements[el] = (skillRec.elements[el] || 0) + dmg;
    if (isChildRune) {
      skillRec.procChildDmg += dmg;
      if (isDot) skillRec.dotDmg += dmg;
      const ch = this._ensureRuneChild(skillRec, childRuneKind);
      ch.element = ch.element || el;
      ch.totalDmg += dmg;
      if (isDot) { ch.dotDmg += dmg; ch.dotTicks++; }
      else { ch.directDmg += dmg; ch.hits++; }
      if (ev.crit) { ch.crits++; ch.critDmg += dmg; }
      if (dmg > 0) {
        ch.minHit = Math.min(ch.minHit, dmg);
        ch.maxHit = Math.max(ch.maxHit, dmg);
      }
      this._addRollupRune(childRuneKind, parentSkillKey, { exactDmg: dmg, hits: isDot ? 0 : 1, triggers: isDot ? 0 : 1, crits: ev.crit ? 1 : 0 });
    } else {
      if (isDot) {
        skillRec.dotDmg += dmg;
        skillRec.dotTicks++;
      } else {
        skillRec.directDmg += dmg;
        skillRec.hits++;
      }
      if (ev.crit) {
        skillRec.crits++;
        skillRec.critDmg += dmg;
      }
      if (dmg > 0) {
        skillRec.minHit = Math.min(skillRec.minHit, dmg);
        skillRec.maxHit = Math.max(skillRec.maxHit, dmg);
      }
    }

    // Tagged modifier runes from server `ev.runes`
    if (Array.isArray(ev.runes) && ev.runes.length && !isChildRune && !isDot && !matchedRxKey) {
      const est = buildRuneBonusEstimate(skillRec, ev.runes);
      for (const rKind of ev.runes) {
        let rt = skillRec.runeTriggers[rKind];
        if (!rt) {
          rt = skillRec.runeTriggers[rKind] = {
            kind: rKind,
            name: runeName(rKind, this.meta),
            hits: 0,
            totalDmg: 0,
            crits: 0,
            estBonusDmg: 0,
          };
        }
        rt.hits++;
        rt.totalDmg += dmg;
        if (ev.crit) rt.crits++;

        let estAdd = 0;
        if (est.parts && est.sumWeights > 0) {
          const p = est.parts.find((x) => x.rKind === rKind);
          if (p) {
            const totalBonus = dmg - dmg / est.combinedFactor;
            estAdd = totalBonus * ((p.factor - 1) / est.sumWeights);
            rt.estBonusDmg += estAdd;
          }
        }
        this._addRollupRune(rKind, parentSkillKey, {
          exactDmg: 0,
          estBonusDmg: estAdd,
          hits: 0,
          triggers: 1,
          crits: ev.crit ? 1 : 0,
        });
      }
    }

    // Element breakdown
    let elRec = this.elements[el];
    if (!elRec) {
      const em = ELEMENT_META[el] || ELEMENT_META.neutral;
      elRec = this.elements[el] = { id: el, name: em.name, color: em.color, dmg: 0, hits: 0, crits: 0, critDmg: 0 };
    }
    elRec.dmg += dmg;
    if (!isDot) elRec.hits++;
    if (ev.crit) { elRec.crits++; elRec.critDmg += dmg; }

    // Monster, Armour & Boss Encounter breakdown
    if (mob && !mob.dummy) {
      const arm = this._armourOf(mob.type);
      if (!this.armours[arm]) {
        const am = ARMOUR_META[arm] || ARMOUR_META.unknown;
        this.armours[arm] = { id: arm, name: am.name, weak: am.weak, dmg: 0, hits: 0, crits: 0 };
      }
      this.armours[arm].dmg += dmg;
      if (!isDot) this.armours[arm].hits++;
      if (ev.crit) this.armours[arm].crits++;

      const spRec = this._ensureMonster(mob.type, mob.lv);
      spRec.dmgDealt += dmg;
      if (!isDot) spRec.hitsDealt++;

      if (mob.boss || mob.rootBoss || mob.storyBoss) {
        this._recordBossHit(mob, parentSkillKey, dmg, 0, !!ev.dead, t);
      }
    }
    if (ev.dead && ev.targetId && mob && !mob.dummy) {
      this._recordKill(ev.targetId, mob.type, t);
    }

    if (dmg >= 1 && !isDot && (ev.crit || isChildRune || matchedRxKey || dmg >= 150)) {
      const label = matchedRxKey
        ? `${REACTION_META[matchedRxKey]?.name || matchedRxKey} (ปฏิกิริยา)`
        : isChildRune
          ? `${runeName(childRuneKind, this.meta)} (${skillRec.name})`
          : skillRec.name;
      this._addLog(
        t,
        matchedRxKey ? 'reaction' : (isChildRune ? 'rune' : 'hit'),
        `${label} → ${dmg}${ev.crit ? ' CRIT!' : ''}`,
        mob?.type || '',
        dmg,
        !!ev.crit
      );
    }
  }

  _handleIncomingCombat(ev, dmg, t) {
    const srcMob = ev.sourceId ? this._monsterMirrors.get(ev.sourceId) : null;
    if (ev.miss || ev.evade) {
      this.dodges++;
      if (ev.lucky) this.luckyDodges++;
      return;
    }
    if (dmg > 0) {
      this.totalDmgTaken += dmg;
      this.hitsTaken++;
      const idx = this._ringSlot(Math.floor(t / 1000));
      this._ringTaken[idx] += dmg;
      if (srcMob && srcMob.type) {
        const spRec = this._ensureMonster(srcMob.type, srcMob.lv);
        spRec.dmgTaken += dmg;
        spRec.hitsTaken++;
        if (srcMob.boss || srcMob.rootBoss || srcMob.storyBoss) {
          this._recordBossHit(srcMob, null, 0, dmg, false, t);
        }
      }
    }
    if (ev.dead) {
      this.deaths++;
      if (srcMob?.type) this._ensureMonster(srcMob.type, srcMob.lv).deaths++;
      this._addLog(t, 'taken', `ตัวละครตาย`, srcMob?.type ? `${this.meta.monsters[srcMob.type]?.name || srcMob.type} (-${dmg})` : `-${dmg}`, dmg);
    }
  }

  _handleNonDmgRuneEvent(ev, t) {
    let rKind = null;
    if (ev.type === 'shot') rKind = 'bounce';
    else if (ev.type === 's2trap') rKind = 'trap';
    else if (ev.type === 's2rune') rKind = ev.rune || ev.k;
    if (!rKind) return;

    const parentKey = this._findParentSkillForChildRune(rKind, ev.targetId, t);
    const skillRec = this._ensureSkill(parentKey, t);
    const ch = this._ensureRuneChild(skillRec, rKind);
    ch.nonDmgCount++;
    this._addRollupRune(rKind, parentKey, { triggers: 1 });
  }

  _addRollupRune(rKind, parentSkillKey, { exactDmg = 0, estBonusDmg = 0, hits = 0, triggers = 0, crits = 0 } = {}) {
    let ru = this.runesRollup[rKind];
    if (!ru) {
      const def = RUNE_META[rKind];
      ru = this.runesRollup[rKind] = {
        kind: rKind,
        name: runeName(rKind, this.meta),
        cat: def?.cat || 'proc',
        el: def?.el || this.meta.runes[rKind]?.el || null,
        exactDmg: 0,
        estBonusDmg: 0,
        hits: 0,
        triggers: 0,
        crits: 0,
        parents: {},
      };
    }
    ru.exactDmg += exactDmg;
    ru.estBonusDmg += estBonusDmg;
    ru.hits += hits;
    ru.triggers += triggers;
    ru.crits += crits;
    if (parentSkillKey) {
      ru.parents[parentSkillKey] = (ru.parents[parentSkillKey] || 0) + exactDmg + estBonusDmg;
    }
  }

  _ensureMonster(type, lv = 0) {
    let rec = this.monsters[type];
    if (!rec) {
      const mMeta = this.meta.monsters[type];
      rec = this.monsters[type] = {
        type,
        name: mMeta?.name || type,
        element: mMeta?.element || 'neutral',
        armour: this._armourOf(type),
        lv: lv || 0,
        kills: 0,
        dmgDealt: 0,
        hitsDealt: 0,
        dmgTaken: 0,
        hitsTaken: 0,
        deaths: 0,
        ttkSumMs: 0,
        ttkCount: 0,
      };
    } else if (lv > 0 && !rec.lv) {
      rec.lv = lv;
    }
    return rec;
  }

  _recordKill(targetId, mobType, t) {
    if (targetId && this._countedKills.has(targetId)) return;
    if (targetId) {
      this._countedKills.set(targetId, t);
      capMap(this._countedKills, MAX_COUNTED_KILLS);
    }
    this.kills++;
    this.killsSinceCard++;
    this.killsSinceRune++;
    const idx = this._ringSlot(Math.floor(t / 1000));
    this._ringKills[idx] += 1;

    if (mobType) {
      const spRec = this._ensureMonster(mobType);
      spRec.kills++;
      const firstHit = targetId ? this._firstHitByTarget.get(targetId) : null;
      if (firstHit && t >= firstHit && t - firstHit <= 120000) {
        spRec.ttkSumMs += t - firstHit;
        spRec.ttkCount++;
      }
    }
    if (targetId) this._firstHitByTarget.delete(targetId);
  }

  _recordBossHit(mob, skillKey, dmgDealt, dmgTaken, dead, t) {
    let b = this._activeBoss;
    if (!b || b.id !== mob.id || b.ended) {
      const prev = this.bossEncounters.find((x) => x.id === mob.id && x.killed && t - x.lastAt <= 2000);
      if (prev) {
        b = prev;
      } else {
        b = this._activeBoss = {
          id: mob.id,
          type: mob.type,
          name: this.meta.monsters[mob.type]?.name || mob.type,
          mapName: this.meta.maps[this.mapId]?.name || this.mapId,
          startedAt: t,
          lastAt: t,
          ended: false,
          killed: false,
          dmgDealt: 0,
          dmgTaken: 0,
          skills: {},
        };
        this.bossEncounters.unshift(b);
        if (this.bossEncounters.length > 10) this.bossEncounters.pop();
      }
    }
    b.lastAt = t;
    b.dmgDealt += dmgDealt;
    b.dmgTaken += dmgTaken;
    if (skillKey && dmgDealt > 0) b.skills[skillKey] = (b.skills[skillKey] || 0) + dmgDealt;
    if (dead) {
      b.ended = true;
      b.killed = true;
      if (this._activeBoss === b) this._activeBoss = null;
    }
  }

  getSummary(now = this._now(), { includeLog = true } = {}) {
    const nowSec = Math.floor(now / 1000);
    const elapsedMs = Math.max(1000, now - this.startedAt);
    const activeMs = Math.max(1000, this.activeCombatMs || 1000);
    const dpsDivSec = (this.dpsMode === 'active' ? activeMs : elapsedMs) / 1000;
    const elapsedHrs = elapsedMs / 3600000;

    const dmg5 = this._ringSum(this._ringDmg, nowSec, 5);
    const dmg60 = this._ringSum(this._ringDmg, nowSec, 60);
    const taken5 = this._ringSum(this._ringTaken, nowSec, 5);
    const taken60 = this._ringSum(this._ringTaken, nowSec, 60);
    const heal60 = this._ringSum(this._ringHeal, nowSec, 60);
    const xp300 = this._ringSum(this._ringXp, nowSec, 300);
    const jobXp300 = this._ringSum(this._ringJobXp, nowSec, 300);
    const kills300 = this._ringSum(this._ringKills, nowSec, 300);

    const dps5 = dmg5 / 5;
    const dps60 = dmg60 / Math.min(60, elapsedMs / 1000);
    const dpsTotal = this.totalDmgDealt / dpsDivSec;
    const dtps5 = taken5 / 5;
    const dtps60 = taken60 / Math.min(60, elapsedMs / 1000);
    const dtpsTotal = this.totalDmgTaken / dpsDivSec;
    const hps60 = heal60 / Math.min(60, elapsedMs / 1000);

    const critRate = this.totalHits > 0 ? (this.totalCrits / this.totalHits) * 100 : 0;
    const critShare = this.totalDmgDealt > 0 ? (this.totalCritDmg / this.totalDmgDealt) * 100 : 0;

    const xpWinMs = Math.max(1000, Math.min(300000, elapsedMs));
    const xpRateMin = (xp300 / xpWinMs) * 60000;
    const jobXpRateMin = (jobXp300 / xpWinMs) * 60000;
    const killsPerMin = (kills300 / xpWinMs) * 60000;

    const baseMaxed = !!(this.hero && this.hero.lvMax > 0 && this.hero.lv >= this.hero.lvMax);
    const jobMaxed = !!(this.hero && this.hero.jobMax > 0 && this.hero.jobLv >= this.hero.jobMax);
    const xpLeft = Math.max(0, (this.hero?.xpNext || 0) - (this.hero?.xp || 0));
    const jobXpLeft = Math.max(0, (this.hero?.jobXpNext || 0) - (this.hero?.jobXp || 0));
    const xpPct = baseMaxed ? 100 : (this.hero?.xpNext > 0 ? Math.min(100, (this.hero.xp / this.hero.xpNext) * 100) : 0);
    const jobXpPct = jobMaxed ? 100 : (this.hero?.jobXpNext > 0 ? Math.min(100, (this.hero.jobXp / this.hero.jobXpNext) * 100) : 0);
    const xpEtaSec = !baseMaxed && xpRateMin > 0 && xpLeft > 0 ? (xpLeft / xpRateMin) * 60 : null;
    const jobXpEtaSec = !jobMaxed && jobXpRateMin > 0 && jobXpLeft > 0 ? (jobXpLeft / jobXpRateMin) * 60 : null;

    // Liquid economy calculation
    const coinsDelta = this._baselineReady ? this._lastCoins - this._startCoins : 0;
    const matValNow = this._matsValue(this._lastMats);
    const matValDelta = this._baselineReady ? matValNow - this._startMatsVal : 0;
    const potValNow = this._potValue(this._lastPots);
    const potValDelta = this._baselineReady ? potValNow - this._startPotVal : 0;
    const netProfit = coinsDelta + matValDelta + potValDelta;
    const potCostPerHr = this.potCostTotal / elapsedHrs;
    const netProfitPerHr = netProfit / elapsedHrs;

    const hpPotsUsedTotal = this.potsUsed.red + this.potsUsed.red_m + this.potsUsed.red_l;
    const spPotsUsedTotal = this.potsUsed.blue + this.potsUsed.blue_m + this.potsUsed.blue_l;
    const totalPotsUsed = hpPotsUsedTotal + spPotsUsedTotal;
    const hpPotRateMin = hpPotsUsedTotal / (elapsedMs / 60000);
    const spPotRateMin = spPotsUsedTotal / (elapsedMs / 60000);
    const hpStock = (this.hero?.pots?.red || 0) + (this.hero?.pots?.red_m || 0) + (this.hero?.pots?.red_l || 0);
    const spStock = (this.hero?.pots?.blue || 0) + (this.hero?.pots?.blue_m || 0) + (this.hero?.pots?.blue_l || 0);

    // Format Skills with nested Rune details
    const skillsList = Object.values(this.skills)
      .filter((sk) => sk.totalDmg > 0 || sk.equippedRunes.length > 0 || sk.miss > 0 || sk.evade > 0 || sk.refused > 0)
      .map((sk) => {
        const directAndDotHits = sk.hits;
        const trigList = Object.values(sk.runeTriggers).map((rt) => {
          const nonHits = Math.max(0, directAndDotHits - rt.hits);
          const nonDmg = Math.max(0, sk.directDmg - rt.totalDmg);
          const avgWith = rt.hits > 0 ? rt.totalDmg / rt.hits : 0;
          const avgWithout = nonHits > 0 ? nonDmg / nonHits : 0;
          return {
            ...rt,
            triggerRate: directAndDotHits > 0 ? (rt.hits / directAndDotHits) * 100 : 0,
            avgWith,
            avgWithout,
          };
        });
        const childList = Object.values(sk.runeChildren).map((ch) => ({
          ...ch,
          minHit: ch.minHit === Infinity ? 0 : ch.minHit,
          avgHit: ch.hits > 0 ? ch.directDmg / ch.hits : (ch.dotTicks > 0 ? ch.dotDmg / ch.dotTicks : 0),
          critRate: ch.hits > 0 ? (ch.crits / ch.hits) * 100 : 0,
          shareOfSkill: sk.totalDmg > 0 ? (ch.totalDmg / sk.totalDmg) * 100 : 0,
          shareOfTotal: this.totalDmgDealt > 0 ? (ch.totalDmg / this.totalDmgDealt) * 100 : 0,
        }));
        return {
          id: sk.id,
          name: sk.name,
          element: sk.element || this.activeElement || 'neutral',
          isBasic: sk.isBasic,
          sourceCat: (sk.directDmg === 0 && sk.procChildDmg === 0 && sk.dotDmg > 0)
            ? 'dot'
            : (sk.sourceCat || sourceCatOfSkill(sk.id)),
          sources: formatSources(sk.src),
          totalDmg: sk.totalDmg,
          directDmg: sk.directDmg,
          dotDmg: sk.dotDmg,
          procChildDmg: sk.procChildDmg,
          sharePct: this.totalDmgDealt > 0 ? (sk.totalDmg / this.totalDmgDealt) * 100 : 0,
          dps: sk.totalDmg / dpsDivSec,
          hits: sk.hits,
          dotTicks: sk.dotTicks,
          crits: sk.crits,
          critRate: sk.hits > 0 ? (sk.crits / sk.hits) * 100 : 0,
          avgHit: sk.hits > 0 ? sk.directDmg / sk.hits : (sk.dotTicks > 0 ? sk.dotDmg / sk.dotTicks : 0),
          minHit: sk.minHit === Infinity ? 0 : sk.minHit,
          maxHit: sk.maxHit,
          casts: sk.casts,
          miss: sk.miss,
          evade: sk.evade,
          refused: sk.refused,
          equippedRunes: sk.equippedRunes,
          runeTriggers: trigList.sort((a, b) => (b.estBonusDmg || b.hits) - (a.estBonusDmg || a.hits)),
          runeChildren: childList.sort((a, b) => b.totalDmg - a.totalDmg),
        };
      })
      .sort((a, b) => b.totalDmg - a.totalDmg);

    // Rollup all runes across skills (plus equipped passive/always-on multiplier or utility runes)
    const rollupMap = new Map();
    for (const ru of Object.values(this.runesRollup)) {
      rollupMap.set(ru.kind, { ...ru, equippedOn: [] });
    }
    for (const sk of skillsList) {
      for (const er of sk.equippedRunes) {
        let ru = rollupMap.get(er.kind);
        if (!ru) {
          const def = RUNE_META[er.kind];
          ru = {
            kind: er.kind,
            name: er.name,
            cat: def?.cat || 'modifier',
            el: def?.el || null,
            exactDmg: 0,
            estBonusDmg: 0,
            hits: 0,
            triggers: 0,
            crits: 0,
            parents: {},
            equippedOn: [],
          };
          rollupMap.set(er.kind, ru);
        }
        ru.equippedOn.push(`${sk.name} (${'I'.repeat(er.tier)})`);
        if (ALWAYS_ON_MOD_RUNES.has(er.kind) && sk.directDmg > 0 && !sk.runeTriggers.some((rt) => rt.kind === er.kind)) {
          const f = rolledRuneBonusFactor(er.kind, er.tier, er.qb);
          if (f > 1.001) {
            const est = sk.directDmg - sk.directDmg / f;
            ru.estBonusDmg += est;
            ru.triggers += sk.hits;
            ru.parents[sk.id] = (ru.parents[sk.id] || 0) + est;
            sk.runeTriggers.push({
              kind: er.kind,
              name: er.name,
              hits: sk.hits,
              totalDmg: sk.directDmg,
              crits: sk.crits,
              estBonusDmg: est,
              triggerRate: 100,
              avgWith: sk.avgHit,
              avgWithout: sk.avgHit / f,
              alwaysOn: true,
            });
          }
        }
      }
    }
    const runesSummary = [...rollupMap.values()]
      .map((ru) => {
        const impact = ru.exactDmg + ru.estBonusDmg;
        return {
          ...ru,
          impactDmg: impact,
          sharePct: this.totalDmgDealt > 0 ? (impact / this.totalDmgDealt) * 100 : 0,
          dps: impact / dpsDivSec,
        };
      })
      .sort((a, b) => b.impactDmg - a.impactDmg || b.triggers - a.triggers);

    // Sparkline (last 120 seconds)
    const sparkline = [];
    for (let s = nowSec - 119; s <= nowSec; s++) {
      const idx = ((s % RING_SIZE) + RING_SIZE) % RING_SIZE;
      const hit = this._ringSec[idx] === s;
      sparkline.push({ t: s, dps: hit ? this._ringDmg[idx] : 0, dtps: hit ? this._ringTaken[idx] : 0 });
    }

    const mpMeta = this.meta.maps[this.mapId];
    const lvGap = this.hero && this.mobAvgLv > 0 ? this.mobAvgLv - this.hero.lv : 0;

    return {
      tabId: this.tabId,
      paused: this.paused,
      dpsMode: this.dpsMode,
      startedAt: this.startedAt,
      elapsedMs,
      activeCombatMs: this.activeCombatMs,
      isNight: this.isNight,
      activeElement: this.activeElement || 'neutral',
      rtt: {
        cur: this.rtt.cur,
        avg: this.rtt.count > 0 ? Math.round(this.rtt.sum / this.rtt.count) : null,
        max: this.rtt.max || null,
      },
      hero: this.hero,
      map: {
        id: this.mapId,
        name: mpMeta?.name || this.mapId || '-',
        lvText: mpMeta?.lvText || '',
        channelId: this.channelId,
        players: this.playerCount,
        mobs: this.mobCount,
        mobAvgLv: this.mobAvgLv,
        lvGap,
        partyThread: this.partyThread,
      },
      kpis: {
        dps5,
        dps60,
        dpsTotal,
        peakDps5: this.peakDps5,
        totalDmgDealt: this.totalDmgDealt,
        directDmg: this.directDmgTotal,
        dotDmg: this.dotDmgTotal,
        procDmg: this.procDmgTotal,
        reactionDmg: this.reactionDmgTotal,
        totalHits: this.totalHits,
        critRate,
        critShare,
        missCount: this.totalMiss,
        evadeCount: this.totalEvade,
        refusedCount: this.totalRefused,
        dtps5,
        dtps60,
        dtpsTotal,
        totalDmgTaken: this.totalDmgTaken,
        hps60,
        healTotal: this.healTotal,
        dodgeRate: this.hitsTaken + this.dodges > 0 ? (this.dodges / (this.hitsTaken + this.dodges)) * 100 : 0,
        luckyDodges: this.luckyDodges,
        deaths: this.deaths,
        totalXp: this.totalXp,
        totalJobXp: this.totalJobXp,
        xpPerMin: xpRateMin,
        xpPerHr: xpRateMin * 60,
        xpEtaSec,
        xpPct,
        baseMaxed,
        baseLvGained: this._baselineReady ? Math.max(0, (this.hero?.lv || 1) - this._startLv) : 0,
        jobXpPerMin: jobXpRateMin,
        jobXpPerHr: jobXpRateMin * 60,
        jobXpEtaSec,
        jobXpPct,
        jobMaxed,
        jobLvGained: this._baselineReady ? Math.max(0, (this.hero?.jobLv || 1) - this._startJobLv) : 0,
        kills: this.kills,
        killsPerMin,
        killsSinceCard: this.killsSinceCard,
        killsSinceRune: this.killsSinceRune,
      },
      econ: {
        potsUsed: { ...this.potsUsed },
        hpPotsUsedTotal,
        spPotsUsedTotal,
        hpPotRateMin,
        spPotRateMin,
        hpPotEtaMin: hpPotRateMin > 0.01 ? hpStock / hpPotRateMin : null,
        spPotEtaMin: spPotRateMin > 0.01 ? spStock / spPotRateMin : null,
        potCostTotal: this.potCostTotal,
        potCostPerHr,
        coinsDelta,
        matValDelta,
        netProfit,
        netProfitPerHr,
        dpsPerPot: totalPotsUsed > 0 ? dpsTotal / (totalPotsUsed / (elapsedMs / 60000)) : dpsTotal,
        dmgPerCoin: this.potCostTotal > 0 ? this.totalDmgDealt / this.potCostTotal : this.totalDmgDealt,
      },
      sparkline,
      skills: skillsList,
      runes: runesSummary,
      elements: Object.values(this.elements)
        .map((e) => ({
          ...e,
          sharePct: this.totalDmgDealt > 0 ? (e.dmg / this.totalDmgDealt) * 100 : 0,
          dps: e.dmg / dpsDivSec,
          avgHit: e.hits > 0 ? e.dmg / e.hits : 0,
          critRate: e.hits > 0 ? (e.crits / e.hits) * 100 : 0,
        }))
        .sort((a, b) => b.dmg - a.dmg),
      dots: Object.values(this.dots)
        .map((d) => ({
          ...d,
          minTick: d.minTick === Infinity ? 0 : d.minTick,
          avgTick: d.ticks > 0 ? d.dmg / d.ticks : 0,
          sharePct: this.totalDmgDealt > 0 ? (d.dmg / this.totalDmgDealt) * 100 : 0,
          dps: d.dmg / dpsDivSec,
        }))
        .sort((a, b) => b.dmg - a.dmg || b.ticks - a.ticks),
      reactions: Object.values(this.reactions)
        .map((r) => ({
          ...r,
          avgDmg: r.count > 0 ? r.dmg / r.count : (r.hits > 0 ? r.dmg / r.hits : 0),
          sharePct: this.totalDmgDealt > 0 ? (r.dmg / this.totalDmgDealt) * 100 : 0,
          dps: r.dmg / dpsDivSec,
        }))
        .sort((a, b) => b.dmg - a.dmg || b.count - a.count),
      armours: Object.values(this.armours)
        .map((a) => ({
          ...a,
          sharePct: this.totalDmgDealt > 0 ? (a.dmg / this.totalDmgDealt) * 100 : 0,
          avgHit: a.hits > 0 ? a.dmg / a.hits : 0,
          critRate: a.hits > 0 ? (a.crits / a.hits) * 100 : 0,
        }))
        .sort((a, b) => b.dmg - a.dmg),
      monsters: Object.values(this.monsters)
        .map((m) => ({
          ...m,
          avgTtkSec: m.ttkCount > 0 ? (m.ttkSumMs / m.ttkCount) / 1000 : null,
          avgHitTaken: m.hitsTaken > 0 ? m.dmgTaken / m.hitsTaken : 0,
        }))
        .sort((a, b) => b.dmgTaken - a.dmgTaken || b.dmgDealt - a.dmgDealt),
      bossEncounters: this.bossEncounters.map((b) => {
        const durSec = Math.max(1, (b.lastAt - b.startedAt) / 1000);
        const topSkills = Object.entries(b.skills)
          .sort((x, y) => y[1] - x[1])
          .slice(0, 3)
          .map(([sid, sdmg]) => ({ name: this.skills[sid]?.name || this.meta.skills[sid]?.name || sid, dmg: sdmg }));
        return { ...b, durSec, dps: b.dmgDealt / durSec, topSkills };
      }),
      buffs: Object.values(this.buffs)
        .map((b) => ({
          ...b,
          uptimePct: this.buffSampleMs > 0 ? Math.min(100, (b.activeMs / this.buffSampleMs) * 100) : 0,
        }))
        .sort((a, b) => b.uptimePct - a.uptimePct),
      execution: {
        castPush: this.castPushCount,
        castCancel: this.castCancelCount,
        errors: Object.entries(this.errors).map(([msg, count]) => ({ msg, count })).sort((a, b) => b.count - a.count),
      },
      actors: (() => {
        const list = Object.values(this.actors);
        const tot = list.reduce((s, a) => s + a.dmg, 0);
        return list
          .map((a) => {
            const actSec = Math.max(1, (a.lastAt - a.firstAt) / 1000);
            return {
              ...a,
              dps: a.dmg / actSec,
              sharePct: tot > 0 ? (a.dmg / tot) * 100 : 0,
              critRate: a.hits > 0 ? (a.crits / a.hits) * 100 : 0,
              isMe: a.id === this._heroId,
            };
          })
          .sort((a, b) => b.dmg - a.dmg);
      })(),
      drops: this.drops.slice(0, 40),
      sources: formatSources(this.srcTotals),
      combatLog: includeLog ? this.combatLog.slice(-150).reverse() : [],
    };
  }

  createRunSnapshot(label = '', now = this._now()) {
    const s = this.getSummary(now, { includeLog: false });
    const id = 'run_' + now + '_' + Math.random().toString(36).slice(2, 6);
    const heroName = s.hero?.name || 'Hero';
    const jobName = s.hero?.jobName || '';
    const title = label || `${heroName} Lv${s.hero?.lv || 1} ${jobName} @ ${s.map.name}`;
    return {
      id,
      createdAt: now,
      label: title,
      hero: s.hero
        ? {
            name: s.hero.name,
            lv: s.hero.lv,
            job: s.hero.jobName,
            weapon: s.hero.weaponName,
            pas: s.hero.pas,
          }
        : null,
      map: s.map.name,
      elapsedMs: s.elapsedMs,
      kpis: {
        dpsTotal: Math.round(s.kpis.dpsTotal),
        dps60: Math.round(s.kpis.dps60),
        critRate: +s.kpis.critRate.toFixed(1),
        xpPerMin: Math.round(s.kpis.xpPerMin),
        jobXpPerMin: Math.round(s.kpis.jobXpPerMin),
        dtpsTotal: +s.kpis.dtpsTotal.toFixed(1),
        kills: s.kpis.kills,
      },
      econ: {
        potCostPerHr: Math.round(s.econ.potCostPerHr),
        netProfitPerHr: Math.round(s.econ.netProfitPerHr),
      },
      skills: s.skills.slice(0, 12).map((sk) => ({
        id: sk.id,
        name: sk.name,
        totalDmg: sk.totalDmg,
        dps: Math.round(sk.dps),
        sharePct: +sk.sharePct.toFixed(1),
        critRate: +sk.critRate.toFixed(1),
        equippedRunes: sk.equippedRunes.map((r) => `${r.name} ${'I'.repeat(r.tier)}`),
      })),
      runes: s.runes.slice(0, 12).map((r) => ({
        kind: r.kind,
        name: r.name,
        exactDmg: r.exactDmg,
        estBonusDmg: Math.round(r.estBonusDmg),
        triggers: r.triggers,
      })),
      dots: s.dots.slice(0, 8).map((d) => ({
        id: d.id,
        name: d.name,
        dmg: d.dmg,
        ticks: d.ticks,
        sharePct: +d.sharePct.toFixed(1),
      })),
      reactions: s.reactions.slice(0, 10).map((r) => ({
        key: r.key,
        name: r.name,
        count: r.count,
        dmg: Math.round(r.dmg),
        sharePct: +r.sharePct.toFixed(1),
      })),
      elements: s.elements,
    };
  }

  exportJSON(now = this._now()) {
    return JSON.stringify(this.getSummary(now), null, 2);
  }

  exportCSV(now = this._now()) {
    const s = this.getSummary(now);
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [
      ['Section', 'ID', 'Name', 'Element', 'TotalDMG', 'Share%', 'DPS', 'Hits', 'Crit%', 'AvgHit', 'MaxHit', 'Triggers', 'EstBonusDMG', 'Runes'].map(esc).join(','),
    ];
    for (const sk of s.skills) {
      const rNames = sk.equippedRunes.map((r) => `${r.name} ${'I'.repeat(r.tier)}`).join('; ');
      lines.push(['Skill', sk.id, sk.name, sk.element, sk.totalDmg, sk.sharePct.toFixed(2), sk.dps.toFixed(1), sk.hits, sk.critRate.toFixed(1), sk.avgHit.toFixed(0), sk.maxHit, '', '', rNames].map(esc).join(','));
      for (const ch of sk.runeChildren) {
        lines.push(['RuneProc', `${sk.id}:${ch.kind}`, ch.name, ch.element || sk.element, ch.totalDmg, ch.shareOfTotal.toFixed(2), '', ch.hits, ch.critRate.toFixed(1), ch.avgHit.toFixed(0), ch.maxHit, ch.nonDmgCount || ch.hits, '', sk.name].map(esc).join(','));
      }
      for (const rt of sk.runeTriggers) {
        lines.push(['RuneMod', `${sk.id}:${rt.kind}`, rt.name, sk.element, rt.totalDmg, '', '', rt.hits, '', rt.avgWith.toFixed(0), '', rt.hits, rt.estBonusDmg.toFixed(0), sk.name].map(esc).join(','));
      }
    }
    for (const d of s.dots) {
      const critPct = d.ticks > 0 ? ((d.crits / d.ticks) * 100).toFixed(1) : '0.0';
      lines.push(['DoT', d.id, d.name, d.element, d.dmg, d.sharePct.toFixed(2), d.dps.toFixed(1), d.ticks, critPct, d.avgTick.toFixed(0), d.maxTick, d.ticks, '', d.sourceBucket].map(esc).join(','));
    }
    for (const r of s.reactions) {
      lines.push(['Reaction', r.key, r.name, r.element, Math.round(r.dmg), r.sharePct.toFixed(2), r.dps.toFixed(1), r.hits, '', r.avgDmg.toFixed(0), Math.round(r.maxHit), r.count, Math.round(r.estDmg), r.combo].map(esc).join(','));
    }
    return lines.join('\n');
  }
}
