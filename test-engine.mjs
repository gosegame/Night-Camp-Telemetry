import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TelemetryEngine, parseSocketedRune, rolledRuneBonusFactor } from './engine.js';

function makeClock(start = 1_700_000_000_000) {
  let t = start;
  const fn = () => t;
  fn.advance = (ms) => { t += ms; return t; };
  fn.get = () => t;
  return fn;
}

function seedBaseMeta(eng, clock) {
  eng.ingestBatch([
    {
      kind: 's2',
      s2: {
        potions: {
          red: { price: 5, amt: 50 },
          red_m: { price: 16, amt: 150 },
          red_l: { price: 38, amt: 350 },
          blue: { price: 3, amt: 35 },
          blue_m: { price: 9, amt: 100 },
          blue_l: { price: 22, amt: 250 },
        },
        materials: { mat_boar_tusk: 14, mat_king_crown: 135, mat_vp_silver_leaf: 18 },
        armourTypeOf: { boar: 'flesh', golem: 'heavy', wolf: 'hide', phantom: 'spirit', boss_dragon: 'heavy' },
      },
    },
    {
      kind: 'meta',
      patch: {
        skills: {
          rg_piercer: { name: 'ธนูใบไม้ทะลวง', element: 'wind', type: 'phys' },
          gale: { name: 'ศรสายลม', element: 'wind', type: 'phys' },
          rg_storm: { name: 'พายุศร', element: 'wind', type: 'phys' },
          truesight: { name: 'เนตรวิหค', element: null, type: 'buff' },
        },
        monsters: {
          boar: { name: 'หมูป่าเขี้ยวตัน', element: 'earth' },
          golem: { name: 'โกเลมหินแดง', element: 'neutral' },
          wolf: { name: 'หมาป่า', element: 'earth' },
          boss_dragon: { name: 'มังกรลาวา', element: 'fire', boss: true },
        },
        items: { bw_honeycomb: { name: 'ธนูรวงผึ้ง', slot: 'weapon', element: null } },
        maps: { canyon: { name: 'ผาหินแดง', lvText: 'Lv 60-72', minLv: 60, maxLv: 72 } },
        jobs: { ranger: { name: 'เรนเจอร์', tier: 2 } },
      },
    },
  ]);
}

function snapFrame(eng, clock, overrides = {}) {
  const base = {
    mapId: 'canyon',
    channelId: '7',
    rtt: 42,
    isNight: true,
    activeElement: 'holy',
    self: {
      id: 'hero-1',
      name: 'ทดสอบ',
      lv: 35,
      xp: 1000,
      xpNext: 10000,
      job: 'ranger',
      jobLv: 15,
      jobXp: 200,
      jobXpNext: 2000,
      hp: 800,
      maxHp: 1000,
      sp: 200,
      maxSp: 300,
      dead: 0,
      coins: 5000,
      potions: 50,
      potionsM: 10,
      potionsL: 0,
      spPotions: 40,
      spPotionsM: 0,
      spPotionsL: 0,
      mats: { mat_boar_tusk: 0 },
      dur: { weapon: 90 },
      load: { w: 40, cap: 100, pct: 40 },
      equip: { weapon: 'bw_honeycomb' },
      buffs: { truesight: 20, pr_aspersio: 30 },
      meters: { ptThread: 1 },
      buildLoot: {
        runes: {
          rg_piercer: ['execute:2:0.08:-0.05', 'wildfire:1:0:0'],
          gale: ['focus:2:0:0', 'arc:1:0:0'],
          bl_basic: ['arc:1:0:0'],
        },
        pas: 'zombie',
      },
      runePouchIds: [{ id: 1, kind: 'trap', tier: 1 }],
      party: { id: 'p1', leader: 'hero-1', members: [{ id: 'hero-1', name: 'ทดสอบ', job: 'ranger', lv: 35 }, { id: 'ally-2', name: 'พระเพื่อน', job: 'bishop', lv: 34 }] },
    },
    monsters: [
      { id: 'm1', type: 'boar', lv: 36, hp: 1000, maxHp: 1000, dead: 0 },
      { id: 'm2', type: 'golem', lv: 40, hp: 3000, maxHp: 3000, dead: 0 },
      { id: 'b1', type: 'boss_dragon', lv: 45, hp: 50000, maxHp: 50000, dead: 0, boss: true },
    ],
    players: [{ id: 'ally-2', name: 'พระเพื่อน', job: 'bishop', lv: 34 }],
    loot: [],
  };
  const merged = {
    ...base,
    ...overrides,
    self: {
      ...base.self,
      ...(overrides.self || {}),
    },
  };
  eng.recordSnapshot(merged, clock.get());
}

