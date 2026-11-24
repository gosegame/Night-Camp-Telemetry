/* Chrome Extension UI logic (Side Panel & Popout Window).
 * Connects to background.js over 'nc-ui' port and renders telemetry summaries. */
import { ELEMENT_META } from './engine.js';

const params = new URLSearchParams(location.search);
const isPopout = params.get('popout') === '1';
const preferTabId = params.get('tabId') ? Number(params.get('tabId')) : null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtNum(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1e6) return sign + (a / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return sign + (a / 1e3).toFixed(1) + 'k';
  return sign + Math.round(a).toLocaleString('en-US');
}

function fmtDurMs(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function fmtEtaSec(sec) {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '—';
  if (sec < 60) return `${Math.ceil(sec)}s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
  if (sec < 360000) return `${(sec / 3600).toFixed(1)}h`;
  return '>99h';
}

function fmtTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function elColor(el) {
  return ELEMENT_META[el]?.color || ELEMENT_META.neutral.color;
}
function elName(el) {
  return ELEMENT_META[el]?.name || el || 'ไร้ธาตุ';
}

const SOURCE_PARTS = [
  { key: 'skill', label: 'สกิลเอง', color: '#38bdf8' },
  { key: 'runeProc', label: 'รูน Proc', color: '#f59e0b' },
  { key: 'runeMod', label: 'รูนตัวคูณ', color: '#facc15' },
  { key: 'card', label: 'การ์ด', color: '#c084fc' },
  { key: 'gear', label: 'อาวุธ/เกียร์', color: '#f472b6' },
  { key: 'dot', label: 'DoT', color: '#4ade80' },
  { key: 'reaction', label: 'ปฏิกิริยา', color: '#ff6b4a' },
];

function sourceModeTag(part, srcObj) {
  if (!srcObj) return '';
  if (part.key === 'runeMod') return '~est';
  if (part.key === 'reaction') {
    const ex = (srcObj.reactionExact || 0) > 0.5;
    const md = (srcObj.reactionMod || 0) > 0.5;
    if (ex && md) return 'จริง+est';
    if (md) return '~est';
    return 'จริง';
  }
  if (part.key === 'card') {
    const ex = (srcObj.cardExact || 0) > 0.5;
    const md = (srcObj.cardMod || 0) > 0.5;
    if (ex && md) return 'จริง+est';
    if (md) return '~est';
    return 'จริง';
  }
  if (part.key === 'gear') {
    const ex = (srcObj.gearExact || 0) > 0.5;
    const md = (srcObj.gearMod || 0) > 0.5;
    if (ex && md) return 'จริง+est';
    if (md) return '~est';
    return 'จริง';
  }
  if (part.key === 'skill') {
    const hasEst =
      (srcObj.runeMod || 0) > 0.5 ||
      (srcObj.cardMod || 0) > 0.5 ||
      (srcObj.gearMod || 0) > 0.5 ||
      (srcObj.reactionMod || 0) > 0.5;
    return hasEst ? '~หักตัวคูณ' : 'จริง';
  }
  return 'จริง';
}

function buildStackedSegments(srcObj, totalDmg) {
  if (!srcObj || !(totalDmg > 0)) return '';
  const parts = [];
  for (const p of SOURCE_PARTS) {
    const val = Number(srcObj[p.key]) || 0;
    if (val <= 0.5) continue;
    const pct = (val / totalDmg) * 100;
    const mode = sourceModeTag(p, srcObj);
    parts.push(`<div class="seg-part" style="width:${pct.toFixed(2)}%;background:${p.color}" title="${esc(p.label)} (${esc(mode)}): ${fmtNum(val)} DMG (${pct.toFixed(1)}%)"></div>`);
  }
  return parts.join('');
}

const state = {
  port: null,
  tabs: [],
  selectedTabId: preferTabId,
  summary: null,
  savedRuns: [],
  activeTab: 'overview',
  skillSort: 'dmg',
  skillQuery: '',
  expandedSkills: new Set(),
  expandAll: false,
  logFilter: 'all',
  runAId: '',
  runBId: 'LIVE',
  tabsSig: '',
  runsSig: '',
  rafId: 0,
  captureError: '',
};

function scheduleRender() {
  if (document.hidden || state.rafId) return;
  state.rafId = requestAnimationFrame(() => {
    state.rafId = 0;
    if (!document.hidden) render();
  });
}

if (isPopout) {
  $('btnPopout').classList.add('hidden');
}

function send(msg) {
  if (!state.port) return;
  try { state.port.postMessage({ tabId: state.selectedTabId, ...msg }); } catch (_) {}
}

function connect() {
  const port = (state.port = chrome.runtime.connect({ name: 'nc-ui' }));
  port.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === 'init') {
      state.selectedTabId = msg.selectedTabId || state.selectedTabId;
      state.captureError = '';
      updateTabs(msg.tabs || []);
      updateSavedRuns(msg.savedRuns || []);
      renderCaptureControls();
    } else if (msg.type === 'tabs') {
      updateTabs(msg.tabs || []);
      renderCaptureControls();
    } else if (msg.type === 'savedRuns') {
      updateSavedRuns(msg.savedRuns || [], msg.justSavedId);
    } else if (msg.type === 'summary') {
      if (msg.tabs) updateTabs(msg.tabs);
      if (msg.summary && !state.selectedTabId) state.selectedTabId = msg.summary.tabId;
      if (msg.summary?.enabled) state.captureError = '';
      state.summary = msg.summary;
      scheduleRender();
    } else if (msg.type === 'captureError') {
      state.captureError = msg.message || 'ไม่สามารถเชื่อมต่อแท็บเกมได้ กรุณารีเฟรชหน้าเกม (F5)';
      renderCaptureControls();
    } else if (msg.type === 'exportResult') {
      triggerDownload(msg.filename, msg.data, msg.format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8');
    }
  });
  port.onDisconnect.addListener(() => {
    state.port = null;
    setTimeout(connect, 1000);
  });
  port.postMessage({ cmd: 'init', preferTabId, activeTab: state.activeTab, visible: !document.hidden });
}

document.addEventListener('visibilitychange', () => {
  const visible = !document.hidden;
  send({ cmd: 'setVisible', visible });
  if (visible && state.summary) scheduleRender();
});

function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateTabs(tabs) {
  state.tabs = tabs;
  const sig = JSON.stringify(tabs.map((t) => [t.tabId, t.heroName, t.lv, t.mapName, t.channelId, t.connected, t.enabled, t.autoStopped]));
  if (sig === state.tabsSig) return;
  state.tabsSig = sig;

  const sel = $('tabSelect');
  if (!tabs.length) {
    sel.innerHTML = '<option value="">ไม่พบแท็บ Night Camp</option>';
    return;
  }
  if (!state.selectedTabId || !tabs.some((t) => t.tabId === state.selectedTabId)) {
    const conn = tabs.find((t) => t.enabled) || tabs.find((t) => t.connected) || tabs[0];
    state.selectedTabId = conn.tabId;
    send({ cmd: 'selectTab', tabId: state.selectedTabId });
  }
  sel.innerHTML = tabs
    .map((t) => {
      const icon = t.enabled ? (t.connected ? '🟢' : '🟡') : '⚪';
      const label = t.heroName
        ? `${icon} ${t.heroName} Lv${t.lv} (${t.jobName}) · ${t.mapName || '-'}${t.channelId ? ' CH' + t.channelId : ''}`
        : `${icon} Tab #${t.tabId}: ${t.title || 'Night Camp'}${t.enabled ? '' : ' (ปิดอยู่)'}`;
      return `<option value="${t.tabId}" ${t.tabId === state.selectedTabId ? 'selected' : ''}>${esc(label)}</option>`;
    })
    .join('');
}

