/* MV3 Background Service Worker: maintains per-tab TelemetryEngine instances,
 * streams summaries to Side Panel / Popout views, and persists Run A/B snapshots. */
import { TelemetryEngine } from './engine.js';

const tabsMap = new Map(); // tabId -> { tabId, engine, port, title, url, connected, enabled, autoStopped, lastSeen }
const uiPorts = new Set(); // Set<chrome.runtime.Port>
const IDLE_STOP_ALARM = 'nc-ui-idle-stop';
const IDLE_STOP_MINUTES = 5;
const IDLE_STOP_MS = IDLE_STOP_MINUTES * 60 * 1000;
let tickTimer = 0;
let idleStopTimer = 0;

async function enableSidePanelAction() {
  try {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (err) {
    console.warn('setPanelBehavior failed:', err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  enableSidePanelAction();
});
chrome.runtime.onStartup.addListener(() => {
  enableSidePanelAction();
});
enableSidePanelAction();

function ensureTabEntry(tabId, senderTab = null) {
  let entry = tabsMap.get(tabId);
  if (!entry) {
    const engine = new TelemetryEngine({ tabId });
    engine.setPaused(true); // standby OFF by default until user clicks Start
    entry = {
      tabId,
      engine,
      port: null,
      title: senderTab?.title || 'Night Camp',
      url: senderTab?.url || '',
      connected: false,
      enabled: false,
      autoStopped: false,
      lastSeen: Date.now(),
    };
    tabsMap.set(tabId, entry);
  } else if (senderTab) {
    if (senderTab.title) entry.title = senderTab.title;
    if (senderTab.url) entry.url = senderTab.url;
  }
  return entry;
}

async function syncGameTabs() {
  const openTabs = await chrome.tabs.query({ url: 'https://play.nightcamp.app/*' }).catch(() => []);
  const openIds = new Set();
  for (const t of openTabs) {
    if (!t?.id) continue;
    openIds.add(t.id);
    ensureTabEntry(t.id, t);
  }
  for (const [tabId, entry] of tabsMap) {
    if (!openIds.has(tabId) && !entry.connected) {
      tabsMap.delete(tabId);
    }
  }
}

function hasActiveCapture() {
  for (const e of tabsMap.values()) {
    if (e.enabled) return true;
  }
  return false;
}

function cancelIdleAutoStop() {
  if (idleStopTimer) {
    clearTimeout(idleStopTimer);
    idleStopTimer = 0;
  }
  try {
    chrome.alarms?.clear(IDLE_STOP_ALARM).catch?.(() => {});
  } catch (_) {}
}

async function autoStopAllActiveTabs() {
  if (uiPorts.size > 0) {
    cancelIdleAutoStop();
    return;
  }
  cancelIdleAutoStop();
  const stoppedIds = new Set();
  for (const entry of tabsMap.values()) {
    if (!entry.enabled) continue;
    entry.enabled = false;
    entry.autoStopped = true;
    entry.engine.setPaused(true);
    stoppedIds.add(entry.tabId);
    if (entry.port) {
      try { entry.port.postMessage({ type: 'setCapture', enabled: false }); } catch (_) {}
    }
    chrome.tabs.sendMessage(entry.tabId, { type: 'setCapture', enabled: false }).catch(() => {});
  }
  const openTabs = await chrome.tabs.query({ url: 'https://play.nightcamp.app/*' }).catch(() => []);
  for (const t of openTabs) {
    if (t?.id && !stoppedIds.has(t.id)) {
      chrome.tabs.sendMessage(t.id, { type: 'setCapture', enabled: false }).catch(() => {});
    }
  }
}

function scheduleIdleAutoStop(forceReset = true) {
  if (uiPorts.size > 0 || !hasActiveCapture()) return;
  if (forceReset) cancelIdleAutoStop();
  if (!idleStopTimer) {
    idleStopTimer = setTimeout(() => {
      idleStopTimer = 0;
      autoStopAllActiveTabs();
    }, IDLE_STOP_MS);
  }
  if (forceReset) {
    try { chrome.alarms?.create?.(IDLE_STOP_ALARM, { delayInMinutes: IDLE_STOP_MINUTES }); } catch (_) {}
  } else {
    try {
      chrome.alarms?.get?.(IDLE_STOP_ALARM, (existing) => {
        if (!existing && uiPorts.size === 0 && hasActiveCapture()) {
          chrome.alarms?.create?.(IDLE_STOP_ALARM, { delayInMinutes: IDLE_STOP_MINUTES });
        }
      });
    } catch (_) {}
  }
}

chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm?.name === IDLE_STOP_ALARM && uiPorts.size === 0) {
    autoStopAllActiveTabs();
  }
});