test('parseSocketedRune & rolledRuneBonusFactor match bl_runes math', () => {
  const p = parseSocketedRune('execute:2:0.1:-0.05');
  assert.equal(p.kind, 'execute');
  assert.equal(p.tier, 2);
  assert.equal(p.grade, 'gold');
  // Execute tier 2 base = 1.45, +10% bonus roll -> 1 + 0.45 * 1.1 = 1.495
  const f = rolledRuneBonusFactor('execute', 2, 0.1);
  assert.ok(Math.abs(f - 1.495) < 1e-6);
});

test('per-skill & per-rune attribution: ev.runes, unique proc, shared proc by target recency, always-on mod', () => {
  const clock = makeClock();
  const eng = new TelemetryEngine({ tabId: 1, now: clock });
  seedBaseMeta(eng, clock);
  snapFrame(eng, clock);

  // 1) rg_piercer hits m1: 1 without execute, 1 WITH execute tagged
  clock.advance(1000);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'rg_piercer', damage: 1000, crit: false });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'rg_piercer', damage: 1486, crit: true, runes: ['execute', 'curse'] });

  // 2) bl_wildfire hits m1 -> only rg_piercer owns wildfire, so must attach deterministically to rg_piercer!
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'bl_wildfire', damage: 400, crit: false });

  // 3) Shared rune `arc` owned by BOTH gale and bl_basic:
  // Hit m1 with gale -> then bl_arc hits m1 -> attributed to gale
  clock.advance(200);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'gale', damage: 500, crit: false });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'bl_arc', damage: 250, crit: false });

  // Hit m2 with basic (skillId: null) -> then bl_arc hits m2 -> attributed to __basic__
  clock.advance(200);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: null, damage: 300, crit: false });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: 'bl_arc', damage: 220, crit: false });

  // Miss & DoT & non-damage rune events
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: 'gale', damage: 0, miss: true });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: 'burn', damage: 120, dot: true });
  eng.recordEvent({ type: 's2rune', actorId: 'hero-1', k: 'wildfire', targetId: 'm1' });
  eng.recordEvent({ type: 's2trap', actorId: 'hero-1', targetId: 'm2', phase: 'boom' });
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', key: 'overload' });

  clock.advance(1000);
  const s = eng.getSummary(clock.get());

  // Total dealt: 1000 + 1486 + 400 + 500 + 250 + 300 + 220 + 120 = 4276
  assert.equal(s.kpis.totalDmgDealt, 4276);
  assert.equal(s.kpis.missCount, 1);
  assert.equal(s.kpis.dotDmg, 120);
  assert.equal(s.kpis.procDmg, 400 + 250 + 220);

  const piercer = s.skills.find((x) => x.id === 'rg_piercer');
  assert.ok(piercer);
  assert.equal(piercer.totalDmg, 1000 + 1486 + 400);
  assert.equal(piercer.procChildDmg, 400);
  assert.equal(piercer.runeChildren.length, 1);
  assert.equal(piercer.runeChildren[0].kind, 'wildfire');
  assert.equal(piercer.runeChildren[0].totalDmg, 400);

  const execTrig = piercer.runeTriggers.find((x) => x.kind === 'execute');
  assert.ok(execTrig);
  assert.equal(execTrig.hits, 1);
  assert.equal(execTrig.triggerRate, 50);
  assert.equal(execTrig.avgWith, 1486);
  assert.equal(execTrig.avgWithout, 1000);
  assert.ok(execTrig.estBonusDmg > 400 && execTrig.estBonusDmg < 520);

  // Check shared arc split cleanly
  const gale = s.skills.find((x) => x.id === 'gale');
  const basic = s.skills.find((x) => x.id === '__basic__');
  assert.equal(gale.runeChildren.find((c) => c.kind === 'arc').totalDmg, 250);
  assert.equal(basic.runeChildren.find((c) => c.kind === 'arc').totalDmg, 220);
  // Always-on focus rune estimated on gale
  assert.ok(gale.runeTriggers.some((x) => x.kind === 'focus' && x.alwaysOn && x.estBonusDmg > 100));

  // Elements check: wind (1000+1486+500+250=3236), fire (400+120=520), holy fallback on basic+arc (300+220... wait arc has el=wind! So basic=300 holy, bl_arc=250+220=470 wind)
  const windEl = s.elements.find((e) => e.id === 'wind');
  const fireEl = s.elements.find((e) => e.id === 'fire');
  const holyEl = s.elements.find((e) => e.id === 'holy');
  assert.equal(windEl.dmg, 1000 + 1486 + 500 + 250 + 220);
  assert.equal(fireEl.dmg, 400 + 120);
  assert.equal(holyEl.dmg, 300);
  assert.equal(s.reactions[0].key, 'overload');
});