function updateSavedRuns(runs, justSavedId = '') {
  state.savedRuns = runs;
  const sig = JSON.stringify(runs.map((r) => [r.id, r.label]));
  if (sig === state.runsSig && !justSavedId) return;
  state.runsSig = sig;

  if (justSavedId) state.runAId = justSavedId;
  else if (!state.runAId && runs.length) state.runAId = runs[0].id;
  if (state.runAId && !runs.some((r) => r.id === state.runAId)) {
    state.runAId = runs[0]?.id || '';
  }

  const optsA = runs.length
    ? runs.map((r) => `<option value="${esc(r.id)}" ${r.id === state.runAId ? 'selected' : ''}>${esc(r.label)} (${fmtTime(r.createdAt)})</option>`).join('')
    : '<option value="">(กด Save ด้านบนเพื่อเก็บสถิติ)</option>';
  $('selectRunA').innerHTML = optsA;

  const optsB = `<option value="LIVE" ${state.runBId === 'LIVE' ? 'selected' : ''}>🔴 LIVE (รอบปัจจุบัน)</option>` +
    runs.map((r) => `<option value="${esc(r.id)}" ${r.id === state.runBId ? 'selected' : ''}>${esc(r.label)} (${fmtTime(r.createdAt)})</option>`).join('');
  $('selectRunB').innerHTML = optsB;
  $('btnDeleteRunA').classList.toggle('hidden', !state.runAId);

  if (state.activeTab === 'compare') renderCompare();
}

// Wire controls
function toggleCapture() {
  const tabInfo = state.tabs.find((t) => t.tabId === state.selectedTabId);
  const curEnabled = !!(tabInfo?.enabled ?? state.summary?.enabled);
  state.captureError = '';
  renderCaptureControls();
  send({ cmd: 'setCapture', enabled: !curEnabled });
}

$('tabSelect').addEventListener('change', (e) => {
  state.selectedTabId = Number(e.target.value) || null;
  state.expandedSkills.clear();
  state.captureError = '';
  send({ cmd: 'selectTab', tabId: state.selectedTabId });
});

$('btnToggleCapture').addEventListener('click', toggleCapture);
$('btnEmptyStart').addEventListener('click', toggleCapture);
$('btnRefreshTabs').addEventListener('click', () => {
  state.captureError = '';
  send({ cmd: 'refreshTabs' });
});
$('btnReset').addEventListener('click', () => {
  state.expandedSkills.clear();
  send({ cmd: 'reset' });
});
$('btnSaveRun').addEventListener('click', () => {
  const s = state.summary;
  const defaultName = s?.hero ? `${s.hero.name} (${s.hero.weaponName})` : 'Snapshot';
  const label = window.prompt('ตั้งชื่อ Snapshot (สำหรับเทียบ A/B):', defaultName);
  if (label !== null) send({ cmd: 'saveRun', label: label.trim() || defaultName });
});
$('btnPopout').addEventListener('click', () => send({ cmd: 'openPopout' }));

$('btnExport').addEventListener('click', (e) => {
  e.stopPropagation();
  $('exportMenu').classList.toggle('hidden');
});
document.addEventListener('click', () => $('exportMenu').classList.add('hidden'));
$('exportMenu').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-export]');
  if (!btn) return;
  send({ cmd: 'exportData', format: btn.dataset.export });
  $('exportMenu').classList.add('hidden');
});

$('navTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-tab');
  if (!btn) return;
  state.activeTab = btn.dataset.tab;
  for (const b of $('navTabs').querySelectorAll('.nav-tab')) b.classList.toggle('active', b === btn);
  for (const p of document.querySelectorAll('.tab-pane')) p.classList.toggle('active', p.id === 'tab-' + state.activeTab);
  send({ cmd: 'setActiveTab', activeTab: state.activeTab });
  render();
});

$('dpsModeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  send({ cmd: 'setDpsMode', mode: b.dataset.mode });
});

$('skillSearch').addEventListener('input', (e) => {
  state.skillQuery = e.target.value.trim().toLowerCase();
  renderSkills();
});

$('skillSortSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sort]');
  if (!b) return;
  state.skillSort = b.dataset.sort;
  for (const x of $('skillSortSeg').querySelectorAll('.seg')) x.classList.toggle('active', x === b);
  renderSkills();
});

$('btnExpandAll').addEventListener('click', () => {
  state.expandAll = !state.expandAll;
  if (!state.expandAll) state.expandedSkills.clear();
  else for (const sk of state.summary?.skills || []) state.expandedSkills.add(sk.id);
  $('btnExpandAll').textContent = state.expandAll ? 'Collapse All' : 'Expand All';
  renderSkills();
});

$('skillsContainer').addEventListener('click', (e) => {
  const head = e.target.closest('.skill-head');
  if (!head) return;
  const sid = head.dataset.sid;
  if (state.expandedSkills.has(sid)) state.expandedSkills.delete(sid);
  else state.expandedSkills.add(sid);
  renderSkills();
});

$('selectRunA').addEventListener('change', (e) => {
  state.runAId = e.target.value;
  $('btnDeleteRunA').classList.toggle('hidden', !state.runAId);
  renderCompare();
});
$('selectRunB').addEventListener('change', (e) => {
  state.runBId = e.target.value;
  renderCompare();
});
$('btnDeleteRunA').addEventListener('click', () => {
  if (state.runAId) send({ cmd: 'deleteRun', runId: state.runAId });
});

$('logFilterSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-log]');
  if (!b) return;
  state.logFilter = b.dataset.log;
  for (const x of $('logFilterSeg').querySelectorAll('.seg')) x.classList.toggle('active', x === b);
  renderLog();
});

function renderCaptureControls() {
  const s = state.summary;
  const tabInfo = state.tabs.find((t) => t.tabId === state.selectedTabId);
  const enabled = !!(tabInfo?.enabled ?? s?.enabled);
  const autoStopped = !!(tabInfo?.autoStopped ?? s?.autoStopped);
  const hasTabs = state.tabs.length > 0;

  const dot = $('liveDot');
  dot.className = 'dot ' + (enabled ? (tabInfo?.connected ? 'online' : 'paused') : 'offline');

  const btn = $('btnToggleCapture');
  btn.disabled = !hasTabs;
  if (enabled) {
    btn.textContent = '⏹ ปิด';
    btn.className = 'btn stop-btn';
    btn.title = 'หยุดเก็บข้อมูลแท็บนี้';
  } else {
    btn.textContent = '▶ เปิด';
    btn.className = 'btn start-btn';
    btn.title = 'เปิดเก็บข้อมูลแท็บที่เลือก';
  }
  $('btnEmptyStart').disabled = !hasTabs;

  const noticeEl = $('captureNotice');
  const noticeMsg = state.captureError
    ? state.captureError
    : (!enabled && autoStopped)
      ? 'ปิดเก็บข้อมูลอัตโนมัติหลังปิดหน้าต่างครบ 5 นาที (Socket เกมยังเชื่อมต่อปกติ — กด ▶ เปิด เพื่อเก็บต่อได้เลย)'
      : '';
  noticeEl.classList.toggle('hidden', !noticeMsg);
  noticeEl.textContent = noticeMsg;
}

