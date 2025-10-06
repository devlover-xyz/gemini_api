(() => {
    "use strict";
  
    // 1) DEFAULTS: bikin auto ON
    const DEFAULTS = {
      recaptcha_auto_open: true,
      recaptcha_auto_solve: true,
      recaptcha_click_delay_time: 300,
      recaptcha_solve_delay_time: 1000
    };
  
    // 2) Helper: set default hanya jika key belum ada
    async function ensureDefaults() {
      const keys = Object.keys(DEFAULTS);
      const cur  = await chrome.storage.local.get(keys);
      const toSet = {};
      for (const [k, v] of Object.entries(DEFAULTS)) {
        if (cur[k] === undefined) toSet[k] = v;
      }
      if (Object.keys(toSet).length) await chrome.storage.local.set(toSet);
    }
  
    // 3) Pasang saat install/upgrade
    chrome.runtime.onInstalled.addListener(async () => {
      await ensureDefaults();
  
      // Deteksi Firefox → minta permission kalau perlu
      const isFirefox = chrome.runtime.getURL("").startsWith("moz-extension://");
      const hasPerm = await chrome.permissions.contains({
        origins: ["<all_urls>", "*://*.google.com/recaptcha/*", "*://*.recaptcha.net/recaptcha/*"]
      });
      if (isFirefox && !hasPerm) {
        chrome.tabs.create({ url: chrome.runtime.getURL("setup.html") });
      }
    });
  
    // 4) (Opsional) Pastikan default juga ada setiap browser startup
    chrome.runtime.onStartup?.addListener(ensureDefaults);
  
    // ===== KV ephemeral (tab-scoped) =====
    const KV = {};
    chrome.runtime.onMessage.addListener(function ({ type, label }, sender, sendResponse) {
      (async () => {
        if (type === "KV_SET") {
          if (label.tab_specific) label.key = `${sender.tab.id}_${label.key}`;
          KV[label.key] = label.value;
          sendResponse({ status: "success" });
        } else if (type === "KV_GET") {
          if (label.tab_specific) label.key = `${sender.tab.id}_${label.key}`;
          sendResponse({ status: "success", value: KV[label.key] });
        }
      })();
      return true;
    });
  
  })();
  