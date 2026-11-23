/* Isolated content script bridge: relays read-only telemetry batches to background.js.
 * Zero DOM manipulation on the game page. */
(function () {
  'use strict';

  const ORIGIN = window.location.origin;
  const MAX_BUFFER = 80;
  let port = null;
  let reconnectTimer = 0;
  let invalidated = false;
  let captureEnabled = false;
  const buffer = [];

  function setCapture(next) {
    const en = !!next;
    captureEnabled = en;
    try {
      window.postMessage({ __ncTelCapture: 1, enabled: en }, ORIGIN);
    } catch (_) {}
    if (en) {
      if (!port) connect();
    } else {
      buffer.length = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = 0;
      }
      const oldPort = port;
      port = null;
      if (oldPort) {
        try { oldPort.disconnect(); } catch (_) {}
      }
    }
  }

  function connect() {
    if (invalidated || !captureEnabled) return;
    try {
      const p = (port = chrome.runtime.connect({ name: 'nc-tab' }));
      p.onMessage.addListener((msg) => {
        if (msg?.type === 'resyncMeta') {
          window.postMessage({ __ncTelResync: 1 }, ORIGIN);
        } else if (msg?.type === 'setCapture') {
          setCapture(!!msg.enabled);
        }
      });
      p.onDisconnect.addListener(() => {
        if (port === p) port = null;
        if (chrome.runtime.lastError) {
          // MV3 worker may have cycled or extension reloaded
        }
        if (!invalidated && captureEnabled && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = 0;
            connect();
          }, 1000);
        }
      });
      while (buffer.length && port) {
        port.postMessage(buffer.shift());
      }
    } catch (_) {
      port = null;
      invalidated = true;
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'setCapture') {
      setCapture(!!msg.enabled);
      sendResponse({ ok: true, enabled: captureEnabled });
    } else if (msg.type === 'pingCapture') {
      sendResponse({ ok: true, enabled: captureEnabled });
    }
  });

  window.addEventListener('message', (ev) => {
    if (!captureEnabled) return;
    if (ev.source !== window || ev.origin !== ORIGIN) return;
    const data = ev.data;
    if (!data || data.__ncTel !== 1 || !Array.isArray(data.batch)) return;

    const msg = { type: 'batch', batch: data.batch };
    if (port) {
      try {
        port.postMessage(msg);
        return;
      } catch (_) {
        port = null;
      }
    }
    if (!invalidated && captureEnabled) {
      buffer.push(msg);
      if (buffer.length > MAX_BUFFER) buffer.shift();
      if (!reconnectTimer) connect();
    }
  });
})();