test('armour, monster TTK, boss split, economy S2, dry streak, party DPS, A/B compare & exports', () => {
  const clock = makeClock();
  const eng = new TelemetryEngine({ tabId: 2, now: clock });
  seedBaseMeta(eng, clock);
  snapFrame(eng, clock);

  // Fight m1 (boar) for 2 seconds and kill it
  clock.advance(1000);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'rg_piercer', damage: 600, crit: false });
  eng.recordEvent({ type: 'combat', sourceId: 'ally-2', targetId: 'm1', skillId: 'holylight', damage: 400, crit: false });
  clock.advance(2000);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'rg_piercer', damage: 700, dead: true });
  // Duplicate reward kill event for same m1 must NOT double-count kill!
  eng.recordEvent({ type: 'reward', monsterId: 'm1', monsterType: 'boar', xp: 500, jobXp: 300, gold: 80 });

  // Incoming damage + dodge + heal + buff sample
  eng.recordEvent({ type: 'combat', sourceId: 'b1', targetId: 'hero-1', damage: 250 });
  eng.recordEvent({ type: 'combat', sourceId: 'b1', targetId: 'hero-1', damage: 0, miss: true, lucky: true });
  eng.recordEvent({ type: 'heal', sourceId: 'ally-2', targetId: 'hero-1', amount: 180 });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'b1', skillId: 'rg_storm', damage: 3000, dead: true });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'b1', skillId: 'bl_wildfire', damage: 200 });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: 'rg_piercer', damage: 900, runes: ['execute'] });

  // Snapshot after consuming 2 red_s (10c) + 1 red_m (16c) + 1 blue_s (3c) = 29c, +1000 coins, +10 boar tusks (+140c) + 1 boar card!
  clock.advance(1000);
  snapFrame(eng, clock, {
    self: {
      coins: 6000,
      potions: 48,
      potionsM: 9,
      spPotions: 39,
      mats: { mat_boar_tusk: 10, bl_card_boar: 1 },
      runePouchIds: [{ id: 1, kind: 'trap', tier: 1 }, { id: 99, kind: 'heavy', tier: 1 }],
    },
  });

  const s = eng.getSummary(clock.get());
  assert.equal(s.kpis.kills, 2); // m1 + b1
  assert.equal(s.kpis.killsSinceCard, 0); // card dropped reset streak
  assert.equal(s.kpis.killsSinceRune, 0); // rune dropped reset streak
  assert.equal(s.kpis.dodgeRate, 50);
  assert.equal(s.kpis.luckyDodges, 1);
  assert.equal(s.kpis.healTotal, 180);
  assert.equal(s.econ.potCostTotal, 29);
  // Liquid = +1000 coins + 140 mats (bl_card_boar=0 unpriced) - 29 potVal = +1111c
  assert.equal(s.econ.netProfit, 1111);

  const boarMob = s.monsters.find((m) => m.type === 'boar');
  assert.equal(boarMob.kills, 1);
  assert.equal(boarMob.avgTtkSec, 2);
  assert.equal(s.armours.find((a) => a.id === 'flesh').dmg, 1300);
  assert.equal(s.bossEncounters.length, 1);
  assert.equal(s.bossEncounters[0].killed, true);
  assert.equal(s.buffs.find((b) => b.id === 'truesight').uptimePct, 100);
  assert.equal(s.actors.length, 2);
  assert.ok(s.actors.some((a) => a.id === 'ally-2' && a.inParty));

  // Run snapshot & CSV/JSON export
  const runSnap = eng.createRunSnapshot('Test Run');
  assert.equal(runSnap.label, 'Test Run');
  assert.ok(JSON.parse(eng.exportJSON()).skills.length >= 2);
  const csv = eng.exportCSV();
  assert.ok(csv.includes('RuneProc'));
  assert.ok(csv.includes('RuneMod'));
});

