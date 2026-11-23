/* Read-only passive telemetry tap for Night Camp Online (MAIN world).
 * Zero DOM injection, zero WebSocket send interference. */
(function () {
  'use strict';
  if (window.__ncTelemetryHooked) return;
  window.__ncTelemetryHooked = true;

  const ORIGIN = window.location.origin;
  const BATCH_FLUSH_MS = 250;
  const BATCH_FLUSH_COUNT = 40;
  const SNAP_THROTTLE_MS = 1000;
  const EL_ENUM = [null, 'fire', 'water', 'wind'];
  const INTERESTING_EVENTS = new Set([
    'combat', 'reward', 'reaction', 's2rune', 's2trap', 'shot',
    'heal', 'teamBuff', 'revive', 'lootPickup', 'cast', 'skill',
    'castPush', 'castCancel', 'error', 'server_shutdown', 'connection_error'
  ]);

  const sentMeta = {
    s2: false,
    skills: new Set(),
    monsters: new Set(),
    items: new Set(),
    runes: new Set(),
    mats: new Set(),
    maps: new Set(),
    jobs: new Set(),
  };

  let queue = [];
  let flushTimer = 0;
  let lastSnapSentAt = 0;
  let lastSnapSig = '';
  let sawDomStream = false;
  let fallbackBound = false;
  let captureEnabled = false;
  let checkTimer = 0;
  let fallbackChecks = 0;

  const nc = () => window.NC || {};

  function pushMsg(item) {
    queue.push(item);
    if (queue.length >= BATCH_FLUSH_COUNT) {
      flush();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flush, BATCH_FLUSH_MS);
    }
  }

  function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = 0;
    }
    if (!queue.length) return;
    const batch = queue;
    queue = [];
    try {
      window.postMessage({ __ncTel: 1, batch }, ORIGIN);
    } catch (_) {
      // Ignore transient structured-clone errors
    }
  }

  function emitMetaPatch(patch) {
    if (patch && Object.keys(patch).length) {
      pushMsg({ kind: 'meta', t: Date.now(), patch });
    }
  }

  function addSkillMeta(patch, sid) {
    if (!sid || sentMeta.skills.has(sid)) return;
    const S = nc().SKILLS?.[sid];
    if (!S) return;
    sentMeta.skills.add(sid);
    (patch.skills ||= {})[sid] = {
      name: S.name || sid,
      element: S.element || null,
      type: S.type || null,
      kind: S.kind || null,
      icon: S.icon || null,
    };
  }

  function addMonsterMeta(patch, type) {
    if (!type || sentMeta.monsters.has(type)) return;
    const M = nc().MONSTERS?.[type] || nc().SPECIES?.[type];
    const isBoss = !!(M?.boss || nc().BOSSES?.[type]);
    if (!M && !isBoss) return;
    sentMeta.monsters.add(type);
    (patch.monsters ||= {})[type] = {
      name: M?.name || type,
      element: M?.element || 'neutral',
      boss: isBoss,
    };
  }

  function addItemMeta(patch, id) {
    if (!id || sentMeta.items.has(id)) return;
    const it = nc().ITEMS?.[id];
    if (!it) return;
    sentMeta.items.add(id);
    (patch.items ||= {})[id] = {
      name: it.name || id,
      slot: it.slot || '',
      wtype: it.wtype || '',
      element: it.element || null,
      rarity: it.rarity || 'common',
      grade: it.gs?.grade || it.sw?.grade || it.wc?.grade || it.grade || 1,
    };
  }

  function addMatMeta(patch, id) {
    if (!id || sentMeta.mats.has(id)) return;
    const m = nc().MATERIALS?.[id];
    const s2p = nc().OnlineS2?.view?.economy?.materials?.[id];
    if (!m && s2p == null) return;
    sentMeta.mats.add(id);
    (patch.mats ||= {})[id] = {
      name: m?.name || id,
      price: s2p != null ? s2p : (m?.base != null ? m.base : (m?.price || 0)),
      rare: !!m?.rare,
    };
  }

  function addMapMeta(patch, mapId) {
    if (!mapId || sentMeta.maps.has(mapId)) return;
    const mp = nc().MAPS?.[mapId];
    if (!mp) return;
    sentMeta.maps.add(mapId);
    let minLv = 0, maxLv = 0;
    if (mp.lv && typeof mp.lv === 'object') {
      const vals = Object.values(mp.lv).flatMap((v) => Array.isArray(v) ? v : [v]).filter(Number.isFinite);
      if (vals.length) {
        minLv = Math.min(...vals);
        maxLv = Math.max(...vals);
      }
    }
    (patch.maps ||= {})[mapId] = {
      name: mp.name || mapId,
      lvText: mp.lvText || '',
      minLv,
      maxLv,
    };
  }

  function addJobMeta(patch, jobId) {
    if (!jobId || sentMeta.jobs.has(jobId)) return;
    const J = nc().JOBS?.[jobId];
    if (!J) return;
    sentMeta.jobs.add(jobId);
    (patch.jobs ||= {})[jobId] = {
      name: J.name || jobId,
      tier: J.tier || 0,
      maxJob: J.maxJob || 0,
      from: J.from || null,
    };
  }

  function syncRunesMeta(patch) {
    const runes = nc().BL?.RUNES;
    if (!runes) return;
    for (const [k, R] of Object.entries(runes)) {
      if (sentMeta.runes.has(k) || !R) continue;
      sentMeta.runes.add(k);
      (patch.runes ||= {})[k] = {
        n: R.n || k,
        on: R.on || 'any',
        el: R.el || null,
        proc: !!R.proc,
        gun: !!R.gun,
      };
    }
  }

  function extractS2View(view) {
    if (!view || sentMeta.s2) return;
    sentMeta.s2 = true;
    pushMsg({
      kind: 's2',
      t: Date.now(),
      s2: {
        potions: view.economy?.potions || null,
        materials: view.economy?.materials || null,
        armourTypeOf: view.armour?.typeOf || null,
        runeOrder: view.builds?.runeOrder || null,
        buildRunes: view.builds?.runes || null,
        party: view.party || null,
      },
    });
  }

  function resolveHeroActiveElement(s, player) {
    const buffs = s?.buffs || player?.buffs || {};
    if (buffs.pr_aspersio > 0 || buffs.lk_faith > 0 || buffs.pal_zeal > 0 || buffs.bi_battlehymn > 0) {
      return 'holy';
    }
    const smEl = player?.smEl || (s?.meters?.smEl ? EL_ENUM[Number(s.meters.smEl)] : null);
    if (buffs.sm_enchant > 0 && smEl) return smEl;
    if ((s?.meters?.gsSpecial > 0 || player?.gsSpecial > 0) && (player?.gsSpecialEl || s?.meters?.gsSpecialEl)) {
      return player?.gsSpecialEl || EL_ENUM[Number(s.meters.gsSpecialEl)] || null;
    }
    const bl = s?.buildLoot || {};
    if (bl.ammoElement && bl.ammoShots > 0) return bl.ammoElement;
    if (bl.oil && bl.oilUntil > 0) return bl.oil;
    for (const [bKey, bVal] of Object.entries(buffs)) {
      if (bVal > 0 && /^oil_([a-z]+)$/i.test(bKey)) return bKey.slice(4);
    }
    const wId = s?.equip?.weapon;
    return (wId && nc().ITEMS?.[wId]?.element) || null;
  }

  function extractCardMods(bl, NC) {
    const out = { critDmg: 0, bossDmg: 0, el: {} };
    if (!bl) return out;
    const list = [bl.pas, bl.pas2, bl.pas3].filter(Boolean);
    if (!list.length) return out;
    const rows = NC.BL_ARTPAS?.rows || {};
    const artOf = NC.BL?.arts?.artOf;
    const best = {};
    for (const t of list) {
      const row = rows[t];
      if (!Array.isArray(row)) continue;
      const art = typeof artOf === 'function' ? artOf(t) : null;
      const el = art?.el || NC.SPECIES?.[t]?.element || NC.MONSTERS?.[t]?.element || 'neutral';
      for (const part of row) {
        if (!Array.isArray(part) || part[0] !== 'A') continue;
        const ty = part[1];
        const n = Number(part[part.length - 1]) || 0;
        if (n <= 0) continue;
        const key = (ty === 'amp' || ty === 'est' || ty === 'res') ? `${ty}:${el}` : ty;
        if (!best[key] || n > best[key].n) best[key] = { ty, el, n };
      }
    }
    for (const item of Object.values(best)) {
      if (item.ty === 'amp') out.el[item.el] = item.n;
      else if (item.ty === 'critd') out.critDmg = item.n;
      else if (item.ty === 'boss') out.bossDmg = item.n;
    }
    return out;
  }

  function extractDamageModMap(raw) {
    const out = { critDmg: 0, bossDmg: 0, el: {}, sk: {} };
    if (!raw || typeof raw !== 'object') return out;
    if (Number(raw.critDmg) > 0) out.critDmg = Number(raw.critDmg);
    if (Number(raw.bossDmg) > 0) out.bossDmg = Number(raw.bossDmg);
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v) || 0;
      if (n <= 0) continue;
      if (k.startsWith('el_')) out.el[k.slice(3)] = n;
      else if (k.startsWith('sk_')) out.sk[k.slice(3)] = n;
    }
    return out;
  }

  function handleEvent(rawEv, nowMs) {
    if (!captureEnabled) return;
    const type = rawEv?.type;
    if (typeof type !== 'string' || !INTERESTING_EVENTS.has(type)) return;

    const patch = {};
    if (rawEv.skillId) addSkillMeta(patch, rawEv.skillId);
    if (rawEv.monsterType) addMonsterMeta(patch, rawEv.monsterType);
    if (rawEv.material) addMatMeta(patch, rawEv.material);
    if (rawEv.itemId) addItemMeta(patch, rawEv.itemId);
    if (rawEv.inst?.id) addItemMeta(patch, rawEv.inst.id);
    if (Object.keys(patch).length) emitMetaPatch(patch);

    // Compact JSON-safe payload tailored by event type
    let ev;
    if (type === 'combat') {
      ev = {
        type,
        t: nowMs,
        sourceId: rawEv.sourceId || null,
        actorId: rawEv.actorId || null,
        targetId: rawEv.targetId || null,
        skillId: rawEv.skillId || null,
        damage: rawEv.damage != null ? Number(rawEv.damage) : 0,
        crit: !!rawEv.crit,
        miss: !!rawEv.miss,
        evade: !!rawEv.evade,
        refused: !!rawEv.refused,
        lucky: !!rawEv.lucky,
        dot: !!rawEv.dot,
        dead: !!rawEv.dead,
      };
      if (rawEv.element || rawEv.el) ev.element = rawEv.element || rawEv.el;
      if (Array.isArray(rawEv.runes) && rawEv.runes.length) ev.runes = rawEv.runes.slice(0, 6);
    } else if (type === 'reward') {
      ev = {
        type,
        t: nowMs,
        xp: rawEv.xp || 0,
        jobXp: rawEv.jobXp || 0,
        gold: rawEv.gold || 0,
        targetId: rawEv.targetId || null,
        monsterId: rawEv.monsterId || null,
        monsterType: rawEv.monsterType || null,
      };
      if (rawEv.test) ev.test = rawEv.test;
    } else if (type === 'heal') {
      ev = {
        type,
        t: nowMs,
        sourceId: rawEv.sourceId || null,
        targetId: rawEv.targetId || null,
        amount: rawEv.amount != null ? Number(rawEv.amount) : 0,
      };
    } else if (type === 'reaction') {
      ev = {
        type,
        t: nowMs,
        actorId: rawEv.actorId || null,
        sourceId: rawEv.sourceId || null,
        key: rawEv.key || null,
      };
    } else if (type === 's2rune' || type === 's2trap' || type === 'shot') {
      ev = {
        type,
        t: nowMs,
        actorId: rawEv.actorId || null,
        sourceId: rawEv.sourceId || null,
        targetId: rawEv.targetId || null,
        rune: rawEv.rune || null,
        k: rawEv.k || null,
        phase: rawEv.phase || null,
      };
    } else if (type === 'lootPickup') {
      ev = {
        type,
        t: nowMs,
        lootId: rawEv.lootId ?? null,
        itemId: rawEv.itemId || null,
        material: rawEv.material || null,
        count: rawEv.count || 0,
      };
      if (rawEv.inst && typeof rawEv.inst === 'object') {
        ev.inst = { id: rawEv.inst.id, sh: !!rawEv.inst.sh, g: rawEv.inst.g || 0 };
      }
    } else if (type === 'cast' || type === 'skill') {
      ev = {
        type,
        t: nowMs,
        actorId: rawEv.actorId || null,
        sourceId: rawEv.sourceId || null,
        skillId: rawEv.skillId || null,
      };
    } else if (type === 'error') {
      ev = {
        type,
        t: nowMs,
        message: rawEv.message || null,
        code: rawEv.code || null,
      };
    } else {
      ev = {
        type,
        t: nowMs,
        actorId: rawEv.actorId || null,
        sourceId: rawEv.sourceId || null,
        targetId: rawEv.targetId || null,
        message: rawEv.message || null,
        code: rawEv.code || null,
      };
    }
    pushMsg({ kind: 'ev', ev });
  }

  function handleSnapshot(snap, nowMs) {
    if (!captureEnabled || !snap || !snap.self) return;
    const s = snap.self;

    // Early O(1) milestone & throttle exit before scanning snapshot arrays/metadata
    const potSig = `${s.potions || 0}:${s.potionsM || 0}:${s.potionsL || 0}:${s.spPotions || 0}:${s.spPotionsM || 0}:${s.spPotionsL || 0}`;
    const stateSig = `${snap.mapId}|${snap.channelId}|${s.lv}|${s.job}|${s.jobLv}|${s.dead > 0 ? 1 : 0}|${s.equip?.weapon || ''}|${potSig}`;
    const force = stateSig !== lastSnapSig;
    if (!force && nowMs - lastSnapSentAt < SNAP_THROTTLE_MS) return;
    lastSnapSig = stateSig;
    lastSnapSentAt = nowMs;

    const NC = nc();
    if (NC.OnlineS2?.view && !sentMeta.s2) extractS2View(NC.OnlineS2.view);

    const patch = {};
    syncRunesMeta(patch);
    if (snap.mapId) addMapMeta(patch, snap.mapId);
    if (s.job) addJobMeta(patch, s.job);
    if (s.equip?.weapon) addItemMeta(patch, s.equip.weapon);
    for (const sk of Object.keys(s.skills || {})) addSkillMeta(patch, sk);
    for (const sk of Object.keys(s.buildLoot?.runes || {})) addSkillMeta(patch, sk);
    for (const b of Object.keys(s.buffs || {})) addSkillMeta(patch, b);
    for (const pl of snap.players || []) {
      if (pl?.job) addJobMeta(patch, pl.job);
    }
    for (const m of snap.monsters || []) {
      if (m?.type) addMonsterMeta(patch, m.type);
    }
    for (const matId of Object.keys(s.mats || {})) addMatMeta(patch, matId);
    for (const l of snap.loot || []) {
      if (l?.material) addMatMeta(patch, l.material);
      if (l?.itemId) addItemMeta(patch, l.itemId);
    }
    if (Object.keys(patch).length) emitMetaPatch(patch);

    const player = NC.game?.player || null;
    const isNight = !!(NC.isNightNow && NC.game && NC.isNightNow(NC.game));
    const bl = s.buildLoot || {};
    const runesCopy = {};
    if (bl.runes && typeof bl.runes === 'object') {
      for (const k in bl.runes) {
        if (Array.isArray(bl.runes[k])) runesCopy[k] = bl.runes[k].slice();
      }
    }

    pushMsg({
      kind: 'snap',
      t: nowMs,
      snap: {
        mapId: snap.mapId || '',
        channelId: snap.channelId || '',
        rtt: Number.isFinite(NC.Online?.rtt) ? Math.round(NC.Online.rtt) : null,
        isNight,
        activeElement: resolveHeroActiveElement(s, player),
        self: {
          id: s.id || '',
          name: s.name || '',
          lv: s.lv || 1,
          lvMax: NC.LV_MAX || 0,
          xp: s.xp || 0,
          xpNext: s.xpNext || (typeof NC.xpNext === 'function' ? NC.xpNext(s.lv || 1) : 0),
          job: s.job || '',
          jobLv: s.jobLv || 1,
          jobMax: NC.JOBS?.[s.job]?.maxJob || (typeof NC.jobMax === 'function' ? NC.jobMax(s) : 0),
          jobXp: s.jobXp || 0,
          jobXpNext: s.jobXpNext || (typeof NC.jobNext === 'function' ? NC.jobNext(s.jobLv || 1, s.job) : 0),
          hp: s.hp || 0,
          maxHp: s.maxHp || 1,
          sp: s.sp || 0,
          maxSp: s.maxSp || 1,
          dead: s.dead || 0,
          coins: s.coins ?? 0,
          potions: s.potions || 0,
          potionsM: s.potionsM || 0,
          potionsL: s.potionsL || 0,
          spPotions: s.spPotions || 0,
          spPotionsM: s.spPotionsM || 0,
          spPotionsL: s.spPotionsL || 0,
          mats: s.mats ? { ...s.mats } : null,
          dur: s.dur ? { ...s.dur } : null,
          load: s.load ? { w: s.load.w, cap: s.load.cap, pct: s.load.pct } : null,
          equip: s.equip ? { ...s.equip } : null,
          buffs: s.buffs ? { ...s.buffs } : null,
          meters: s.meters ? { ptThread: s.meters.ptThread, blShell: s.meters.blShell } : null,
          buildLoot: {
            runes: runesCopy,
            pas: bl.pas || null,
            pas2: bl.pas2 || null,
            pas3: bl.pas3 || null,
            ammoElement: bl.ammoElement || null,
            ammoShots: bl.ammoShots || 0,
          },
          cardMods: extractCardMods(bl, NC),
          gearMods: extractDamageModMap(
            s.derived?.detail?.gear || (typeof NC.GEAROPT?.rowMods === 'function' && player ? NC.GEAROPT.rowMods(player) : null)
          ),
          totalMods: extractDamageModMap(s.derived?.detail?.mods || player?.d?.mods || null),
          runePouchIds: Array.isArray(s.runePouch)
            ? s.runePouch.filter(Boolean).map((r) => ({ id: r.id, kind: r.kind, tier: r.tier || 1 }))
            : null,
          party: s.party
            ? {
                id: s.party.id,
                leader: s.party.leader,
                loot: s.party.loot,
                members: Array.isArray(s.party.members)
                  ? s.party.members.map((m) => ({ id: m.id, name: m.name, job: m.job, lv: m.lv }))
                  : [],
              }
            : null,
        },
        monsters: Array.isArray(snap.monsters)
          ? snap.monsters.filter(Boolean).map((m) => ({
              id: m.id,
              type: m.type || '',
              lv: m.lv || 0,
              dead: m.dead || 0,
              boss: !!(m.boss || NC.BOSSES?.[m.type]),
              rootBoss: !!m.rootBoss,
              storyBoss: !!(m.storyBoss || /^sb_/.test(m.type || '')),
              dummy: !!m.dummy,
            }))
          : [],
        players: Array.isArray(snap.players)
          ? snap.players.filter(Boolean).map((pl) => ({
              id: pl.id,
              name: pl.name || '',
              job: pl.job || '',
              lv: pl.lv || 0,
            }))
          : [],
        loot: Array.isArray(snap.loot)
          ? snap.loot.filter(Boolean).map((l) => ({
              id: l.id,
              itemId: l.itemId || '',
              material: l.material || '',
              count: l.count || 1,
              gold: l.gold || 0,
              inst: l.inst ? { id: l.inst.id, sh: !!l.inst.sh, g: l.inst.g || 0 } : null,
            }))
          : [],
      },
    });
  }

  function resetMetaState() {
    sentMeta.s2 = false;
    sentMeta.skills.clear();
    sentMeta.monsters.clear();
    sentMeta.items.clear();
    sentMeta.runes.clear();
    sentMeta.mats.clear();
    sentMeta.maps.clear();
    sentMeta.jobs.clear();
    lastSnapSentAt = 0;
    lastSnapSig = '';
  }

  function startFallbackCheck() {
    if (!captureEnabled || sawDomStream || fallbackBound || checkTimer) return;
    fallbackChecks = 0;
    checkTimer = setInterval(() => {
      if (!captureEnabled || sawDomStream || fallbackBound) {
        clearInterval(checkTimer);
        checkTimer = 0;
        return;
      }
      fallbackChecks++;
      if (fallbackChecks > 20) {
        clearInterval(checkTimer);
        checkTimer = 0;
        return;
      }
      if (fallbackChecks >= 6) attachFallbackIfNeeded();
    }, 1000);
  }

  function setCaptureEnabled(next) {
    const en = !!next;
    if (en === captureEnabled) return;
    captureEnabled = en;
    if (!en) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = 0;
      }
      queue = [];
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = 0;
      }
      return;
    }
    resetMetaState();
    const s2v = nc().OnlineS2?.view;
    if (s2v && !sentMeta.s2) extractS2View(s2v);
    startFallbackCheck();
  }

  // Control messages from isolated bridge (resync metadata or toggle manual capture)
  window.addEventListener('message', (ev) => {
    if (ev.source !== window || ev.origin !== ORIGIN || !ev.data) return;
    if (ev.data.__ncTelResync === 1) {
      resetMetaState();
      const s2v = nc().OnlineS2?.view;
      if (captureEnabled && s2v && !sentMeta.s2) extractS2View(s2v);
    } else if (ev.data.__ncTelCapture === 1) {
      setCaptureEnabled(ev.data.enabled);
    }
  });

  // Primary passive tap: standard window CustomEvents emitted by online/oldlooks.js
  window.addEventListener('nightcamp:online-event', (e) => {
    sawDomStream = true;
    if (!captureEnabled) return;
    handleEvent(e?.detail, Date.now());
  });

  window.addEventListener('nightcamp:online-snapshot', (e) => {
    sawDomStream = true;
    if (!captureEnabled) return;
    handleSnapshot(e?.detail?.snapshot, Date.now());
  });

  window.addEventListener('nightcamp:season2', (e) => {
    if (!captureEnabled) return;
    if (e?.detail?.view) extractS2View(e.detail.view);
  });

  // Fallback listener if a future client build omits online/oldlooks.js dispatches
  function attachFallbackIfNeeded() {
    if (sawDomStream || fallbackBound) return;
    const O = nc().Online;
    if (!O || typeof O.on !== 'function') return;
    fallbackBound = true;
    O.on('event', (ev) => {
      if (captureEnabled && !sawDomStream) handleEvent(ev, Date.now());
    });
    O.on('snapshot', (snap) => {
      if (captureEnabled && !sawDomStream) handleSnapshot(snap, Date.now());
    });
    if (nc().OnlineS2?.view && !sentMeta.s2) extractS2View(nc().OnlineS2.view);
  }
})();