function render() {
  const s = state.summary;
  const hasData = !!(s && s.hero);
  $('emptyState').classList.toggle('hidden', hasData);
  renderCaptureControls();

  const tabInfo = state.tabs.find((t) => t.tabId === state.selectedTabId);
  const enabled = !!(tabInfo?.enabled ?? s?.enabled);

  if (!hasData) {
    $('heroTitle').textContent = !state.tabs.length
      ? 'เปิดแท็บ https://play.nightcamp.app/ แล้วกดเช็กแท็บ'
      : enabled
        ? 'กำลังรอแพ็กเก็ตจากตัวละครในแท็บเกม...'
        : 'สแตนด์บาย (ปิดอยู่) · กด ▶ เปิด เพื่อเริ่มเก็บข้อมูล';
    $('rttBadge').textContent = 'RTT —';
    return;
  }

  const h = s.hero;
  const k = s.kpis;
  const ch = s.map.channelId ? ` CH${s.map.channelId}` : '';
  const tod = s.isNight ? '🌙' : '☀️';
  $('heroTitle').textContent = `${h.name} · Lv${h.lv} ${h.jobName} (J${h.jobLv}) · ${s.map.name}${ch} ${tod}`;

  const rttCur = s.rtt?.cur;
  const rttEl = $('rttBadge');
  rttEl.textContent = rttCur != null ? `RTT ${rttCur}ms` : 'RTT —';
  rttEl.className = 'badge ' + (rttCur == null ? 'muted' : rttCur < 120 ? 'good' : rttCur < 250 ? 'warn' : 'bad');

  $('dpsModeBadge').textContent = s.dpsMode === 'active' ? '(Act)' : '(All)';
  $('stripDps').textContent = `${fmtNum(k.dps5)} / ${fmtNum(k.dpsTotal)}`;
  $('stripCrit').textContent = `${k.critRate.toFixed(1)}%`;
  $('stripBaseXp').textContent = `${fmtNum(k.xpPerMin)}`;
  $('stripJobXp').textContent = `${fmtNum(k.jobXpPerMin)}`;
  $('stripDtps').textContent = `${fmtNum(k.dtpsTotal)}`;
  const net = s.econ.netProfitPerHr;
  $('stripNet').textContent = `${net >= 0 ? '+' : ''}${fmtNum(net)}`;
  $('stripNet').className = 'strip-val ' + (net >= 0 ? 'green' : 'red');

  if (state.activeTab === 'overview') renderOverview();
  else if (state.activeTab === 'skills') renderSkills();
  else if (state.activeTab === 'elements') renderElements();
  else if (state.activeTab === 'econ') renderEcon();
  else if (state.activeTab === 'compare') {
    renderParty();
    renderCompare();
    renderLog();
  }
}