test('zero in-game DOM injection in main-hook.js & bridge.js', () => {
  const dir = 'D:/games-re/nightcamp/telemetry-ext';
  for (const fname of ['main-hook.js', 'bridge.js']) {
    const src = fs.readFileSync(path.join(dir, fname), 'utf8');
    assert.equal(/\b(createElement|appendChild|insertBefore|innerHTML|outerHTML|insertAdjacentHTML|shadowRoot)\b/.test(src), false, `${fname} must never inject DOM`);
  }
  const mf = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  assert.equal(mf.manifest_version, 3);
  assert.ok(mf.permissions.includes('alarms'), 'manifest must include alarms permission for 5m idle stop');
  assert.ok(mf.side_panel?.default_path === 'panel.html');
  for (const sz of [16, 48, 128]) {
    const iconBuf = fs.readFileSync(path.join(dir, `icons/icon${sz}.png`));
    assert.deepEqual([...iconBuf.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  }
});

test('manual opt-in capture (OFF by default), zero WebSocket override, 5m UI-closed auto-stop & EXP colors', () => {
  const dir = 'D:/games-re/nightcamp/telemetry-ext';
  const hookSrc = fs.readFileSync(path.join(dir, 'main-hook.js'), 'utf8');
  const bridgeSrc = fs.readFileSync(path.join(dir, 'bridge.js'), 'utf8');
  const bgSrc = fs.readFileSync(path.join(dir, 'background.js'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(dir, 'panel.css'), 'utf8');

  const hookCode = hookSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.match(hookSrc, /let captureEnabled = false;/);
  assert.equal(/\bWebSocket\b/.test(hookCode), false, 'main-hook code must never touch or wrap game WebSocket');

  assert.match(bridgeSrc, /let captureEnabled = false;/);
  assert.match(bridgeSrc, /if\s*\(invalidated\s*\|\|\s*!captureEnabled\)\s*return;/);
  assert.equal(/^  connect\(\);\s*$/m.test(bridgeSrc), false, 'bridge must not connect unconditionally on startup');

  assert.match(bgSrc, /const IDLE_STOP_MINUTES = 5;/);
  assert.match(bgSrc, /chrome\.alarms\?\.create/);
  assert.match(bgSrc, /chrome\.alarms\?\.onAlarm/);

  assert.match(cssSrc, /\.bar-fill\.base\s*\{\s*background:\s*var\(--gold\)/);
  assert.match(cssSrc, /\.bar-fill\.job\s*\{\s*background:\s*var\(--green\)/);
});

test('Base & Job EXP tracking: rates, %, ETAs, levels gained, MAX detection, and promotion reset', () => {
  const clock = makeClock();
  const eng = new TelemetryEngine({ tabId: 3, now: clock });
  seedBaseMeta(eng, clock);
  snapFrame(eng, clock, {
    self: {
      lv: 20,
      lvMax: 99,
      xp: 2500,
      xpNext: 10000,
      job: 'knight',
      jobLv: 48,
      jobMax: 50,
      jobXp: 500,
      jobXpNext: 2000,
    },
  });

  // Gain 1500 Base XP & 500 Job XP across 1 minute
  clock.advance(60000);
  eng.recordEvent({ type: 'reward', monsterId: 'm10', monsterType: 'boar', xp: 1500, jobXp: 500 });
  snapFrame(eng, clock, {
    self: {
      lv: 21,
      lvMax: 99,
      xp: 4000,
      xpNext: 10000,
      job: 'knight',
      jobLv: 49,
      jobMax: 50,
      jobXp: 1000,
      jobXpNext: 2000,
    },
  });

  const s1 = eng.getSummary(clock.get());
  assert.equal(s1.kpis.totalXp, 1500);
  assert.equal(s1.kpis.totalJobXp, 500);
  assert.equal(s1.kpis.xpPerMin, 1500);
  assert.equal(s1.kpis.xpPerHr, 90000);
  assert.equal(s1.kpis.xpPct, 40);
  assert.equal(s1.kpis.xpEtaSec, 240); // (10000 - 4000) / 1500 * 60
  assert.equal(s1.kpis.baseLvGained, 1);
  assert.equal(s1.kpis.jobXpPerMin, 500);
  assert.equal(s1.kpis.jobXpPerHr, 30000);
  assert.equal(s1.kpis.jobXpPct, 50);
  assert.equal(s1.kpis.jobXpEtaSec, 120); // (2000 - 1000) / 500 * 60
  assert.equal(s1.kpis.jobLvGained, 1);
  assert.equal(s1.kpis.jobMaxed, false);

  const runSnap = eng.createRunSnapshot('EXP Test');
  assert.equal(runSnap.kpis.xpPerMin, 1500);
  assert.equal(runSnap.kpis.jobXpPerMin, 500);

  // Reaching jobMax marks jobMaxed = true, jobXpPct = 100, jobXpEtaSec = null
  snapFrame(eng, clock, {
    self: {
      lv: 21,
      lvMax: 99,
      xp: 4000,
      xpNext: 10000,
      job: 'knight',
      jobLv: 50,
      jobMax: 50,
      jobXp: 0,
      jobXpNext: 0,
    },
  });
  const sMax = eng.getSummary(clock.get());
  assert.equal(sMax.kpis.jobMaxed, true);
  assert.equal(sMax.kpis.jobXpPct, 100);
  assert.equal(sMax.kpis.jobXpEtaSec, null);

  // Promoting job resets jobLvGained baseline to the new class
  snapFrame(eng, clock, {
    self: {
      lv: 21,
      lvMax: 99,
      xp: 4000,
      xpNext: 10000,
      job: 'crusader',
      jobLv: 1,
      jobMax: 50,
      jobXp: 0,
      jobXpNext: 1000,
    },
  });
  assert.equal(eng.getSummary(clock.get()).kpis.jobLvGained, 0);
});

test('24-hour continuous soak keeps all caches bounded and rolling/total metrics exact', () => {
  const clock = makeClock();
  const eng = new TelemetryEngine({ tabId: 4, now: clock });
  seedBaseMeta(eng, clock);
  snapFrame(eng, clock);

  // Initial party member hit at t0 (must never be evicted by passerby pressure)
  eng.recordEvent({ type: 'combat', sourceId: 'ally-2', targetId: 'm1', skillId: 'holylight', damage: 400 });

  // Simulate 23h 55m (2,870 ticks of 30s = 86,100s) with high entity churn
  for (let step = 1; step <= 2870; step++) {
    clock.advance(30000);
    const t = clock.get();
    const mobId = `m_${step}`;
    const otherId = `other_${step % 155}`;
    const pouchSlice = [];
    for (let j = 0; j < 4; j++) pouchSlice.push({ id: step + j, kind: 'trap', tier: 1 });

    eng.recordSnapshot({
      mapId: 'canyon',
      channelId: '7',
      self: {
        id: 'hero-1',
        name: 'ทดสอบ',
        lv: 35,
        xp: 1000,
        xpNext: 10000,
        job: 'ranger',
        jobLv: 15,
        jobXp: 200,
        jobXpNext: 2000,
        hp: 900,
        maxHp: 1000,
        sp: 250,
        maxSp: 300,
        coins: 5000 + step,
        potions: 50,
        spPotions: 40,
        mats: {},
        equip: { weapon: 'bw_honeycomb' },
        runePouchIds: pouchSlice,
        party: { id: 'p1', members: [{ id: 'hero-1', name: 'ทดสอบ' }, { id: 'ally-2', name: 'พระเพื่อน' }] },
      },
      monsters: [{ id: mobId, type: 'boar', lv: 36, dead: 0 }],
      players: [{ id: otherId, name: `ผู้เล่น_${step % 155}`, job: 'ranger', lv: 30 }],
      loot: [{ id: `loot_${step}`, material: 'mat_boar_tusk', count: 1 }],
    }, t);

    eng.recordEvent({ type: 'combat', sourceId: otherId, targetId: mobId, skillId: 'double', damage: 150 });
    eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: mobId, skillId: 'rg_piercer', damage: 200, dead: true });
    eng.recordEvent({ type: 'reward', monsterId: mobId, monsterType: 'boar', xp: 100, jobXp: 60 });
    if (step <= 100) {
      eng.recordEvent({ type: 'error', message: `err_kind_${step % 85}` });
    }
  }

  // Simulate final 5m (300 ticks of 1s -> exact hour 24 = 86,400s)
  for (let k = 1; k <= 300; k++) {
    clock.advance(1000);
    const t = clock.get();
    const mobId = `m_end_${k}`;
    eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: mobId, skillId: 'rg_piercer', damage: 500, crit: false });
    eng.recordEvent({ type: 'reward', monsterId: mobId, monsterType: 'boar', xp: 400, jobXp: 250 });
    if (k % 2 === 0) {
      eng.recordEvent({ type: 'combat', sourceId: mobId, targetId: 'hero-1', damage: 50 });
    }
  }

  // Hard memory-bound assertions at hour 24
  assert.ok(eng._monsterMirrors.size <= 500);
  assert.ok(eng._playerMirrors.size <= 300);
  assert.ok(eng._lootCache.size <= 300);
  assert.ok(eng._firstHitByTarget.size <= 400);
  assert.ok(eng._lastHitByTarget.size <= 400);
  assert.ok(eng._countedKills.size <= 500);
  assert.ok(eng._seenRuneIds.size <= 500);
  assert.ok(Object.keys(eng.actors).length <= 80);
  assert.ok(eng.actors['hero-1'] && eng.actors['ally-2'], 'hero and party member must not be evicted');
  assert.ok(Object.keys(eng.errors).length <= 51);
  assert.ok(eng.errors['(other)'] > 0);
  assert.ok(eng.combatLog.length <= 200);

  // Rolling windows & 24h cumulative sums remain exact
  const now = clock.get();
  const s = eng.getSummary(now);
  assert.equal(s.kpis.totalDmgDealt, 2870 * 200 + 300 * 500);
  assert.equal(s.kpis.totalXp, 2870 * 100 + 300 * 400);
  assert.equal(s.kpis.totalJobXp, 2870 * 60 + 300 * 250);
  assert.equal(s.kpis.dps5, 500);
  assert.equal(s.kpis.dps60, 500);
  assert.equal(s.kpis.xpPerMin, 24000);
  assert.equal(s.kpis.jobXpPerMin, 15000);
  assert.equal(s.sparkline.length, 120);
  assert.ok(s.sparkline.every((p) => p.dps === 500));

  const sNoLog = eng.getSummary(now, { includeLog: false });
  assert.equal(sNoLog.combatLog.length, 0);
});

test('per-skill & global 6-source damage breakdown: skill, runeProc, runeMod, card, gear, DoT', () => {
  const clock = makeClock();
  const eng = new TelemetryEngine({ tabId: 5, now: clock });
  seedBaseMeta(eng, clock);
  snapFrame(eng, clock, {
    self: {
      cardMods: { critDmg: 15, bossDmg: 0, el: { wind: 10 } },
      gearMods: { critDmg: 0, bossDmg: 0, el: { wind: 10 }, sk: { rg_piercer: 20 } },
      totalMods: { critDmg: 15, bossDmg: 0, el: { wind: 20 }, sk: { rg_piercer: 20 } },
    },
  });

  clock.advance(1000);
  // 1) Skill hit with execute rune + crit (triggers card critDmg+el + gear el+sk) + bl_wildfire proc
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'rg_piercer', damage: 2000, crit: true, runes: ['execute'] });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'bl_wildfire', damage: 500, crit: false });

  // 2) Card passive attack (bl_art_fire) must be classified as card, NOT runeProc
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'bl_art_fire', damage: 700, crit: false });

  // 3) Weapon proc attack (wp_bolt) must be classified as gear
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'wp_bolt', damage: 600, crit: false });

  // 4) Pure non-rune DoT (burn)
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'burn', damage: 180, dot: true });

  clock.advance(1000);
  const s = eng.getSummary(clock.get());

  const piercer = s.skills.find((x) => x.id === 'rg_piercer');
  assert.ok(piercer);
  assert.equal(piercer.sourceCat, 'skill');
  assert.ok(piercer.sources.skill > 0);
  assert.equal(piercer.sources.runeProc, 500);
  assert.ok(piercer.sources.runeMod > 0);
  assert.ok(piercer.sources.card > 0);
  assert.ok(piercer.sources.gear > 0);
  assert.equal(piercer.sources.dot, 0);
  const piercerSum = piercer.sources.skill + piercer.sources.runeProc + piercer.sources.runeMod + piercer.sources.card + piercer.sources.gear + piercer.sources.dot;
  assert.ok(Math.abs(piercerSum - piercer.totalDmg) < 1e-6, 'per-skill segments must sum to totalDmg');

  const artSkill = s.skills.find((x) => x.id === 'bl_art_fire');
  assert.ok(artSkill);
  assert.equal(artSkill.sourceCat, 'card');
  assert.equal(artSkill.sources.card, 700);
  assert.equal(artSkill.sources.runeProc, 0);

  const wpSkill = s.skills.find((x) => x.id === 'wp_bolt');
  assert.ok(wpSkill);
  assert.equal(wpSkill.sourceCat, 'gear');
  assert.equal(wpSkill.sources.gear, 600);

  const burnSkill = s.skills.find((x) => x.id === 'burn');
  assert.ok(burnSkill);
  assert.equal(burnSkill.sources.dot, 180);

  const g = s.sources;
  const globalSum = g.skill + g.runeProc + g.runeMod + g.card + g.gear + g.dot;
  assert.ok(Math.abs(globalSum - s.kpis.totalDmgDealt) < 1e-6, 'global 6 sources must sum to totalDmgDealt');
  assert.equal(g.runeProc, 500);
  assert.equal(g.dot, 180);
  assert.ok(g.cardExact === 700 && g.cardMod > 0);
  assert.ok(g.gearExact === 600 && g.gearMod > 0);
});