function listTabsSnapshot() {
  const out = [];
  for (const e of tabsMap.values()) {
    const h = e.engine.hero;
    out.push({
      tabId: e.tabId,
      title: e.title,
      connected: e.connected,
      enabled: !!e.enabled,
      autoStopped: !!e.autoStopped,
      lastSeen: e.lastSeen,
      heroName: h?.name || '',
      lv: h?.lv || 0,
      jobName: h?.jobName || '',
      mapName: e.engine.meta.maps[e.engine.mapId]?.name || e.engine.mapId || '',
      channelId: e.engine.channelId || '',
      paused: e.engine.paused,
    });
  }
  return out;
}

function broadcastTabs() {
  if (!uiPorts.size) return;
  const tabs = listTabsSnapshot();
  for (const p of uiPorts) {
    try { p.postMessage({ type: 'tabs', tabs }); } catch (_) {}
  }
}

async function getSavedRuns() {
  const res = await chrome.storage.local.get({ savedRuns: [] });
  return Array.isArray(res.savedRuns) ? res.savedRuns : [];
}

function sendSummaryToPort(p, force = false, summaryCache = null) {
  if (!force && p._visible === false) return null;
  let targetId = p._selectedTabId;
  if (!targetId || !tabsMap.has(targetId)) {
    const preferred = [...tabsMap.values()].find((e) => e.enabled || e.connected) || [...tabsMap.values()][0];
    targetId = preferred ? preferred.tabId : null;
    p._selectedTabId = targetId;
  }
  if (!targetId) {
    if (force) {
      try { p.postMessage({ type: 'summary', summary: null, tabs: listTabsSnapshot() }); } catch (_) {}
    }
    return null;
  }
  const entry = tabsMap.get(targetId);
  if (!entry) return null;
  if (!force && !entry.enabled) return null;
  const now = Date.now();
  const recentlyActive = now - entry.engine.lastActivityAt < 65000;
  if (!force && !entry.engine._dirty && !recentlyActive) return null;

  const includeLog = p._activeTab === 'compare';
  const cacheKey = `${targetId}:${includeLog ? 1 : 0}`;
  let summary = summaryCache?.get(cacheKey);
  if (!summary) {
    summary = entry.engine.getSummary(now, { includeLog });
    summary.enabled = !!entry.enabled;
    summary.autoStopped = !!entry.autoStopped;
    summaryCache?.set(cacheKey, summary);
  }
  try {
    p.postMessage({ type: 'summary', summary, tabs: listTabsSnapshot() });
  } catch (_) {}
  return entry;
}