function renderOverview() {
  const s = state.summary;
  const k = s.kpis;
  const h = s.hero;
  const ec = s.econ;

  $('sessionTimer').textContent = `Elapsed ${fmtDurMs(s.elapsedMs)} · Active Combat ${fmtDurMs(s.activeCombatMs)}`;
  for (const b of $('dpsModeSeg').querySelectorAll('.seg')) {
    b.classList.toggle('active', b.dataset.mode === s.dpsMode);
  }

  // Alerts
  const alerts = [];
  if (Math.abs(s.map.lvGap) > 3 && s.map.mobAvgLv > 0) {
    alerts.push({ cls: 'warn', text: `⚠ Lv Gap ${s.map.lvGap > 0 ? '+' : ''}${s.map.lvGap} (พ้น ±3 EXP ลด)` });
  }
  if (h.minDur < 25) alerts.push({ cls: 'bad', text: `🔧 อาวุธ/เกราะทนทาน ${h.minDur}%` });
  if (h.loadPct >= 80) alerts.push({ cls: 'warn', text: `⚖ น้ำหนัก ${h.loadPct}%` });
  if (ec.hpPotEtaMin != null && ec.hpPotEtaMin < 15) alerts.push({ cls: 'bad', text: `🧪 ยาแดงเหลือ ~${ec.hpPotEtaMin.toFixed(0)}m` });
  if (ec.spPotEtaMin != null && ec.spPotEtaMin < 15) alerts.push({ cls: 'warn', text: `💧 ยาฟ้าเหลือ ~${ec.spPotEtaMin.toFixed(0)}m` });
  if (s.map.partyThread) alerts.push({ cls: 'good', text: `🧶 ด้ายเชิดทำงาน (+5% Drop/Regen)` });

  const ab = $('alertsBar');
  ab.classList.toggle('hidden', alerts.length === 0);
  ab.innerHTML = alerts.map((a) => `<span class="badge ${a.cls}">${esc(a.text)}</span>`).join('');

  $('overviewKpis').innerHTML = [
    { t: 'Total / 60s DPS', m: `${fmtNum(k.dpsTotal)}`, s: `5s: ${fmtNum(k.dps5)} · Peak: ${fmtNum(k.peakDps5)}`, cls: 'cyan' },
    { t: 'Critical Rate', m: `${k.critRate.toFixed(1)}%`, s: `Crit Share: ${k.critShare.toFixed(0)}% · ${k.totalHits} hits`, cls: 'gold' },
    { t: 'Base / Job EXP /m', mHtml: `<span class="gold">${esc(fmtNum(k.xpPerMin))}</span> <span class="muted">/</span> <span class="green">${esc(fmtNum(k.jobXpPerMin))}</span>`, s: `Base ${k.baseMaxed ? 'MAX' : fmtEtaSec(k.xpEtaSec)} · Job ${k.jobMaxed ? 'MAX' : fmtEtaSec(k.jobXpEtaSec)}`, cls: '' },
    { t: 'Kills & Total DMG', m: `${k.killsPerMin.toFixed(1)}/m`, s: `${k.kills} kills · ${fmtNum(k.totalDmgDealt)} DMG`, cls: '' },
    { t: 'Damage Taken', m: `${fmtNum(k.dtpsTotal)}/s`, s: `HPS: ${fmtNum(k.hps60)}/s · Dodge ${k.dodgeRate.toFixed(0)}%`, cls: 'red' },
    { t: 'Net Profit / hr', m: `${ec.netProfitPerHr >= 0 ? '+' : ''}${fmtNum(ec.netProfitPerHr)}c`, s: `ยา ${fmtNum(ec.potCostPerHr)}c/h · DPS/Pot ${fmtNum(ec.dpsPerPot)}`, cls: ec.netProfitPerHr >= 0 ? 'green' : 'red' },
  ]
    .map((x) => `<div class="kpi-box"><div class="kpi-title">${esc(x.t)}</div><div class="kpi-main ${x.cls}">${x.mHtml || esc(x.m)}</div><div class="kpi-sub">${esc(x.s)}</div></div>`)
    .join('');

  $('expSessionBadge').innerHTML = `รอบนี้ <span class="gold">+${esc(fmtNum(k.totalXp))} B</span> · <span class="green">+${esc(fmtNum(k.totalJobXp))} J</span>`;
  const baseValTxt = k.baseMaxed ? 'MAX' : `${fmtNum(h.xp)}/${fmtNum(h.xpNext)} (${k.xpPct.toFixed(1)}%)`;
  const jobValTxt = k.jobMaxed ? 'MAX' : `${fmtNum(h.jobXp)}/${fmtNum(h.jobXpNext)} (${k.jobXpPct.toFixed(1)}%)`;
  const baseGainTxt = k.baseLvGained > 0 ? ` <span class="badge good">+${k.baseLvGained}</span>` : '';
  const jobGainTxt = k.jobLvGained > 0 ? ` <span class="badge good">+${k.jobLvGained}</span>` : '';
  $('expProgressBox').innerHTML = `
    <div class="exp-row">
      <div class="bar-row-top">
        <span><b>Base Lv ${h.lv}${h.lvMax ? '/' + h.lvMax : ''}</b>${baseGainTxt}</span>
        <span class="mono gold">${esc(baseValTxt)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill base" style="width:${k.xpPct.toFixed(1)}%"></div></div>
      <div class="exp-meta">
        <span class="mono">${fmtNum(k.xpPerMin)}/m · ${fmtNum(k.xpPerHr)}/h</span>
        <span>ETA ${k.baseMaxed ? 'MAX' : fmtEtaSec(k.xpEtaSec)}</span>
      </div>
    </div>
    <div class="exp-row">
      <div class="bar-row-top">
        <span><b>Job Lv ${h.jobLv}${h.jobMax ? '/' + h.jobMax : ''}</b>${jobGainTxt}</span>
        <span class="mono green">${esc(jobValTxt)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill job" style="width:${k.jobXpPct.toFixed(1)}%"></div></div>
      <div class="exp-meta">
        <span class="mono">${fmtNum(k.jobXpPerMin)}/m · ${fmtNum(k.jobXpPerHr)}/h</span>
        <span>ETA ${k.jobMaxed ? 'MAX' : fmtEtaSec(k.jobXpEtaSec)}</span>
      </div>
    </div>
  `;

  drawSparkline(s.sparkline);

  // Composition bar: 7 Damage Sources (Skill / Rune Proc / Rune Mod / Card / Gear / DoT / Reaction)
  const tot = Math.max(1, k.totalDmgDealt);
  const srcAll = s.sources || {
    skill: k.directDmg,
    runeProc: k.procDmg,
    runeMod: 0,
    card: 0,
    gear: 0,
    dot: k.dotDmg,
    reaction: k.reactionDmg || 0,
  };
  $('compTotal').textContent = `${fmtNum(k.totalDmgDealt)} DMG`;
  $('compBar').innerHTML = buildStackedSegments(srcAll, tot);
  $('compLegend').innerHTML = SOURCE_PARTS
    .filter((p) => (srcAll[p.key] || 0) > 0.5 || p.key === 'skill')
    .map((p) => {
      const v = srcAll[p.key] || 0;
      const pct = k.totalDmgDealt > 0 ? (v / tot) * 100 : 0;
      const tag = sourceModeTag(p, srcAll);
      return `<span><i style="color:${p.color};font-style:normal">■</i> ${esc(p.label)} <span class="muted" style="font-size:9px">[${esc(tag)}]</span> <b>${pct.toFixed(1)}%</b> (${fmtNum(v)})</span>`;
    })
    .join('');

  // Status DoT & Elemental Reactions summary card on Overview
  const dotsList = s.dots || [];
  const rxList = s.reactions || [];
  const statusCard = $('overviewStatusCard');
  if (statusCard) {
    const hasStatusOrRx = dotsList.length > 0 || rxList.length > 0;
    statusCard.classList.toggle('hidden', !hasStatusOrRx);
    if (hasStatusOrRx) {
      const dotPct = k.totalDmgDealt > 0 ? ((srcAll.dot || 0) / tot) * 100 : 0;
      const rxPct = k.totalDmgDealt > 0 ? ((srcAll.reaction || 0) / tot) * 100 : 0;
      $('overviewStatusBadge').textContent = `DoT ${dotPct.toFixed(1)}% · ปฏิกิริยา ${rxPct.toFixed(1)}%`;

      const items = [
        ...dotsList.map((d) => ({
          kind: 'dot',
          name: d.name,
          color: d.color || elColor(d.element),
          dmg: d.dmg || 0,
          sharePct: d.sharePct || 0,
          dps: d.dps || 0,
          sub: `${d.ticks} ticks`,
          tagHtml: d.sourceBucket === 'runeProc'
            ? '<span class="muted" style="font-size:9px">[รูน Proc]</span>'
            : d.inferred
              ? '<span class="est-tag">~est</span>'
              : '<span class="exact-tag">จริง</span>',
        })),
        ...rxList.map((r) => ({
          kind: 'rx',
          name: r.name,
          color: r.color || '#ff6b4a',
          dmg: r.dmg || 0,
          sharePct: r.sharePct || 0,
          dps: r.dps || 0,
          sub: `×${r.count}`,
          tagHtml: r.exactDmg > 0 && r.estDmg > 0
            ? '<span class="est-tag">จริง+est</span>'
            : r.exactDmg > 0
              ? '<span class="exact-tag">จริง</span>'
              : r.estDmg > 0
                ? '<span class="est-tag">~est</span>'
                : `<span class="muted" style="font-size:9px">[${r.mode === 'spread' ? 'กระจายเผา' : 'CC'}]</span>`,
        })),
      ]
        .sort((a, b) => b.dmg - a.dmg)
        .slice(0, 8);

      $('overviewStatusBars').innerHTML = items
        .map((it) => {
          const w = it.dmg > 0 ? Math.max(2, Math.min(100, it.sharePct)).toFixed(1) : '0.0';
          const rightTxt = it.dmg > 0
            ? `${fmtNum(it.dmg)} (${it.sharePct.toFixed(1)}%) · ${fmtNum(it.dps)}/s`
            : `${it.sub} (ไม่มีดาเมจตรง)`;
          return `<div class="bar-row">
            <div class="bar-row-top">
              <span><i class="el-dot" style="display:inline-block;background:${esc(it.color)};margin-right:5px"></i>${esc(it.name)} <span class="muted">(${esc(it.sub)})</span> ${it.tagHtml}</span>
              <span class="mono">${esc(rightTxt)}</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${esc(it.color)}"></div></div>
          </div>`;
        })
        .join('');
    }
  }

  // Top 5 Skills
  const top = s.skills.filter((sk) => sk.totalDmg > 0).slice(0, 5);
  $('overviewTopSkills').innerHTML = top.length
    ? top
        .map((sk) => {
          const c = elColor(sk.element);
          return `<div class="bar-row">
            <div class="bar-row-top">
              <span><i class="el-dot" style="display:inline-block;background:${c};margin-right:5px"></i>${esc(sk.name)}</span>
              <span class="mono">${fmtNum(sk.totalDmg)} (${sk.sharePct.toFixed(1)}%) · ${fmtNum(sk.dps)}/s</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width:${sk.sharePct.toFixed(1)}%;background:${c}"></div></div>
          </div>`;
        })
        .join('')
    : '<div class="muted">ยังไม่มีดาเมจที่บันทึก</div>';
}