test('per-DoT separation & empty-skillId DoT inference without dumping into __basic__', () => {
  const clock = makeClock();
  const eng = new TelemetryEngine({ tabId: 6, now: clock });
  seedBaseMeta(eng, clock);
  snapFrame(eng, clock, {
    self: {
      buildLoot: {
        runes: { rg_piercer: ['venom:2:0:0'] },
      },
    },
    monsters: [
      { id: 'm1', type: 'boar', lv: 36, dead: 0, st: { burn: 2 } },
      { id: 'm2', type: 'golem', lv: 40, dead: 0, poisoned: true },
      { id: 'm3', type: 'wolf', lv: 37, dead: 0, st: { burn: 1 }, poisoned: true },
      { id: 'm4', type: 'boar', lv: 36, dead: 0 },
    ],
  });

  clock.advance(500);
  // Explicit DoTs
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'burn', damage: 200, dot: true });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: 'poison', damage: 150, dot: true });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'rp_bleed', damage: 180, dot: true });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'as_bleed', damage: 220, dot: true });
  // Rune Proc DoT (bl_venom) must count in runeProc, NOT double-counted in dot
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'bl_venom', damage: 300, dot: true });

  // Untagged DoTs (skillId: null) inferred via snapshot mirror + targetSt
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: null, damage: 100, dot: true }); // snapshot st.burn -> burn
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: null, damage: 90, dot: true });  // snapshot poisoned -> poison
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm3', skillId: null, damage: 110, dot: true }); // both -> __dot_burn_poison__
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm4', skillId: null, damage: 70, dot: true, targetSt: { burn: true, poison: false } }); // targetSt -> burn

  clock.advance(500);
  const s = eng.getSummary(clock.get());

  // NONE dumped into __basic__
  assert.equal(s.skills.some((x) => x.id === '__basic__'), false);

  const burnDot = s.dots.find((d) => d.id === 'burn');
  const poisonDot = s.dots.find((d) => d.id === 'poison');
  const rpDot = s.dots.find((d) => d.id === 'rp_bleed');
  const asDot = s.dots.find((d) => d.id === 'as_bleed');
  const venomDot = s.dots.find((d) => d.id === 'bl_venom');
  const bothDot = s.dots.find((d) => d.id === '__dot_burn_poison__');

  assert.equal(burnDot.dmg, 200 + 100 + 70);
  assert.equal(burnDot.ticks, 3);
  assert.equal(burnDot.inferred, false); // had explicit burn tick too
  assert.equal(burnDot.sourceBucket, 'dot');

  assert.equal(poisonDot.dmg, 150 + 90);
  assert.equal(poisonDot.ticks, 2);
  assert.equal(rpDot.dmg, 180);
  assert.equal(asDot.dmg, 220);

  assert.equal(bothDot.dmg, 110);
  assert.equal(bothDot.inferred, true);

  assert.equal(venomDot.dmg, 300);
  assert.equal(venomDot.sourceBucket, 'runeProc');

  // No double counting: bl_venom is in runeProc (300), all other DoTs in dot
  const expectedDotBucket = 200 + 150 + 180 + 220 + 100 + 90 + 110 + 70;
  assert.equal(s.sources.runeProc, 300);
  assert.equal(s.sources.dot, expectedDotBucket);
  assert.equal(s.kpis.dotDmg, expectedDotBucket);
  assert.equal(s.kpis.totalDmgDealt, expectedDotBucket + 300);
});