function ensureUiTicker() {
  if (uiPorts.size && !tickTimer) {
    tickTimer = setInterval(() => {
      if (!uiPorts.size) {
        clearInterval(tickTimer);
        tickTimer = 0;
        return;
      }
      const cache = new Map();
      const updated = new Set();
      for (const p of uiPorts) {
        const entry = sendSummaryToPort(p, false, cache);
        if (entry) updated.add(entry);
      }
      for (const entry of updated) entry.engine._dirty = false;
    }, 1000);
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabsMap.has(tabId)) {
    tabsMap.delete(tabId);
    if (!hasActiveCapture()) cancelIdleAutoStop();
    broadcastTabs();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const isGameUrl = typeof tab?.url === 'string' && tab.url.startsWith('https://play.nightcamp.app/');
  if (changeInfo.status === 'loading' && tabsMap.has(tabId)) {
    const entry = tabsMap.get(tabId);
    entry.enabled = false;
    entry.connected = false;
    entry.autoStopped = false;
    entry.port = null;
    entry.engine.setPaused(true);
    if (!hasActiveCapture()) cancelIdleAutoStop();
    broadcastTabs();
    return;
  }
  if (isGameUrl && (changeInfo.title || changeInfo.url || !tabsMap.has(tabId))) {
    ensureTabEntry(tabId, tab);
    broadcastTabs();
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'nc-tab') {
    const tabId = port.sender?.tab?.id;
    if (!tabId) return;
    const entry = ensureTabEntry(tabId, port.sender.tab);
    entry.port = port;
    entry.connected = true;
    entry.enabled = true;
    entry.autoStopped = false;
    entry.engine.setPaused(false);
    entry.lastSeen = Date.now();
    if (entry.engine.lastSnapAt === 0) {
      try { port.postMessage({ type: 'resyncMeta' }); } catch (_) {}
    }
    if (uiPorts.size === 0) scheduleIdleAutoStop(false);
    broadcastTabs();

    port.onMessage.addListener((msg) => {
      if (!msg || msg.type !== 'batch' || !Array.isArray(msg.batch)) return;
      if (!entry.enabled) return;
      const beforeHero = entry.engine.hero?.name || '';
      const beforeMap = entry.engine.mapId || '';
      entry.lastSeen = Date.now();
      entry.connected = true;
      entry.engine.ingestBatch(msg.batch);
      if ((entry.engine.hero?.name || '') !== beforeHero || (entry.engine.mapId || '') !== beforeMap) {
        broadcastTabs();
      }
    });

    port.onDisconnect.addListener(() => {
      if (entry.port === port) {
        entry.port = null;
        entry.connected = false;
        broadcastTabs();
      }
    });
    return;
  }

  if (port.name === 'nc-ui') {
    uiPorts.add(port);
    port._selectedTabId = null;
    port._visible = true;
    port._activeTab = 'overview';
    cancelIdleAutoStop();
    ensureUiTicker();

    port.onMessage.addListener(async (msg) => {
      if (!msg || typeof msg !== 'object') return;
      try {
        if (msg.cmd === 'init') {
          if (msg.activeTab) port._activeTab = msg.activeTab;
          if (typeof msg.visible === 'boolean') port._visible = msg.visible;
          await syncGameTabs();
          if (msg.preferTabId && tabsMap.has(Number(msg.preferTabId))) {
            port._selectedTabId = Number(msg.preferTabId);
          } else {
            const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => []);
            if (active?.id && tabsMap.has(active.id)) {
              port._selectedTabId = active.id;
            } else {
              const firstActive = [...tabsMap.values()].find((e) => e.enabled || e.connected) || [...tabsMap.values()][0];
              port._selectedTabId = firstActive ? firstActive.tabId : null;
            }
          }
          const savedRuns = await getSavedRuns();
          port.postMessage({
            type: 'init',
            tabs: listTabsSnapshot(),
            selectedTabId: port._selectedTabId,
            savedRuns,
          });
          sendSummaryToPort(port, true);
          return;
        }

        if (msg.cmd === 'refreshTabs') {
          await syncGameTabs();
          broadcastTabs();
          sendSummaryToPort(port, true);
          return;
        }

        if (msg.cmd === 'setActiveTab') {
          port._activeTab = msg.activeTab || 'overview';
          sendSummaryToPort(port, true);
          return;
        }

        if (msg.cmd === 'setVisible') {
          port._visible = msg.visible !== false;
          if (port._visible) sendSummaryToPort(port, true);
          return;
        }

        if (msg.cmd === 'selectTab') {
          port._selectedTabId = msg.tabId ? Number(msg.tabId) : null;
          sendSummaryToPort(port, true);
          return;
        }

        const targetId = Number(msg.tabId || port._selectedTabId);
        let entry = targetId ? tabsMap.get(targetId) : null;
        if (!entry && targetId) {
          await syncGameTabs();
          entry = tabsMap.get(targetId) || null;
        }

        if (msg.cmd === 'reset' && entry) {
          entry.engine.reset();
          entry.engine.setPaused(!entry.enabled);
          for (const p of uiPorts) if (p._selectedTabId === targetId) sendSummaryToPort(p, true);
          entry.engine._dirty = false;
        } else if (msg.cmd === 'setCapture' && entry) {
          const nextEnabled = msg.enabled !== undefined ? !!msg.enabled : !entry.enabled;
          if (nextEnabled) {
            try {
              await chrome.tabs.sendMessage(targetId, { type: 'setCapture', enabled: true });
            } catch (_) {
              entry.enabled = false;
              entry.engine.setPaused(true);
              broadcastTabs();
              try {
                port.postMessage({
                  type: 'captureError',
                  tabId: targetId,
                  message: 'กรุณารีเฟรชหน้าเกม (F5) 1 ครั้ง แล้วกด ▶ เปิดใหม่อีกครั้ง',
                });
              } catch (_) {}
              return;
            }
            entry.enabled = true;
            entry.autoStopped = false;
            entry.engine.setPaused(false);
            cancelIdleAutoStop();
            broadcastTabs();
            for (const p of uiPorts) if (p._selectedTabId === targetId) sendSummaryToPort(p, true);
            entry.engine._dirty = false;
          } else {
            entry.enabled = false;
            entry.autoStopped = false;
            entry.engine.setPaused(true);
            if (entry.port) {
              try { entry.port.postMessage({ type: 'setCapture', enabled: false }); } catch (_) {}
            }
            chrome.tabs.sendMessage(targetId, { type: 'setCapture', enabled: false }).catch(() => {});
            if (!hasActiveCapture()) cancelIdleAutoStop();
            broadcastTabs();
            for (const p of uiPorts) if (p._selectedTabId === targetId) sendSummaryToPort(p, true);
            entry.engine._dirty = false;
          }
        } else if (msg.cmd === 'setDpsMode' && entry) {
          entry.engine.setDpsMode(msg.mode);
          for (const p of uiPorts) if (p._selectedTabId === targetId) sendSummaryToPort(p, true);
          entry.engine._dirty = false;
        } else if (msg.cmd === 'saveRun' && entry) {
          const snap = entry.engine.createRunSnapshot(msg.label || '');
          const list = await getSavedRuns();
          list.unshift(snap);
          if (list.length > 20) list.length = 20;
          await chrome.storage.local.set({ savedRuns: list });
          for (const p of uiPorts) {
            try { p.postMessage({ type: 'savedRuns', savedRuns: list, justSavedId: snap.id }); } catch (_) {}
          }
        } else if (msg.cmd === 'deleteRun') {
          const list = (await getSavedRuns()).filter((r) => r.id !== msg.runId);
          await chrome.storage.local.set({ savedRuns: list });
          for (const p of uiPorts) {
            try { p.postMessage({ type: 'savedRuns', savedRuns: list }); } catch (_) {}
          }
        } else if (msg.cmd === 'exportData' && entry) {
          const format = msg.format === 'csv' ? 'csv' : 'json';
          const data = format === 'csv' ? entry.engine.exportCSV() : entry.engine.exportJSON();
          const hero = (entry.engine.hero?.name || 'nightcamp').replace(/[^a-zA-Z0-9ก-๛_-]/g, '_');
          const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          port.postMessage({
            type: 'exportResult',
            format,
            filename: `nc_telemetry_${hero}_${stamp}.${format}`,
            data,
          });
        } else if (msg.cmd === 'openPopout') {
          const qs = targetId ? `?popout=1&tabId=${targetId}` : '?popout=1';
          await chrome.windows.create({
            url: chrome.runtime.getURL('panel.html' + qs),
            type: 'popup',
            width: 620,
            height: 860,
          });
        }
      } catch (err) {
        console.warn('nc-ui command error:', err);
      }
    });

    port.onDisconnect.addListener(() => {
      uiPorts.delete(port);
      if (!uiPorts.size) {
        if (tickTimer) {
          clearInterval(tickTimer);
          tickTimer = 0;
        }
        if (hasActiveCapture()) {
          scheduleIdleAutoStop(true);
        }
      }
    });
  }
});