function drawSparkline(points) {
  const canvas = $('sparkCanvas');
  if (!canvas || !points || !points.length) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  let maxVal = 10;
  for (const p of points) maxVal = Math.max(maxVal, p.dps, p.dtps);

  // Subtle horizontal grid
  ctx.strokeStyle = 'rgba(148,163,184,0.12)';
  ctx.lineWidth = 1;
  for (const f of [0.25, 0.5, 0.75]) {
    const y = h - f * (h - 14) - 4;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const xAt = (i) => (i / Math.max(1, points.length - 1)) * w;
  const yAt = (v) => h - 4 - (v / maxVal) * (h - 18);

  // DTPS red fill
  ctx.beginPath();
  ctx.moveTo(0, h - 4);
  for (let i = 0; i < points.length; i++) ctx.lineTo(xAt(i), yAt(points[i].dtps));
  ctx.lineTo(w, h - 4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(248, 113, 113, 0.25)';
  ctx.fill();

  // DPS cyan line
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = xAt(i), y = yAt(points[i].dps);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Max label
  ctx.fillStyle = '#8b9bb4';
  ctx.font = '10px monospace';
  ctx.fillText(`Max ${fmtNum(maxVal)}/s`, 4, 11);
}

function renderSkills() {
  const s = state.summary;
  if (!s) return;
  const q = state.skillQuery;
  let list = s.skills.slice();
  if (q) {
    list = list.filter((sk) => {
      if (sk.name.toLowerCase().includes(q) || sk.id.toLowerCase().includes(q)) return true;
      if (sk.equippedRunes.some((r) => r.name.toLowerCase().includes(q) || r.kind.toLowerCase().includes(q))) return true;
      if (sk.runeChildren.some((c) => c.name.toLowerCase().includes(q))) return true;
      return sk.runeTriggers.some((t) => t.name.toLowerCase().includes(q));
    });
  }
  const sorters = {
    dmg: (a, b) => b.totalDmg - a.totalDmg,
    dps: (a, b) => b.dps - a.dps,
    hits: (a, b) => b.hits - a.hits,
    crit: (a, b) => b.critRate - a.critRate,
    avg: (a, b) => b.avgHit - a.avgHit,
  };
  list.sort(sorters[state.skillSort] || sorters.dmg);

  const gSrc = s.sources || {};
  const gTot = Math.max(1, s.kpis?.totalDmgDealt || 0);
  $('skillsSourceLegend').innerHTML = SOURCE_PARTS.map((p) => {
    const v = gSrc[p.key] || 0;
    const pctTxt = (s.kpis?.totalDmgDealt || 0) > 0 && v > 0.5 ? ` <b>${((v / gTot) * 100).toFixed(0)}%</b>` : '';
    return `<span class="src-legend-item"><i class="src-swatch" style="background:${p.color}"></i>${esc(p.label)}${pctTxt}</span>`;
  }).join('');

  const roman = (t) => 'I'.repeat(Math.max(1, Math.min(3, t || 1)));
  $('skillsContainer').innerHTML = list.length
    ? list
        .map((sk) => {
          const open = state.expandedSkills.has(sk.id);
          const color = elColor(sk.element);
          const catBadge = sk.sourceCat === 'card'
            ? '<span class="cat-tag card">🃏 การ์ด</span>'
            : sk.sourceCat === 'gear'
              ? '<span class="cat-tag gear">⚔ อาวุธ</span>'
              : sk.sourceCat === 'reaction'
                ? '<span class="cat-tag reaction">⚡ ปฏิกิริยา</span>'
                : sk.sourceCat === 'dot'
                  ? '<span class="cat-tag dot">DoT</span>'
                  : '';
          const srcObj = sk.sources || { skill: sk.directDmg, runeProc: sk.procChildDmg, dot: sk.dotDmg };
          const runeBadges = sk.equippedRunes
            .map((r) => {
              const qbPct = Math.round((r.qb || 0) * 100);
              const tip = `Roll bonus: ${qbPct >= 0 ? '+' : ''}${qbPct}%`;
              return `<span class="rune-pill ${esc(r.grade)}" title="${esc(tip)}">${esc(r.name)} ${roman(r.tier)}</span>`;
            })
            .join('');

          let detailHtml = '';
          if (open) {
            const srcPills = SOURCE_PARTS
              .filter((p) => (srcObj[p.key] || 0) > 0.5)
              .map((p) => {
                const val = srcObj[p.key] || 0;
                const pct = sk.totalDmg > 0 ? (val / sk.totalDmg) * 100 : 0;
                const mode = sourceModeTag(p, srcObj);
                return `<span class="src-pill"><i class="src-swatch" style="background:${p.color}"></i>${esc(p.label)} <b>${fmtNum(val)}</b> <span class="muted">(${pct.toFixed(1)}% · ${esc(mode)})</span></span>`;
              })
              .join('');

            const childRows = sk.runeChildren.length
              ? `<div>
                  <div class="sub-hd">Proc / Extra-Hit Runes <span class="exact-tag">EXACT</span></div>
                  <table class="tbl">
                    <thead><tr><th>รูน</th><th class="num">DMG</th><th class="num">%สกิล</th><th class="num">Hits</th><th class="num">Crit%</th><th class="num">Avg/Max</th></tr></thead>
                    <tbody>
                      ${sk.runeChildren
                        .map(
                          (ch) => `<tr>
                          <td><i class="el-dot" style="display:inline-block;background:${elColor(ch.element)};margin-right:4px"></i>${esc(ch.name)}</td>
                          <td class="num cyan">${fmtNum(ch.totalDmg)}</td>
                          <td class="num">${ch.shareOfSkill.toFixed(1)}%</td>
                          <td class="num">${ch.hits || ch.nonDmgCount || ch.dotTicks}</td>
                          <td class="num gold">${ch.critRate.toFixed(0)}%</td>
                          <td class="num">${fmtNum(ch.avgHit)} / ${fmtNum(ch.maxHit)}</td>
                        </tr>`
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>`
              : '';

            const trigRows = sk.runeTriggers.length
              ? `<div>
                  <div class="sub-hd">Modifier / Triggered Runes <span class="est-tag">~EST BONUS</span></div>
                  <table class="tbl">
                    <thead><tr><th>รูน</th><th class="num">ติด/รวม</th><th class="num">ติด Avg</th><th class="num">ไม่ติด Avg</th><th class="num">~โบนัส DMG</th></tr></thead>
                    <tbody>
                      ${sk.runeTriggers
                        .map(
                          (rt) => `<tr>
                          <td>${esc(rt.name)}${rt.alwaysOn ? ' <span class="muted">(ทั้งฮิต)</span>' : ''}</td>
                          <td class="num">${rt.hits} (${rt.triggerRate.toFixed(0)}%)</td>
                          <td class="num">${fmtNum(rt.avgWith)}</td>
                          <td class="num muted">${rt.alwaysOn ? fmtNum(rt.avgWithout) : (rt.avgWithout > 0 ? fmtNum(rt.avgWithout) : '—')}</td>
                          <td class="num amber">${rt.estBonusDmg > 0 ? '~' + fmtNum(rt.estBonusDmg) : '—'}</td>
                        </tr>`
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>`
              : '';

            detailHtml = `<div class="skill-detail">
              <div>
                <div class="sub-hd">ที่มาของดาเมจในสกิลนี้</div>
                <div class="stacked-bar" style="margin-bottom:5px">${buildStackedSegments(srcObj, sk.totalDmg)}</div>
                <div class="src-pills">${srcPills || '<span class="muted">ยังไม่มีดาเมจ</span>'}</div>
              </div>
              <div class="pots-breakdown" style="margin-top:0">
                <span>Direct: <b class="cyan">${fmtNum(sk.directDmg)}</b></span>
                <span>DoT: <b class="green">${fmtNum(sk.dotDmg)}</b> (${sk.dotTicks})</span>
                <span>Proc Runes: <b class="amber">${fmtNum(sk.procChildDmg)}</b></span>
                <span>Miss/Evade/Refused: <b>${sk.miss}/${sk.evade}/${sk.refused}</b></span>
              </div>
              ${childRows}
              ${trigRows}
              ${!childRows && !trigRows ? '<div class="muted" style="font-size:10.5px">ยังไม่มีรูนที่ติด/ทำงานในสกิลนี้</div>' : ''}
            </div>`;
          }

          return `<div class="skill-card">
            <div class="skill-head" data-sid="${esc(sk.id)}">
              <div class="skill-row1">
                <div class="skill-name-wrap">
                  <span>${open ? '▾' : '▸'}</span>
                  <span class="el-dot" style="background:${color}"></span>
                  <span>${esc(sk.name)}</span>
                  ${catBadge}
                </div>
                <div class="skill-dmg">${fmtNum(sk.totalDmg)} <span class="muted">(${sk.sharePct.toFixed(1)}%)</span></div>
              </div>
              <div class="skill-bar-track">
                <div class="skill-bar-outer" style="width:${sk.sharePct.toFixed(2)}%">
                  ${buildStackedSegments(srcObj, sk.totalDmg)}
                </div>
              </div>
              <div class="skill-row2">
                <span>${fmtNum(sk.dps)}/s · ${sk.hits === 0 && sk.dotTicks > 0 ? `${sk.dotTicks} ticks` : `${sk.hits}h`} · Crit <b class="gold">${sk.critRate.toFixed(0)}%</b> · Avg ${fmtNum(sk.avgHit)} (Max ${fmtNum(sk.maxHit)})</span>
                <div class="rune-badges">${runeBadges}</div>
              </div>
            </div>
            ${detailHtml}
          </div>`;
        })
        .join('')
    : '<div class="muted">ไม่พบสกิลที่ตรงเงื่อนไข</div>';

  $('runesSummaryContainer').innerHTML = s.runes.length
    ? `<table class="tbl">
        <thead><tr><th>รูน</th><th>ติดกับสกิล</th><th class="num">ครั้ง</th><th class="num">DMG</th><th class="num">%รวม</th></tr></thead>
        <tbody>
          ${s.runes
            .map((r) => {
              const dmgText =
                r.exactDmg > 0
                  ? `${fmtNum(r.exactDmg)}<span class="exact-tag">จริง</span>`
                  : r.estBonusDmg > 0
                    ? `~${fmtNum(r.estBonusDmg)}<span class="est-tag">est</span>`
                    : '—';
              return `<tr>
                <td><b>${esc(r.name)}</b></td>
                <td class="muted">${esc(r.equippedOn.join(', ') || 'Auto')}</td>
                <td class="num">${r.triggers}</td>
                <td class="num">${dmgText}</td>
                <td class="num">${r.sharePct.toFixed(1)}%</td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>`
    : '<div class="muted">ยังไม่มีข้อมูลรูนในรอบนี้</div>';
}

function renderElements() {
  const s = state.summary;
  if (!s) return;
  $('activeElPill').innerHTML = `<i class="el-dot" style="display:inline-block;background:${elColor(s.activeElement)};margin-right:4px"></i>Active: ${esc(elName(s.activeElement))}`;

  $('elementsContainer').innerHTML = s.elements.length
    ? s.elements
        .map(
          (e) => `<div class="bar-row">
          <div class="bar-row-top">
            <span><i class="el-dot" style="display:inline-block;background:${e.color};margin-right:5px"></i><b>${esc(e.name)}</b></span>
            <span class="mono">${fmtNum(e.dmg)} (${e.sharePct.toFixed(1)}%) · ${fmtNum(e.dps)}/s · Crit ${e.critRate.toFixed(0)}% · Avg ${fmtNum(e.avgHit)}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${e.sharePct.toFixed(1)}%;background:${e.color}"></div></div>
        </div>`
        )
        .join('')
    : '<div class="muted">ยังไม่มีข้อมูลธาตุ</div>';

  $('reactionsRow').innerHTML = s.reactions.length
    ? '<span class="muted" style="font-size:10px">Reactions:</span> ' +
      s.reactions
        .map((r) => `<span class="badge good">${esc(r.name)} ×${r.count}${r.dmg > 0 ? ' · ' + fmtNum(r.dmg) : ''}</span>`)
        .join('')
    : '';

  const dotsList = s.dots || [];
  const rxList = s.reactions || [];
  const statusReactBox = $('statusReactContainer');
  if (statusReactBox) {
    const dotSum = s.sources?.dot ?? s.kpis?.dotDmg ?? 0;
    const rxSum = s.sources?.reaction ?? s.kpis?.reactionDmg ?? 0;
    const totDmg = Math.max(1, s.kpis?.totalDmgDealt || 0);
    const dotPct = (s.kpis?.totalDmgDealt || 0) > 0 ? (dotSum / totDmg) * 100 : 0;
    const rxPct = (s.kpis?.totalDmgDealt || 0) > 0 ? (rxSum / totDmg) * 100 : 0;
    $('statusReactBadge').textContent = (dotsList.length || rxList.length)
      ? `DoT ${fmtNum(dotSum)} (${dotPct.toFixed(1)}%) · ปฏิกิริยา ${fmtNum(rxSum)} (${rxPct.toFixed(1)}%)`
      : 'ยังไม่มี DoT / ปฏิกิริยา';

    const rxHtml = rxList.length
      ? `<div>
          <div class="sub-hd">ปฏิกิริยาธาตุ (Elemental Reactions)</div>
          <table class="tbl">
            <thead><tr><th>ปฏิกิริยา</th><th class="num">ครั้ง</th><th class="num">DMG</th><th class="num">% รวม</th><th class="num">DPS</th><th class="num">Avg/ครั้ง</th></tr></thead>
            <tbody>
              ${rxList
                .map((r) => {
                  let dmgCell = '—';
                  if (r.dmg > 0) {
                    const tag = r.exactDmg > 0 && r.estDmg > 0
                      ? '<span class="est-tag">จริง+est</span>'
                      : r.exactDmg > 0
                        ? '<span class="exact-tag">จริง</span>'
                        : '<span class="est-tag">~est</span>';
                    dmgCell = `${fmtNum(r.dmg)}${tag}`;
                  } else if (r.mode === 'spread' || r.mode === 'cc') {
                    dmgCell = `<span class="muted">${r.mode === 'spread' ? 'กระจายเผา' : 'CC'}</span>`;
                  }
                  const comboSub = r.combo ? ` <span class="muted" style="font-size:9.5px">(${esc(r.combo)})</span>` : '';
                  return `<tr>
                    <td><i class="el-dot" style="display:inline-block;background:${esc(r.color || '#ff6b4a')};margin-right:4px"></i><b>${esc(r.name)}</b>${comboSub}</td>
                    <td class="num">${r.count}</td>
                    <td class="num cyan">${dmgCell}</td>
                    <td class="num">${r.dmg > 0 ? r.sharePct.toFixed(1) + '%' : '—'}</td>
                    <td class="num">${r.dmg > 0 ? fmtNum(r.dps) : '—'}</td>
                    <td class="num">${r.dmg > 0 ? fmtNum(r.avgDmg) : '—'}</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>`
      : '';

    const hasRuneDot = dotsList.some((d) => d.sourceBucket === 'runeProc');
    const dotHtml = dotsList.length
      ? `<div style="${rxList.length ? 'margin-top:8px' : ''}">
          <div class="sub-hd">สถานะ / DoT (เผา · พิษ · เลือดไหล · รูนพิษ)</div>
          <table class="tbl">
            <thead><tr><th>สถานะ</th><th class="num">Ticks</th><th class="num">DMG</th><th class="num">% รวม</th><th class="num">DPS</th><th class="num">Avg / Max</th></tr></thead>
            <tbody>
              ${dotsList
                .map((d) => {
                  const tag = d.sourceBucket === 'runeProc'
                    ? '<span class="cat-tag" style="color:#f59e0b;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);margin-left:3px">รูน Proc</span>'
                    : d.inferred
                      ? '<span class="est-tag">~est</span>'
                      : '<span class="exact-tag">จริง</span>';
                  return `<tr>
                    <td><i class="el-dot" style="display:inline-block;background:${esc(d.color || elColor(d.element))};margin-right:4px"></i><b>${esc(d.name)}</b>${tag}</td>
                    <td class="num">${d.ticks}</td>
                    <td class="num green">${fmtNum(d.dmg)}</td>
                    <td class="num">${d.sharePct.toFixed(1)}%</td>
                    <td class="num">${fmtNum(d.dps)}</td>
                    <td class="num">${fmtNum(d.avgTick)} / ${fmtNum(d.maxTick)}</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
          ${hasRuneDot ? '<div class="muted" style="font-size:10px;margin-top:4px">* รูนพิษสะสม (Venom) นับรวมอยู่ในส่วน <b>รูน Proc</b> ของแถบองค์ประกอบดาเมจแล้ว (ไม่นับซ้ำ)</div>' : ''}
        </div>`
      : '';

    statusReactBox.innerHTML = (rxHtml || dotHtml)
      ? (rxHtml + dotHtml)
      : '<div class="muted">ยังไม่มีดาเมจจาก DoT หรือปฏิกิริยาธาตุในรอบนี้</div>';
  }

  $('armoursContainer').innerHTML = s.armours.length
    ? `<table class="tbl">
        <thead><tr><th>เกราะมอน</th><th>แพ้ทาง</th><th class="num">Hits</th><th class="num">DMG (%)</th><th class="num">Avg Hit</th></tr></thead>
        <tbody>
          ${s.armours
            .map(
              (a) => `<tr>
              <td><b>${esc(a.name)}</b></td>
              <td class="muted">${esc(a.weak)}</td>
              <td class="num">${a.hits}</td>
              <td class="num cyan">${fmtNum(a.dmg)} (${a.sharePct.toFixed(0)}%)</td>
              <td class="num">${fmtNum(a.avgHit)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : '<div class="muted">ยังไม่มีข้อมูลเกราะมอน</div>';

  const bs = $('bossSection');
  bs.classList.toggle('hidden', s.bossEncounters.length === 0);
  $('bossContainer').innerHTML = s.bossEncounters
    .map(
      (b) => `<div class="mini-box" style="margin-bottom:5px">
        <div class="bar-row-top">
          <b>👹 ${esc(b.name)}</b>
          <span class="badge ${b.killed ? 'good' : 'warn'}">${b.killed ? 'Killed' : b.ended ? 'Ended' : 'Fighting'} · ${b.durSec.toFixed(1)}s</span>
        </div>
        <div class="muted" style="font-size:10.5px;margin-top:2px">
          DPS <b class="cyan">${fmtNum(b.dps)}</b> · DMG ${fmtNum(b.dmgDealt)} · Taken <b class="red">${fmtNum(b.dmgTaken)}</b>
          ${b.topSkills.length ? ' · Top: ' + b.topSkills.map((t) => `${esc(t.name)} (${fmtNum(t.dmg)})`).join(', ') : ''}
        </div>
      </div>`
    )
    .join('');

  $('monstersContainer').innerHTML = s.monsters.length
    ? `<table class="tbl">
        <thead><tr><th>มอนสเตอร์</th><th class="num">Kills</th><th class="num">TTK</th><th class="num">DMG ทำได้</th><th class="num">DMG โดน</th></tr></thead>
        <tbody>
          ${s.monsters
            .slice(0, 25)
            .map(
              (m) => `<tr>
              <td>${esc(m.name)} <span class="muted">Lv${m.lv || '?'}</span></td>
              <td class="num">${m.kills}</td>
              <td class="num">${m.avgTtkSec != null ? m.avgTtkSec.toFixed(1) + 's' : '—'}</td>
              <td class="num cyan">${fmtNum(m.dmgDealt)}</td>
              <td class="num ${m.dmgTaken > 0 ? 'red' : 'muted'}">${fmtNum(m.dmgTaken)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : '<div class="muted">ยังไม่มีข้อมูลมอนสเตอร์</div>';
}

function renderEcon() {
  const s = state.summary;
  if (!s) return;
  const k = s.kpis;
  const h = s.hero;
  const ec = s.econ;

  $('survivalBadge').textContent = `Deaths: ${k.deaths} · Dodges: ${k.dodgeRate.toFixed(1)}%`;
  $('survivalGrid').innerHTML = [
    { k: 'DTPS (Total / 60s)', v: `${fmtNum(k.dtpsTotal)} / ${fmtNum(k.dtps60)}`, c: 'red' },
    { k: 'Total Taken', v: fmtNum(k.totalDmgTaken), c: 'red' },
    { k: 'Incoming HPS (60s)', v: `${fmtNum(k.hps60)}/s`, c: 'green' },
    { k: 'Dodge / Lucky', v: `${k.dodgeRate.toFixed(1)}% (${k.luckyDodges})`, c: 'cyan' },
    { k: 'Min Gear Dur', v: `${h.minDur}%`, c: h.minDur < 25 ? 'red' : '' },
    { k: 'Weight', v: `${h.loadPct}%`, c: h.loadPct >= 80 ? 'amber' : '' },
  ]
    .map((x) => `<div class="mini-box"><div class="k">${esc(x.k)}</div><div class="v ${x.c}">${esc(x.v)}</div></div>`)
    .join('');

  $('crowdBadge').textContent = `Players: ${s.map.players} · Mobs: ${s.map.mobs}`;
  $('econGrid').innerHTML = [
    { k: 'Net Profit / hr', v: `${ec.netProfitPerHr >= 0 ? '+' : ''}${fmtNum(ec.netProfitPerHr)}c`, c: ec.netProfitPerHr >= 0 ? 'green' : 'red' },
    { k: 'Pot Cost / hr (S2)', v: `${fmtNum(ec.potCostPerHr)}c`, c: 'amber' },
    { k: 'ΔCoins / ΔMats', v: `${fmtNum(ec.coinsDelta)} / ${fmtNum(ec.matValDelta)}c`, c: '' },
    { k: 'DPS/Pot · DMG/1c', v: `${fmtNum(ec.dpsPerPot)} · ${fmtNum(ec.dmgPerCoin)}`, c: 'cyan' },
    { k: 'HP Pot ETA', v: ec.hpPotEtaMin != null ? `${ec.hpPotEtaMin.toFixed(0)}m` : '∞', c: '' },
    { k: 'SP Pot ETA', v: ec.spPotEtaMin != null ? `${ec.spPotEtaMin.toFixed(0)}m` : '∞', c: '' },
  ]
    .map((x) => `<div class="mini-box"><div class="k">${esc(x.k)}</div><div class="v ${x.c}">${esc(x.v)}</div></div>`)
    .join('');

  const pu = ec.potsUsed;
  $('potsBreakdown').innerHTML = `
    <span>HP Used: <b>${ec.hpPotsUsedTotal}</b> (S:${pu.red} M:${pu.red_m} L:${pu.red_l}) [${ec.hpPotRateMin.toFixed(1)}/m]</span>
    <span>SP Used: <b>${ec.spPotsUsedTotal}</b> (S:${pu.blue} M:${pu.blue_m} L:${pu.blue_l}) [${ec.spPotRateMin.toFixed(1)}/m]</span>
  `;

  $('dryStreakBadge').textContent = `ตั้งแต่ดรอปล่าสุด: ${k.killsSinceCard} ตัว (การ์ด) · ${k.killsSinceRune} ตัว (รูน)`;
  $('dropsContainer').innerHTML = s.drops.length
    ? s.drops
        .slice(0, 15)
        .map(
          (d) => `<div class="log-item cat-drop">
          <span class="log-time">${fmtTime(d.at)}</span>
          <span class="log-txt">[${esc(d.cat)}] ${esc(d.name)}${d.count > 1 ? ' ×' + d.count : ''}</span>
          <span class="mono muted">${d.unitPrice > 0 ? fmtNum(d.unitPrice * d.count) + 'c' : ''}</span>
        </div>`
        )
        .join('')
    : '<div class="muted">ยังไม่มีดรอปแรร์ในรอบนี้ (นับเฉพาะการ์ด, รูน, ของมีค่า, เกียร์ G3+)</div>';

  $('buffsContainer').innerHTML = s.buffs.length
    ? s.buffs
        .map(
          (b) => `<div class="bar-row">
          <div class="bar-row-top">
            <span>${esc(b.name)}</span>
            <span class="mono">${b.uptimePct.toFixed(1)}%</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${b.uptimePct.toFixed(1)}%;background:#4ade80"></div></div>
        </div>`
        )
        .join('')
    : '<div class="muted">ยังไม่มีข้อมูล Buff Uptime ระหว่างต่อสู้</div>';

  const ex = s.execution;
  const errSummary = ex.errors.slice(0, 4).map((e) => `${e.msg}: ${e.count}`).join(' · ');
  $('execContainer').innerHTML = `
    <span>RTT avg/max: <b>${s.rtt.avg ?? '—'}/${s.rtt.max ?? '—'}ms</b></span>
    <span>CastPush: <b>${ex.castPush}</b> · Cancel: <b>${ex.castCancel}</b></span>
    ${errSummary ? `<span>Refusals: <b>${esc(errSummary)}</b></span>` : ''}
  `;
}

function renderParty() {
  const s = state.summary;
  if (!s) return;
  $('partyBadge').textContent = s.hero?.inParty ? `ในปาร์ตี้ (${s.hero.partyMemberIds.length} คน)` : 'Solo / Map';
  $('partyContainer').innerHTML = s.actors.length
    ? `<table class="tbl">
        <thead><tr><th>ตัวละคร</th><th class="num">DMG</th><th class="num">%</th><th class="num">DPS</th><th class="num">Crit%</th></tr></thead>
        <tbody>
          ${s.actors
            .slice(0, 10)
            .map(
              (a) => `<tr>
              <td>${a.isMe ? '⭐ ' : (a.inParty ? '👥 ' : '')}<b>${esc(a.name)}</b> <span class="muted">${a.lv ? 'Lv' + a.lv : ''}</span></td>
              <td class="num cyan">${fmtNum(a.dmg)}</td>
              <td class="num">${a.sharePct.toFixed(1)}%</td>
              <td class="num">${fmtNum(a.dps)}</td>
              <td class="num gold">${a.critRate.toFixed(0)}%</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : '<div class="muted">ยังไม่มีข้อมูลผู้เล่นในแมพ</div>';
}

function resolveCompareRun(id) {
  if (id === 'LIVE') {
    const s = state.summary;
    if (!s || !s.hero) return null;
    return {
      label: `LIVE (${s.hero.name})`,
      hero: { name: s.hero.name, lv: s.hero.lv, job: s.hero.jobName, weapon: s.hero.weaponName, pas: s.hero.pas },
      kpis: s.kpis,
      econ: s.econ,
      skills: s.skills,
      runes: s.runes,
    };
  }
  return state.savedRuns.find((r) => r.id === id) || null;
}

function renderCompare() {
  const runA = resolveCompareRun(state.runAId);
  const runB = resolveCompareRun(state.runBId);
  const box = $('compareContainer');
  if (!runA || !runB) {
    box.innerHTML = '<div class="muted">กดปุ่ม <b>💾 Save</b> ด้านบนอย่างน้อย 1 รอบเพื่อเทียบ Run A vs Run B (เช่น ก่อน-หลังเปลี่ยนรูน/อาวุธ)</div>';
    return;
  }

  const rows = [
    { label: 'Total DPS', a: runA.kpis.dpsTotal, b: runB.kpis.dpsTotal, fmt: fmtNum, better: 'high' },
    { label: 'Crit %', a: runA.kpis.critRate, b: runB.kpis.critRate, fmt: (x) => Number(x).toFixed(1) + '%', better: 'high' },
    { label: 'Base EXP / min', a: runA.kpis.xpPerMin, b: runB.kpis.xpPerMin, fmt: fmtNum, better: 'high' },
    { label: 'Job EXP / min', a: runA.kpis.jobXpPerMin || 0, b: runB.kpis.jobXpPerMin || 0, fmt: fmtNum, better: 'high' },
    { label: 'Taken / s', a: runA.kpis.dtpsTotal, b: runB.kpis.dtpsTotal, fmt: (x) => Number(x).toFixed(1), better: 'low' },
    { label: 'Pot Cost / hr', a: runA.econ.potCostPerHr, b: runB.econ.potCostPerHr, fmt: fmtNum, better: 'low' },
    { label: 'Net Profit / hr', a: runA.econ.netProfitPerHr, b: runB.econ.netProfitPerHr, fmt: fmtNum, better: 'high' },
  ];

  const kpiHtml = `<table class="tbl">
    <thead><tr><th>Metric</th><th class="num">Run A</th><th class="num">Run B</th><th class="num">Δ (B vs A)</th></tr></thead>
    <tbody>
      ${rows
        .map((r) => {
          const diff = r.b - r.a;
          const pct = r.a !== 0 ? (diff / Math.abs(r.a)) * 100 : (r.b !== 0 ? 100 : 0);
          const isGood = r.better === 'high' ? diff >= 0 : diff <= 0;
          const cls = Math.abs(diff) < 0.01 ? 'muted' : isGood ? 'delta-pos' : 'delta-neg';
          const sign = diff > 0 ? '+' : '';
          return `<tr>
            <td>${esc(r.label)}</td>
            <td class="num">${esc(r.fmt(r.a))}</td>
            <td class="num">${esc(r.fmt(r.b))}</td>
            <td class="num ${cls}">${sign}${esc(r.fmt(diff))} (${sign}${pct.toFixed(0)}%)</td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>`;

  const metaDiff = `<div class="pots-breakdown" style="margin-top:6px">
    <span><b>A:</b> ${esc(runA.hero?.weapon || '-')} · ${esc((runA.hero?.pas || []).map((x) => x.name).join(', ') || 'ไม่มีการ์ด')}</span>
    <span><b>B:</b> ${esc(runB.hero?.weapon || '-')} · ${esc((runB.hero?.pas || []).map((x) => x.name).join(', ') || 'ไม่มีการ์ด')}</span>
  </div>`;

  // Per-Skill & Per-Rune DPS/DMG diff for top overlapping or changed skills
  const skA = new Map((runA.skills || []).map((x) => [x.id, x]));
  const skB = new Map((runB.skills || []).map((x) => [x.id, x]));
  const allSkIds = [...new Set([...skA.keys(), ...skB.keys()])];
  const skRows = allSkIds
    .map((id) => {
      const a = skA.get(id), b = skB.get(id);
      const da = a?.dps || 0, db = b?.dps || 0;
      return { name: b?.name || a?.name || id, da, db, diff: db - da, runesB: (b?.equippedRunes || []).join(', ') };
    })
    .sort((x, y) => Math.max(y.da, y.db) - Math.max(x.da, x.db))
    .slice(0, 6);

  const skHtml = skRows.length
    ? `<div style="margin-top:8px"><div class="sub-hd">Per-Skill DPS Δ</div>
      <table class="tbl">
        <thead><tr><th>สกิล</th><th class="num">A DPS</th><th class="num">B DPS</th><th class="num">Δ</th></tr></thead>
        <tbody>${skRows.map((x) => {
          const sign = x.diff > 0 ? '+' : '';
          const cls = Math.abs(x.diff) < 1 ? 'muted' : x.diff >= 0 ? 'delta-pos' : 'delta-neg';
          return `<tr><td>${esc(x.name)}</td><td class="num">${fmtNum(x.da)}</td><td class="num">${fmtNum(x.db)}</td><td class="num ${cls}">${sign}${fmtNum(x.diff)}</td></tr>`;
        }).join('')}</tbody>
      </table></div>`
    : '';

  box.innerHTML = kpiHtml + metaDiff + skHtml;
}

function renderLog() {
  const s = state.summary;
  if (!s) return;
  let logs = s.combatLog || [];
  if (state.logFilter !== 'all') {
    logs = logs.filter((l) => l.cat === state.logFilter);
  }
  $('logContainer').innerHTML = logs.length
    ? logs
        .slice(0, 80)
        .map(
          (l) => `<div class="log-item cat-${esc(l.cat)}">
          <span class="log-time">${fmtTime(l.at)}</span>
          <span class="log-txt">${esc(l.text)}</span>
          <span class="muted">${esc(l.detail)}</span>
        </div>`
        )
        .join('')
    : '<div class="muted">ไม่มี Log ในหมวดนี้</div>';
}

connect();