test('elemental reactions (all 3 wire paths, both event orderings, 7-source sum invariant, exports & bounds)', () => {
  const clock = makeClock();
  const eng = new TelemetryEngine({ tabId: 7, now: clock });
  seedBaseMeta(eng, clock);
  snapFrame(eng, clock, {
    self: {
      reactPct: 30, // boost = 1.3 -> mult k = 1 + 1.3 = 2.3
      cardMods: { critDmg: 0, bossDmg: 0, el: { fire: 20 } },
      gearMods: { critDmg: 0, bossDmg: 0, el: { wind: 15 }, sk: { gale: 10 } },
      totalMods: { critDmg: 0, bossDmg: 0, el: { fire: 20, wind: 15 }, sk: { gale: 10 } },
      buildLoot: { runes: { gale: ['execute:2:0:0'] } },
    },
    monsters: [
      { id: 'm1', type: 'boar', lv: 36, dead: 0 },
      { id: 'm2', type: 'golem', lv: 40, dead: 0 },
      { id: 'm3', type: 'wolf', lv: 37, dead: 0 },
      { id: 'm4', type: 'boar', lv: 36, dead: 0 },
      { id: 'm5', type: 'boar', lv: 36, dead: 0 },
    ],
  });

  // Path 1: Explicit server-tagged reaction hits (`reaction_overload` and `ev.reaction: 'poisonfire'`)
  clock.advance(100);
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm1', key: 'overload' });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'reaction_overload', damage: 900 });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: 'poisonfire', reaction: 'poisonfire', damage: 600 });

  // Path 2a: Untagged same-tick overload AFTER skill hit
  clock.advance(200);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'gale', damage: 1000, runes: ['execute'] });
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm1', key: 'overload' });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: null, damage: 750 }); // blast hits self
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: null, damage: 750 }); // blast hits neighbor

  // Path 2b: Untagged same-tick overload BEFORE basic trigger hit -> basic hit must NOT be swallowed!
  clock.advance(200);
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm1', key: 'overload' });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: null, damage: 500 }); // triggering basic hit
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: null, damage: 400 }); // overload blast on self

  // Path 2c: Superconduct chain capped at 3 non-self mobs (4th neighbor stays basic)
  clock.advance(200);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'gale', damage: 800 });
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm1', key: 'superconduct' });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: null, damage: 450 }); // 1
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm3', skillId: null, damage: 450 }); // 2
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm4', skillId: null, damage: 450 }); // 3 (cap)
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm5', skillId: null, damage: 210 }); // beyond cap -> __basic__

  // Path 2d: Mist single self-target burst (neighbor hit must NOT attach)
  clock.advance(200);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'rg_piercer', damage: 400 });
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm1', key: 'mist' });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: null, damage: 1100 }); // self burst

  // Path 3a: Case I in-place multiplier (`cleanse`, hit-then-reaction within 40ms, zero card/gear mods on holy)
  clock.advance(200);
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: 'rg_piercer', element: 'holy', damage: 2300 });
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm2', key: 'cleanse' });

  // Path 3b: Case II in-place multiplier (`steam`, reaction-then-hit) + AoE splash on non-self mob only
  clock.advance(200);
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm1', key: 'steam' });
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'rg_piercer', element: 'fire', damage: 2760 }); // 1000 * 1.2 * 2.3 = 2760
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm2', skillId: null, damage: 680 }); // steam AoE splash on m2

  // Utility reactions (`wildfire`, `conduct`) -> count++, dmg === 0
  clock.advance(200);
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm1', key: 'wildfire' });
  eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: 'm2', key: 'conduct' });

  // Fire a few burns too
  eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: 'm1', skillId: 'burn', damage: 160, dot: true });

  clock.advance(500);
  const s = eng.getSummary(clock.get());

  // Exact + Est reaction checks
  const rxOver = s.reactions.find((r) => r.key === 'overload');
  const rxPf = s.reactions.find((r) => r.key === 'poisonfire');
  const rxSc = s.reactions.find((r) => r.key === 'superconduct');
  const rxMist = s.reactions.find((r) => r.key === 'mist');
  const rxCleanse = s.reactions.find((r) => r.key === 'cleanse');
  const rxSteam = s.reactions.find((r) => r.key === 'steam');
  const rxWild = s.reactions.find((r) => r.key === 'wildfire');
  const rxCond = s.reactions.find((r) => r.key === 'conduct');

  assert.equal(rxOver.exactDmg, 900);
  assert.equal(rxOver.estDmg, 750 + 750 + 400);
  assert.equal(rxOver.count, 3);
  assert.equal(rxPf.exactDmg, 600);
  assert.equal(rxSc.estDmg, 450 * 3);
  assert.equal(rxMist.estDmg, 1100);
  // cleanse: 2300 / 2.3 = 1000 base -> 1300 est reaction mult bonus
  assert.ok(Math.abs(rxCleanse.estDmg - 1300) < 1e-6);
  // steam: (2760 - 1000) * (ln(2.3) / (ln(1.2) + ln(2.3))) + 680 AoE
  const wFire = Math.log(1.2), wRx = Math.log(2.3);
  const expectedSteamMult = (2760 - 1000) * (wRx / (wFire + wRx));
  assert.ok(Math.abs(rxSteam.estDmg - (expectedSteamMult + 680)) < 1e-6);
  assert.equal(rxWild.count, 1);
  assert.equal(rxWild.dmg, 0);
  assert.equal(rxCond.count, 1);
  assert.equal(rxCond.dmg, 0);

  // Triggering basic hit (500) + beyond-cap m5 (210) must be on __basic__
  const basic = s.skills.find((sk) => sk.id === '__basic__');
  assert.equal(basic.totalDmg, 500 + 210);

  // Explicit reaction skill row category
  const rxSkill = s.skills.find((sk) => sk.id === 'reaction_overload');
  assert.equal(rxSkill.sourceCat, 'reaction');

  // Strict 7-source global & per-skill sum invariants
  const g = s.sources;
  const sum7 = g.skill + g.runeProc + g.runeMod + g.card + g.gear + g.dot + g.reaction;
  assert.ok(Math.abs(sum7 - s.kpis.totalDmgDealt) < 1e-6, 'global 7 sources must sum exactly to totalDmgDealt');
  for (const sk of s.skills) {
    const ss = sk.sources;
    const skSum = ss.skill + ss.runeProc + ss.runeMod + ss.card + ss.gear + ss.dot + ss.reaction;
    assert.ok(Math.abs(skSum - sk.totalDmg) < 1e-6, `skill ${sk.id} 7 sources must sum to totalDmg`);
  }

  // Exports & RunSnapshot
  const csv = eng.exportCSV(clock.get());
  assert.ok(csv.includes('"DoT"'));
  assert.ok(csv.includes('"Reaction"'));
  const json = JSON.parse(eng.exportJSON(clock.get()));
  assert.ok(json.dots.length >= 1 && json.reactions.length >= 6 && json.sources.reaction > 0);
  const snap = eng.createRunSnapshot('Rx Run', clock.get());
  assert.ok(snap.dots.length >= 1 && snap.reactions.length >= 6);

  // Bounded pending reactions & direct hits caches
  for (let i = 0; i < 450; i++) {
    clock.advance(10);
    eng.recordEvent({ type: 'combat', sourceId: 'hero-1', targetId: `tx_${i}`, skillId: 'gale', damage: 100 });
    eng.recordEvent({ type: 'reaction', actorId: 'hero-1', targetId: `tx_${i}`, key: 'overload' });
  }
  assert.ok(eng._pendingReactions.length <= 16);
  assert.ok(eng._lastDirectHitByTarget.size <= 400);
});
